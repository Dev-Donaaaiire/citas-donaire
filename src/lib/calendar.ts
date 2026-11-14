import type { Appointment, BlockedSlot, BusinessSettings, TimeSlot } from '@/types/booking'
import { buildGoogleCalendarTemplateUrl, generateIcsContent } from '@/lib/ics'

const DIAS_MAP: Record<number, string> = {
  0: 'domingo',
  1: 'lunes',
  2: 'martes',
  3: 'miercoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sabado',
}

/**
 * Convierte un objeto Date a string YYYY-MM-DD local
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parsea string HH:mm o HH:mm:ss a minutos desde medianoche
 */
export function timeStringToMinutes(timeStr: string): number {
  const parts = timeStr.split(':')
  const hours = parseInt(parts[0] || '0', 10)
  const minutes = parseInt(parts[1] || '0', 10)
  return hours * 60 + minutes
}

/**
 * Convierte minutos desde medianoche a formato HH:mm
 */
export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Comprueba si dos intervalos de tiempo se solapan
 */
export function isOverlapping(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && endA > startB
}

/**
 * Calcula los slots de tiempo disponibles para una fecha y duración dada,
 * cruzando con business_settings, appointments activos y blocked_slots.
 */
export function calculateAvailableSlots({
  targetDate,
  durationMinutes,
  settings,
  appointments,
  blockedSlots,
}: {
  targetDate: Date
  durationMinutes: number
  settings: BusinessSettings | null
  appointments: Appointment[]
  blockedSlots: BlockedSlot[]
}): TimeSlot[] {
  const dayOfWeekIndex = targetDate.getDay()
  const dayName = DIAS_MAP[dayOfWeekIndex]

  // Configuración por defecto si no viene de la base de datos
  const diasLaborables = Array.isArray(settings?.dias_laborables)
    ? (settings.dias_laborables as string[])
    : ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

  const isClosedDay = !diasLaborables.includes(dayName)

  if (isClosedDay) {
    return []
  }

  const openingMinutes = timeStringToMinutes(settings?.horario_apertura || '09:00:00')
  const closingMinutes = timeStringToMinutes(settings?.horario_cierre || '20:00:00')

  // Paso entre slots (30 minutos o la duración si es menor)
  const stepMinutes = Math.min(30, durationMinutes)

  const slots: TimeSlot[] = []
  const now = new Date()

  // Filtramos citas activas (no canceladas) para no iterar en vacío
  const activeAppointments = appointments.filter((app) => app.estado !== 'cancelada')

  for (
    let currentMin = openingMinutes;
    currentMin + durationMinutes <= closingMinutes;
    currentMin += stepMinutes
  ) {
    const timeLabel = minutesToTimeString(currentMin)
    const endMinutes = currentMin + durationMinutes
    const endTimeLabel = minutesToTimeString(endMinutes)

    const [startH, startM] = timeLabel.split(':').map(Number)
    const [endH, endM] = endTimeLabel.split(':').map(Number)

    const slotStartDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      startH,
      startM,
      0,
      0
    )

    const slotEndDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      endH,
      endM,
      0,
      0
    )

    // 1. ¿Está en el pasado?
    if (slotStartDate <= now) {
      slots.push({
        time: timeLabel,
        datetime: slotStartDate.toISOString(),
        endDatetime: slotEndDate.toISOString(),
        isAvailable: false,
        reason: 'past',
      })
      continue
    }

    // 2. ¿Solapa con alguna cita activa?
    const hasApptCollision = activeAppointments.some((appt) => {
      const apptStart = new Date(appt.fecha_hora_inicio)
      const apptEnd = new Date(appt.fecha_hora_fin)
      return isOverlapping(slotStartDate, slotEndDate, apptStart, apptEnd)
    })

    if (hasApptCollision) {
      slots.push({
        time: timeLabel,
        datetime: slotStartDate.toISOString(),
        endDatetime: slotEndDate.toISOString(),
        isAvailable: false,
        reason: 'booked',
      })
      continue
    }

    // 3. ¿Solapa con algún bloqueo de horario / día?
    const hasBlockedCollision = blockedSlots.some((block) => {
      const blockStart = new Date(block.fecha_inicio)
      const blockEnd = new Date(block.fecha_fin)
      return isOverlapping(slotStartDate, slotEndDate, blockStart, blockEnd)
    })

    if (hasBlockedCollision) {
      slots.push({
        time: timeLabel,
        datetime: slotStartDate.toISOString(),
        endDatetime: slotEndDate.toISOString(),
        isAvailable: false,
        reason: 'blocked',
      })
      continue
    }

    // Si pasa todas las validaciones, está libre
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
 * Obtiene los días del mes para el calendario (formato Lunes a Domingo)
 */
export function getMonthDaysGrid(year: number, monthIndex: number) {
  const firstDayOfMonth = new Date(year, monthIndex, 1)
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0)
  const totalDays = lastDayOfMonth.getDate()

  // Día de la semana del primer día (0 = Domingo, 1 = Lunes, etc.)
  // Lo convertimos a Lunes = 0, Domingo = 6
  let firstDayWeekday = firstDayOfMonth.getDay() - 1
  if (firstDayWeekday === -1) firstDayWeekday = 6

  const days: (Date | null)[] = []

  // Relleno de días en blanco antes del primer día
  for (let i = 0; i < firstDayWeekday; i++) {
    days.push(null)
  }

  // Días del mes
  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(year, monthIndex, d))
  }

  return days
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
  location?: string
  startDate: Date
  endDate: Date
}): string {
  return buildGoogleCalendarTemplateUrl({
    title,
    description,
    location,
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
  url,
  filename = 'cita-donaire.ics',
}: {
  title: string
  description: string
  location?: string
  startDate: Date
  endDate: Date
  url?: string
  filename?: string
}) {
  const icsContent = generateIcsContent({
    title,
    description,
    location,
    startDate,
    endDate,
    url,
    method: 'PUBLISH',
  })

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}
