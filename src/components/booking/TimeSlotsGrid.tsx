'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Sun, Sunset, AlertCircle } from 'lucide-react'
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
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-xl bg-zinc-900/50 animate-pulse border border-white/5"
          />
        ))}
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-zinc-900/30 border border-white/10 text-center flex flex-col items-center justify-center">
        <AlertCircle className="w-8 h-8 text-zinc-500 mb-2" />
        <p className="text-sm font-medium text-zinc-300">
          No hay horarios disponibles para esta fecha
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          El salón se encuentra cerrado o todos los huecos están ocupados. Por favor selecciona otro día.
        </p>
      </div>
    )
  }

  // Separar en Mañana y Tarde
  const morningSlots = slots.filter((s) => {
    const hour = parseInt(s.time.split(':')[0], 10)
    return hour < 14
  })

  const afternoonSlots = slots.filter((s) => {
    const hour = parseInt(s.time.split(':')[0], 10)
    return hour >= 14
  })

  const renderSlotButton = (slot: TimeSlot) => {
    const isSelected = selectedSlot?.datetime === slot.datetime
    const isDisabled = !slot.isAvailable

    return (
      <motion.button
        key={slot.datetime}
        type="button"
        whileTap={isDisabled ? undefined : { scale: 0.96 }}
        onClick={() => {
          if (!isDisabled) {
            onSelectSlot(slot)
          }
        }}
        disabled={isDisabled}
        className={cn(
          'relative min-h-[48px] px-3 py-2.5 rounded-xl text-center font-mono text-sm transition-all duration-200 select-none cursor-pointer flex items-center justify-center gap-1.5',
          'border',
          isSelected
            ? 'bg-emerald-500 text-zinc-950 font-bold border-emerald-400 shadow-[0_0_16px_rgb(var(--glow-rgb)/0.35)] ring-2 ring-emerald-400'
            : slot.isAvailable
            ? 'bg-emerald-950/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/40 hover:border-emerald-500/50'
            : 'bg-zinc-900/30 text-zinc-600 border-white/5 cursor-not-allowed opacity-50'
        )}
      >
        <span>{slot.time}</span>
        {!slot.isAvailable && (
          <span className="text-[10px] text-zinc-500 block sm:inline font-sans font-normal">
            {slot.reason === 'booked' ? '(Ocupado)' : slot.reason === 'past' ? '(Pasado)' : '(No disp.)'}
          </span>
        )}
      </motion.button>
    )
  }

  return (
    <div className="space-y-6">
      {/* Turno de Mañana */}
      {morningSlots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase tracking-wider">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Turno Mañana (09:00 - 14:00)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {morningSlots.map(renderSlotButton)}
          </div>
        </div>
      )}

      {/* Turno de Tarde */}
      {afternoonSlots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase tracking-wider">
            <Sunset className="w-3.5 h-3.5 text-orange-400" />
            <span>Turno Tarde (14:00 - 20:00)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {afternoonSlots.map(renderSlotButton)}
          </div>
        </div>
      )}
    </div>
  )
}
