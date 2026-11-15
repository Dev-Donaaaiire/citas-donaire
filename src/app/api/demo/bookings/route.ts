import { after, NextRequest, NextResponse } from 'next/server'
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
import { isDbDemoModeActive } from '@/lib/demo-guard'
import {
  addDemoSandboxBooking,
  DEMO_SANDBOX_COOKIE_NAME,
  DEMO_SANDBOX_SERVICES,
  DEMO_SANDBOX_SETTINGS,
} from '@/lib/demo-sandbox'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as PublicBookingBody

    // Honeypot: rechazo sin tocar Supabase ni Resend
    if (isHoneypotTriggered(body)) {
      return NextResponse.json(
        { error: 'No se pudo procesar la solicitud.', code: 'BAD_REQUEST' },
        { status: 400 }
      )
    }

    const limited = await enforceBookingRateLimits(
      request,
      body.email,
      'demo-booking'
    )
    if (limited) return limited

    const demoDbActive = await isDbDemoModeActive()
    if (demoDbActive) {
      const baseUrl = resolveTrustedBaseUrl(request)
      const { result, emailJob } = await createServerBooking(
        toBookingInput(body, baseUrl, true)
      )

      if (emailJob) {
        after(() => dispatchBookingEmailJob(emailJob))
      }

      return NextResponse.json(result, { status: 201 })
    }

    // Modo producción / sandbox aislado: persistimos la reserva en el delta del sandbox
    const bodyStr = (value: unknown) =>
      typeof value === 'string' ? value : ''
    const nombre = bodyStr(body.nombre).trim()
    const email = bodyStr(body.email).trim().toLowerCase()
    const telefono = bodyStr(body.telefono).trim()
    const slotDatetime = bodyStr(body.slotDatetime).trim()

    const startDate = new Date(slotDatetime)
    if (
      nombre.length < 2 ||
      !email.includes('@') ||
      telefono.length < 6 ||
      Number.isNaN(startDate.getTime())
    ) {
      return NextResponse.json(
        { error: 'Completa todos los datos válidos para probar la reserva.' },
        { status: 400 }
      )
    }

    const deltaCookie = request.cookies.get(DEMO_SANDBOX_COOKIE_NAME)?.value
    const bookingResult = addDemoSandboxBooking(
      {
        serviceId: typeof body.serviceId === 'string' ? body.serviceId : undefined,
        nombre,
        email,
        telefono,
        notas: bodyStr(body.notas).trim() || null,
        slotDatetime,
      },
      deltaCookie
    )

    const response = NextResponse.json(
      {
        appointment: bookingResult.appointment,
        service: bookingResult.service,
        client: {
          id: bookingResult.client.id,
          nombre: bookingResult.client.nombre,
        },
        businessSettings: DEMO_SANDBOX_SETTINGS,
        rescheduled: false,
        sandbox: true,
        emailResult: {
          success: true,
          simulated: true,
          status: 'simulated',
          reason: 'sandbox_mode',
        },
      },
      { status: 201 }
    )

    response.cookies.set(DEMO_SANDBOX_COOKIE_NAME, bookingResult.serializedCookie, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 86400 * 7,
    })

    return response
  } catch (err) {
    if (err instanceof BookingApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      )
    }

    console.error('[api/demo/bookings][POST] Error:', err)
    return NextResponse.json(
      { error: 'No se pudo completar la simulación de reserva.' },
      { status: 500 }
    )
  }
}
