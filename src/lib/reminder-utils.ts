/**
 * Genera el enlace directo a WhatsApp para reactivación de cliente en 1 clic
 */
export function generateWhatsAppReminderUrl({
  phone,
  clientName,
  businessName = 'Krono / Donaire Salon',
  bookingUrl = typeof window !== 'undefined' ? `${window.location.origin}/reservar` : 'https://donairecitas.pro/reservar',
}: {
  phone: string | null | undefined
  clientName: string
  businessName?: string
  bookingUrl?: string
}): string {
  if (!phone) return ''

  // Limpiar caracteres no numéricos excepto el signo +
  const cleanPhone = phone.replace(/[^0-9]/g, '')

  const firstName = clientName.trim().split(' ')[0] || clientName

  const message = `¡Hola ${firstName}! 💈 Han pasado más de 30 días desde tu última visita a ${businessName}. ¿Te gustaría renovar tu corte y estilo esta semana?\n\nPuedes elegir tu hueco en 30 segundos sin llamadas aquí 👇:\n${bookingUrl}`

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

/**
 * Genera el enlace directo mailto para reactivación de cliente
 */
export function generateEmailReminderUrl({
  email,
  clientName,
  businessName = 'Krono / Donaire Salon',
  bookingUrl = typeof window !== 'undefined' ? `${window.location.origin}/reservar` : 'https://donairecitas.pro/reservar',
}: {
  email: string
  clientName: string
  businessName?: string
  bookingUrl?: string
}): string {
  const firstName = clientName.trim().split(' ')[0] || clientName
  const subject = `💈 ${firstName}, ¿renovamos tu estilo esta semana? - ${businessName}`
  const body = `Hola ${firstName},\n\nHan pasado más de 30 días desde tu última visita en ${businessName} y nos gustaría saber cómo estás.\n\nPara que no tengas que preocuparte por esperas o llamadas, puedes reservar tu cita online directamente con tu estilista favorito en menos de un minuto:\n\n👉 Reserva aquí: ${bookingUrl}\n\n¡Esperamos verte pronto!\nEquipo de ${businessName}`

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
