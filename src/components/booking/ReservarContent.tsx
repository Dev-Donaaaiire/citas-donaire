'use client'

import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Check,
  Calendar as CalendarIcon,
  Clock,
  UserCheck,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Lock,
} from 'lucide-react'
import {
  fetchPublicAvailabilityData,
  submitPublicBooking,
} from '@/lib/booking-service'
import type { PublicBookingInitialData } from '@/lib/data/public-booking'
import { calculateAvailableSlots, formatDateKey } from '@/lib/calendar'
import { formatDateFull } from '@/lib/format'
import {
  addDaysToIsoDate,
  getTodayIsoInTimeZone,
  sanitizeTimeZone,
  zonedDateTimeToUtc,
} from '@/lib/timezone'
import type {
  Service,
  TimeSlot,
  BookingConfirmationDetails,
} from '@/types/booking'
import { useIsDemo } from '@/lib/use-is-demo'
import { ServiceCard } from '@/components/booking/ServiceCard'
import { CalendarMonth } from '@/components/booking/CalendarMonth'
import { TimeSlotsGrid } from '@/components/booking/TimeSlotsGrid'
import { BookingForm } from '@/components/booking/BookingForm'
import { BookingConfirmation } from '@/components/booking/BookingConfirmation'
import { BookingSummaryBar } from '@/components/booking/BookingSummaryBar'
import { useBusinessTheme } from '@/components/theme/BusinessThemeSync'

const SPRING_TRANSITION = { type: 'spring', stiffness: 350, damping: 28 } as const

type BookingStep = 1 | 2 | 3 | 4

function findInitialAvailableDate(data: PublicBookingInitialData): Date {
  const tz = sanitizeTimeZone(data.settings.timezone)
  const todayIso = getTodayIsoInTimeZone(tz)
  const defaultDuration = data.services[0]?.duracion_minutos || 30

  for (let i = 0; i < 14; i += 1) {
    const candidateIso = addDaysToIsoDate(todayIso, i)
    const slots = calculateAvailableSlots({
      date: candidateIso,
      serviceDurationMinutes: defaultDuration,
      settings: data.settings,
      busyIntervals: data.busyIntervals,
    })
    if (slots.some((s) => s.isAvailable)) {
      return zonedDateTimeToUtc(candidateIso, '12:00', tz)
    }
  }

  return zonedDateTimeToUtc(todayIso, '12:00', tz)
}

interface ReservarContentProps {
  initialData: PublicBookingInitialData
  rescheduleToken?: string | null
  initialServiceId?: string | null
}

