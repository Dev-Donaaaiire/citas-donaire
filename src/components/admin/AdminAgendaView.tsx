'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  User,
  CheckCircle,
  XCircle,
  Ban,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from 'lucide-react'
import type { Appointment, BlockedSlot } from '@/types/booking'
import { formatCurrency, formatDateFull, formatTime, formatDateKey } from '@/lib/format'
import {
  updateAppointmentStatus,
  deleteBlockedSlot,
  createBlockedSlot,
} from '@/lib/booking-service'
import { AdminBlockSlotModal } from './AdminBlockSlotModal'
import { cn } from '@/lib/utils'

interface AdminAgendaViewProps {
  appointments: Appointment[]
  blockedSlots: BlockedSlot[]
  onRefresh: () => void
}

export function AdminAgendaView({
  appointments,
  blockedSlots,
  onRefresh,
}: AdminAgendaViewProps) {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const selectedDateKey = formatDateKey(selectedDate)

  // Desplazamiento de fechas
  const handlePrevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - (viewMode === 'daily' ? 1 : 7))
    setSelectedDate(d)
  }

  const handleNextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + (viewMode === 'daily' ? 1 : 7))
    setSelectedDate(d)
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  // Filtrar citas según la vista diaria o semanal
  const filteredAppointments = useMemo(() => {
    if (viewMode === 'daily') {
      return appointments.filter((appt) => {
        const apptDateKey = formatDateKey(new Date(appt.fecha_hora_inicio))
        return apptDateKey === selectedDateKey
      })
    } else {
      // Semana completa
      const dayOfWeek = selectedDate.getDay()
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const weekStart = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate() - daysSinceMonday,
        0,
        0,
        0
      )
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

      return appointments.filter((appt) => {
        const d = new Date(appt.fecha_hora_inicio)
        return d >= weekStart && d < weekEnd
      })
    }
  }, [appointments, viewMode, selectedDate, selectedDateKey])

  // Manejar cambio de estado en 1 clic
  const handleStatusChange = async (
    apptId: string,
    status: 'completada' | 'cancelada' | 'confirmada'
  ) => {
    setProcessingId(apptId)
    try {
      await updateAppointmentStatus(apptId, status)
      onRefresh()
    } catch (err) {
      console.error(err)
      alert('Error al actualizar la cita.')
    } finally {
      setProcessingId(null)
    }
  }

  // Manejar eliminación de bloqueo
  const handleDeleteBlock = async (id: string) => {
    if (!confirm('¿Deseas desbloquear este horario?')) return
    try {
      await deleteBlockedSlot(id)
      onRefresh()
    } catch (err) {
      console.error(err)
      alert('Error al eliminar bloqueo.')
    }
  }

  // Guardar nuevo bloqueo
  const handleSaveBlock = async (data: {
    fechaInicio: string
    fechaFin: string
    motivo: string
  }) => {
    await createBlockedSlot(data)
    onRefresh()
  }

  return (
    <div className="space-y-6">
      {/* Controles superiores de la agenda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/10 backdrop-blur-md">
        {/* Selector de modo y botones de día */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-zinc-800/80 p-1 border border-white/5">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none',
                viewMode === 'daily'
                  ? 'bg-zinc-700 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Vista Diaria
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none',
                viewMode === 'weekly'
                  ? 'bg-zinc-700 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Vista Semanal
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Hoy
          </button>
        </div>

        {/* Navegador de fechas */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs sm:text-sm font-semibold text-zinc-100 capitalize px-2 font-mono">
              {viewMode === 'daily'
                ? formatDateFull(selectedDate)
                : `Semana del ${selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}
            </span>

            <button
              type="button"
              onClick={handleNextDay}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botón para abrir modal de bloqueo */}
          <button
            type="button"
            onClick={() => setIsBlockModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all active:scale-95"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Bloquear Horas/Día</span>
          </button>
        </div>
      </div>

      {/* Grid de citas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-zinc-200 tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>
              Citas Programadas ({filteredAppointments.length})
            </span>
          </h3>
          <span className="text-xs text-zinc-500 font-mono">
            Actualización en tiempo real
          </span>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="p-8 rounded-2xl bg-zinc-900/30 border border-white/5 text-center text-zinc-400 text-sm">
            No hay citas programadas para el período seleccionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredAppointments.map((appt) => {
              const client = appt.clients
              const service = appt.services
              const isProcessing = processingId === appt.id

              return (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'p-4 sm:p-5 rounded-2xl border transition-all duration-200 backdrop-blur-md',
                    appt.estado === 'completada'
                      ? 'bg-zinc-900/30 border-white/5 opacity-80'
                      : appt.estado === 'cancelada'
                      ? 'bg-red-950/20 border-red-500/20 opacity-70'
                      : 'bg-zinc-900/70 border-white/10 shadow-lg'
                  )}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Horario y Estado */}
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-zinc-800/80 border border-white/10 text-center min-w-[85px] shrink-0">
                        <span className="text-sm font-mono font-bold text-white block">
                          {formatTime(appt.fecha_hora_inicio)}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 block">
                          {formatTime(appt.fecha_hora_fin)}
                        </span>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-base text-zinc-100 tracking-tight">
                            {service?.nombre || 'Servicio'}
                          </h4>
                          <span
                            className={cn(
                              'text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-semibold',
                              appt.estado === 'completada'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : appt.estado === 'cancelada'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            )}
                          >
                            {appt.estado}
                          </span>
                        </div>

                        {/* Datos del cliente */}
                        <div className="flex items-center gap-3 text-xs text-zinc-300 flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-white">
                            <User className="w-3.5 h-3.5 text-zinc-400" />
                            {client?.nombre || 'Cliente sin nombre'}
                          </span>
                          {client?.telefono && (
                            <a
                              href={`https://wa.me/${client.telefono.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-emerald-400 hover:underline font-mono text-[11px]"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{client.telefono}</span>
                            </a>
                          )}
                          {client?.email && (
                            <span className="text-zinc-500 text-[11px] font-mono truncate">
                              {client.email}
                            </span>
                          )}
                        </div>

                        {/* Precio y duración */}
                        <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 pt-1">
                          <span className="text-emerald-400 font-semibold">
                            {formatCurrency(Number(service?.precio || 0))}
                          </span>
                          <span>•</span>
                          <span>{service?.duracion_minutos || 45} min</span>
                          <span>•</span>
                          <span className="text-zinc-500 capitalize">
                            {new Date(appt.fecha_hora_inicio).toLocaleDateString('es-ES', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones en 1 clic para el dueño */}
                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5 w-full lg:w-auto justify-end">
                      {appt.estado !== 'completada' && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleStatusChange(appt.id, 'completada')}
                          className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5"
                          title="Marcar cita como atendida y actualizar última visita del cliente"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Completada (1 clic)</span>
                        </button>
                      )}

                      {appt.estado !== 'cancelada' && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleStatusChange(appt.id, 'cancelada')}
                          className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:bg-red-950/60 hover:text-red-300 hover:border-red-500/30 border border-white/5 text-xs font-medium transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
                        </button>
                      )}

                      {appt.estado === 'completada' && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleStatusChange(appt.id, 'confirmada')}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs"
                        >
                          Reabrir
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bloqueos Activos del Salón */}
      <div className="p-5 rounded-2xl bg-zinc-900/40 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-400" />
            <h4 className="text-sm font-semibold text-zinc-200 tracking-tight">
              Horas y Días Bloqueados ({blockedSlots.length})
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setIsBlockModalOpen(true)}
            className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-mono"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo bloqueo</span>
          </button>
        </div>

        {blockedSlots.length === 0 ? (
          <p className="text-xs text-zinc-500">
            No hay bloqueos activos en el calendario. Todos los horarios estándar están disponibles.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {blockedSlots.map((block) => (
              <div
                key={block.id}
                className="p-3 rounded-xl bg-zinc-950/50 border border-white/5 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-semibold text-zinc-200 block">
                    {block.motivo || 'Bloqueo programado'}
                  </span>
                  <span className="font-mono text-zinc-400 text-[11px]">
                    {new Date(block.fecha_inicio).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    • {formatTime(block.fecha_inicio)} - {formatTime(block.fecha_fin)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteBlock(block.id)}
                  className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  title="Eliminar bloqueo y liberar horario"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para añadir bloqueo */}
      <AdminBlockSlotModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onSave={handleSaveBlock}
      />
    </div>
  )
}
