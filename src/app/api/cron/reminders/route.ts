import { connection, NextRequest, NextResponse } from 'next/server'
import { sendNoticeEmail } from '@/lib/email-service'
import { formatTime } from '@/lib/format'
import { checkPersistentRateLimit, getClientIp } from '@/lib/rate-limit'
import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase-admin'
import {
  addDaysToIsoDate,
  getTodayIsoInTimeZone,
  sanitizeTimeZone,
  zonedDateTimeToUtc,
} from '@/lib/timezone'
import { formatDay, publicAppUrl } from '@/lib/waitlist'

/**
 * Recordatorio del día antes (lo lanza el cron de vercel.json). Es seguro
 * repetirlo: cada cita se reclama antes de enviar y solo se avisa una vez.
 * Si se define CRON_SECRET, además se exige.
 */
export async function GET(request: NextRequest) {
  await connection()
  try {
    const secret = process.env.CRON_SECRET?.trim()
    if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }
    const limit = await checkPersistentRateLimit({
      key: `cron-reminders:${getClientIp(request)}`,
      maxRequests: 10,
      windowSeconds: 60 * 60,
    })
    if (!limit.allowed) return NextResponse.json({ error: 'Demasiadas llamadas.' }, { status: 429 })
    if (!hasSupabaseAdminConfig()) return NextResponse.json({ sent: 0 })

    const db = getSupabaseAdmin()
    const { data: settings } = await db
      .from('business_settings')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!settings) return NextResponse.json({ sent: 0 })

    const tz = sanitizeTimeZone(settings.timezone)
    const today = getTodayIsoInTimeZone(tz)
    const tomorrow = addDaysToIsoDate(today, 1)

    // Limpieza: la lista de espera no conserva fechas pasadas
    await db.from('waitlist').delete().lt('fecha', today)

    const { data: appointments, error } = await db
      .from('appointments')
      .select('id, fecha_hora_inicio, token_cancelacion, client:clients(nombre, email), service:services(nombre)')
      .eq('estado', 'confirmada')
      .is('recordatorio_enviado_at', null)
      .gte('fecha_hora_inicio', zonedDateTimeToUtc(tomorrow, '00:00', tz).toISOString())
      .lt('fecha_hora_inicio', zonedDateTimeToUtc(addDaysToIsoDate(tomorrow, 1), '00:00', tz).toISOString())
      .limit(100)
    if (error) throw new Error(error.message)

    let sent = 0
    for (const row of appointments) {
      const client = row.client as unknown as { nombre: string; email: string | null } | null
      const service = row.service as unknown as { nombre: string } | null
      if (!client?.email || client.email.endsWith('@citas.local')) continue

      const { data: claimed } = await db
        .from('appointments')
        .update({ recordatorio_enviado_at: new Date().toISOString() })
        .eq('id', row.id)
        .is('recordatorio_enviado_at', null)
        .select('id')
      if (!claimed?.length) continue

      const manageUrl = `${publicAppUrl()}/cancelar?token=${encodeURIComponent(row.token_cancelacion)}`
      const time = formatTime(row.fecha_hora_inicio, tz)
      const delivered = await sendNoticeEmail({
        to: client.email,
        businessName: settings.nombre_negocio,
        subject: `Mañana a las ${time}: tu cita en ${settings.nombre_negocio}`,
        title: 'Tu cita es mañana',
        paragraphs: [
          `Hola ${client.nombre}, te esperamos el ${formatDay(tomorrow)} a las ${time}.`,
          `Servicio: ${service?.nombre || 'tu cita'}.`,
        ],
        actions: [
          { label: 'Confirmo que voy', url: manageUrl },
          { label: 'No puedo ir', url: manageUrl },
        ],
      })
      if (delivered) sent += 1
      else await db.from('appointments').update({ recordatorio_enviado_at: null }).eq('id', row.id)
    }

    return NextResponse.json({ sent })
  } catch (err) {
    console.error('[api/cron/reminders] Error:', err)
    return NextResponse.json({ error: 'No se pudieron enviar los recordatorios.' }, { status: 500 })
  }
}