export function ReservarContent({
  initialData,
  rescheduleToken = null,
  initialServiceId = null,
}: ReservarContentProps) {
  const isDemoRoute = useIsDemo()

  const [bookingData, setBookingData] =
    useState<PublicBookingInitialData>(initialData)

  const preselectedService = useMemo(() => {
    if (initialServiceId) {
      return (
        bookingData.services.find((s) => s.id === initialServiceId) ||
        bookingData.services[0] ||
        null
      )
    }
    return bookingData.services[0] || null
  }, [bookingData.services, initialServiceId])

  const [step, setStep] = useState<BookingStep>(() =>
    rescheduleToken ? 2 : 1
  )
  const [selectedServiceState, setSelectedService] = useState<Service | null>(
    preselectedService
  )
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    findInitialAvailableDate(initialData)
  )
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [confirmationDetails, setConfirmationDetails] =
    useState<BookingConfirmationDetails | null>(null)

  useEffect(() => {
    if (rescheduleToken) {
      setConfirmationDetails(null)
      setSelectedSlot(null)
      setSubmitError(null)
      setEmailStatus('idle')
      if (initialServiceId) {
        const found = bookingData.services.find((s) => s.id === initialServiceId)
        if (found) setSelectedService(found)
      }
      setStep(2)
    }
  }, [rescheduleToken, initialServiceId, bookingData.services])

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [emailStatus, setEmailStatus] = useState<
    'idle' | 'sending' | 'queued' | 'sent' | 'simulated' | 'error'
  >('idle')

  const settings = bookingData.settings
  const services = bookingData.services
  const busyIntervals = bookingData.busyIntervals
  const tz = sanitizeTimeZone(settings.timezone)
  const selectedService = selectedServiceState ?? preselectedService ?? services[0] ?? null

  // El cliente ve exactamente el tema que el dueño configuró en /setup
  useBusinessTheme(settings.tema_activo, !isDemoRoute)

  const refreshAvailability = async () => {
    setIsRefreshing(true)
    try {
      const updated = await fetchPublicAvailabilityData(isDemoRoute)
      setBookingData(updated)
    } catch {
      // Mantiene datos actuales en memoria si hay microcorte de red
    } finally {
      setIsRefreshing(false)
    }
  }

  const availableSlots = useMemo(() => {
    if (!selectedService) return []
    return calculateAvailableSlots({
      date: formatDateKey(selectedDate, tz),
      serviceDurationMinutes: selectedService.duracion_minutos,
      settings,
      busyIntervals,
    })
  }, [selectedDate, selectedService, settings, busyIntervals, tz])

  const handleSelectService = (service: Service) => {
    setSelectedService(service)
    setSelectedSlot(null)
    setSubmitError(null)

    const currentHasSlots = calculateAvailableSlots({
      date: formatDateKey(selectedDate, tz),
      serviceDurationMinutes: service.duracion_minutos,
      settings,
      busyIntervals,
    }).some((s) => s.isAvailable)

    if (!currentHasSlots) {
      const todayIso = getTodayIsoInTimeZone(tz)
      for (let i = 0; i < 14; i += 1) {
        const candidateIso = addDaysToIsoDate(todayIso, i)
        const slots = calculateAvailableSlots({
          date: candidateIso,
          serviceDurationMinutes: service.duracion_minutos,
          settings,
          busyIntervals,
        })
        if (slots.some((s) => s.isAvailable)) {
          setSelectedDate(zonedDateTimeToUtc(candidateIso, '12:00', tz))
          break
        }
      }
    }

    setStep(2)
  }

  const handleBookingSubmit = async (formData: {
    nombre: string
    email: string
    telefono: string
    notas: string
    website: string
  }) => {
    if (!selectedService || !selectedSlot) return
    setIsSubmitting(true)
    setSubmitError(null)
    setEmailStatus('sending')

    try {
      const result = await submitPublicBooking({
        serviceId: selectedService.id,
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono,
        notas: formData.notas,
        website: formData.website,
        slotDatetime: selectedSlot.datetime,
        rescheduleToken: rescheduleToken || null,
        isDemo: isDemoRoute,
      })

      setEmailStatus(
        !result.emailResult.success
          ? 'error'
          : result.emailResult.status === 'simulated' ||
              result.emailResult.simulated
            ? 'simulated'
            : result.emailResult.status === 'sent'
              ? 'sent'
              : 'queued'
      )

      setConfirmationDetails({
        appointmentId: result.appointment.id,
        tokenCancelacion: result.appointment.token_cancelacion,
        service: result.service,
        clientName: formData.nombre,
        clientEmail: formData.email,
        clientPhone: formData.telefono,
        fechaHoraInicio: result.appointment.fecha_hora_inicio,
        fechaHoraFin: result.appointment.fecha_hora_fin,
        businessName: result.businessSettings.nombre_negocio,
        businessAddress: result.businessSettings.direccion,
        businessPhone: result.businessSettings.telefono_contacto,
        businessTimezone: result.businessSettings.timezone,
        rescheduled: result.rescheduled,
      })

      setStep(4)
      await refreshAvailability()
    } catch (err: unknown) {
      setEmailStatus('idle')
      const message =
        err instanceof Error
          ? err.message
          : 'No pudimos confirmar tu reserva en este momento. Intenta con otra hora.'
      setSubmitError(message)
      await refreshAvailability()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setConfirmationDetails(null)
    setSelectedSlot(null)
    setSubmitError(null)
    setEmailStatus('idle')
    setStep(1)
  }

  const stepsInfo = [
    { num: 1, label: 'Servicio', icon: Sparkles },
    { num: 2, label: 'Fecha y Hora', icon: CalendarIcon },
    { num: 3, label: 'Tus Datos', icon: UserCheck },
  ]

  // Caso 1: Licencia inválida / caducada / faltante en producción
  if (bookingData.licenseBlocked) {
    return (
      <div className="min-h-dvh bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full rounded-2xl bg-zinc-900/70 border border-white/10 p-6 sm:p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Agenda temporalmente pausada
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            La reserva online de este establecimiento está pendiente de
            activación administrativa.
          </p>
          {settings.telefono_contacto && (
            <p className="text-xs font-mono text-zinc-300">
              Contacto directo: {settings.telefono_contacto}
            </p>
          )}
          <div className="pt-2">
            <Link
              href="/setup"
              className="inline-flex min-h-12 px-5 items-center justify-center rounded-xl bg-zinc-800 border border-white/10 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
            >
              Ir al Panel / Setup (Propietario)
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Caso 2: Negocio aún sin setup inicial o sin servicios activos
  if (bookingData.needsSetup || services.length === 0) {
    return (
      <div className="min-h-dvh bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full rounded-2xl bg-zinc-900/70 border border-white/10 p-6 sm:p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            {settings.nombre_negocio}
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Aún no hay servicios públicos configurados en el catálogo. Completa
            el asistente inicial en 2 minutos para empezar a aceptar reservas.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2 justify-center">
            <Link
              href="/setup"
              className="min-h-12 px-5 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-semibold flex items-center justify-center hover:bg-emerald-400 transition-colors"
            >
              Configurar mi negocio
            </Link>
            <Link
              href="/demo"
              className="min-h-12 px-5 rounded-xl bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-medium flex items-center justify-center hover:bg-zinc-700 transition-colors"
            >
              Probar Demo Live
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Navbar minimalista superior */}
      <header className="border-b border-white/10 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center font-bold text-emerald-400 font-mono text-sm shrink-0">
              {settings.nombre_negocio.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-white truncate">
                {settings.nombre_negocio}
              </h1>
              <p className="text-xs text-zinc-400 truncate">
                {settings.direccion || 'Reserva online instantánea'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={refreshAvailability}
              disabled={isRefreshing}
              aria-label="Actualizar disponibilidad"
              className="min-w-12 min-h-12 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
            {isDemoRoute && (
              <Link
                href="/demo/admin"
                className="min-h-12 px-3 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-300 hover:text-white transition-colors font-medium flex items-center"
              >
                Panel Demo
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-36 sm:pb-12">
        {/* Aviso si estamos en /demo con BD real en producción (sandbox aislado) */}
        {bookingData.isSandboxFallback && (
          <div className="mb-5 p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 text-xs text-zinc-300 flex items-center justify-between gap-3">
            <span>
              <strong className="text-emerald-400">Demo Sandbox:</strong>{' '}
              entorno de prueba aislado. Tus clics no afectan a datos reales.
            </span>
          </div>
        )}

        {/* Aviso de Reprogramación segura sin pérdida de cita previa */}
        {rescheduleToken && step < 4 && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs sm:text-sm text-emerald-200 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-emerald-100">
                Reprogramando tu cita actual
              </p>
              <p className="text-emerald-200/80 leading-relaxed">
                Tu cita anterior seguirá confirmada hasta que completes la
                elección y confirmes tu nuevo horario.
              </p>
            </div>
          </div>
        )}

        {/* Indicador de Progreso */}
        {step < 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              <div
                aria-hidden="true"
                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-800 z-0"
              />
              {stepsInfo.map((item) => {
                const isActive = step === item.num
                const isCompleted = step > item.num
                const Icon = item.icon

                return (
                  <button
                    key={item.num}
                    type="button"
                    disabled={item.num > step && (!selectedService || step === 1)}
                    onClick={() => {
                      if (item.num < step) setStep(item.num as BookingStep)
                    }}
                    className={`relative z-10 flex items-center gap-2 px-3 min-h-12 rounded-full border transition-all duration-200 ${
                      isActive
                        ? 'bg-zinc-900 border-emerald-500/60 text-white shadow-sm'
                        : isCompleted
                          ? 'bg-zinc-900 border-emerald-500/40 text-emerald-400 cursor-pointer hover:bg-zinc-800'
                          : 'bg-zinc-950 border-white/10 text-zinc-400 cursor-default'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono ${
                        isActive
                          ? 'bg-emerald-500 text-zinc-950 font-bold'
                          : isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Icon className="w-3 h-3" />
                      )}
                    </span>
                    <span className="text-xs font-medium hidden sm:inline">
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* PASO 1: SELECCIONAR SERVICIO */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={SPRING_TRANSITION}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                  Elige tu servicio
                </h2>
                <p className="text-sm text-zinc-400">
                  Selecciona el servicio para consultar los huecos exactos
                  según su duración.
                </p>
              </div>

              <div className="space-y-3">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isSelected={selectedService?.id === service.id}
                    onSelect={handleSelectService}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* PASO 2: FECHA Y HORA */}
          {step === 2 && selectedService && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={SPRING_TRANSITION}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white">
                    Elige día y hora
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Para{' '}
                    <span className="text-zinc-200 font-medium">
                      {selectedService.nombre}
                    </span>{' '}
                    ({selectedService.duracion_minutos} min)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="self-start sm:self-auto min-h-12 px-3 text-xs text-zinc-400 hover:text-zinc-100 underline underline-offset-4"
                >
                  Cambiar servicio
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-7">
                  <CalendarMonth
                    selectedDate={selectedDate}
                    onSelectDate={(d) => {
                      setSelectedDate(d)
                      setSelectedSlot(null)
                    }}
                    durationMinutes={selectedService.duracion_minutos}
                    settings={settings}
                    busyIntervals={busyIntervals}
                  />
                </div>

                <div className="md:col-span-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-200 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>
                        Horarios del{' '}
                        <span className="lowercase">
                          {formatDateFull(selectedDate, tz)}
                        </span>
                      </span>
                    </h3>
                    <span className="text-xs font-mono text-zinc-400 shrink-0 ml-2">
                      {availableSlots.filter((s) => s.isAvailable).length}{' '}
                      disp.
                    </span>
                  </div>

                  <TimeSlotsGrid
                    slots={availableSlots}
                    selectedSlot={selectedSlot}
                    onSelectSlot={setSelectedSlot}
                  />

                  {/* CTA Continuar visible en desktop debajo de los horarios */}
                  <div className="hidden sm:flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      disabled={!selectedSlot}
                      onClick={() => setStep(3)}
                      className="w-full min-h-12 px-5 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-sm hover:bg-emerald-400 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgb(var(--glow-rgb)/0.2)]"
                    >
                      <span>
                        {selectedSlot
                          ? `Continuar a las ${selectedSlot.time} h`
                          : 'Selecciona una hora disponible'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* PASO 3: DATOS PERSONALES */}
          {step === 3 && selectedService && selectedSlot && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={SPRING_TRANSITION}
              className="space-y-6 max-w-lg mx-auto"
            >
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Tus datos para confirmar
                </h2>
                <p className="text-sm text-zinc-400">
                  Recibirás un enlace directo por si necesitas anular o cambiar
                  tu hora.
                </p>
              </div>

              <BookingForm
                service={selectedService}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                timezone={tz}
                formFields={initialData.settings?.campos_formulario || undefined}
                onSubmit={handleBookingSubmit}
                isSubmitting={isSubmitting}
                submitError={submitError}
                onBack={() => setStep(2)}
              />
            </motion.div>
          )}

          {/* PASO 4: CONFIRMACIÓN */}
          {step === 4 && confirmationDetails && (
            <BookingConfirmation
              details={confirmationDetails}
              emailStatus={emailStatus}
              onBookAnother={handleReset}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Pie de página discreto con acceso para el dueño */}
      <footer className="mt-16 py-8 border-t border-white/5 text-center text-xs text-zinc-500">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between gap-4">
          <span className="font-mono text-[11px] text-zinc-500 truncate">
            {settings.nombre_negocio || 'Reservas Online'}
          </span>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors py-1 px-2.5 rounded-lg hover:bg-zinc-900/60 font-mono text-[11px]"
            title="Acceso de propietario al panel"
          >
            <Lock className="w-3 h-3 text-zinc-500" />
            <span>Acceso Dueño</span>
          </Link>
        </div>
      </footer>

      {/* Barra pegajosa inferior para el pulgar en pasos 1 y 2 */}
      {step < 3 && (
        <BookingSummaryBar
          service={selectedService}
          selectedDate={step === 2 ? selectedDate : null}
          selectedSlot={step === 2 ? selectedSlot : null}
          step={step as 1 | 2}
          timeZone={tz}
          onContinue={() => {
            if (step === 1 && selectedService) setStep(2)
            else if (step === 2 && selectedSlot) setStep(3)
          }}
        />
      )}
    </div>
  )
}
