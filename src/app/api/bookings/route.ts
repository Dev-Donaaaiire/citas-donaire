import { NextRequest, NextResponse } from 'next/server'
import {
  BookingApiError,
  createServerBooking,
  dispatchBookingEmailJob,
} from '@/lib/booking-server'
import {
  enforceBookingRateLimits,
  isHoneypotTriggered,
  resolveTrustedBaseUrl,
  toBookingInput,
  type PublicBookingBody,
} from '@/lib/booking-request'
import { hasSupabaseAdminConfig } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        {
          error:
            'El servidor aún no tiene configurada la variable SUPABASE_SERVICE_ROLE_KEY.',
          code: 'SERVER_UNCONFIGURED',
        },
        { status: 503 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as PublicBookingBody

    // Honeypot: rechazo sin tocar Supabase ni Resend
    if (isHoneypotTriggered(body)) {
      return NextResponse.json(
        { error: 'No se pudo procesar la solicitud.', code: 'BAD_REQUEST' },
        { status: 400 }
      )
    }

    const limited = await enforceBookingRateLimits(request, body.email, 'booking')
    if (limited) return limited

    const baseUrl = resolveTrustedBaseUrl(request)
    const { result, emailJob } = await createServerBooking(
      toBookingInput(body, baseUrl, false)
    )

    // Envío síncrono fiable para asegurar la entrega en Vercel Serverless
    if (emailJob) {
      await dispatchBookingEmailJob(emailJob)
    }

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof BookingApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      )
    }

    console.error('[api/bookings][POST] Error inesperado:', err)
    return NextResponse.json(
      { error: 'Error inesperado procesando tu reserva.' },
      { status: 500 }
    )
  }
}
