import { NextRequest, NextResponse } from 'next/server'
import { checkPersistentRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit'
import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase-admin'
import { addDaysToIsoDate, getTodayIsoInTimeZone, sanitizeTimeZone } from '@/lib/timezone'
import { MAX_BOOKING_DAYS_AHEAD } from '@/lib/calendar'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_PENDING_PER_EMAIL = 5

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseAdminConfig()) return fail('La lista de espera no está disponible.', 503)

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const text = (key: string) => (typeof body[key] === 'string' ? (body[key] as string).trim() : '')
    if (text('website')) return fail('No se pudo procesar la solicitud.')

    const limit = await checkPersistentRateLimit({
      key: `waitlist:${getClientIp(request)}`,
      maxRequests: 5,
      windowSeconds: 10 * 60,
    })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Espera unos minutos.' },
        { status: 429, headers: rateLimitHeaders(limit) }
      )
    }

    const nombre = text('nombre')
    const email = text('email').toLowerCase()
    const serviceId = text('serviceId')
    const date = text('date')
    if (nombre.length < 2 || nombre.length > 120) return fail('Introduce tu nombre.')
    if (!EMAIL_REGEX.test(email) || email.length > 180) return fail('Introduce un correo válido.')
    if (!UUID_REGEX.test(serviceId)) return fail('Servicio no válido.')

    const db = getSupabaseAdmin()
    const [{ data: settings }, { data: service }] = await Promise.all([
      db.from('business_settings').select('timezone').order('created_at', { ascending: true }).limit(1).maybeSingle(),
      db.from('services').select('id').eq('id', serviceId).eq('activo', true).maybeSingle(),
    ])
    if (!service) return fail('Servicio no válido.')

    const today = getTodayIsoInTimeZone(sanitizeTimeZone(settings?.timezone))
    const last = addDaysToIsoDate(today, MAX_BOOKING_DAYS_AHEAD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || date < today || date > last) {
      return fail('Elige una fecha válida.')
    }

    const { data: pending, error: pendingError } = await db
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .is('notified_at', null)
      .gte('fecha', today)
    if (pendingError) return fail('La lista de espera no está disponible.', 503)
    if (pending.length >= MAX_PENDING_PER_EMAIL) {
      return fail('Ya estás en la lista para varias fechas.', 409)
    }

    const { error } = await db
      .from('waitlist')
      .insert({ service_id: serviceId, nombre, email, fecha: date })
    // Repetir la misma inscripción no es un error para el cliente
    if (error && error.code !== '23505') return fail('No se pudo apuntarte. Inténtalo de nuevo.', 500)

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('[api/waitlist] Error:', err)
    return fail('No se pudo apuntarte. Inténtalo de nuevo.', 500)
  }
}
