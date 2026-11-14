import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  issueOrGetLicenseForStripeSession,
  type LicensePlan,
} from '@/lib/license'
import { sendLicenseDeliveryEmail } from '@/lib/email-service'

interface StripeCheckoutSession {
  id?: string
  amount_total?: number | null
  currency?: string | null
  customer_email?: string | null
  customer_details?: {
    email?: string | null
    name?: string | null
  } | null
  metadata?: {
    plan?: string
    email?: string
    name?: string
  } | null
}

interface StripeWebhookEvent {
  id?: string
  type?: string
  data?: {
    object?: StripeCheckoutSession
  }
}

function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string
): { valid: boolean; reason?: string } {
  if (!signatureHeader) {
    return { valid: false, reason: 'Falta la cabecera stripe-signature.' }
  }

  const parts = signatureHeader.split(',').map((part) => part.trim())
  const timestampPart = parts.find((p) => p.startsWith('t='))
  const v1Signatures = parts
    .filter((p) => p.startsWith('v1='))
    .map((p) => p.slice(3))

  if (!timestampPart || v1Signatures.length === 0) {
    return { valid: false, reason: 'Formato de stripe-signature inválido.' }
  }

  const timestamp = Number(timestampPart.slice(2))
  if (!Number.isFinite(timestamp)) {
    return { valid: false, reason: 'Timestamp de firma inválido.' }
  }

  // Tolerancia estándar de Stripe: 5 minutos (300 s)
  const toleranceSeconds = 300
  const currentUnixSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(currentUnixSeconds - timestamp) > toleranceSeconds) {
    return {
      valid: false,
      reason: 'La firma del webhook de Stripe ha expirado (>5 min).',
    }
  }

  const signedPayload = `${timestamp}.${rawBody}`
  const expectedHex = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex')

  const expectedBuffer = Buffer.from(expectedHex, 'hex')

  const matched = v1Signatures.some((sig) => {
    try {
      const candidateBuffer = Buffer.from(sig, 'hex')
      if (candidateBuffer.length !== expectedBuffer.length) {
        return false
      }
      return crypto.timingSafeEqual(candidateBuffer, expectedBuffer)
    } catch {
      return false
    }
  })

  if (!matched) {
    return { valid: false, reason: 'La firma HMAC-SHA256 no coincide.' }
  }

  return { valid: true }
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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()

    // Verificar firma criptográfica si STRIPE_WEBHOOK_SECRET está configurado
    if (
      webhookSecret &&
      webhookSecret !== 'whsec_tu_webhook_secret_aqui' &&
      webhookSecret.startsWith('whsec_')
    ) {
      const signatureHeader = request.headers.get('stripe-signature')
      const verification = verifyStripeWebhookSignature(
        rawBody,
        signatureHeader,
        webhookSecret
      )
      if (!verification.valid) {
        return NextResponse.json(
          { error: verification.reason || 'Firma de Stripe inválida.' },
          { status: 400 }
        )
      }
    }

    let event: StripeWebhookEvent
    try {
      event = JSON.parse(rawBody) as StripeWebhookEvent
    } catch {
      return NextResponse.json(
        { error: 'Payload JSON del webhook mal formado.' },
        { status: 400 }
      )
    }

    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({
        received: true,
        ignored: true,
        eventType: event.type || 'unknown',
      })
    }

    const session = event.data?.object
    if (!session) {
      return NextResponse.json(
        { error: 'El evento checkout.session.completed no contiene data.object.' },
        { status: 400 }
      )
    }

    const buyerEmail = (
      session.customer_details?.email ||
      session.customer_email ||
      session.metadata?.email ||
      ''
    )
      .trim()
      .toLowerCase()

    if (!buyerEmail || !buyerEmail.includes('@')) {
      return NextResponse.json(
        { error: 'No se encontró un email válido del comprador en la sesión.' },
        { status: 400 }
      )
    }

    const buyerName =
      session.customer_details?.name || session.metadata?.name || null
    const stripeSessionId =
      typeof session.id === 'string' && session.id.trim()
        ? session.id.trim()
        : `cs_manual_${crypto.randomUUID()}`

    const amountTotal =
      typeof session.amount_total === 'number' ? session.amount_total : null

    const plan: LicensePlan =
      session.metadata?.plan === 'llave_en_mano_99' ||
      (amountTotal !== null && amountTotal >= 5000)
        ? 'llave_en_mano_99'
        : 'autoinstalable_15'

    const { license, alreadyExisted } = await issueOrGetLicenseForStripeSession(
      {
        compradorEmail: buyerEmail,
        stripeSessionId,
        plan,
      }
    )

    const emailResult = await sendLicenseDeliveryEmail({
      buyerEmail: license.comprador_email,
      buyerName,
      licenseKey: license.license_key,
      plan: license.plan,
      amountCents: amountTotal,
      baseUrl: resolveBaseUrl(request),
    })

    return NextResponse.json({
      received: true,
      eventType: event.type,
      alreadyExisted,
      license: {
        id: license.id,
        licenseKey: license.license_key,
        compradorEmail: license.comprador_email,
        plan: license.plan,
        stripeSessionId: license.stripe_session_id,
        activa: license.activa,
      },
      email: emailResult,
    })
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Error interno al procesar el webhook de Stripe.'
    console.error('[Stripe Webhook Error]:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
