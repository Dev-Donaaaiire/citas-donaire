import { connection, NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase-admin'
import {
  DEMO_CANCEL_TOKEN_PREFIX,
  getCancelAppointmentInitialData,
} from '@/lib/data/cancel-booking'
import { notifyWaitlist } from '@/lib/waitlist'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  await connection()
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim() || ''
    const { appointment, error, status } =
      await getCancelAppointmentInitialData(token)

    if (!appointment) {
      return NextResponse.json({ error }, { status })
    }

    return NextResponse.json({ appointment })
  } catch (err) {
    console.error('[api/bookings/cancel][GET] Error:', err)
    return NextResponse.json(
      { error: 'Error al consultar la cita.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      token?: string
    }
    const token = typeof body.token === 'string' ? body.token.trim() : ''

    if (!UUID_REGEX.test(token)) {
      return NextResponse.json(
        { error: 'Token de cancelación inválido.' },
        { status: 400 }
      )
    }

    if (token.startsWith(DEMO_CANCEL_TOKEN_PREFIX)) {
      return NextResponse.json({
        cancelled: true,
        id: 'sandbox-demo-apt',
        estado: 'cancelada',
        sandbox: true,
      })
    }

    const client = hasSupabaseAdminConfig() ? getSupabaseAdmin() : supabase
    const { data, error } = await client.rpc('cancel_appointment_by_token', {
      p_token: token,
    })

    if (error) {
      return NextResponse.json(
        { error: 'No se pudo procesar la cancelación de la cita.' },
        { status: 500 }
      )
    }

    const result = (data ?? {}) as {
      cancelled?: boolean
      reason?: string
      id?: string
      client_id?: string
      previous_estado?: string
      estado?: string
    }

    if (
      result.cancelled &&
      result.client_id &&
      result.previous_estado === 'confirmada' &&
      hasSupabaseAdminConfig()
    ) {
      const { error: counterErr } = await getSupabaseAdmin().rpc(
        'increment_client_appointments',
        { p_client_id: result.client_id, p_delta: -1 }
      )
      if (counterErr) {
        console.error(
          '[api/bookings/cancel][POST] Error ajustando total_citas:',
          counterErr
        )
      }
    }

    if (!result.cancelled) {
      if (result.reason === 'already_cancelled') {
        return NextResponse.json({
          cancelled: false,
          alreadyCancelled: true,
          estado: 'cancelada',
        })
      }

      return NextResponse.json(
        {
          error:
            result.reason === 'already_completed'
              ? 'Esta cita ya fue completada y no puede anularse.'
              : 'No se encontró ninguna cita activa asociada a este enlace.',
        },
        { status: result.reason === 'not_found' ? 404 : 409 }
      )
    }

    if (hasSupabaseAdminConfig() && result.id) {
      const { data: freed } = await getSupabaseAdmin()
        .from('appointments')
        .select('fecha_hora_inicio')
        .eq('id', result.id)
        .maybeSingle()
      if (freed) await notifyWaitlist(freed.fecha_hora_inicio)
    }

    return NextResponse.json({
      cancelled: true,
      id: result.id,
      estado: 'cancelada',
    })
  } catch (err) {
    console.error('[api/bookings/cancel][POST] Error:', err)
    return NextResponse.json(
      { error: 'Error inesperado al cancelar la cita.' },
      { status: 500 }
    )
  }
}
