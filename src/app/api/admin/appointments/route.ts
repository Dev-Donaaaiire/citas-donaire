import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin-auth'
import { updateAppointmentStatusServer } from '@/lib/data/admin-dashboard'

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
    const auth = await requireAdminSession()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = (await request.json().catch(() => ({}))) as {
      appointmentId?: string
      estado?: string
    }

    const appointmentId =
      typeof body.appointmentId === 'string' ? body.appointmentId.trim() : ''
    const estado = typeof body.estado === 'string' ? body.estado.trim() : ''

    if (!UUID_REGEX.test(appointmentId) || !ALLOWED_STATUSES.has(estado)) {
      return NextResponse.json(
        { error: 'Identificador de cita o estado inválido.' },
        { status: 400 }
      )
    }

    const result = await updateAppointmentStatusServer(
      appointmentId,
      estado as 'confirmada' | 'cancelada' | 'completada' | 'no_show'
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/admin/appointments][PATCH] Error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'No se pudo actualizar la cita.',
      },
      { status: 500 }
    )
  }
}
