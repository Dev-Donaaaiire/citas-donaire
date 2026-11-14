'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { Service, TimeSlot } from '@/types/booking'
import { formatCurrency, formatDateShort } from '@/lib/format'
import { cn } from '@/lib/utils'

interface BookingSummaryBarProps {
  currentStep: number
  selectedService: Service | null
  selectedDate: Date
  selectedSlot: TimeSlot | null
  onContinue: () => void
  disabled?: boolean
}

export function BookingSummaryBar({
  currentStep,
  selectedService,
  selectedDate,
  selectedSlot,
  onContinue,
  disabled,
}: BookingSummaryBarProps) {
  if (currentStep >= 3) {
    // En el paso 3 (formulario) y 4 (confirmación) el botón principal está en el propio componente
    return null
  }

  const canContinue =
    (currentStep === 1 && selectedService !== null) ||
    (currentStep === 2 && selectedSlot !== null)

  const getButtonText = () => {
    if (currentStep === 1) return 'Elegir Fecha y Hora'
    if (currentStep === 2) return 'Continuar con mis Datos'
    return 'Continuar'
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
        {/* Info resumen */}
        <div className="min-w-0 flex-1">
          {selectedService ? (
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white truncate">
                {selectedService.nombre}
              </span>
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                <span className="text-emerald-400 font-bold">
                  {formatCurrency(Number(selectedService.precio))}
                </span>
                {selectedSlot && (
                  <>
                    <span>•</span>
                    <span className="text-zinc-300">
                      {formatDateShort(selectedDate)} a las {selectedSlot.time}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Selecciona un servicio para comenzar</span>
            </div>
          )}
        </div>

        {/* Botón CTA táctil */}
        <motion.button
          type="button"
          whileTap={{ scale: canContinue ? 0.97 : 1 }}
          onClick={onContinue}
          disabled={!canContinue || disabled}
          className={cn(
            'h-12 min-h-[48px] px-5 sm:px-6 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer select-none shrink-0',
            canContinue
              ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-[0_0_20px_rgb(var(--glow-rgb)/0.35)]'
              : 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed opacity-60'
          )}
        >
          <span>{getButtonText()}</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  )
}
