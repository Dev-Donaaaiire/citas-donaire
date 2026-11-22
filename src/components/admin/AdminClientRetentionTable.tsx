'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Search,
  MessageCircle,
  Ban,
  CheckCircle,
  Loader2,
  Mail,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { Client } from '@/types/booking'
import {
  formatRelativeDays,
  formatDateFull,
  getDaysSince,
} from '@/lib/format'
import {
  sendRetentionReminder,
  toggleClientBlacklist,
} from '@/lib/booking-service'
import { AdminSendEmailModal } from '@/components/admin/AdminSendEmailModal'
import { cn } from '@/lib/utils'
import { useFeedback } from '@/components/ui/FeedbackProvider'

interface AdminClientRetentionTableProps {
  clients: Client[]
  pagination: {
    page: number
    pageSize: number
    totalFiltered: number
    totalClients: number
    atRiskCount: number
    blockedCount: number
  }
  timezone?: string | null
  businessName?: string
  isDemo?: boolean
  isSandboxFallback?: boolean
  activeFilter: 'all' | 'risk' | 'blocked'
  searchQuery: string
  onQueryChange: (params: {
    page?: number
    filter?: 'all' | 'risk' | 'blocked'
    search?: string
  }) => void
  onRefresh: () => void
  onSandboxBlacklistToggle?: (clientId: string, newStatus: boolean) => void
}

