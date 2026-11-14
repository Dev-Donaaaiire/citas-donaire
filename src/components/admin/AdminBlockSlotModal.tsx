'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Ban, Loader2 } from 'lucide-react'
import { formatDateKey } from '@/lib/calendar'

interface AdminBlockSlotModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { fechaInicio: string; fechaFin: string; motivo: string }) => Promise<void>
}

export function AdminBlockSlotModal({
  isOpen,
  onClose,
  onSave,
}: AdminBlockSlotModalProps) {
  const [date, setDate] = useState(formatDateKey(new Date()))
  const [startTime, setStartTime] = useState('14:00')
  const [endTime, setEndTime] = useState('15:00')
  const [motivo, setMotivo] = useState('Pausa almuerzo y descanso de equipo')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const applyPreset = (preset: 'lunch' | 'afternoon' | 'fullDay') => {
    if (preset === 'lunch') {
      setStartTime('14:00')
      setEndTime('15:00')
      setMotivo('Pausa almuerzo y descanso del equipo')
    } else if (preset === 'afternoon') {
      setStartTime('16:00')
      setEndTime('20:00')
      setMotivo('Tarde reservada para formación interna')
    } else if (preset === 'fullDay') {
      setStartTime('09:00')
      setEndTime('20:00')
      setMotivo('Cierre del salón por festivo o mantenimiento')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)

    const [year, month, day] = date.split('-').map(Number)

    const startDateTime = new Date(year, month - 1, day, startH, startM, 0)
    const endDateTime = new Date(year, month - 1, day, endH, endM, 0)

    if (endDateTime <= startDateTime) {
      setError('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSave({
        fechaInicio: startDateTime.toISOString(),
        fechaFin: endDateTime.toISOString(),
        motivo,
      })
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear bloqueo'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl p-6 text-zinc-100 space-y-5"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-400" />
            <h3 className="text-base font-semibold text-white tracking-tight">
              Bloquear Horas o Días
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presets rápidos en 1 clic */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
            Plantillas rápidas en 1 clic
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => applyPreset('lunch')}
              className="px-2.5 py-2 rounded-xl bg-zinc-800/80 border border-white/5 hover:border-white/20 text-xs text-zinc-300 hover:text-white transition-all text-center"
            >
              Almuerzo (14h-15h)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('afternoon')}
              className="px-2.5 py-2 rounded-xl bg-zinc-800/80 border border-white/5 hover:border-white/20 text-xs text-zinc-300 hover:text-white transition-all text-center"
            >
              Tarde libre
            </button>
            <button
              type="button"
              onClick={() => applyPreset('fullDay')}
              className="px-2.5 py-2 rounded-xl bg-zinc-800/80 border border-white/5 hover:border-white/20 text-xs text-zinc-300 hover:text-white transition-all text-center"
            >
              Día completo
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-medium">Fecha a bloquear</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-zinc-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">Hora Inicio</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-zinc-800/80 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">Hora Fin</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-zinc-800/80 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-medium">Motivo del bloqueo</label>
            <input
              type="text"
              required
              placeholder="Ej. Pausa técnica, almuerzo, etc."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-zinc-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-400 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Ban className="w-3.5 h-3.5" />
                  <span>Confirmar Bloqueo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
