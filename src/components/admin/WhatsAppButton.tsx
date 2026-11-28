'use client'

import React from 'react'
import { MessageCircle } from 'lucide-react'
import { buildWhatsAppUrl, toWhatsAppNumber } from '@/lib/whatsapp'

interface WhatsAppButtonProps {
  phone: string | null | undefined
  label: string
  ariaLabel: string
  /** Se llama al pulsar; recibe el origen para construir enlaces. */
  message: (origin: string) => string
  isDemo: boolean
}

export function WhatsAppButton({ phone, label, ariaLabel, message, isDemo }: WhatsAppButtonProps) {
  const number = toWhatsAppNumber(phone)
  if (!number) return null

  const open = () => {
    // En la demo los teléfonos son inventados: nunca se escribe a un número real
    window.open(
      buildWhatsAppUrl(isDemo ? null : number, message(window.location.origin)),
      '_blank',
      'noopener,noreferrer'
    )
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-label={ariaLabel}
      className="min-h-12 min-w-12 px-3 rounded-xl border border-white/10 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
    >
      <MessageCircle className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  )
}
