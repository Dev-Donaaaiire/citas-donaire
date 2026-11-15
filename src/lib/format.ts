import {
  DEFAULT_BUSINESS_TIMEZONE,
  getZonedDateParts,
  sanitizeTimeZone,
  zonedDateTimeToUtc,
} from '@/lib/timezone'

/**
 * Formatea una fecha a YYYY-MM-DD según la zona horaria del negocio
 */
export function formatDateKey(
  dateInput: Date | string,
  timeZone: string | null = DEFAULT_BUSINESS_TIMEZONE
): string {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim()
  }
  return getZonedDateParts(dateInput, timeZone).isoDate
}

/**
 * Formatea importes monetarios en EUR con formato español
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formatea hora HH:mm en la zona horaria del negocio
 */
export function formatTime(
  isoString: string,
  timeZone: string | null = DEFAULT_BUSINESS_TIMEZONE
): string {
  try {
    const d = new Date(isoString)
    if (Number.isNaN(d.getTime())) return '--:--'
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: sanitizeTimeZone(timeZone),
    }).format(d)
  } catch {
    return '--:--'
  }
}

function resolveDateForDisplay(
  dateInput: string | Date,
  timeZone: string
): Date {
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return zonedDateTimeToUtc(trimmed, '12:00', timeZone)
    }
    return new Date(trimmed)
  }
  return dateInput
}

/**
 * Formatea fecha larga en español respetando la zona horaria del negocio
 */
export function formatDateFull(
  dateInput: string | Date,
  timeZone: string | null = DEFAULT_BUSINESS_TIMEZONE
): string {
  try {
    const tz = sanitizeTimeZone(timeZone)
    const d = resolveDateForDisplay(dateInput, tz)
    if (Number.isNaN(d.getTime())) return 'Fecha inválida'
    const formatted = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: tz,
    }).format(d)
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  } catch {
    return 'Fecha inválida'
  }
}

/**
 * Formatea fecha corta en español (ej. "15 nov")
 */
export function formatDateShort(
  dateInput: string | Date,
  timeZone: string | null = DEFAULT_BUSINESS_TIMEZONE
): string {
  try {
    const tz = sanitizeTimeZone(timeZone)
    const d = resolveDateForDisplay(dateInput, tz)
    if (Number.isNaN(d.getTime())) return '--'
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      timeZone: tz,
    }).format(d)
  } catch {
    return '--'
  }
}

/**
 * Calcula los días transcurridos desde la última visita
 */
export function getDaysSince(dateInput: string | null | undefined): number {
  if (!dateInput) return 999
  try {
    const d = new Date(dateInput)
    if (Number.isNaN(d.getTime())) return 999
    const diffMs = Date.now() - d.getTime()
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  } catch {
    return 999
  }
}

/**
 * Texto descriptivo de hace cuántos días fue la visita
 */
export function formatRelativeDays(dateInput: string | null | undefined): string {
  const days = getDaysSince(dateInput)
  if (days >= 999) return 'Sin visitas previas'
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}
