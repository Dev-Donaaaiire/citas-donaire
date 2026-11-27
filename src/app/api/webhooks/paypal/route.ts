import { NextRequest, NextResponse } from 'next/server'
import {
  issueOrGetLicenseForPaymentSession,
  type LicensePlan,
} from '@/lib/license'
import { sendLicenseDeliveryEmail } from '@/lib/email-service'

interface PayPalWebhookEvent {
  id?: string
  event_type?: string
  resource?: {
    id?: string
    status?: string
    custom_id?: string
    invoice_id?: string
    supplementary_data?: {
      related_ids?: {
        order_id?: string
        authorization_id?: string
      }
    }
    amount?: {
      currency_code?: string
      value?: string
    }
    purchase_units?: Array<{
      custom_id?: string
      amount?: {
        currency_code?: string
        value?: string
      }
      payments?: {
        captures?: Array<{
          id?: string
          status?: string
          amount?: {
            currency_code?: string
            value?: string
          }
        }>
      }
    }>
    payer?: {
      email_address?: string
      name?: {
        given_name?: string
        surname?: string
      }
    }
    payment_source?: {
      paypal?: {
        email_address?: string
      }
    }
    subscriber?: {
      email_address?: string
    }
  }
}

function getPayPalApiBase(): string {
  const explicit = process.env.PAYPAL_API_BASE?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  return process.env.PAYPAL_ENV?.trim().toLowerCase() === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'
}

/**
 * Los eventos de captura no siempre incluyen al comprador: se consulta la orden
 * en la API de PayPal. Devuelve null si no se puede obtener.
 */
