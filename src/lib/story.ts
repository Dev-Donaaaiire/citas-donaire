import { calculateAvailableSlots } from '@/lib/calendar'
import { addDaysToIsoDate, getTodayIsoInTimeZone, sanitizeTimeZone } from '@/lib/timezone'
import type { PublicBookingInitialData } from '@/lib/data/public-booking'
import type { ThemeId } from '@/lib/themes'

export const STORY_WIDTH = 1080
export const STORY_HEIGHT = 1920
const MAX_TIMES = 12

export type StoryDay = 'today' | 'tomorrow'

export function storyDateIso(day: StoryDay, timezone: string, now = new Date()): string {
  const today = getTodayIsoInTimeZone(sanitizeTimeZone(timezone), now)
  return day === 'today' ? today : addDaysToIsoDate(today, 1)
}

/** Horas libres en las que cabe al menos el servicio más corto. */
export function freeTimes(
  data: Pick<PublicBookingInitialData, 'settings' | 'services' | 'busyIntervals'>,
  dateIso: string,
  now = new Date()
): string[] {
  const durations = data.services.map((s) => s.duracion_minutos)
  if (durations.length === 0) return []
  return calculateAvailableSlots({
    date: dateIso,
    serviceDurationMinutes: Math.min(...durations),
    settings: data.settings,
    busyIntervals: data.busyIntervals,
    now,
  })
    .filter((slot) => slot.isAvailable)
    .map((slot) => slot.time)
}

const PALETTES: Record<ThemeId, { bg: string; card: string; text: string; muted: string; accent: string }> = {
  dark_luxury: { bg: '#09090b', card: '#18181b', text: '#f4f1e8', muted: '#a8a394', accent: '#c9a227' },
  clean_minimal: { bg: '#f7f6f4', card: '#ffffff', text: '#18181b', muted: '#6b675f', accent: '#18181b' },
  neon_creator: { bg: '#05070d', card: '#0d1424', text: '#eaf2ff', muted: '#8fa3c4', accent: '#22d3ee' },
}

export function drawStory(
  canvas: HTMLCanvasElement,
  options: {
    businessName: string
    theme: ThemeId
    dateIso: string
    day: StoryDay
    times: string[]
    bookingUrl: string
  }
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = STORY_WIDTH
  canvas.height = STORY_HEIGHT
  const colors = PALETTES[options.theme] ?? PALETTES.dark_luxury
  const font = (size: number, weight = 600) =>
    `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
  const center = STORY_WIDTH / 2
  const write = (text: string, y: number, size: number, color: string, weight?: number) => {
    ctx.fillStyle = color
    ctx.font = font(size, weight)
    ctx.fillText(text, center, y, STORY_WIDTH - 140)
  }

  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Instagram tapa los ~250 px superiores e inferiores: el contenido queda dentro
  write(options.businessName, 300, 54, colors.muted)
  write(options.day === 'today' ? 'Huecos libres hoy' : 'Huecos libres mañana', 420, 84, colors.text, 800)
  const date = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${options.dateIso}T12:00:00Z`))
  write(date, 520, 46, colors.accent)

  const shown = options.times.slice(0, MAX_TIMES)
  shown.forEach((time, index) => {
    const x = 150 + (index % 3) * 280
    const y = 640 + Math.floor(index / 3) * 170
    ctx.fillStyle = colors.card
    ctx.beginPath()
    ctx.roundRect(x, y, 220, 120, 28)
    ctx.fill()
    ctx.strokeStyle = colors.accent
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = colors.text
    ctx.font = font(52, 700)
    ctx.fillText(time, x + 110, y + 62)
  })

  const rest = options.times.length - shown.length
  if (rest > 0) write(`y ${rest} horas más`, 1360, 42, colors.muted)
  write('Reserva en 30 segundos', 1520, 52, colors.text, 700)
  write(options.bookingUrl, 1610, 40, colors.accent)
}
