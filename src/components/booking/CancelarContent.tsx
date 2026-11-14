'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  Calendar,
  CalendarSync,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowLeft,
  XCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Appointment } from '@/types/booking'
import { formatCurrency, formatDateFull, formatTime } from '@/lib/format'

export function CancelarContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')?.trim() || ''

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(token))
  const [error, setError] = useState<string | null>(
    token ? null : 'No se ha proporcionado un token de cancelación válido.'
  )
  const [actionMode, setActionMode] = useState<'cancel' | 'reschedule' | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let active = true

    supabase
      .from('appointments')
      .select('*, services(*), clients(*)')
      .eq('token_cancelacion', token)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (!active) return
        if (fetchError) {
          setError('No se pudo consultar la cita. Verifica el enlace.')
        } else if (!data) {
          setError('No encontramos ninguna cita asociada a este enlace.')
        } else {
          setAppointment(data as Appointment)
        }
        setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [token])

  const handleCancelAppointment = async () => {
    if (!appointment || !token) return
    setActionMode('cancel')
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ estado: 'cancelada' })
        .eq('token_cancelacion', token)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setAppointment({ ...appointment, estado: 'cancelada' })
      setActionSuccess(
        'Tu cita ha sido cancelada correctamente. El hueco vuelve a estar libre.'
      )
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'No pudimos cancelar la cita.'
      )
    } finally {
      setActionMode(null)
    }
  }

  const handleReschedule = async () => {
    if (!appointment || !token) {
      router.push('/reservar')
      return
    }
    setActionMode('reschedule')
    setError(null)
    try {
      if (appointment.estado === 'confirmada') {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ estado: 'cancelada' })
          .eq('token_cancelacion', token)

        if (updateError) {
          throw new Error(updateError.message)
        }
      }
      router.push('/reservar')
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos liberar la cita actual para cambiarla.'
      )
      setActionMode(null)
    }
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-zinc-950">
      <header className="border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/reservar"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Reservas</span>
          </Link>
          <span className="text-xs font-mono text-zinc-400">Gestión de Cita</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-md shadow-2xl space-y-6"
        >
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
              <p className="text-xs font-mono text-zinc-400">
                Buscando tu reserva...
              </p>
            </div>
          ) : error && !appointment ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Enlace no disponible
                </h1>
                <p className="text-xs text-zinc-400">{error}</p>
              </div>
              <Link
                href="/reservar"
                className="inline-flex h-12 px-6 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950 text-sm font-semibold hover:bg-emerald-400 transition-all active:scale-[0.98]"
              >
                Reservar una nueva cita
              </Link>
            </div>
          ) : appointment ? (
            <>
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                  Gestión sin llamadas
                </span>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Cancelar o cambiar tu cita
                </h1>
                <p className="text-xs text-zinc-400">
                  Puedes anular esta reserva o elegir un horario nuevo al instante.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {actionSuccess && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Resumen de la cita */}
              <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/10 space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
                  <div>
                    <h2 className="font-semibold text-base text-white">
                      {appointment.services?.nombre || 'Servicio reservado'}
                    </h2>
                    {appointment.clients?.nombre && (
                      <p className="text-xs text-zinc-400 mt-0.5">
                        A nombre de {appointment.clients.nombre}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-emerald-400 block">
                      {formatCurrency(Number(appointment.services?.precio || 0))}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/10 inline-block mt-1">
                      {appointment.estado}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="capitalize">
                      {formatDateFull(appointment.fecha_hora_inicio)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300 font-mono">
                    <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {formatTime(appointment.fecha_hora_inicio)} -{' '}
                      {formatTime(appointment.fecha_hora_fin)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              {appointment.estado === 'confirmada' ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={actionMode !== null}
                    onClick={handleReschedule}
                    className="w-full h-12 px-5 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {actionMode === 'reschedule' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CalendarSync className="w-4 h-4" />
                    )}
                    <span>Cambiar cita / Elegir otro horario</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionMode !== null}
                    onClick={handleCancelAppointment}
                    className="w-full h-12 px-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {actionMode === 'cancel' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>Confirmar cancelación de cita</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <p className="text-xs text-zinc-400">
                    Esta cita figura como{' '}
                    <strong className="text-zinc-200 uppercase font-mono">
                      {appointment.estado}
                    </strong>
                    .
                  </p>
                  <Link
                    href="/reservar"
                    className="w-full h-12 px-5 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-[0.98]"
                  >
                    <CalendarSync className="w-4 h-4" />
                    <span>Reservar un nuevo horario</span>
                  </Link>
                </div>
              )}
            </>
          ) : null}
        </motion.div>
      </main>
    </div>
  )
}
