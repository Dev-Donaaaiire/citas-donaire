import { NextRequest, NextResponse } from 'next/server'
import {
  issueOrGetLicenseForPaymentSession,
  type LicensePlan,
} from '@/lib/license'
import { sendLicenseDeliveryEmail } from '@/lib/email-service'

interface PayPalWebhookEvent {
  id?: string
  create_time?: string
  resource_type?: string
  event_type?: string
  summary?: string
  resource?: {
    id?: string
    status?: string
    custom_id?: string
    amount?: {
      value?: string
      currency_code?: string
    }
    seller_receivable_breakdown?: {
      gross_amount?: {
        value?: string
        currency_code?: string
      }
    }
    gross_amount?: {
      value?: string
      currency_code?: string
    }
    payer?: {
      email_address?: string
      name?: {
        given_name?: string
        surname?: string
      }
      payer_info?: {
        email?: string
        first_name?: string
        last_name?: string
      }
    }
    supplementary_data?: {
      related_ids?: {
        order_id?: string
        capture_id?: string
      }
    }
  }
}

function resolveBaseUrl(request: NextRequest): string {
  const origin = request.headers.get('origin')
  if (origin) return origin
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  if (host) {
    const scheme = host.includes('localhost') ? 'http' : proto
    return `${scheme}://${host}`
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    let event: PayPalWebhookEvent
    try {
      event = JSON.parse(rawBody) as PayPalWebhookEvent
    } catch {
      return NextResponse.json(
        { error: 'Payload JSON del webhook de PayPal mal formado.' },
        { status: 400 }
      )
    }

    const eventType = event.event_type || ''

    // Eventos soportados de pago completado en PayPal
    const supportedEvents = [
      'PAYMENT.CAPTURE.COMPLETED',
      'CHECKOUT.ORDER.APPROVED',
      'PAYMENT.SALE.COMPLETED',
    ]

    if (!supportedEvents.includes(eventType)) {
      return NextResponse.json({
        received: true,
        ignored: true,
        eventType,
      })
    }

    const resource = event.resource
    if (!resource) {
      return NextResponse.json(
        { error: 'El evento de PayPal no contiene el objeto resource.' },
        { status: 400 }
      )
    }

    // Extraer email del comprador
    const buyerEmail = (
      resource.payer?.email_address ||
      resource.payer?.payer_info?.email ||
      resource.custom_id ||
      ''
    )
      .trim()
      .toLowerCase()

    if (!buyerEmail || !buyerEmail.includes('@')) {
      return NextResponse.json(
        { error: 'No se encontró un email válido del comprador en el recurso de PayPal.' },
        { status: 400 }
      )
    }

    // Extraer nombre
    const givenName =
      resource.payer?.name?.given_name || resource.payer?.payer_info?.first_name || ''
    const surname =
      resource.payer?.name?.surname || resource.payer?.payer_info?.last_name || ''
    const buyerName = `${givenName} ${surname}`.trim() || null

    // Extraer ID de la transacción / captura
    const paymentId =
      resource.id ||
      resource.supplementary_data?.related_ids?.capture_id ||
      resource.supplementary_data?.related_ids?.order_id ||
      event.id ||
      `pp_manual_${Date.now()}`

    // Extraer importe para determinar el plan (14,99 € vs 99 €)
    const rawAmount =
      resource.amount?.value ||
      resource.seller_receivable_breakdown?.gross_amount?.value ||
      resource.gross_amount?.value ||
      '0'

    const amountNum = parseFloat(rawAmount)
    const amountCents = !isNaN(amountNum) && amountNum > 0 ? Math.round(amountNum * 100) : 1499

    const plan: LicensePlan =
      resource.custom_id === 'llave_en_mano_99' || amountNum >= 50
        ? 'llave_en_mano_99'
        : 'autoinstalable_15'

    // Emitir o recuperar la licencia única de forma idempotente en Supabase
    const { license, alreadyExisted } = await issueOrGetLicenseForPaymentSession({
      compradorEmail: buyerEmail,
      paymentSessionId: paymentId,
      plan,
    })

    // Enviar el email automático con Resend conteniendo la clave y el botón de Vercel en 1 clic
    const emailResult = await sendLicenseDeliveryEmail({
      buyerEmail: license.comprador_email,
      buyerName,
      licenseKey: license.license_key,
      plan: license.plan,
      amountCents,
      baseUrl: resolveBaseUrl(request),
    })

    return NextResponse.json({
      received: true,
      eventType,
      alreadyExisted,
      license: {
        id: license.id,
        licenseKey: license.license_key,
        compradorEmail: license.comprador_email,
        plan: license.plan,
        paymentId: license.stripe_session_id,
        activa: license.activa,
      },
      email: emailResult,
    })
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Error interno al procesar el webhook de PayPal.'
    console.error('[PayPal Webhook Error]:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
