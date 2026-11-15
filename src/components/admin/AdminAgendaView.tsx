'use client'

import React, { useMemo, useState } from 'react'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Lock,
  Trash2,
  Phone,
  Calendar as CalendarIcon,
  Plus,
  Loader2,
  UserX,
} from 'lucide-react'
import type { Appointment, BlockedSlot } from '@/types/booking'
import { formatCurrency, formatDateFull, formatTime, formatDateKey } from '@/lib/format'
import {
  addDaysToIsoDate,
  getTodayIsoInTimeZone,
  sanitizeTimeZone,
  zonedDateTimeToUtc,
} from '@/lib/timezone'
import { updateAppointmentStatus, deleteBlockedSlot } from '@/lib/booking-service'
import { cn } from '@/lib/utils'
import { AdminBlockSlotModal } from '@/components/admin/AdminBlockSlotModal'
import { useFeedback } from '@/components/ui/FeedbackProvider'

interface AdminAgendaViewProps {
  appointments: Appointment[]
  blockedSlots: BlockedSlot[]
  timezone?: string | null
  isDemo?: boolean
  isSandboxFallback?: boolean
  onRefresh: (range?: { fromIso: string; toIso: string }) => void
  onSandboxStatusUpdate?: (
    appointmentId: string,
    newStatus: 'confirmada' | 'cancelada' | 'completada' | 'no_show'
  ) => void
  onSandboxBlockAdd?: (slot: BlockedSlot) => void
  onSandboxBlockDelete?: (id: string) => void
}

