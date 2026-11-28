import 'server-only'

import { calculateAvailableSlots } from '@/lib/calendar'
import { sendNoticeEmail } from '@/lib/email-service'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  addDaysToIsoDate,
  getZonedDateParts,
  sanitizeTimeZone,
  zonedDateTimeToUtc,
} from '@/lib/timezone'

export function publicAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (configured) return configured
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  return vercel ? `https://${vercel}` : 'http://localhost:3000'
}

export function formatDay(isoDate: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T12:00:00Z`))
}

/**
 * Se ha liberado tiempo el día de `startIso`: avisa a quien esperaba ese día y
 * tiene ya un hueco para su servicio. El primero que reserve se lo queda.
 * Nunca lanza: un fallo aquí no puede estropear la cancelación que lo provoca.
 */
export async function notifyWaitlist(startIso: string): Promise<number> {
  try {
    const db = getSupabaseAdmin()
    const { data: settings } = await db
      .from('business_settings')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!settings) return 0

    const tz = sanitizeTimeZone(settings.timezone)
    const date = getZonedDateParts(new Date(startIso), tz).isoDate
    const { data: waiting } = await db
      .from('waitlist')
      .select('id, email, service_id')
      .eq('fecha', date)
      .is('notified_at', null)
      .order('created_at', { ascending: true })
      .limit(50)
    if (!waiting?.length) return 0

    const from = zonedDateTimeToUtc(date, '00:00', tz).toISOString()
    const to = zonedDateTimeToUtc(addDaysToIsoDate(date, 1), '00:00', tz).toISOString()
    const [services, appointments, blocks] = await Promise.all([
      db.from('services').select('id, nombre, duracion_minutos').eq('activo', true),
      db
        .from('appointments')
        .select('fecha_hora_inicio, fecha_hora_fin, estado')
        .neq('estado', 'cancelada')
        .lt('fecha_hora_inicio', to)
        .gt('fecha_hora_fin', from),
      db.from('blocked_slots').select('fecha_inicio, fecha_fin').lt('fecha_inicio', to).gt('fecha_fin', from),
    ])
    if (services.error || appointments.error || blocks.error) return 0

    let notified = 0
    for (const entry of waiting) {
      const service = services.data.find((s) => s.id === entry.service_id)
      if (!service) continue
      const hasSlot = calculateAvailableSlots({
        date,
        serviceDurationMinutes: service.duracion_minutos,
        settings,
        appointments: appointments.data,
        blockedSlots: blocks.data,
      }).some((slot) => slot.isAvailable)
      if (!hasSlot) continue

      // Reclamo atómico: dos cancelaciones a la vez no envían dos avisos
      const { data: claimed } = await db
        .from('waitlist')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', entry.id)
        .is('notified_at', null)
        .select('id')
      if (!claimed?.length) continue

      const sent = await sendNoticeEmail({
        to: entry.email,
        businessName: settings.nombre_negocio,
        subject: `Hay un hueco libre el ${formatDay(date)} en ${settings.nombre_negocio}`,
        title: 'Se ha liberado un hueco',
        paragraphs: [
          'Hola, nos pediste que te avisáramos si quedaba sitio.',
          `Ya hay sitio para ${service.nombre} el ${formatDay(date)}. Es para quien reserve primero.`,
        ],
        actions: [
          { label: 'Reservar ahora', url: `${publicAppUrl()}/reservar?serviceId=${encodeURIComponent(service.id)}` },
        ],
      })
      if (sent) notified += 1
      else await db.from('waitlist').update({ notified_at: null }).eq('id', entry.id)
    }
    return notified
  } catch (err) {
    console.error('[notifyWaitlist] Error:', err)
    return 0
  }
}
