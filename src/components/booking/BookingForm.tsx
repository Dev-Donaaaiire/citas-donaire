'use client'

import React, { useState } from 'react'
import { User, Mail, Phone, FileText, AlertTriangle, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react'
import type { Service, TimeSlot } from '@/types/booking'
import { formatCurrency, formatDateFull } from '@/lib/format'
import { isEmailBlacklisted } from '@/lib/booking-service'
import { cn } from '@/lib/utils'

interface BookingFormProps {
  service: Service
  selectedDate: Date
  selectedSlot: TimeSlot
  onSubmit: (formData: {
    clientName: string
    clientEmail: string
    clientPhone?: string
    notes?: string
  }) => Promise<void>
  isSubmitting: boolean
  onBack: () => void
}

export function BookingForm({
  service,
  selectedDate,
  selectedSlot,
  onSubmit,
  isSubmitting,
  onBack,
}: BookingFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [isBlacklisted, setIsBlacklisted] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleEmailBlur = async () => {
    if (email && email.includes('@')) {
      try {
        const blocked = await isEmailBlacklisted(email)
        setIsBlacklisted(blocked)
      } catch {
        // Ignorar fallo puntual
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!name.trim()) {
      setValidationError('Por favor introduce tu nombre completo.')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setValidationError('Por favor introduce un correo electrónico válido.')
      return
    }

    if (isBlacklisted) {
      setValidationError(
        'Este correo tiene restringidas las reservas automáticas. Por favor contacta al salón.'
      )
      return
    }

    await onSubmit({
      clientName: name.trim(),
      clientEmail: email.trim(),
      clientPhone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Resumen del servicio y fecha seleccionada */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md flex items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-0.5">
            Cita seleccionada
          </span>
          <h4 className="font-semibold text-zinc-100 text-sm sm:text-base">
            {service.nombre}
          </h4>
          <p className="text-xs text-emerald-400 font-mono mt-0.5">
            {formatDateFull(selectedDate)} a las {selectedSlot.time} h
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="font-mono text-lg font-bold text-white">
            {formatCurrency(Number(service.precio))}
          </span>
          <span className="block text-[11px] font-mono text-zinc-400">
            {service.duracion_minutos} min
          </span>
        </div>
      </div>

      {/* Alerta de validación o blacklist */}
      {isBlacklisted && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start gap-3 text-red-300">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="block font-semibold text-red-200">
              Email con reserva restringida
            </strong>
            Este correo figura en la lista de no-show por inasistencias pasadas sin cancelación previa. Contacta al salón al +34 612 345 678 para validar tu hueco.
          </div>
        </div>
      )}

      {validationError && (
        <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Campos del formulario */}
      <div className="space-y-4">
        {/* Nombre */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-zinc-400" />
            <span>Nombre completo</span>
            <span className="text-emerald-400">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej. Carlos Mendoza"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-zinc-900/60 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-zinc-400" />
            <span>Correo electrónico</span>
            <span className="text-emerald-400">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="Ej. carlos@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            className={cn(
              'w-full h-12 px-4 rounded-xl bg-zinc-900/60 border text-white placeholder:text-zinc-600 focus:outline-none transition-all text-sm',
              isBlacklisted
                ? 'border-red-500/60 focus:ring-1 focus:ring-red-500'
                : 'border-white/10 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50'
            )}
          />
          <p className="text-[11px] text-zinc-500">
            Te enviaremos los detalles y el enlace directo de cancelación si te surge un imprevisto.
          </p>
        </div>

        {/* Teléfono opcional */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-zinc-400" />
              <span>Teléfono móvil</span>
              <span className="text-zinc-500 text-[11px]">(Opcional)</span>
            </span>
            <span className="text-[11px] text-emerald-400/80 font-mono">
              Recordatorio por WhatsApp
            </span>
          </label>
          <input
            type="tel"
            placeholder="Ej. +34 612 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-zinc-900/60 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm"
          />
        </div>

        {/* Notas adicionales */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            <span>Petición o nota para el estilista</span>
            <span className="text-zinc-500 text-[11px]">(Opcional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="Ej. Degradado medio, piel sensible en el cuello, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 rounded-xl bg-zinc-900/60 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm resize-none"
          />
        </div>
      </div>

      {/* Garantía de privacidad sin llamadas */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-900/30 border border-white/5 text-zinc-400 text-xs">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Reserva 100% confirmada al instante. Sin llamadas ni creación de contraseñas.</span>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="h-12 px-5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800 text-sm font-medium transition-colors"
        >
          Atrás
        </button>

        <button
          type="submit"
          disabled={isSubmitting || isBlacklisted}
          className={cn(
            'flex-1 h-12 px-6 rounded-xl font-semibold text-sm transition-all duration-200 select-none cursor-pointer flex items-center justify-center gap-2',
            'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 active:scale-[0.98]',
            'shadow-[0_0_20px_rgb(var(--glow-rgb)/0.3)] disabled:opacity-50 disabled:pointer-events-none'
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Confirmando tu reserva...</span>
            </>
          ) : (
            <>
              <span>Confirmar Cita Ahora</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  )
}
