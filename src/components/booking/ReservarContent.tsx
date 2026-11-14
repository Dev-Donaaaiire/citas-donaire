'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Scissors,
  Calendar as CalendarIcon,
  User,
  CheckCircle2,
  Clock,
  ChevronLeft,
  Building2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import {
  getBookingInitialData,
  createBookingAppointment,
} from '@/lib/booking-service'
import { calculateAvailableSlots } from '@/lib/calendar'
import type {
  Service,
  TimeSlot,
  BusinessSettings,
  Appointment,
  BlockedSlot,
  BookingConfirmationDetails,
} from '@/types/booking'
import { ServiceCard } from '@/components/booking/ServiceCard'
import { CalendarMonth } from '@/components/booking/CalendarMonth'
import { TimeSlotsGrid } from '@/components/booking/TimeSlotsGrid'
import { BookingForm } from '@/components/booking/BookingForm'
import { BookingConfirmation } from '@/components/booking/BookingConfirmation'
import { BookingSummaryBar } from '@/components/booking/BookingSummaryBar'
import { cn } from '@/lib/utils'
import { useIsDemo } from '@/lib/use-is-demo'

export function ReservarContent() {
  const isDemo = useIsDemo()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [services, setServices] = useState<Service[]>([])
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Selecciones del usuario
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  // Confirmación
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmationDetails, setConfirmationDetails] =
    useState<BookingConfirmationDetails | null>(null)
  const [emailStatus, setEmailStatus] = useState<
    'idle' | 'sending' | 'sent' | 'simulated' | 'error'
  >('idle')

  // Carga inicial de datos desde Supabase
  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const data = await getBookingInitialData()
      setServices(data.services)
      setSettings(data.settings)
      setAppointments(data.appointments)
      setBlockedSlots(data.blockedSlots)

      if (data.services.length > 0) {
        setSelectedService((prev) => prev || data.services[0])
      }
    } catch (err: unknown) {
      console.error(err)
      setErrorMessage(
        'No se pudo conectar con el sistema de reservas. Inténtalo de nuevo.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    getBookingInitialData()
      .then((data) => {
        if (active) {
          setServices(data.services)
          setSettings(data.settings)
          setAppointments(data.appointments)
          setBlockedSlots(data.blockedSlots)
          if (data.services.length > 0) {
            setSelectedService(data.services[0])
          }
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          console.error(err)
          setErrorMessage(
            'No se pudo conectar con el sistema de reservas. Inténtalo de nuevo.'
          )
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  // Calcular slots disponibles para la fecha y servicio seleccionados
  const availableSlots = useMemo(() => {
    if (!selectedService || !selectedDate) return []
    return calculateAvailableSlots({
      targetDate: selectedDate,
      durationMinutes: selectedService.duracion_minutos,
      settings,
      appointments,
      blockedSlots,
    })
  }, [selectedDate, selectedService, settings, appointments, blockedSlots])

  const handleSelectService = (service: Service) => {
    setSelectedService(service)
    setSelectedSlot(null)
  }

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  // Manejar el envío del formulario sin registro
  const handleFormSubmit = async (formData: {
    clientName: string
    clientEmail: string
    clientPhone?: string
    notes?: string
  }) => {
    if (!selectedService || !selectedSlot) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const result = await createBookingAppointment({
        serviceId: selectedService.id,
        slotDatetime: selectedSlot.datetime,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone,
        notes: formData.notes,
      })

      const businessName =
        settings?.nombre_negocio || 'Krono / Donaire Luxury Hair & Styling'

      setConfirmationDetails({
        appointmentId: result.appointment.id,
        tokenCancelacion: result.appointment.token_cancelacion,
        service: result.service,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone,
        fechaHoraInicio: result.appointment.fecha_hora_inicio,
        fechaHoraFin: result.appointment.fecha_hora_fin,
        businessName,
      })

      setStep(4)
      setEmailStatus('sending')

      // Disparar envío automático de correos con .ics adjunto (dueño y cliente)
      void fetch('/api/notifications/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: result.appointment.id,
          tokenCancelacion: result.appointment.token_cancelacion,
          businessName,
          ownerEmail: settings?.email_notificaciones,
          serviceName: result.service.nombre,
          servicePrice: Number(result.service.precio),
          durationMinutes: result.service.duracion_minutos,
          clientName: formData.clientName,
          clientEmail: formData.clientEmail,
          clientPhone: formData.clientPhone,
          notes: formData.notes,
          startIso: result.appointment.fecha_hora_inicio,
          endIso: result.appointment.fecha_hora_fin,
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Error enviando email')
          const data = (await res.json()) as { simulated?: boolean }
          setEmailStatus(data.simulated ? 'simulated' : 'sent')
        })
        .catch(() => {
          setEmailStatus('error')
        })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al procesar la reserva'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetBooking = () => {
    setSelectedSlot(null)
    setConfirmationDetails(null)
    setEmailStatus('idle')
    setStep(1)
    loadData()
  }

  const stepsConfig = [
    { num: 1, label: 'Servicio', icon: Scissors },
    { num: 2, label: 'Horario', icon: CalendarIcon },
    { num: 3, label: 'Tus Datos', icon: User },
    { num: 4, label: 'Confirmada', icon: CheckCircle2 },
  ]

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-zinc-950 pb-28">
      {/* Barra superior / Navbar */}
      <header className="sticky top-[var(--demo-bar-h,0px)] z-30 w-full border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm shadow-sm">
              KD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-white">
                  {settings?.nombre_negocio || 'Krono / Donaire Citas'}
                </h1>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Reserva online 24/7 sin llamadas
              </p>
            </div>
          </div>

          <Link
            href={isDemo ? '/demo/admin' : '/admin'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/60 text-xs font-mono text-zinc-300 hover:text-white hover:border-white/20 transition-all active:scale-95"
          >
            <Building2 className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Panel Dueño</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </Link>
        </div>
      </header>

      {/* Indicador de pasos */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-6 pb-2">
        <div className="grid grid-cols-4 gap-2">
          {stepsConfig.map((s) => {
            const isCompleted = step > s.num
            const isCurrent = step === s.num
            const Icon = s.icon

            return (
              <div
                key={s.num}
                className={cn(
                  'flex flex-col items-center gap-1.5 text-center transition-all duration-200 select-none'
                )}
              >
                <div
                  className={cn(
                    'w-full h-1.5 rounded-full transition-all duration-300',
                    isCurrent
                      ? 'bg-emerald-400 shadow-[0_0_10px_rgb(var(--glow-rgb)/0.5)]'
                      : isCompleted
                      ? 'bg-zinc-700'
                      : 'bg-zinc-900'
                  )}
                />
                <span
                  className={cn(
                    'text-[11px] font-medium tracking-tight flex items-center gap-1',
                    isCurrent
                      ? 'text-emerald-400 font-semibold'
                      : isCompleted
                      ? 'text-zinc-400'
                      : 'text-zinc-600'
                  )}
                >
                  <Icon className="w-3 h-3 hidden sm:inline" />
                  <span>{s.label}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Contenido principal */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-4">
        {errorMessage && (
          <div className="mb-5 p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* PASO 1: Selección de Servicio */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Selecciona tu Servicio
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Elige la experiencia que deseas disfrutar. Duración y precio transparentes.
                </p>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-28 rounded-2xl bg-zinc-900/50 animate-pulse border border-white/5"
                    />
                  ))}
                </div>
              ) : (
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
              )}
            </motion.div>
          )}

          {/* PASO 2: Calendario y Horas Disponibles */}
          {step === 2 && selectedService && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors mb-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Cambiar servicio ({selectedService.nombre})</span>
                  </button>
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    Elige Fecha y Hora
                  </h2>
                </div>

                <div className="text-right">
                  <span className="font-mono text-sm font-semibold text-emerald-400">
                    {selectedService.duracion_minutos} min
                  </span>
                </div>
              </div>

              {/* Calendario mensual */}
              <CalendarMonth
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                durationMinutes={selectedService.duracion_minutos}
                settings={settings}
                appointments={appointments}
                blockedSlots={blockedSlots}
              />

              {/* Selector de Horas disponibles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-200 tracking-tight flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Huecos libres para este día</span>
                  </h3>
                  <span className="text-xs font-mono text-emerald-400/90">
                    {availableSlots.filter((s) => s.isAvailable).length} disponibles
                  </span>
                </div>

                <TimeSlotsGrid
                  slots={availableSlots}
                  selectedSlot={selectedSlot}
                  onSelectSlot={(slot) => setSelectedSlot(slot)}
                  isLoading={isLoading}
                />
              </div>
            </motion.div>
          )}

          {/* PASO 3: Formulario sin registro */}
          {step === 3 && selectedService && selectedSlot && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors mb-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Modificar fecha u hora</span>
                </button>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Tus Datos de Contacto
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Reserva en 30 segundos sin contraseñas ni llamadas.
                </p>
              </div>

              <BookingForm
                service={selectedService}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                onBack={() => setStep(2)}
              />
            </motion.div>
          )}

          {/* PASO 4: Confirmación Instantánea */}
          {step === 4 && confirmationDetails && (
            <BookingConfirmation
              details={confirmationDetails}
              emailStatus={emailStatus}
              onBookAnother={handleResetBooking}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Barra fija inferior táctil para móvil */}
      <BookingSummaryBar
        currentStep={step}
        selectedService={selectedService}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        onContinue={() => {
          if (step === 1 && selectedService) setStep(2)
          else if (step === 2 && selectedSlot) setStep(3)
        }}
      />
    </div>
  )
}
