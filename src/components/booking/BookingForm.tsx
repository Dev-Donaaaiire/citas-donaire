'use client'

import React, { useState } from 'react'
import {
  User,
  Mail,
  Phone,
  FileText,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import type { Service, TimeSlot } from '@/types/booking'
import { formatCurrency, formatDateFull } from '@/lib/format'

interface BookingFormProps {
  service: Service
  selectedDate: Date
  selectedSlot: TimeSlot
  timezone?: string | null
  onSubmit: (data: {
    nombre: string
    email: string
    telefono: string
    notas: string
    website: string
  }) => Promise<void>
  isSubmitting: boolean
  submitError?: string | null
  onBack: () => void
}

export function BookingForm({
  service,
  selectedDate,
  selectedSlot,
  timezone,
  onSubmit,
  isSubmitting,
  submitError,
  onBack,
}: BookingFormProps) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [notas, setNotas] = useState('')
  const [website, setWebsite] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    const cleanName = nombre.trim()
    const cleanEmail = email.trim().toLowerCase()
    const cleanPhone = telefono.trim()

    if (cleanName.length < 2) {
      setLocalError('Por favor, introduce tu nombre completo.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setLocalError('Introduce un correo electrónico válido para enviarte la confirmación.')
      return
    }

    if (cleanPhone.length < 6) {
      setLocalError('Introduce un número de teléfono válido para avisos de tu cita.')
      return
    }

    await onSubmit({
      nombre: cleanName,
      email: cleanEmail,
      telefono: cleanPhone,
      notas: notas.trim(),
      website,
    })
  }

  const displayError = submitError || localError

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Resumen compacto superior */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-400 font-mono uppercase tracking-wider">
            {service.nombre} · {service.duracion_minutos} min
          </p>
          <p className="text-sm font-medium text-zinc-100 mt-0.5 capitalize">
            {formatDateFull(selectedDate, timezone)} a las {selectedSlot.time} h
          </p>
        </div>
        <div className="text-right">
          <span className="text-base font-bold font-mono text-zinc-100">
            {formatCurrency(Number(service.precio))}
          </span>
        </div>
      </div>

      {/* Mensaje de error de validación o de servidor */}
      {displayError && (
        <div
          role="alert"
          className="p-4 rounded-xl ui-badge-danger border text-xs sm:text-sm font-medium flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{displayError}</p>
        </div>
      )}

      {/* Campos del formulario */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="booking-name"
            className="text-xs font-medium text-zinc-300 flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-zinc-400" />
            <span>Nombre y apellidos *</span>
          </label>
          <input
            id="booking-name"
            type="text"
            required
            autoComplete="name"
            placeholder="Ej. Carlos Mendoza"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full min-h-12 px-4 rounded-xl bg-zinc-900/60 border border-white/10 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="booking-email"
            className="text-xs font-medium text-zinc-300 flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5 text-zinc-400" />
            <span>Correo electrónico *</span>
          </label>
          <input
            id="booking-email"
            type="email"
            required
            autoComplete="email"
            placeholder="ejemplo@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full min-h-12 px-4 rounded-xl bg-zinc-900/60 border border-white/10 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
          />
          <p className="text-xs text-zinc-400 pl-1">
            Enviaremos aquí tu entrada al calendario y el enlace para cambiar o
            cancelar en 1 clic.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="booking-phone"
            className="text-xs font-medium text-zinc-300 flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5 text-zinc-400" />
            <span>Teléfono móvil *</span>
          </label>
          <input
            id="booking-phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="Ej. +34 600 000 000"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full min-h-12 px-4 rounded-xl bg-zinc-900/60 border border-white/10 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="booking-notes"
            className="text-xs font-medium text-zinc-300 flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            <span>Notas adicionales (opcional)</span>
          </label>
          <textarea
            id="booking-notes"
            rows={2}
            placeholder="¿Algo que debamos saber antes de tu cita?"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/10 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-colors resize-none"
          />
        </div>
      </div>

      {/* Honeypot anti-bots: invisible para humanos y lectores de pantalla */}
      <div
        aria-hidden="true"
        className="sr-only absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="booking-website">No rellenes este campo</label>
        <input
          id="booking-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {/* Garantía de privacidad */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-zinc-900/40 border border-white/10 text-zinc-300 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Reserva 100% confirmada al instante. Sin llamadas ni creación de
            contraseñas.
          </span>
        </div>
        <p className="text-xs text-zinc-400 px-1 leading-relaxed">
          Podrás cambiar o cancelar tu cita gratis en 1 clic desde tu email de
          confirmación.
        </p>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          aria-label="Volver al paso anterior"
          className="min-h-12 min-w-12 px-4 rounded-xl border border-white/10 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 text-sm font-medium shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Atrás</span>
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 min-h-12 px-6 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 active:scale-[0.98] shadow-[0_0_20px_rgb(var(--glow-rgb)/0.25)] disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Confirmando reserva...</span>
            </>
          ) : (
            <span>Confirmar Reserva</span>
          )}
        </button>
      </div>
    </form>
  )
}
