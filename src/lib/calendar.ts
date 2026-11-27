import type {
  Appointment,
  BlockedSlot,
  BusinessPublicSettings,
  PublicBusyInterval,
  TimeSlot,
} from '@/types/booking'
import { buildGoogleCalendarTemplateUrl, generateIcsContent } from '@/lib/ics'
import {
  DEFAULT_BUSINESS_TIMEZONE,
  getZonedDateParts,
  getZonedDayOfWeek,
  normalizeWorkingDays,
  sanitizeTimeZone,
  zonedDateTimeToUtc,
} from '@/lib/timezone'

/**
 * Formatea una fecha a YYYY-MM-DD según la zona horaria del negocio
 */
export function formatDateKey(
  date: Date | string,
  timeZone: string | null = DEFAULT_BUSINESS_TIMEZONE
): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return date.trim()
  }
  return getZonedDateParts(date, timeZone).isoDate
}

/**
 * Convierte cadena HH:mm o HH:mm:ss a minutos desde medianoche
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours = 0, minutes = 0] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convierte minutos desde medianoche a cadena HH:mm
 */
export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Verifica si dos intervalos de tiempo [startA, endA) y [startB, endB) se solapan
 */
export function isOverlapping(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && endA > startB
}

type SettingsForSlots = Pick<
  BusinessPublicSettings,
  'horario_apertura' | 'horario_cierre' | 'dias_laborables' | 'duracion_cita_minutos'
> & {
  timezone?: string | null
}

/** Antelación máxima admitida para una reserva pública. */
export const MAX_BOOKING_DAYS_AHEAD = 180

/**
 * Calcula los slots disponibles para un día concreto y duración de servicio,
 * interpretando siempre horarios y días en la zona horaria configurada del negocio.
 */
export function calculateAvailableSlots({
  date,
  serviceDurationMinutes,
  settings,
  busyIntervals,
  appointments,
  blockedSlots,
  now = new Date(),
}: {
  date: Date | string
  serviceDurationMinutes: number
  settings: SettingsForSlots
  busyIntervals?: PublicBusyInterval[]
  appointments?: Pick<Appointment, 'fecha_hora_inicio' | 'fecha_hora_fin' | 'estado'>[]
  blockedSlots?: Pick<BlockedSlot, 'fecha_inicio' | 'fecha_fin'>[]
  now?: Date
}): TimeSlot[] {
  const tz = sanitizeTimeZone(settings.timezone)
  const dateKey = formatDateKey(date, tz)
  const dayOfWeek = getZonedDayOfWeek(dateKey)

  const laborables = normalizeWorkingDays(settings.dias_laborables)

  if (!laborables.includes(dayOfWeek)) {
    return []
  }

  const openMin = timeStringToMinutes(settings.horario_apertura || '09:00')
  const closeMin = timeStringToMinutes(settings.horario_cierre || '20:00')
  const stepMin = Math.max(10, Number(settings.duracion_cita_minutos) || 30)
  const durationMinutes = Math.max(5, Number(serviceDurationMinutes) || stepMin)

  const slots: TimeSlot[] = []
  const todayKey = formatDateKey(now, tz)
  const isPastDay = dateKey < todayKey

  const dayStartUtc = zonedDateTimeToUtc(dateKey, '00:00', tz)
  const dayEndUtc = new Date(dayStartUtc.getTime() + 26 * 60 * 60 * 1000)

  const activeAppointmentRanges: { start: Date; end: Date }[] = []
  const blockedRanges: { start: Date; end: Date }[] = []

  if (busyIntervals && busyIntervals.length > 0) {
    for (const item of busyIntervals) {
      const start = new Date(item.inicio)
      const end = new Date(item.fin)
      if (!isOverlapping(start, end, dayStartUtc, dayEndUtc)) continue
      if (item.kind === 'blocked') {
        blockedRanges.push({ start, end })
      } else {
        activeAppointmentRanges.push({ start, end })
      }
    }
  }

  if (appointments && appointments.length > 0) {
    for (const a of appointments) {
      if (a.estado === 'cancelada') continue
      const start = new Date(a.fecha_hora_inicio)
      const end = new Date(a.fecha_hora_fin)
      if (isOverlapping(start, end, dayStartUtc, dayEndUtc)) {
        activeAppointmentRanges.push({ start, end })
      }
    }
  }

  if (blockedSlots && blockedSlots.length > 0) {
    for (const b of blockedSlots) {
      const start = new Date(b.fecha_inicio)
      const end = new Date(b.fecha_fin)
      if (isOverlapping(start, end, dayStartUtc, dayEndUtc)) {
        blockedRanges.push({ start, end })
      }
    }
  }

  // Pequeño margen mínimo de 15 minutos desde ahora si reservan para hoy
  const minThreshold = new Date(now.getTime() + 15 * 60_000)

  for (
    let currentMin = openMin;
    currentMin + durationMinutes <= closeMin;
    currentMin += stepMin
  ) {
    const timeLabel = minutesToTimeString(currentMin)
    const slotStartDate = zonedDateTimeToUtc(dateKey, timeLabel, tz)
    const slotEndDate = new Date(
      slotStartDate.getTime() + durationMinutes * 60_000
    )

    if (isPastDay || slotStartDate <= minThreshold) {
      slots.push({
        time: timeLabel,
        datetime: slotStartDate.toISOString(),
        endDatetime: slotEndDate.toISOString(),
        isAvailable: false,
        reason: 'past',
      })
      continue
    }

    const overlapsBlock = blockedRanges.some((range) =>
      isOverlapping(slotStartDate, slotEndDate, range.start, range.end)
    )

    if (overlapsBlock) {
      slots.push({
        time: timeLabel,
        datetime: slotStartDate.toISOString(),
        endDatetime: slotEndDate.toISOString(),
        isAvailable: false,
        reason: 'blocked',
      })
      continue
    }

    const overlapsAppointment = activeAppointmentRanges.some((range) =>
      isOverlapping(slotStartDate, slotEndDate, range.start, range.end)
    )

    if (overlapsAppointment) {
      slots.push({
        time: timeLabel,
        datetime: slotStartDate.toISOString(),
        endDatetime: slotEndDate.toISOString(),
        isAvailable: false,
        reason: 'booked',
      })
      continue
    }

    slots.push({
      time: timeLabel,
      datetime: slotStartDate.toISOString(),
      endDatetime: slotEndDate.toISOString(),
      isAvailable: true,
    })
  }

  return slots
}

