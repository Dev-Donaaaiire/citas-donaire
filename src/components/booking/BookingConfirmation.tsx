'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  CheckCircle2,
  CalendarPlus,
  Download,
  ExternalLink,
  RotateCcw,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  Mail,
  Phone,
} from 'lucide-react'
import { generateGoogleCalendarUrl, downloadIcsFile } from '@/lib/calendar'
import { formatCurrency, formatDateFull, formatTime } from '@/lib/format'
import type { BookingConfirmationDetails } from '@/types/booking'

interface BookingConfirmationProps {
  details: BookingConfirmationDetails
  emailStatus?: 'idle' | 'sending' | 'queued' | 'sent' | 'simulated' | 'error'
  onBookAnother: () => void
}

export function BookingConfirmation({
  details,
  emailStatus = 'idle',
  onBookAnother,
}: BookingConfirmationProps) {
  const startDate = new Date(details.fechaHoraInicio)
  const endDate = new Date(details.fechaHoraFin)
  const tz = details.businessTimezone || 'Europe/Madrid'
  const fullLocation = details.businessAddress?.trim()
    ? `${details.businessName} · ${details.businessAddress.trim()}`
    : details.businessName

  const descriptionText = `Servicio: ${details.service.nombre}\nCliente: ${details.clientName}\nNegocio: ${details.businessName}`

  const gcalUrl = generateGoogleCalendarUrl({
    title: `${details.service.nombre} - ${details.businessName}`,
    description: descriptionText,
    location: fullLocation,
    startDate,
    endDate,
  })

  const handleDownloadIcs = () => {
    downloadIcsFile({
      title: `${details.service.nombre} - ${details.businessName}`,
      description: descriptionText,
      location: fullLocation,
      startDate,
      endDate,
      organizerName: details.businessName,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className="space-y-6"
    >
      {/* Cabecera de éxito */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-md text-center space-y-4 shadow-xl relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-emerald-500/50"
        />

        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgb(var(--glow-rgb)/0.2)]">
          <CheckCircle2 className="w-8 h-8 stroke-[1.75]" />
        </div>

        <div className="space-y-1.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            {details.rescheduled
              ? 'Cita Reprogramada Correctamente'
              : 'Reserva Confirmada'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            ¡Te esperamos, {details.clientName.split(' ')[0]}!
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Tu espacio ya ha sido bloqueado automáticamente en la agenda de{' '}
            <strong className="text-zinc-200">{details.businessName}</strong>.
          </p>
        </div>

        {/* Estado del email automático con Resend */}
        {emailStatus !== 'idle' && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/60 border border-white/10 text-xs">
            <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            {emailStatus === 'sending' && (
              <span className="text-zinc-300">
                Enviando confirmación e invitación .ics...
              </span>
            )}
            {emailStatus === 'queued' && (
              <span className="text-emerald-300">
                Enviando confirmación e invitación .ics a{' '}
                <strong className="font-mono">{details.clientEmail}</strong>
              </span>
            )}
            {emailStatus === 'sent' && (
              <span className="text-emerald-300">
                Confirmación enviada por email a{' '}
                <strong className="font-mono">{details.clientEmail}</strong>
              </span>
            )}
            {emailStatus === 'simulated' && (
              <span className="text-zinc-300">
                Entorno demo/sandbox: correo simulado para{' '}
                <strong className="font-mono">{details.clientEmail}</strong>
              </span>
            )}
            {emailStatus === 'error' && (
              <span className="text-amber-300">
                Tu cita está confirmada (aviso por email en cola).
              </span>
            )}
          </div>
        )}

        {/* Tarjeta resumen de la cita */}
        <div className="mt-6 p-5 rounded-2xl bg-zinc-950/70 border border-white/10 text-left space-y-3">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10">
            <div>
              <span className="text-[11px] font-mono uppercase text-zinc-400">
                Servicio contratado
              </span>
              <h3 className="text-base font-medium text-white">
                {details.service.nombre}
              </h3>
            </div>
            <span className="text-lg font-bold font-mono text-zinc-100">
              {formatCurrency(Number(details.service.precio))}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-1">
            <div className="flex items-center gap-2.5 text-zinc-200">
              <CalendarIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="capitalize">
                {formatDateFull(startDate, tz)}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-zinc-200 font-mono">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {formatTime(details.fechaHoraInicio, tz)} -{' '}
                {formatTime(details.fechaHoraFin, tz)}
              </span>
            </div>
            {details.businessAddress?.trim() && (
              <div className="flex items-center gap-2.5 text-zinc-300 text-xs sm:col-span-2 pt-1">
                <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>
                  {details.businessAddress.trim()} ({details.businessName})
                </span>
              </div>
            )}
            {details.businessPhone?.trim() && (
              <div className="flex items-center gap-2.5 text-zinc-300 text-xs sm:col-span-2">
                <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>Contacto: {details.businessPhone.trim()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acciones directas al calendario */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-zinc-400 text-center uppercase tracking-wider font-mono">
          Guarda tu cita para no olvidarla
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={gcalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-12 px-4 rounded-xl ui-btn-contrast font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200 active:scale-[0.98]"
          >
            <CalendarPlus className="w-4 h-4 text-emerald-500" />
            <span>Añadir a Google Calendar</span>
          </a>

          <button
            type="button"
            onClick={handleDownloadIcs}
            className="min-h-12 px-4 rounded-xl bg-zinc-900 border border-white/10 text-zinc-100 hover:bg-zinc-800 hover:border-white/20 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
          >
            <Download className="w-4 h-4 text-zinc-400" />
            <span>Apple Calendar / Outlook (.ics)</span>
          </button>
        </div>
      </div>

      {/* Autogestión */}
      <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="text-zinc-400">
          ¿Necesitas cambiar o cancelar tu cita? Sin llamadas:
        </span>
        <Link
          href={`/cancelar?token=${encodeURIComponent(details.tokenCancelacion)}`}
          className="min-h-12 px-3 flex items-center gap-1.5 text-zinc-200 hover:text-white font-medium underline underline-offset-4 transition-colors"
        >
          <span>Gestionar o anular reserva</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="text-center pt-1">
        <button
          type="button"
          onClick={onBookAnother}
          className="min-h-12 px-4 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors inline-flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Hacer otra reserva</span>
        </button>
      </div>
    </motion.div>
  )
}
