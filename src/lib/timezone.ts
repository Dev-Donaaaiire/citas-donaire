export const DEFAULT_BUSINESS_TIMEZONE = 'Europe/Madrid'

export function sanitizeTimeZone(timeZone: string | null | undefined): string {
  const candidate = timeZone?.trim()
  if (!candidate) return DEFAULT_BUSINESS_TIMEZONE

  try {
    Intl.DateTimeFormat('es-ES', { timeZone: candidate }).format(new Date())
    return candidate
  } catch {
    return DEFAULT_BUSINESS_TIMEZONE
  }
}

export interface ZonedDateParts {
  year: number
  month: number // 1-12
  day: number // 1-31
  hour: number // 0-23
  minute: number // 0-59
  second: number // 0-59
  dayOfWeek: number // 0 (Dom) - 6 (Sáb)
  isoDate: string // YYYY-MM-DD
  hhmm: string // HH:mm
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function getZonedDateParts(
  input: Date | string,
  timeZone?: string | null
): ZonedDateParts {
  const tz = sanitizeTimeZone(timeZone)
  const date = typeof input === 'string' ? new Date(input) : input

  if (Number.isNaN(date.getTime())) {
    const fallback = new Date()
    return getZonedDateParts(fallback, tz)
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(date)
  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value
    }
  }

  const year = Number(map.year)
  const month = Number(map.month)
  const day = Number(map.day)
  const hour = Number(map.hour) % 24
  const minute = Number(map.minute)
  const second = Number(map.second)

  const dayOfWeek = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay()

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dayOfWeek,
    isoDate: `${year}-${pad2(month)}-${pad2(day)}`,
    hhmm: `${pad2(hour)}:${pad2(minute)}`,
  }
}

export function getTimeZoneOffsetMs(instant: Date, timeZone?: string | null): number {
  const parts = getZonedDateParts(instant, timeZone)
  const wallAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0
  )
  // Redondear a segundo entero para evitar desfase por milisegundos del instante origen
  const roundedInstant = Math.floor(instant.getTime() / 1000) * 1000
  return wallAsUtc - roundedInstant
}

/**
 * Convierte una fecha (YYYY-MM-DD) y hora (HH:mm) interpretadas en la zona
 * horaria del negocio a su instante exacto en UTC.
 */
export function zonedDateTimeToUtc(
  isoDate: string,
  hhmm: string,
  timeZone?: string | null
): Date {
  const tz = sanitizeTimeZone(timeZone)
  const [yStr, mStr, dStr] = isoDate.split('-')
  const [hStr, minStr] = hhmm.split(':')

  const year = Number(yStr)
  const month = Number(mStr)
  const day = Number(dStr)
  const hour = Number(hStr ?? 0)
  const minute = Number(minStr ?? 0)

  const nominalUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  const firstOffset = getTimeZoneOffsetMs(new Date(nominalUtcMs), tz)
  const firstGuess = nominalUtcMs - firstOffset
  const secondOffset = getTimeZoneOffsetMs(new Date(firstGuess), tz)

  return new Date(nominalUtcMs - secondOffset)
}

export function getTodayIsoInTimeZone(
  timeZone?: string | null,
  now: Date = new Date()
): string {
  return getZonedDateParts(now, timeZone).isoDate
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0))
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(
    shifted.getUTCDate()
  )}`
}

export function getZonedDayOfWeek(
  isoDate: string
): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay()
}

const WEEKDAY_STRING_MAP: Record<string, number> = {
  '0': 0,
  domingo: 0,
  dom: 0,
  sunday: 0,
  sun: 0,
  '1': 1,
  lunes: 1,
  lun: 1,
  monday: 1,
  mon: 1,
  '2': 2,
  martes: 2,
  mar: 2,
  tuesday: 2,
  tue: 2,
  '3': 3,
  miercoles: 3,
  mie: 3,
  wednesday: 3,
  wed: 3,
  '4': 4,
  jueves: 4,
  jue: 4,
  thursday: 4,
  thu: 4,
  '5': 5,
  viernes: 5,
  vie: 5,
  friday: 5,
  fri: 5,
  '6': 6,
  sabado: 6,
  sab: 6,
  saturday: 6,
  sat: 6,
}

/**
 * Normaliza dias_laborables aceptando tanto índices numéricos [1..6]
 * como nombres de días heredados (["lunes", "martes", ...]).
 */
export function normalizeWorkingDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) {
    return [1, 2, 3, 4, 5, 6]
  }
  if (raw.length === 0) {
    return []
  }

  const normalized = new Set<number>()
  for (const item of raw) {
    if (typeof item === 'number' && Number.isInteger(item) && item >= 0 && item <= 6) {
      normalized.add(item)
      continue
    }
    if (typeof item === 'string') {
      const key = item
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      if (key in WEEKDAY_STRING_MAP) {
        normalized.add(WEEKDAY_STRING_MAP[key])
      }
    }
  }

  return normalized.size > 0
    ? Array.from(normalized).sort((a, b) => a - b)
    : [1, 2, 3, 4, 5, 6]
}