async function fetchOrderBuyerEmail(orderId: string): Promise<string | null> {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim()
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null

  const base = getPayPalApiBase()
  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  if (!tokenRes.ok) throw new Error('PayPal OAuth no disponible.')
  const { access_token } = (await tokenRes.json()) as { access_token?: string }

  const orderRes = await fetch(
    `${base}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    {
      headers: { Authorization: `Bearer ${access_token}` },
      cache: 'no-store',
    }
  )
  if (orderRes.status === 404) return null
  // Fallo temporal: se lanza para que PayPal reintente el webhook
  if (!orderRes.ok) throw new Error(`PayPal orders: ${orderRes.status}`)

  const order = (await orderRes.json()) as {
    payer?: { email_address?: string }
    payment_source?: { paypal?: { email_address?: string } }
  }
  return (
    order.payer?.email_address ||
    order.payment_source?.paypal?.email_address ||
    null
  )
}

function resolvePublicAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') ||
    'http://localhost:3000'
  )
}

async function verifyPayPalWebhookSignature(
  request: NextRequest,
  rawBody: string
): Promise<{ valid: boolean; status: 400 | 401; error?: string }> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim()
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim()
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim()

  if (!webhookId || !clientId || !clientSecret) {
    return {
      valid: false,
      status: 401,
      error:
        'Credenciales o PAYPAL_WEBHOOK_ID no configurados en el servidor.',
    }
  }

  const authAlgo = request.headers.get('paypal-auth-algo')?.trim()
  const certUrl = request.headers.get('paypal-cert-url')?.trim()
  const transmissionId = request.headers.get('paypal-transmission-id')?.trim()
  const transmissionSig = request.headers.get('paypal-transmission-sig')?.trim()
  const transmissionTime = request.headers.get('paypal-transmission-time')?.trim()

  if (
    !authAlgo ||
    !certUrl ||
    !transmissionId ||
    !transmissionSig ||
    !transmissionTime
  ) {
    return {
      valid: false,
      status: 400,
      error: 'Faltan cabeceras obligatorias de verificación de PayPal.',
    }
  }

  const paypalBase = getPayPalApiBase()
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64'
  )

  const tokenRes = await fetch(`${paypalBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })

  if (!tokenRes.ok) {
    return {
      valid: false,
      status: 401,
      error: 'No se pudo autenticar con PayPal OAuth para verificar el webhook.',
    }
  }

  const tokenData = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string
  }

  if (!tokenData.access_token) {
    return {
      valid: false,
      status: 401,
      error: 'Respuesta OAuth inválida de PayPal.',
    }
  }

  const verifyRes = await fetch(
    `${paypalBase}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      // El evento se reenvía tal cual llegó: reserializarlo puede invalidar la firma
      body: `${JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
      }).slice(0, -1)},"webhook_event":${rawBody}}`,
      cache: 'no-store',
    }
  )

  if (!verifyRes.ok) {
    return {
      valid: false,
      status: 401,
      error: 'PayPal rechazó la verificación criptográfica del webhook.',
    }
  }

  const verifyData = (await verifyRes.json().catch(() => ({}))) as {
    verification_status?: string
  }

  if (verifyData.verification_status !== 'SUCCESS') {
    return {
      valid: false,
      status: 401,
      error: 'Firma criptográfica de PayPal no válida (verification_status != SUCCESS).',
    }
  }

  return { valid: true, status: 400 }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    let event: PayPalWebhookEvent

    try {
      event = JSON.parse(rawBody) as PayPalWebhookEvent
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo JSON del webhook inválido.' },
        { status: 400 }
      )
    }

    const sigCheck = await verifyPayPalWebhookSignature(request, rawBody)
    if (!sigCheck.valid) {
      return NextResponse.json(
        { error: sigCheck.error },
        { status: sigCheck.status }
      )
    }

    const eventType = event.event_type || 'unknown'
    // Un único evento por pago: CHECKOUT.ORDER.COMPLETED se ignora para no emitir licencias duplicadas
    const acceptedEvents = new Set(['PAYMENT.CAPTURE.COMPLETED'])

    if (!acceptedEvents.has(eventType)) {
      return NextResponse.json({
        received: true,
        ignored: true,
        eventType,
      })
    }

    const resource = event.resource
    if (!resource) {
      return NextResponse.json(
        { error: 'El evento de PayPal no contiene recurso asociado.' },
        { status: 400 }
      )
    }

    if (resource.status && resource.status.toUpperCase() !== 'COMPLETED') {
      return NextResponse.json(
        { error: `El pago de PayPal no está COMPLETED (${resource.status}).` },
        { status: 400 }
      )
    }

    const captureAmount =
      resource.amount ||
      resource.purchase_units?.[0]?.payments?.captures?.[0]?.amount ||
      resource.purchase_units?.[0]?.amount

    const isSandbox =
      process.env.PAYPAL_ENV?.trim().toLowerCase() === 'sandbox' ||
      process.env.NODE_ENV !== 'production'
    const allowedCurrencies = isSandbox ? ['EUR', 'USD'] : ['EUR']

    const currency = captureAmount?.currency_code?.trim().toUpperCase()
    const amountEur = Number(captureAmount?.value ?? NaN)

    if (
      !allowedCurrencies.includes(currency || '') ||
      !Number.isFinite(amountEur) ||
      amountEur < 14.99
    ) {
      return NextResponse.json(
        {
          error:
            'Divisa o importe inválido en webhook PayPal (se requiere EUR y mínimo 14.99).',
        },
        { status: 400 }
      )
    }

    const plan: LicensePlan =
      amountEur >= 99 ? 'llave_en_mano_99' : 'autoinstalable_15'

    const orderId = resource.supplementary_data?.related_ids?.order_id
    let buyerEmail =
      resource.payer?.email_address ||
      resource.payment_source?.paypal?.email_address ||
      resource.subscriber?.email_address ||
      (orderId ? await fetchOrderBuyerEmail(orderId) : null)

    // Sin email del comprador, la licencia llega al vendedor para que la reenvíe
    const needsForwarding = !buyerEmail || !buyerEmail.includes('@')
    if (needsForwarding) {
      buyerEmail = process.env.OWNER_NOTIFICATION_EMAIL?.trim() || null
    }

    if (!buyerEmail || !buyerEmail.includes('@')) {
      return NextResponse.json(
        { error: 'El evento de PayPal no incluye email válido del comprador.' },
        { status: 400 }
      )
    }

    const buyerName = [
      resource.payer?.name?.given_name,
      resource.payer?.name?.surname,
    ]
      .filter(Boolean)
      .join(' ')
      .trim()

    // Normaliza siempre al order_id para que un mismo pago nunca genere dos sesiones distintas
    const sessionRef =
      resource.supplementary_data?.related_ids?.order_id ||
      resource.id ||
      event.id
    if (!sessionRef) {
      return NextResponse.json(
        { error: 'El evento de PayPal no incluye identificador de pago.' },
        { status: 400 }
      )
    }
    const paymentId = `paypal:${sessionRef}`

    const { license, alreadyExisted } =
      await issueOrGetLicenseForPaymentSession({
        compradorEmail: buyerEmail,
        paymentSessionId: paymentId,
        plan,
      })

    let emailResult = { success: false, simulated: false }
    try {
      emailResult = await sendLicenseDeliveryEmail({
        buyerEmail: license.comprador_email,
        buyerName: buyerName || null,
        licenseKey: license.license_key,
        plan,
        amountCents: Math.round(amountEur * 100),
        baseUrl: resolvePublicAppUrl(),
        subjectPrefix: needsForwarding
          ? `[REENVIAR AL COMPRADOR · pago ${paymentId}] `
          : undefined,
      })
    } catch (emailErr) {
      console.error(
        '[webhooks/paypal] Error enviando correo de licencia:',
        emailErr
      )
    }

    // Sin entrega real respondemos 503 para que PayPal reintente; la licencia
    // ya emitida se reutiliza por id de pago, así que no se duplica.
    if (!emailResult.success || emailResult.simulated) {
      console.error(
        `[webhooks/paypal] Licencia emitida sin email entregado (${paymentId}).`
      )
      return NextResponse.json(
        { error: 'No se pudo entregar el correo de la licencia.' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      received: true,
      eventType,
      alreadyExisted,
      plan,
      emailDelivered: true,
    })
  } catch (err) {
    console.error('[webhooks/paypal] Error:', err)
    return NextResponse.json(
      { error: 'Error interno al procesar el webhook de PayPal.' },
      { status: 500 }
    )
  }
}
