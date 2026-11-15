'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { Service, TimeSlot } from '@/types/booking'
import { formatCurrency, formatDateShort } from '@/lib/format'
import { cn } from '@/lib/utils'

interface BookingSummaryBarProps {
  step: 1 | 2
  service: Service | null
  selectedDate: Date | null
  selectedSlot: TimeSlot | null
  onContinue: () => void
  disabled?: boolean
  timeZone?: string
}

export function BookingSummaryBar({
  step,
  service,
  selectedDate,
  selectedSlot,
  onContinue,
  disabled,
  timeZone,
}: BookingSummaryBarProps) {
  const canContinue =
    (step === 1 && service !== null) || (step === 2 && selectedSlot !== null)

  const buttonText =
    step === 1
      ? 'Elegir fecha y hora'
      : step === 2
        ? 'Continuar con mis datos'
        : 'Continuar'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-zinc-950/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {service ? (
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-semibold text-white truncate">
                {service.nombre}
              </span>
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                <span className="text-emerald-400 font-bold">
                  {formatCurrency(Number(service.precio))}
                </span>
                {selectedSlot && selectedDate && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-zinc-300 truncate">
                      {formatDateShort(selectedDate, timeZone)} a las{' '}
                      {selectedSlot.time} h
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Selecciona un servicio para comenzar</span>
            </div>
          )}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: canContinue ? 0.98 : 1 }}
          onClick={onContinue}
          disabled={!canContinue || disabled}
          className={cn(
            'min-h-12 h-12 px-5 sm:px-6 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer select-none shrink-0 active:scale-[0.98]',
            canContinue
              ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-[0_0_20px_rgb(var(--glow-rgb)/0.35)]'
              : 'ui-slot-disabled border cursor-not-allowed'
          )}
        >
          <span>{buttonText}</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </motion.button>
      </div>
    </div>
  )
}
