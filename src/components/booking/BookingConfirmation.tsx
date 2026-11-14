'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Download,
  CalendarPlus,
  RotateCcw,
  User,
  Shield,
  Mail,
  Loader2,
  CalendarSync,
} from 'lucide-react'
import type { BookingConfirmationDetails } from '@/types/booking'
import { formatCurrency, formatDateFull, formatTime } from '@/lib/format'
import { generateGoogleCalendarUrl, downloadIcsFile } from '@/lib/calendar'

interface BookingConfirmationProps {
  details: BookingConfirmationDetails
  emailStatus?: 'idle' | 'sending' | 'sent' | 'simulated' | 'error'
  onBookAnother: () => void
}

export function BookingConfirmation({
  details,
  emailStatus = 'idle',
  onBookAnother,
}: BookingConfirmationProps) {
  const startDate = new Date(details.fechaHoraInicio)
  const endDate = new Date(details.fechaHoraFin)
  const cancelPath = `/cancelar?token=${encodeURIComponent(details.tokenCancelacion)}`
  const fullCancelUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${cancelPath}`
      : cancelPath

  const gcalUrl = generateGoogleCalendarUrl({
    title: `${details.service.nombre} - ${details.businessName}`,
    description: `Cita confirmada para ${details.clientName}.\nServicio: ${details.service.nombre} (${details.service.duracion_minutos} min)\nPrecio: ${formatCurrency(Number(details.service.precio))}\nCancelar o cambiar cita: ${fullCancelUrl}`,
    location: 'Donaire Salon & Barbería, Calle Serrano 45, Madrid',
    startDate,
    endDate,
  })

  const handleDownloadIcs = () => {
    downloadIcsFile({
      title: `${details.service.nombre} - ${details.businessName}`,
      description: `Cita confirmada para ${details.clientName}.\nServicio: ${details.service.nombre}\nPrecio: ${formatCurrency(Number(details.service.precio))}\nCancelar o cambiar cita: ${fullCancelUrl}`,
      location: 'Donaire Salon & Barbería, Calle Serrano 45, Madrid',
      startDate,
      endDate,
      url: fullCancelUrl,
      filename: `cita-donaire-${details.service.nombre.toLowerCase().replace(/\s+/g, '-')}.ics`,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className="space-y-6 text-center max-w-lg mx-auto"
    >
      {/* Icono de verificación animado */}
      <div className="flex flex-col items-center justify-center pt-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 20,
            delay: 0.1,
          }}
          className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_30px_rgb(var(--glow-rgb)/0.3)]"
        >
          <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
        </motion.div>

        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
          ¡Cita Confirmada con Éxito!
        </h2>
        <p className="text-sm text-zinc-400">
          Hemos registrado tu cita para{' '}
          <span className="text-zinc-200 font-mono font-medium">{details.clientEmail}</span>
        </p>

        {emailStatus !== 'idle' && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-white/10 text-[11px] font-mono text-zinc-300">
            {emailStatus === 'sending' ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                <span>Enviando correo y archivo .ics...</span>
              </>
            ) : emailStatus === 'sent' ? (
              <>
                <Mail className="w-3 h-3 text-emerald-400" />
                <span>Confirmación enviada por email con .ics adjunto</span>
              </>
            ) : emailStatus === 'simulated' ? (
              <>
                <Mail className="w-3 h-3 text-amber-400" />
                <span>Email y .ics generados (configura RESEND_API_KEY para envío real)</span>
              </>
            ) : (
              <>
                <Mail className="w-3 h-3 text-zinc-400" />
                <span>Cita guardada · descarga tu calendario abajo</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tarjeta tipo billete / pass luxury */}
      <div className="p-6 rounded-2xl bg-zinc-900/70 border border-white/10 backdrop-blur-md text-left space-y-5 shadow-2xl relative overflow-hidden">
        {/* Glow sutil */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Encabezado del ticket */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div>
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
              Servicio contratado
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {details.service.nombre}
            </h3>
            <span className="text-xs text-zinc-400 font-mono">
              Duración estimada: {details.service.duracion_minutos} min
            </span>
          </div>

          <div className="text-right">
            <span className="text-xl font-mono font-bold text-emerald-400">
              {formatCurrency(Number(details.service.precio))}
            </span>
            <span className="block text-[10px] font-mono text-zinc-500 uppercase mt-0.5">
              Pago en salón
            </span>
          </div>
        </div>

        {/* Detalles de fecha y hora */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-zinc-800/60 border border-white/5 text-emerald-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-zinc-500 block uppercase font-mono text-[10px]">
                Fecha
              </span>
              <span className="font-medium text-zinc-200 capitalize">
                {formatDateFull(startDate)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-zinc-800/60 border border-white/5 text-emerald-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-zinc-500 block uppercase font-mono text-[10px]">
                Horario
              </span>
              <span className="font-mono font-semibold text-zinc-200">
                {formatTime(details.fechaHoraInicio)} - {formatTime(details.fechaHoraFin)}
              </span>
            </div>
          </div>
        </div>

        {/* Ubicación y cliente */}
        <div className="pt-2 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>Calle Serrano 45, Madrid (Donaire Salon)</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-500 shrink-0" />
            <span className="truncate">{details.clientName}</span>
          </div>
        </div>

        {/* Token y seguridad */}
        <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ref. Cita:</span>
          </div>
          <span className="text-zinc-300">
            {details.tokenCancelacion.slice(0, 8)}...
          </span>
        </div>
      </div>

      {/* Botones directos de Calendarios (Requisito clave) */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Botón Google Calendar */}
          <a
            href={gcalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 px-4 rounded-xl bg-white text-zinc-950 hover:bg-zinc-100 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200 active:scale-[0.98]"
          >
            <CalendarPlus className="w-4 h-4 text-emerald-600" />
            <span>Añadir a Google Calendar</span>
          </a>

          {/* Botón Apple / Outlook (.ics) */}
          <button
            type="button"
            onClick={handleDownloadIcs}
            className="h-12 px-4 rounded-xl bg-zinc-800 border border-white/10 text-white hover:bg-zinc-700/80 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
          >
            <Download className="w-4 h-4 text-zinc-300" />
            <span>Descargar .ics (Apple/Outlook)</span>
          </button>
        </div>

        <Link
          href={cancelPath}
          className="w-full h-11 px-4 rounded-xl border border-white/10 bg-zinc-900/50 text-zinc-300 hover:text-white hover:bg-zinc-800 font-medium text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
        >
          <CalendarSync className="w-3.5 h-3.5 text-zinc-400" />
          <span>Cancelar o cambiar esta cita sin llamar</span>
        </Link>

        <button
          type="button"
          onClick={onBookAnother}
          className="w-full py-3 text-xs text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Hacer otra reserva o volver al inicio</span>
        </button>
      </div>
    </motion.div>
  )
}