export function AdminAgendaView({
  appointments,
  blockedSlots,
  timezone = 'Europe/Madrid',
  isDemo = false,
  isSandboxFallback = false,
  onRefresh,
  onSandboxStatusUpdate,
  onSandboxBlockAdd,
  onSandboxBlockDelete,
}: AdminAgendaViewProps) {
  const { notify, confirmAction } = useFeedback()
  const tz = sanitizeTimeZone(timezone)
  const todayKey = getTodayIsoInTimeZone(tz)

  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey)
  const [viewMode, setViewMode] = useState<'day' | 'upcoming'>('day')
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const dateTabs = useMemo(() => {
    const labelFmt = new Intl.DateTimeFormat('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: tz,
    })

    const list: { key: string; label: string }[] = []
    for (let i = 0; i < 7; i += 1) {
      const iso = addDaysToIsoDate(todayKey, i)
      const noon = zonedDateTimeToUtc(iso, '12:00', tz)
      const label =
        i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : labelFmt.format(noon)
      list.push({ key: iso, label })
    }
    return list
  }, [todayKey, tz])

  const filteredAppointments = useMemo(() => {
    const now = new Date()
    const list = appointments.filter((appt) => {
      if (viewMode === 'day') {
        return formatDateKey(appt.fecha_hora_inicio, tz) === selectedDateKey
      }
      return (
        new Date(appt.fecha_hora_inicio) >= now ||
        formatDateKey(appt.fecha_hora_inicio, tz) === todayKey
      )
    })

    return list.sort(
      (a, b) =>
        new Date(a.fecha_hora_inicio).getTime() -
        new Date(b.fecha_hora_inicio).getTime()
    )
  }, [appointments, viewMode, selectedDateKey, todayKey, tz])

  const filteredBlocks = useMemo(() => {
    return blockedSlots
      .filter((b) => {
        if (viewMode === 'day') {
          const bStart = formatDateKey(b.fecha_inicio, tz)
          const bEnd = formatDateKey(b.fecha_fin, tz)
          return bStart <= selectedDateKey && bEnd >= selectedDateKey
        }
        return new Date(b.fecha_fin) >= new Date()
      })
      .sort(
        (a, b) =>
          new Date(a.fecha_inicio).getTime() -
          new Date(b.fecha_inicio).getTime()
      )
  }, [blockedSlots, viewMode, selectedDateKey, tz])

  const handleJumpDate = (newIsoDate: string) => {
    if (!newIsoDate) return
    setSelectedDateKey(newIsoDate)
    setViewMode('day')
    // Cargar ventana alrededor de la fecha elegida (paginación temporal en servidor)
    const fromIso = zonedDateTimeToUtc(
      addDaysToIsoDate(newIsoDate, -7),
      '00:00',
      tz
    ).toISOString()
    const toIso = zonedDateTimeToUtc(
      addDaysToIsoDate(newIsoDate, 31),
      '23:59',
      tz
    ).toISOString()
    onRefresh({ fromIso, toIso })
  }

  const handleUpdateStatus = async (
    apptId: string,
    status: 'completada' | 'cancelada' | 'no_show'
  ) => {
    if (status === 'cancelada' || status === 'no_show') {
      const ok = await confirmAction({
        title:
          status === 'no_show'
            ? '¿Marcar cita como No-Show?'
            : '¿Cancelar esta cita?',
        description:
          status === 'no_show'
            ? 'Se incrementará el contador de ausencias del cliente (si acumula 2, se bloqueará automáticamente).'
            : 'La cita pasará a estado cancelada y liberará el hueco en el calendario público.',
        confirmLabel:
          status === 'no_show' ? 'Registrar No-Show' : 'Sí, cancelar cita',
        cancelLabel: 'Volver',
        tone: 'danger',
      })
      if (!ok) return
    }

    setUpdatingId(apptId)
    try {
      await updateAppointmentStatus(apptId, status, isDemo)
      notify({
        type: 'success',
        title: 'Estado actualizado',
        description:
          status === 'completada'
            ? 'Cita marcada como completada.'
            : status === 'no_show'
              ? 'No-show registrado correctamente.'
              : 'Cita cancelada y horario liberado.',
      })
      if (isSandboxFallback && onSandboxStatusUpdate) {
        onSandboxStatusUpdate(apptId, status)
      } else {
        onRefresh()
      }
    } catch (err) {
      notify({
        type: 'error',
        title: 'Error al actualizar cita',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeleteBlock = async (id: string) => {
    const confirmed = await confirmAction({
      title: '¿Desbloquear este tramo horario?',
      description:
        'El intervalo volverá a aparecer como disponible si está dentro del horario comercial.',
      confirmLabel: 'Desbloquear horario',
      cancelLabel: 'Mantener bloqueo',
      tone: 'neutral',
    })
    if (!confirmed) return

    setUpdatingId(id)
    try {
      await deleteBlockedSlot(id, isDemo)
      notify({
        type: 'success',
        title: 'Tramo desbloqueado',
      })
      if (isSandboxFallback && onSandboxBlockDelete) {
        onSandboxBlockDelete(id)
      } else {
        onRefresh()
      }
    } catch (err) {
      notify({
        type: 'error',
        title: 'Error al eliminar bloqueo',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const statusBadge = (estado: string) => {
    switch (estado) {
      case 'confirmada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Confirmada
          </span>
        )
      case 'completada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-200 border border-white/10">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Completada
          </span>
        )
      case 'cancelada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ui-badge-danger border">
            <XCircle className="w-3 h-3" />
            Cancelada
          </span>
        )
      case 'no_show':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ui-badge-danger border">
            <UserX className="w-3 h-3" />
            No-Show
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25">
            {estado}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra de controles superior */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Tabs de fecha rápida */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {dateTabs.map((tab) => {
            const isActive = viewMode === 'day' && selectedDateKey === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setViewMode('day')
                  setSelectedDateKey(tab.key)
                }}
                className={cn(
                  'min-h-12 px-4 rounded-xl text-xs font-medium whitespace-nowrap transition-all border shrink-0 active:scale-[0.98]',
                  isActive
                    ? 'ui-btn-contrast border-transparent font-semibold'
                    : 'bg-zinc-900/60 border-white/10 text-zinc-300 hover:text-white hover:border-white/20'
                )}
              >
                {tab.label}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setViewMode('upcoming')}
            className={cn(
              'min-h-12 px-4 rounded-xl text-xs font-medium whitespace-nowrap transition-all border shrink-0 active:scale-[0.98]',
              viewMode === 'upcoming'
                ? 'ui-btn-contrast border-transparent font-semibold'
                : 'bg-zinc-900/60 border-white/10 text-zinc-300 hover:text-white hover:border-white/20'
            )}
          >
            Próximas (+7 días)
          </button>
        </div>

        {/* Selector de mes/fecha concreta y botón bloquear */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <label htmlFor="admin-jump-date" className="sr-only">
            Ir a fecha específica
          </label>
          <input
            id="admin-jump-date"
            type="date"
            value={selectedDateKey}
            onChange={(e) => handleJumpDate(e.target.value)}
            className="min-h-12 px-3 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500/60"
          />

          <button
            type="button"
            onClick={() => setShowBlockModal(true)}
            className="min-h-12 px-4 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 hover:border-white/20 text-zinc-100 text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Bloquear Horario / Día</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna principal: Agenda de Citas */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-zinc-400" />
              <span>
                {viewMode === 'day'
                  ? formatDateFull(selectedDateKey, tz)
                  : 'Próximas reservas confirmadas'}
              </span>
            </h3>
            <span className="text-xs font-mono text-zinc-400">
              {filteredAppointments.length} cita
              {filteredAppointments.length === 1 ? '' : 's'}
            </span>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="p-10 rounded-2xl bg-zinc-900/30 border border-white/10 text-center space-y-2">
              <p className="text-sm font-medium text-zinc-300">
                No hay citas para mostrar aquí
              </p>
              <p className="text-xs text-zinc-400">
                Tu link público de reservas está listo para recibir citas 24/7.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAppointments.map((appt) => {
                const isUpdating = updatingId === appt.id
                const isCancelled =
                  appt.estado === 'cancelada' || appt.estado === 'no_show'

                return (
                  <div
                    key={appt.id}
                    className={cn(
                      'p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                      isCancelled
                        ? 'bg-zinc-900/20 border-white/5 opacity-70'
                        : 'bg-zinc-900/60 border-white/10 hover:border-white/20 backdrop-blur-md'
                    )}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-center shrink-0 min-w-[78px]">
                        <span className="block text-sm font-bold font-mono text-white">
                          {formatTime(appt.fecha_hora_inicio, tz)}
                        </span>
                        <span className="block text-[10px] font-mono text-zinc-400">
                          {formatTime(appt.fecha_hora_fin, tz)}
                        </span>
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-medium text-sm sm:text-base text-zinc-100 truncate">
                            {appt.client?.nombre || 'Cliente'}
                          </h4>
                          {statusBadge(appt.estado)}
                        </div>

                        <p className="text-xs text-zinc-300 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-medium text-emerald-400">
                            {appt.service?.nombre || 'Servicio'}
                          </span>
                          <span className="text-zinc-500">•</span>
                          <span className="font-mono text-zinc-200">
                            {appt.service
                              ? formatCurrency(Number(appt.service.precio))
                              : '--'}
                          </span>
                          {viewMode === 'upcoming' && (
                            <>
                              <span className="text-zinc-500">•</span>
                              <span className="text-zinc-400 capitalize">
                                {formatDateFull(appt.fecha_hora_inicio, tz)}
                              </span>
                            </>
                          )}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-zinc-400 font-mono">
                          {appt.client?.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {appt.client.telefono}
                            </span>
                          )}
                          {appt.notas && (
                            <span className="text-zinc-300 font-sans italic">
                              &ldquo;{appt.notas}&rdquo;
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Acciones rápidas >= 48px */}
                    {appt.estado === 'confirmada' && (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() =>
                            handleUpdateStatus(appt.id, 'completada')
                          }
                          aria-label={`Marcar cita de ${appt.client?.nombre || 'cliente'} como completada`}
                          className="min-h-12 min-w-12 px-3.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Completar</span>
                        </button>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(appt.id, 'no_show')}
                          aria-label={`Registrar No-Show de ${appt.client?.nombre || 'cliente'}`}
                          className="min-h-12 min-w-12 px-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 hover:bg-amber-500/20 text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>No-Show</span>
                        </button>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() =>
                            handleUpdateStatus(appt.id, 'cancelada')
                          }
                          aria-label={`Cancelar cita de ${appt.client?.nombre || 'cliente'}`}
                          className="min-h-12 min-w-12 px-3 rounded-xl ui-badge-danger border hover:opacity-90 text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Anular</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Columna derecha: Bloqueos activos */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-400" />
              <span>Bloqueos de Agenda</span>
            </h3>
            <span className="text-xs font-mono text-zinc-400">
              {filteredBlocks.length}
            </span>
          </div>

          {filteredBlocks.length === 0 ? (
            <div className="p-6 rounded-2xl bg-zinc-900/30 border border-white/10 text-center space-y-1.5">
              <Clock className="w-6 h-6 text-zinc-400 mx-auto" />
              <p className="text-xs font-medium text-zinc-300">
                Sin bloqueos activos en este periodo
              </p>
              <p className="text-[11px] text-zinc-400">
                Usa el botón &ldquo;Bloquear Horario&rdquo; si necesitas cerrar
                horas o días puntuales.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredBlocks.map((block) => (
                <div
                  key={block.id}
                  className="p-3.5 rounded-2xl ui-badge-danger border flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {block.motivo || 'Bloqueo manual'}
                    </p>
                    <p className="text-[11px] font-mono opacity-90 mt-0.5 capitalize">
                      {formatDateFull(block.fecha_inicio, tz)} •{' '}
                      {formatTime(block.fecha_inicio, tz)} -{' '}
                      {formatTime(block.fecha_fin, tz)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={updatingId === block.id}
                    onClick={() => handleDeleteBlock(block.id)}
                    aria-label="Eliminar bloqueo de horario"
                    className="min-w-12 min-h-12 rounded-xl bg-zinc-950/60 border border-white/10 text-zinc-200 hover:text-white flex items-center justify-center transition-colors shrink-0 active:scale-[0.98]"
                  >
                    {updatingId === block.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AdminBlockSlotModal
        isOpen={showBlockModal}
        isDemo={isDemo}
        isSandboxFallback={isSandboxFallback}
        timezone={tz}
        onClose={() => setShowBlockModal(false)}
        onSuccess={(created) => {
          if (isSandboxFallback && onSandboxBlockAdd && created) {
            onSandboxBlockAdd(created)
          } else {
            onRefresh()
          }
        }}
      />
    </div>
  )
}
