import { NextRequest, NextResponse } from 'next/server'
import { DEMO_CANCEL_TOKEN_PREFIX } from '@/lib/data/cancel-booking'
import { checkPersistentRateLimit, getClientIp } from '@/lib/rate-limit'
import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase-admin'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** El cliente confirma asistencia. Es POST para que abrir el email no confirme solo. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { token?: unknown }
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    if (!UUID_REGEX.test(token)) {
      return NextResponse.json({ error: 'Enlace no válido.' }, { status: 400 })
    }
    if (token.startsWith(DEMO_CANCEL_TOKEN_PREFIX)) return NextResponse.json({ ok: true })

    const limit = await checkPersistentRateLimit({
      key: `confirm:${getClientIp(request)}`,
      maxRequests: 20,
      windowSeconds: 10 * 60,
    })
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
    }
    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json({ error: 'No disponible.' }, { status: 503 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from('appointments')
      .update({ confirmada_cliente_at: new Date().toISOString() })
      .eq('token_cancelacion', token)
      .eq('estado', 'confirmada')
      .gt('fecha_hora_inicio', new Date().toISOString())
      .select('id')
    if (error) throw new Error(error.message)
    if (!data.length) {
      return NextResponse.json({ error: 'Esta cita ya no se puede confirmar.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/bookings/confirm] Error:', err)
    return NextResponse.json({ error: 'No se pudo confirmar.' }, { status: 500 })
  }
}
