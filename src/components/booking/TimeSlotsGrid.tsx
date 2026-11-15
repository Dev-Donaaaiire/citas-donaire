'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Clock, AlertCircle } from 'lucide-react'
import type { TimeSlot } from '@/types/booking'
import { cn } from '@/lib/utils'

interface TimeSlotsGridProps {
  slots: TimeSlot[]
  selectedSlot: TimeSlot | null
  onSelectSlot: (slot: TimeSlot) => void
  isLoading?: boolean
}

export function TimeSlotsGrid({
  slots,
  selectedSlot,
  onSelectSlot,
  isLoading,
}: TimeSlotsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="min-h-12 rounded-xl bg-zinc-900/60 border border-white/5 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-zinc-900/30 border border-white/10 text-center flex flex-col items-center justify-center">
        <AlertCircle className="w-8 h-8 text-zinc-400 mb-2" />
        <p className="text-sm font-medium text-zinc-200">
          No hay horarios disponibles para esta fecha
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          El negocio permanece cerrado o no quedan huecos suficientes para la
          duración del servicio.
        </p>
      </div>
    )
  }

  const availableCount = slots.filter((s) => s.isAvailable).length

  if (availableCount === 0) {
    return (
      <div className="p-8 rounded-2xl bg-zinc-900/30 border border-white/10 text-center flex flex-col items-center justify-center">
        <Clock className="w-8 h-8 text-zinc-400 mb-2" />
        <p className="text-sm font-medium text-zinc-200">
          Agenda completa para este día
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          Todos los huecos han sido reservados o bloqueados. Selecciona otro día
          en el calendario.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {slots.map((slot, index) => {
          const isSelected = selectedSlot?.datetime === slot.datetime
          const isDisabled = !slot.isAvailable

          return (
            <motion.button
              key={slot.datetime}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectSlot(slot)}
              aria-pressed={isSelected}
              aria-label={
                isDisabled
                  ? `${slot.time} no disponible (${slot.reason === 'booked' ? 'ocupado' : 'bloqueado'})`
                  : `Seleccionar horario ${slot.time}`
              }
              title={
                isDisabled
                  ? `${slot.time} · ${slot.reason === 'booked' ? 'Horario ocupado' : 'No disponible'}`
                  : `Seleccionar ${slot.time}`
              }
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
                delay: Math.min(index * 0.015, 0.2),
              }}
              className={cn(
                'relative min-h-12 w-full px-2 rounded-xl font-mono text-sm tracking-tight transition-all duration-200 select-none flex items-center justify-center overflow-hidden',
                'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                isSelected
                  ? 'bg-emerald-500 text-zinc-950 font-bold border-emerald-400 shadow-[0_0_16px_rgb(var(--glow-rgb)/0.35)] ring-2 ring-emerald-400'
                  : slot.isAvailable
                    ? 'bg-emerald-950/25 text-emerald-300 border-emerald-500/35 hover:bg-emerald-900/40 hover:border-emerald-500/60 active:scale-[0.98]'
                    : 'ui-slot-disabled cursor-not-allowed opacity-50'
              )}
            >
              <span
                className={cn(
                  'leading-none whitespace-nowrap',
                  isDisabled && 'line-through decoration-current/60 font-normal'
                )}
              >
                {slot.time}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* Leyenda sutil de disponibilidad */}
      <div className="flex items-center justify-end gap-3 px-1 pt-0.5 text-[11px] font-sans text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgb(var(--glow-rgb)/0.4)]" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          <span className="line-through decoration-zinc-500">Ocupado</span>
        </div>
      </div>
    </div>
  )
}
