'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  CalendarPlus,
  MapPin,
  Phone,
} from 'lucide-react'
import { confirmCancelAppointment } from '@/lib/booking-service'
import { formatCurrency, formatDateFull, formatTime } from '@/lib/format'
import type { CancelAppointmentDetails } from '@/types/booking'
import type { ThemeId } from '@/lib/themes'
import { useBusinessTheme } from '@/components/theme/BusinessThemeSync'

interface CancelarContentProps {
  token: string
  initialAppointment: CancelAppointmentDetails | null
  initialError: string | null
  temaActivo?: ThemeId
}

export function CancelarContent({
  token,
  initialAppointment,
  initialError,
  temaActivo,
}: CancelarContentProps) {
  useBusinessTheme(temaActivo, true)

  const [appointment, setAppointment] =
    useState<CancelAppointmentDetails | null>(initialAppointment)
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelledSuccess, setCancelledSuccess] = useState(
    initialAppointment?.estado === 'cancelada'
  )
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  useEffect(() => {
    setAppointment(initialAppointment)
    setErrorMsg(initialError)
    setCancelledSuccess(initialAppointment?.estado === 'cancelada')
    setIsCancelling(false)
    setShowCancelConfirm(false)
  }, [token, initialAppointment, initialError])

  const handleConfirmCancel = async () => {
    if (!appointment || !token) return
    setIsCancelling(true)
    setErrorMsg(null)

    try {
      await confirmCancelAppointment(token)
      setCancelledSuccess(true)
      setAppointment((prev) => (prev ? { ...prev, estado: 'cancelada' } : prev))
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No pudimos cancelar tu cita automáticamente. Inténtalo de nuevo.'
      )
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-6">
      <header className="max-w-lg w-full mx-auto py-3 flex items-center justify-between">
        <Link
          href="/reservar"
          className="inline-flex items-center gap-2 min-h-12 px-3 -ml-3 rounded-xl text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ir a reservas</span>
        </Link>
        <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
          Autogestión de Cita
        </span>
      </header>

      <main className="max-w-lg w-full mx-auto my-auto py-8">
        {errorMsg && !appointment ? (
          <div className="p-8 rounded-3xl bg-zinc-900/60 border border-white/10 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl ui-badge-danger border flex items-center justify-center mx-auto">
              <XCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold text-white">
                Enlace no disponible
              </h1>
              <p className="text-sm text-zinc-400">{errorMsg}</p>
            </div>
            <Link
              href="/reservar"
              className="inline-flex items-center justify-center min-h-12 px-6 rounded-xl ui-btn-contrast font-medium text-sm transition-all active:scale-[0.98]"
            >
              Volver a reservar
            </Link>
          </div>
        ) : appointment ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-md space-y-6 shadow-xl"
          >
            {cancelledSuccess ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="text-2xl font-semibold text-white">
                    Cita cancelada
                  </h1>
                  <p className="text-sm text-zinc-400">
                    Tu reserva de{' '}
                    <strong className="text-zinc-200">
                      {appointment.service_nombre}
                    </strong>{' '}
                    en{' '}
                    <strong className="text-zinc-200">
                      {appointment.business_name}
                    </strong>{' '}
                    ha sido anulada y el horario ha quedado libre.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/reservar"
                    className="w-full min-h-12 px-6 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-[0.98]"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>Reservar otro día y hora</span>
                  </Link>
                </div>
              </div>
            ) : appointment.estado === 'completada' ? (
              <div className="text-center space-y-4">
                <h1 className="text-xl font-semibold text-white">
                  Esta cita ya fue completada
                </h1>
                <p className="text-sm text-zinc-400">
                  No es posible anular una reserva ya atendida. ¿Deseas solicitar
                  una nueva cita?
                </p>
                <Link
                  href="/reservar"
                  className="inline-flex items-center justify-center min-h-12 px-6 rounded-xl ui-btn-contrast font-medium text-sm"
                >
                  Hacer nueva reserva
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight text-white">
                      Gestionar tu reserva
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                      Puedes cambiar a otro horario sin perder el actual hasta
                      confirmarlo, o anular definitivamente esta cita.
                    </p>
                  </div>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl ui-badge-danger border text-xs font-medium"
                  >
                    {errorMsg}
                  </div>
                )}

                {/* Resumen de la cita */}
                <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/10 space-y-3">
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
                    <div>
                      <span className="text-xs font-mono uppercase text-zinc-400">
                        {appointment.business_name} · {appointment.client_nombre}
                      </span>
                      <p className="text-base font-medium text-white">
                        {appointment.service_nombre}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-zinc-200">
                      {formatCurrency(Number(appointment.service_precio))}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="capitalize">
                        {formatDateFull(
                          appointment.fecha_hora_inicio,
                          appointment.timezone
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>
                        {formatTime(
                          appointment.fecha_hora_inicio,
                          appointment.timezone
                        )}{' '}
                        -{' '}
                        {formatTime(
                          appointment.fecha_hora_fin,
                          appointment.timezone
                        )}
                      </span>
                    </div>
                    {appointment.direccion && (
                      <div className="flex items-center gap-2 sm:col-span-2 text-zinc-400">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{appointment.direccion}</span>
                      </div>
                    )}
                    {appointment.telefono_contacto && (
                      <div className="flex items-center gap-2 sm:col-span-2 text-zinc-400">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{appointment.telefono_contacto}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botones de acción claros y sin cancelación accidental */}
                <div className="space-y-3 pt-2">
                  <Link
                    href={`/reservar?rescheduleToken=${encodeURIComponent(token)}&serviceId=${encodeURIComponent(appointment.service_id)}`}
                    className="w-full min-h-12 px-5 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-sm hover:bg-emerald-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>Cambiar cita / Elegir otro horario</span>
                  </Link>

                  {!showCancelConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(true)}
                      className="w-full min-h-12 px-5 rounded-xl bg-zinc-900/60 border border-red-500/30 text-red-400 hover:bg-red-950/20 hover:border-red-500/50 font-medium text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Anular esta reserva</span>
                    </button>
                  ) : (
                    <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/40 space-y-3">
                      <p className="text-xs text-red-200 leading-relaxed font-medium">
                        ¿Confirmas que deseas anular tu cita? Tu horario se liberará de inmediato.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isCancelling}
                          onClick={handleConfirmCancel}
                          className="flex-1 min-h-11 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isCancelling ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Anulando...</span>
                            </>
                          ) : (
                            <span>Sí, anular definitivamente</span>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={isCancelling}
                          onClick={() => setShowCancelConfirm(false)}
                          className="min-h-11 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                        >
                          Volver
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        ) : null}
      </main>

      <footer className="max-w-lg w-full mx-auto text-center py-4 text-xs font-mono text-zinc-400">
        Sistema automatizado de citas
      </footer>
    </div>
  )
}