export function AdminClientRetentionTable({
  clients,
  pagination,
  timezone = 'Europe/Madrid',
  businessName = 'Krono Studio',
  isDemo = false,
  isSandboxFallback = false,
  activeFilter,
  searchQuery,
  onQueryChange,
  onRefresh,
  onSandboxBlacklistToggle,
}: AdminClientRetentionTableProps) {
  const { notify, confirmAction } = useFeedback()

  const [localSearch, setLocalSearch] = useState(searchQuery)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [clientForEmail, setClientForEmail] = useState<Client | null>(null)
  const [emailedIds, setEmailedIds] = useState<Record<string, boolean>>({})
  const emailTimersRef = useRef<Record<string, number>>({})
  const searchDebounceRef = useRef<number | null>(null)

  useEffect(() => {
    const activeTimers = emailTimersRef.current
    return () => {
      Object.values(activeTimers).forEach((timerId) =>
        window.clearTimeout(timerId)
      )
      if (searchDebounceRef.current !== null) {
        window.clearTimeout(searchDebounceRef.current)
      }
    }
  }, [])

  const handleSearchInput = (value: string) => {
    setLocalSearch(value)
    if (searchDebounceRef.current !== null) {
      window.clearTimeout(searchDebounceRef.current)
    }
    searchDebounceRef.current = window.setTimeout(() => {
      onQueryChange({ search: value, page: 1 })
    }, 300)
  }

  const handleToggleBlock = async (client: Client) => {
    const isBlocking = !client.bloqueado_no_show
    const confirmed = await confirmAction({
      title: isBlocking
        ? `¿Bloquear a ${client.nombre}?`
        : `¿Desbloquear a ${client.nombre}?`,
      description: isBlocking
        ? 'Si lo bloqueas por no-show, no podrá reservar citas nuevas online desde la web.'
        : 'Este cliente podrá volver a reservar citas con normalidad.',
      confirmLabel: isBlocking ? 'Sí, bloquear cliente' : 'Sí, desbloquear',
      cancelLabel: 'Cancelar',
      tone: isBlocking ? 'danger' : 'neutral',
    })
    if (!confirmed) return

    setUpdatingId(client.id)
    try {
      const res = await toggleClientBlacklist(
        client.id,
        client.bloqueado_no_show,
        isDemo
      )
      notify({
        type: 'success',
        title: res.newStatus ? 'Cliente bloqueado' : 'Cliente desbloqueado',
        description: `${client.nombre} actualizado correctamente.`,
      })
      if (isSandboxFallback && onSandboxBlacklistToggle) {
        onSandboxBlacklistToggle(client.id, res.newStatus)
      } else {
        onRefresh()
      }
    } catch (err) {
      notify({
        type: 'error',
        title: 'No se pudo actualizar el cliente',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const handleSendWhatsAppReminder = (client: Client) => {
    const cleanPhone = (client.telefono || '').replace(/[^\d]/g, '')
    if (!cleanPhone) {
      notify({
        type: 'error',
        title: 'Teléfono no registrado',
        description: 'Este cliente no tiene un número válido para WhatsApp.',
      })
      return
    }
    const firstName = client.nombre.split(' ')[0]
    const bookingUrl = `${window.location.origin}${isDemo ? '/demo' : '/reservar'}`
    const text = `¡Hola ${firstName}! Hace ya unos días que no te vemos por ${businessName}. Te echamos de menos, si te apetece reservar tu próximo hueco aquí lo tienes en 1 clic: ${bookingUrl}`
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  const handleEmailSuccess = (
    client: Client,
    result: { simulated?: boolean; warning?: string }
  ) => {
    setEmailedIds((prev) => ({ ...prev, [client.id]: true }))
    if (emailTimersRef.current[client.id]) {
      window.clearTimeout(emailTimersRef.current[client.id])
    }
    emailTimersRef.current[client.id] = window.setTimeout(() => {
      setEmailedIds((prev) => ({ ...prev, [client.id]: false }))
    }, 4000)
  }

  const totalPages = Math.max(
    1,
    Math.ceil(pagination.totalFiltered / Math.max(1, pagination.pageSize))
  )

  return (
    <div className="space-y-4">
      {/* Cabecera de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onQueryChange({ filter: 'all', page: 1 })}
            className={cn(
              'min-h-12 px-4 rounded-xl text-xs font-medium transition-all border active:scale-[0.98]',
              activeFilter === 'all'
                ? 'ui-btn-contrast border-transparent font-semibold'
                : 'bg-zinc-900/60 border-white/10 text-zinc-300 hover:text-white'
            )}
          >
            Todos ({pagination.totalClients})
          </button>

          <button
            type="button"
            onClick={() => onQueryChange({ filter: 'risk', page: 1 })}
            className={cn(
              'min-h-12 px-4 rounded-xl text-xs font-medium transition-all border flex items-center gap-1.5 active:scale-[0.98]',
              activeFilter === 'risk'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 font-semibold'
                : 'bg-zinc-900/60 border-white/10 text-amber-300 hover:border-amber-500/40'
            )}
          >
            <span>Sin volver +30d ({pagination.atRiskCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onQueryChange({ filter: 'blocked', page: 1 })}
            className={cn(
              'min-h-12 px-4 rounded-xl text-xs font-medium transition-all border active:scale-[0.98]',
              activeFilter === 'blocked'
                ? 'ui-btn-danger font-semibold'
                : 'bg-zinc-900/60 border-white/10 text-zinc-300 hover:border-red-500/40'
            )}
          >
            Bloqueados ({pagination.blockedCount})
          </button>
        </div>

        {/* Buscador */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="clients-search" className="sr-only">
            Buscar clientes por nombre, email o teléfono
          </label>
          <input
            id="clients-search"
            type="text"
            placeholder="Buscar cliente, email o tel..."
            value={localSearch}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="w-full min-h-12 pl-10 pr-4 rounded-xl bg-zinc-900/60 border border-white/10 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60"
          />
        </div>
      </div>

      {/* Vista móvil (Tarjetas apiladas < md) */}
      <div className="md:hidden space-y-3">
        {clients.length === 0 ? (
          <div className="p-8 rounded-2xl bg-zinc-900/40 border border-white/10 text-center text-xs text-zinc-400">
            No hay clientes que coincidan con este filtro.
          </div>
        ) : (
          clients.map((client) => {
            const daysSince = getDaysSince(client.ultima_visita)
            const isAtRisk = daysSince >= 30 && !client.bloqueado_no_show

            return (
              <div
                key={client.id}
                className={cn(
                  'p-4 rounded-2xl border space-y-3',
                  client.bloqueado_no_show
                    ? 'ui-badge-danger'
                    : 'bg-zinc-900/60 border-white/10'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-white truncate">
                      {client.nombre}
                    </h4>
                    <p className="text-xs font-mono text-zinc-400 truncate mt-0.5">
                      {client.telefono || 'Sin tel'} ·{' '}
                      {client.email && !client.email.endsWith('@citas.local')
                        ? client.email
                        : 'Sin correo'}
                    </p>
                  </div>
                  {client.bloqueado_no_show ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium ui-badge-danger border shrink-0">
                      Bloqueado
                    </span>
                  ) : isAtRisk ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                      Riesgo +30d
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      Activo
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-300 pt-1 border-t border-white/10">
                  <span className="font-mono">
                    {client.total_citas} cita
                    {client.total_citas === 1 ? '' : 's'}
                  </span>
                  <span>
                    Última visita: {formatRelativeDays(client.ultima_visita)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {!client.bloqueado_no_show && (
                    <>
                      <button
                        type="button"
                        disabled={!client.telefono}
                        onClick={() => handleSendWhatsAppReminder(client)}
                        aria-label={`Enviar WhatsApp de reactivación a ${client.nombre}`}
                        title={
                          client.telefono
                            ? 'Contactar por WhatsApp'
                            : 'El cliente no proporcionó teléfono'
                        }
                        className="flex-1 min-h-12 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        disabled={
                          !client.email || client.email.endsWith('@citas.local')
                        }
                        onClick={() => setClientForEmail(client)}
                        aria-label={`Enviar email a ${client.nombre}`}
                        title={
                          client.email && !client.email.endsWith('@citas.local')
                            ? 'Enviar email'
                            : 'El cliente no proporcionó correo electrónico'
                        }
                        className={cn(
                          'flex-1 min-h-12 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed',
                          emailedIds[client.id]
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-zinc-950 border-white/10 text-zinc-200 hover:bg-zinc-900'
                        )}
                      >
                        {emailedIds[client.id] ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                        <span>{emailedIds[client.id] ? 'Enviado' : 'Email'}</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    disabled={updatingId === client.id}
                    onClick={() => handleToggleBlock(client)}
                    aria-label={
                      client.bloqueado_no_show
                        ? `Desbloquear a ${client.nombre}`
                        : `Bloquear a ${client.nombre} por no-show`
                    }
                    className={cn(
                      'min-h-12 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all active:scale-[0.98] disabled:opacity-50',
                      client.bloqueado_no_show
                        ? 'w-full bg-zinc-950 border-white/15 text-zinc-100'
                        : 'bg-zinc-950 border-white/10 text-zinc-300'
                    )}
                  >
                    {updatingId === client.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : client.bloqueado_no_show ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Desbloquear</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4" />
                        <span>Bloquear</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Tabla Desktop (>= md) */}
      <div className="hidden md:block rounded-2xl bg-zinc-900/40 border border-white/10 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-zinc-400 bg-zinc-950/50">
                <th className="py-3.5 px-4 font-medium">Cliente</th>
                <th className="py-3.5 px-4 font-medium">Contacto</th>
                <th className="py-3.5 px-4 font-medium">Citas</th>
                <th className="py-3.5 px-4 font-medium">Última Visita</th>
                <th className="py-3.5 px-4 font-medium text-right">
                  Acciones / Retención
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-zinc-400 text-xs"
                  >
                    No hay clientes que coincidan con este filtro.
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const daysSince = getDaysSince(client.ultima_visita)
                  const isAtRisk = daysSince >= 30 && !client.bloqueado_no_show

                  return (
                    <tr
                      key={client.id}
                      className={cn(
                        'transition-colors hover:bg-white/[0.02]',
                        client.bloqueado_no_show && 'bg-red-950/15'
                      )}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-semibold text-zinc-200 shrink-0">
                            {client.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-100">
                              {client.nombre}
                            </p>
                            {client.no_shows > 0 && (
                              <span className="text-[11px] text-red-400 font-mono">
                                {client.no_shows} no-show
                                {client.no_shows > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-zinc-300">
                        <div>
                          {client.telefono || (
                            <span className="text-zinc-500 italic">Sin tel</span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {client.email && !client.email.endsWith('@citas.local') ? (
                            client.email
                          ) : (
                            <span className="text-zinc-500 italic">
                              Sin correo
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-zinc-200">
                        {client.total_citas}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
                              client.bloqueado_no_show
                                ? 'ui-badge-danger'
                                : isAtRisk
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            )}
                          >
                            {client.bloqueado_no_show
                              ? 'Lista Negra'
                              : formatRelativeDays(client.ultima_visita)}
                          </span>
                          {client.ultima_visita && (
                            <p className="text-[11px] text-zinc-400 pl-1 capitalize">
                              {formatDateFull(client.ultima_visita, timezone)}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!client.bloqueado_no_show && (
                            <>
                              <button
                                type="button"
                                disabled={!client.telefono}
                                onClick={() =>
                                  handleSendWhatsAppReminder(client)
                                }
                                aria-label={`Recordar por WhatsApp a ${client.nombre}`}
                                title={
                                  client.telefono
                                    ? 'Contactar por WhatsApp'
                                    : 'El cliente no proporcionó teléfono'
                                }
                                className="min-h-12 min-w-12 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <MessageCircle className="w-4 h-4" />
                                <span className="hidden lg:inline">
                                  WhatsApp
                                </span>
                              </button>

                              <button
                                type="button"
                                disabled={
                                  !client.email ||
                                  client.email.endsWith('@citas.local')
                                }
                                onClick={() => setClientForEmail(client)}
                                aria-label={`Recordar por email a ${client.nombre}`}
                                title={
                                  client.email &&
                                  !client.email.endsWith('@citas.local')
                                    ? 'Enviar email'
                                    : 'El cliente no proporcionó correo electrónico'
                                }
                                className={cn(
                                  'min-h-12 min-w-12 px-3 rounded-xl border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed',
                                  emailedIds[client.id]
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                    : 'bg-zinc-900 border-white/10 text-zinc-200 hover:bg-zinc-800'
                                )}
                              >
                                {emailedIds[client.id] ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <Mail className="w-4 h-4" />
                                )}
                                <span className="hidden xl:inline">
                                  {emailedIds[client.id] ? 'Enviado' : 'Email'}
                                </span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            disabled={updatingId === client.id}
                            onClick={() => handleToggleBlock(client)}
                            aria-label={
                              client.bloqueado_no_show
                                ? `Desbloquear a ${client.nombre}`
                                : `Bloquear a ${client.nombre} por no-show`
                            }
                            className={cn(
                              'min-h-12 min-w-12 px-3 rounded-xl border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50',
                              client.bloqueado_no_show
                                ? 'bg-zinc-800 border-white/15 text-zinc-100 hover:bg-zinc-700'
                                : 'bg-zinc-950 border-white/10 text-zinc-300 hover:text-red-300 hover:border-red-500/30'
                            )}
                          >
                            {updatingId === client.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : client.bloqueado_no_show ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
                            <span>
                              {client.bloqueado_no_show
                                ? 'Desbloquear'
                                : 'Bloquear'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación accesible */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-zinc-400">
          <span className="font-mono">
            Página {pagination.page} de {totalPages} ·{' '}
            {pagination.totalFiltered} resultados
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onQueryChange({ page: pagination.page - 1 })}
              aria-label="Página anterior de clientes"
              className="min-h-12 min-w-12 px-3 rounded-xl border border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 flex items-center justify-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>
            <button
              type="button"
              disabled={pagination.page >= totalPages}
              onClick={() => onQueryChange({ page: pagination.page + 1 })}
              aria-label="Página siguiente de clientes"
              className="min-h-12 min-w-12 px-3 rounded-xl border border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 flex items-center justify-center gap-1"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {/* Modal para personalizar y enviar email */}
      <AdminSendEmailModal
        isOpen={Boolean(clientForEmail)}
        client={clientForEmail}
        businessName={businessName}
        isDemo={isDemo}
        onClose={() => setClientForEmail(null)}
        onSuccess={handleEmailSuccess}
      />
    </div>
  )
}
