'use client'

import React from 'react'
import { MessageCircle } from 'lucide-react'
import type { Appointment } from '@/types/booking'
import { buildReminderMessage, buildWhatsAppUrl, toWhatsAppNumber } from '@/lib/whatsapp'

interface WhatsAppReminderButtonProps {
  appointment: Appointment
  timezone: string
  businessName: string
  isDemo: boolean
}

export function WhatsAppReminderButton({
  appointment,
  timezone,
  businessName,
  isDemo,
}: WhatsAppReminderButtonProps) {
  const number = toWhatsAppNumber(appointment.client?.telefono)
  if (!number) return null

  const open = () => {
    const message = buildReminderMessage({
      clientName: appointment.client?.nombre || 'Cliente',
      serviceName: appointment.service?.nombre || 'tu servicio',
      startIso: appointment.fecha_hora_inicio,
      timezone,
      businessName,
      manageUrl: `${window.location.origin}/cancelar?token=${encodeURIComponent(appointment.token_cancelacion)}`,
    })
    // En la demo los teléfonos son inventados: nunca se escribe a un número real
    window.open(
      buildWhatsAppUrl(isDemo ? null : number, message),
      '_blank',
      'noopener,noreferrer'
    )
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`Enviar recordatorio por WhatsApp a ${appointment.client?.nombre || 'cliente'}`}
      className="min-h-12 min-w-12 px-3 rounded-xl border border-white/10 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
    >
      <MessageCircle className="w-3.5 h-3.5" />
      <span>WhatsApp</span>
    </button>
  )
}