/**
 * Obtiene los días del mes para el calendario (formato Lunes a Domingo),
 * representados al mediodía en la zona horaria del negocio para evitar desfases.
 */
export function getMonthDaysGrid(
  year: number,
  monthIndex: number,
  timeZone: string | null = DEFAULT_BUSINESS_TIMEZONE
): (Date | null)[] {
  const tz = sanitizeTimeZone(timeZone)
  const mm = String(monthIndex + 1).padStart(2, '0')
  const firstDayIso = `${year}-${mm}-01`
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()

  // Lunes = 0, Domingo = 6
  const startDayOfWeek = (getZonedDayOfWeek(firstDayIso) + 6) % 7
  const grid: (Date | null)[] = []

  for (let i = 0; i < startDayOfWeek; i++) {
    grid.push(null)
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dd = String(d).padStart(2, '0')
    grid.push(zonedDateTimeToUtc(`${year}-${mm}-${dd}`, '12:00', tz))
  }

  return grid
}

/**
 * Genera la URL para añadir a Google Calendar
 */
export function generateGoogleCalendarUrl({
  title,
  description,
  location,
  startDate,
  endDate,
}: {
  title: string
  description: string
  location?: string | null
  startDate: Date
  endDate: Date
}): string {
  return buildGoogleCalendarTemplateUrl({
    title,
    description,
    location: location || undefined,
    startDate,
    endDate,
  })
}

/**
 * Genera el archivo .ics para Outlook / Apple Calendar y desencadena la descarga
 */
export function downloadIcsFile({
  title,
  description,
  location,
  startDate,
  endDate,
  organizerName,
  organizerEmail,
}: {
  title: string
  description: string
  location?: string | null
  startDate: Date
  endDate: Date
  organizerName?: string
  organizerEmail?: string
}): void {
  const icsContent = generateIcsContent({
    title,
    description,
    location: location || undefined,
    startDate,
    endDate,
    organizerName,
    organizerEmail,
    method: 'PUBLISH',
  })

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'reserva-cita.ics'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
