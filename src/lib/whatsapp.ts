import { formatDateFull, formatTime } from '@/lib/format'

/**
 * Número en formato internacional sin "+", como lo exige wa.me. Los números de
 * 9 cifras que empiezan por 6, 7 o 9 se consideran españoles. null si no es claro.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  const raw = (phone ?? '').trim()
  const digits = raw.replace(/\D/g, '')
  if (raw.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? digits : null
  if (digits.startsWith('00')) return toWhatsAppNumber(`+${digits.slice(2)}`)
  if (/^[679]\d{8}$/.test(digits)) return `34${digits}`
  if (/^34[679]\d{8}$/.test(digits)) return digits
  return null
}

export function buildReminderMessage(input: {
  clientName: string
  serviceName: string
  startIso: string
  timezone: string
  businessName: string
  manageUrl: string
}): string {
  const firstName = input.clientName.trim().split(/\s+/)[0]
  const greeting = firstName && firstName !== 'Cliente' ? `Hola ${firstName}` : 'Hola'
  const date = formatDateFull(input.startIso, input.timezone).toLocaleLowerCase('es-ES')
  const time = formatTime(input.startIso, input.timezone)
  return `${greeting}, te recordamos tu cita de ${input.serviceName} el ${date} a las ${time} en ${input.businessName}. Si no puedes venir, cámbiala aquí: ${input.manageUrl}`
}

/** Sin número, WhatsApp deja elegir el contacto. */
export function buildWhatsAppUrl(number: string | null, message: string): string {
  return `https://wa.me/${number ?? ''}?text=${encodeURIComponent(message)}`
}
