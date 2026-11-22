'use client'

import React, { useId, useState } from 'react'
import { X, Lock, Loader2, Calendar } from 'lucide-react'
import type { BlockedSlot } from '@/types/booking'
import { createBlockedSlot } from '@/lib/booking-service'
import { formatDateKey } from '@/lib/calendar'
import { zonedDateTimeToUtc } from '@/lib/timezone'
import { AccessibleModal } from '@/components/ui/AccessibleModal'
import { useFeedback } from '@/components/ui/FeedbackProvider'

interface AdminBlockSlotModalProps {
  isOpen: boolean
  isDemo?: boolean
  isSandboxFallback?: boolean
  timezone?: string | null
  onClose: () => void
  onSuccess: (created?: BlockedSlot) => void
}

export function AdminBlockSlotModal({
  isOpen,
  isDemo = false,
  timezone = 'Europe/Madrid',
  onClose,
  onSuccess,
}: AdminBlockSlotModalProps) {
  const titleId = useId()
  const { notify } = useFeedback()

  const [date, setDate] = useState(() => formatDateKey(new Date(), timezone))
  const [startTime, setStartTime] = useState('14:00')
  const [endTime, setEndTime] = useState('16:00')
  const [fullDay, setFullDay] = useState(false)
  const [motivo, setMotivo] = useState('Bloqueo / Cita personal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setIsSubmitting(true)

    try {
      const startIso = fullDay
        ? zonedDateTimeToUtc(date, '00:00', timezone).toISOString()
        : zonedDateTimeToUtc(date, startTime, timezone).toISOString()
      const endIso = fullDay
        ? zonedDateTimeToUtc(date, '23:59', timezone).toISOString()
        : zonedDateTimeToUtc(date, endTime, timezone).toISOString()

      if (new Date(endIso) <= new Date(startIso)) {
        setErrorMsg('La hora de fin debe ser posterior a la hora de inicio.')
        setIsSubmitting(false)
        return
      }

      const result = await createBlockedSlot({
        fechaInicio: startIso,
        fechaFin: endIso,
        motivo: motivo.trim() || 'Bloqueo manual de agenda',
        isDemo,
      })

      const affected = result.affectedAppointmentsCount || 0
      notify({
        type: affected > 0 ? 'info' : 'success',
        title: affected > 0 ? 'Tramo bloqueado y clientes avisados' : 'Tramo bloqueado',
        description:
          affected > 0
            ? `Horario bloqueado. Se ha enviado un correo a ${affected} cliente(s) con enlace directo para cambiar su cita.`
            : `Horario bloqueado correctamente para el ${date}.`,
      })
      onSuccess(result.blockedSlot)
      onClose()
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el bloqueo.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      panelClassName="max-w-md rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden"
    >
      <div>
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl ui-badge-danger border flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h2
              id={titleId}
              className="text-base font-semibold tracking-tight text-white"
            >
              Bloquear Fecha / Horario
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de bloqueo"
            className="min-w-12 min-h-12 -mr-2 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-xl ui-badge-danger border text-xs font-medium"
            >
              {errorMsg}
            </div>
          )}

          {/* Selector de fecha */}
          <div className="space-y-1.5">
            <label
              htmlFor="block-date"
              className="text-xs font-medium text-zinc-300 flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Fecha</span>
            </label>
            <input
              id="block-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          {/* Toggle Día Completo */}
          <label
            htmlFor="block-full-day"
            className="flex items-center justify-between p-3.5 min-h-12 rounded-xl bg-zinc-950/60 border border-white/10 cursor-pointer"
          >
            <span className="text-xs font-medium text-zinc-200">
              Bloquear el día completo (Cerrado)
            </span>
            <input
              id="block-full-day"
              type="checkbox"
              checked={fullDay}
              onChange={(e) => setFullDay(e.target.checked)}
              className="h-5 w-5 accent-red-600 rounded"
            />
          </label>

          {/* Horas */}
          {!fullDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="block-start"
                  className="text-xs font-medium text-zinc-300 block"
                >
                  Desde
                </label>
                <input
                  id="block-start"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full min-h-12 px-3 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/60"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="block-end"
                  className="text-xs font-medium text-zinc-300 block"
                >
                  Hasta
                </label>
                <input
                  id="block-end"
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full min-h-12 px-3 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-1.5">
            <label
              htmlFor="block-reason"
              className="text-xs font-medium text-zinc-300 block"
            >
              Motivo interno
            </label>
            <input
              id="block-reason"
              type="text"
              placeholder="Ej. Comida, cita médica, descanso..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full min-h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-12 px-4 rounded-xl border border-white/10 bg-zinc-950 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors active:scale-[0.98]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-12 px-4 rounded-xl ui-btn-danger text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Bloquear Tramo</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </AccessibleModal>
  )
}
