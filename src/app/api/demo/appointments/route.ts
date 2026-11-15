import { NextRequest, NextResponse } from 'next/server'
import { isDbDemoModeActive } from '@/lib/demo-guard'
import { updateAppointmentStatusServer } from '@/lib/data/admin-dashboard'
import {
  DEMO_SANDBOX_COOKIE_NAME,
  updateDemoSandboxAppointmentStatus,
} from '@/lib/demo-sandbox'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ALLOWED_STATUSES = new Set([
  'confirmada',
  'cancelada',
  'completada',
  'no_show',
])

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      appointmentId?: string
      estado?: string
    }

    const appointmentId =
      typeof body.appointmentId === 'string' ? body.appointmentId.trim() : ''
    const estado = typeof body.estado === 'string' ? body.estado.trim() : ''

    if (!UUID_REGEX.test(appointmentId) || !ALLOWED_STATUSES.has(estado)) {
      return NextResponse.json(
        { error: 'Datos de cita o estado inválidos.' },
        { status: 400 }
      )
    }

    if (!(await isDbDemoModeActive())) {
      const deltaCookie = request.cookies.get(DEMO_SANDBOX_COOKIE_NAME)?.value
      const updateResult = updateDemoSandboxAppointmentStatus(
        appointmentId,
        estado as 'confirmada' | 'cancelada' | 'completada' | 'no_show',
        deltaCookie
      )

      const response = NextResponse.json({
        success: true,
        sandbox: true,
      })

      response.cookies.set(
        DEMO_SANDBOX_COOKIE_NAME,
        updateResult.serializedCookie,
        {
          path: '/',
          httpOnly: false,
          sameSite: 'lax',
          maxAge: 86400 * 7,
        }
      )

      return response
    }

    const result = await updateAppointmentStatusServer(
      appointmentId,
      estado as 'confirmada' | 'cancelada' | 'completada' | 'no_show'
    )
    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/demo/appointments][PATCH] Error:', err)
    return NextResponse.json(
      { error: 'Error actualizando la cita demo.' },
      { status: 500 }
    )
  }
}
