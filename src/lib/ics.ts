export interface IcsEventInput {
  uid?: string
  title: string
  description: string
  location?: string
  startDate: Date | string
  endDate: Date | string
  url?: string
  organizerName?: string
  organizerEmail?: string
  method?: 'PUBLISH' | 'REQUEST'
}

export interface BookingCalendarInput {
  appointmentId: string
  tokenCancelacion: string
  businessName: string
  serviceName: string
  servicePrice: number
  durationMinutes: number
  clientName: string
  clientEmail: string
  clientPhone?: string | null
  startIso: string
  endIso: string
  baseUrl: string
}

export interface BookingCalendarAssets {
  icsContent: string
  icsFilename: string
  googleCalendarUrl: string
  cancelUrl: string
}

function toIcsUtcDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

/**
 * Genera dinámicamente en memoria un archivo .ics estándar RFC 5545
 * compatible con Apple Calendar, Google Calendar y Microsoft Outlook.
 */
export function generateIcsContent(input: IcsEventInput): string {
  const uid = input.uid || `krono-${Date.now()}@donairecitas.pro`
  const method = input.method || 'REQUEST'
  const dtStamp = toIcsUtcDate(new Date())
  const dtStart = toIcsUtcDate(input.startDate)
  const dtEnd = toIcsUtcDate(input.endDate)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Krono Donaire Citas//ES',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
    `LOCATION:${escapeIcsText(input.location || 'Donaire Salon & Styling')}`,
  ]

  if (input.organizerEmail) {
    const cn = input.organizerName ? `;CN=${escapeIcsText(input.organizerName)}` : ''
    lines.push(`ORGANIZER${cn}:mailto:${input.organizerEmail}`)
  }

  if (input.url) {
    lines.push(`URL:${input.url}`)
  }

  lines.push('STATUS:CONFIRMED', 'SEQUENCE:0', 'END:VEVENT', 'END:VCALENDAR')

  return lines.join('\r\n')
}

/**
 * Genera la URL directa de plantilla de Google Calendar
 */
export function buildGoogleCalendarTemplateUrl({
  title,
  description,
  location,
  startDate,
  endDate,
}: {
  title: string
  description: string
  location?: string
  startDate: Date | string
  endDate: Date | string
}): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toIcsUtcDate(startDate)}/${toIcsUtcDate(endDate)}`,
    details: description,
    location: location || 'Donaire Salon & Styling',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Genera todos los artefactos de calendario para una reserva confirmada
 * (archivo .ics en memoria, URL de Google Calendar y URL de cancelación por token).
 */
export function generateBookingCalendarAssets(
  input: BookingCalendarInput
): BookingCalendarAssets {
  const cleanBaseUrl = input.baseUrl.replace(/\/$/, '')
  const cancelUrl = `${cleanBaseUrl}/cancelar?token=${encodeURIComponent(
    input.tokenCancelacion
  )}`

  const formattedPrice = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(input.servicePrice)

  const title = `${input.serviceName} · ${input.businessName}`
  const location = `${input.businessName} · Calle Serrano 45, Madrid`

  const descriptionLines = [
    `Negocio: ${input.businessName}`,
    `Servicio: ${input.serviceName} (${input.durationMinutes} min · ${formattedPrice})`,
    `Cliente: ${input.clientName}`,
    `Email: ${input.clientEmail}`,
    input.clientPhone ? `Teléfono: ${input.clientPhone}` : null,
    `Cancelar o cambiar cita: ${cancelUrl}`,
  ].filter(Boolean) as string[]

  const description = descriptionLines.join('\n')

  const icsContent = generateIcsContent({
    uid: `appt-${input.appointmentId}@donairecitas.pro`,
    title,
    description,
    location,
    startDate: input.startIso,
    endDate: input.endIso,
    url: cancelUrl,
    organizerName: input.businessName,
    method: 'REQUEST',
  })

  const googleCalendarUrl = buildGoogleCalendarTemplateUrl({
    title,
    description,
    location,
    startDate: input.startIso,
    endDate: input.endIso,
  })

  const safeSlug = input.serviceName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return {
    icsContent,
    icsFilename: `cita-${safeSlug || 'reserva'}.ics`,
    googleCalendarUrl,
    cancelUrl,
  }
}
