'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  MessageCircle,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Sparkles,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import type { Client } from '@/types/booking'
import { formatRelativeDays, formatDateFull, getDaysSince } from '@/lib/format'
import { generateWhatsAppReminderUrl } from '@/lib/reminder-utils'
import { toggleClientBlacklist } from '@/lib/booking-service'
import { cn } from '@/lib/utils'

interface AdminClientRetentionTableProps {
  clients: Client[]
  onRefresh: () => void
  businessName?: string
}

export function AdminClientRetentionTable({
  clients,
  onRefresh,
  businessName = 'Krono / Donaire Salon',
}: AdminClientRetentionTableProps) {
  const [filterMode, setFilterMode] = useState<'risk' | 'all' | 'blacklisted'>('risk')
  const [searchQuery, setSearchQuery] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Filtrado reactivo de clientes
  const filteredClients = useMemo(() => {
    let result = clients

    // 1. Filtro por estado
    if (filterMode === 'risk') {
      result = result.filter((c) => {
        const days = getDaysSince(c.ultima_visita)
        return days >= 30
      })
    } else if (filterMode === 'blacklisted') {
      result = result.filter((c) => c.bloqueado_no_show)
    }

    // 2. Filtro por buscador
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.telefono && c.telefono.toLowerCase().includes(q))
      )
    }

    return result
  }, [clients, filterMode, searchQuery])

  // Contadores para los badges
  const atRiskCount = useMemo(
    () => clients.filter((c) => getDaysSince(c.ultima_visita) >= 30).length,
    [clients]
  )

  const blacklistedCount = useMemo(
    () => clients.filter((c) => c.bloqueado_no_show).length,
    [clients]
  )

  // Alternar lista negra de no-show en 1 clic
  const handleToggleBlacklist = async (client: Client) => {
    const isBlocking = !client.bloqueado_no_show
    const confirmText = isBlocking
      ? `¿Deseas bloquear a ${client.nombre} por inasistencia (no-show)? No podrá reservar online con el correo ${client.email}.`
      : `¿Deseas desbloquear a ${client.nombre} para que vuelva a reservar online?`

    if (!confirm(confirmText)) return

    setTogglingId(client.id)
    try {
      await toggleClientBlacklist(client.id, client.bloqueado_no_show)
      showToast(
        isBlocking
          ? `${client.nombre} añadido a la lista negra.`
          : `${client.nombre} desbloqueado con éxito.`
      )
      onRefresh()
    } catch (err) {
      console.error(err)
      alert('Error al actualizar el estado del cliente.')
    } finally {
      setTogglingId(null)
    }
  }

  // Enviar recordatorio por WhatsApp
  const handleSendWhatsApp = (client: Client) => {
    const url = generateWhatsAppReminderUrl({
      phone: client.telefono,
      clientName: client.nombre,
      businessName,
    })

    if (!url) {
      alert('Este cliente no tiene un teléfono registrado para WhatsApp.')
      return
    }

    window.open(url, '_blank')
    showToast(`Mensaje de reactivación generado para ${client.nombre}`)
  }

  // Enviar recordatorio por Email mediante Resend
  const handleSendEmail = async (client: Client) => {
    setSendingEmailId(client.id)
    try {
      const res = await fetch('/api/notifications/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.nombre,
          clientEmail: client.email,
          businessName,
          lastVisit: client.ultima_visita,
        }),
      })

      const data = (await res.json()) as { simulated?: boolean; error?: string }

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo enviar el recordatorio.')
      }

      showToast(
        data.simulated
          ? `✉️ Recordatorio procesado para ${client.nombre} (configura RESEND_API_KEY para envío en vivo)`
          : `✉️ Recordatorio enviado por email a ${client.nombre} (${client.email})`
      )
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al enviar el recordatorio.'
      alert(msg)
    } finally {
      setSendingEmailId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast flotante de confirmación */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl bg-emerald-500 text-zinc-950 font-semibold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tarjeta de propuesta de valor */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-amber-500/30 backdrop-blur-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Motor de Retención & Seguimiento Automático
              </h3>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Detecta clientes cuya última visita fue hace <strong>más de 30 días</strong> y
              reactívalos con recordatorios persuasivos en 1 clic. Bloquea de inmediato a quienes no
              se presentan (no-shows) para proteger la facturación de tu agenda.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center shrink-0">
            <span className="text-2xl font-mono font-bold text-amber-400 block leading-tight">
              {atRiskCount}
            </span>
            <span className="text-[10px] font-mono text-amber-300/80 uppercase">
              Para reactivar
            </span>
          </div>
        </div>
      </div>

      {/* Barra de filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Pestañas de filtro */}
        <div className="flex rounded-xl bg-zinc-900/60 p-1 border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setFilterMode('risk')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all select-none flex items-center gap-1.5',
              filterMode === 'risk'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <span>En riesgo (+30 días)</span>
            <span
              className={cn(
                'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                filterMode === 'risk' ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
              )}
            >
              {atRiskCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all select-none flex items-center gap-1.5',
              filterMode === 'all'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <span>Todos ({clients.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('blacklisted')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all select-none flex items-center gap-1.5',
              filterMode === 'blacklisted'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <span>Lista Negra</span>
            {blacklistedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-red-950 text-red-200">
                {blacklistedCount}
              </span>
            )}
          </button>
        </div>

        {/* Buscador */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900/60 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>
      </div>

      {/* Tabla inteligente de clientes */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-zinc-900/80 text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 font-medium">Cliente</th>
                <th className="py-3.5 px-4 font-medium">Última Visita</th>
                <th className="py-3.5 px-4 font-medium text-center">Citas</th>
                <th className="py-3.5 px-4 font-medium">Estado</th>
                <th className="py-3.5 px-4 font-medium text-right">Acciones en 1 Clic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 text-xs">
                    No se encontraron clientes para este filtro.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const daysSince = getDaysSince(client.ultima_visita)
                  const isInactive = daysSince >= 30
                  const isToggling = togglingId === client.id

                  return (
                    <motion.tr
                      key={client.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        'hover:bg-zinc-800/40 transition-colors',
                        client.bloqueado_no_show && 'bg-red-950/10'
                      )}
                    >
                      {/* Cliente */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-zinc-200 shrink-0 text-xs font-mono">
                            {client.nombre.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-zinc-100 text-sm block truncate">
                              {client.nombre}
                            </span>
                            <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-mono mt-0.5">
                              <span className="truncate">{client.email}</span>
                              {client.telefono && (
                                <>
                                  <span>•</span>
                                  <span className="text-zinc-500">{client.telefono}</span>
                                </>
                              )}
                            </div>
                            {client.notas && (
                              <p className="text-[10px] text-zinc-500 truncate max-w-xs mt-0.5">
                                Nota: {client.notas}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Última Visita */}
                      <td className="py-4 px-4 font-mono">
                        <div>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold',
                              isInactive
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            )}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{formatRelativeDays(client.ultima_visita)}</span>
                          </span>
                          <span className="block text-[10px] text-zinc-500 mt-1 capitalize font-sans">
                            {client.ultima_visita
                              ? formatDateFull(client.ultima_visita)
                              : 'Sin historial'}
                          </span>
                        </div>
                      </td>

                      {/* Citas Totales */}
                      <td className="py-4 px-4 text-center font-mono">
                        <span className="text-sm font-semibold text-zinc-200">
                          {client.total_citas}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-4">
                        {client.bloqueado_no_show ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                            <ShieldAlert className="w-3 h-3 text-red-400" />
                            <span>Lista Negra</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Habilitado</span>
                          </span>
                        )}
                      </td>

                      {/* Acciones en 1 clic */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botón WhatsApp 1 Clic */}
                          {client.telefono && (
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(client)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 font-medium text-xs transition-all active:scale-95 flex items-center gap-1"
                              title="Enviar recordatorio automático por WhatsApp en 1 clic"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">WhatsApp (1 clic)</span>
                            </button>
                          )}

                          {/* Botón Enviar Recordatorio por Email (Resend) */}
                          <button
                            type="button"
                            disabled={sendingEmailId === client.id}
                            onClick={() => handleSendEmail(client)}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-700 font-medium text-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                            title="Enviar recordatorio cordial por Email con enlace de reserva"
                          >
                            {sendingEmailId === client.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                            ) : (
                              <Mail className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">
                              {sendingEmailId === client.id
                                ? 'Enviando...'
                                : 'Enviar recordatorio'}
                            </span>
                          </button>

                          {/* Botón Bloquear / Desbloquear No-Show */}
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleBlacklist(client)}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg font-medium text-xs transition-all active:scale-95 flex items-center gap-1 border',
                              client.bloqueado_no_show
                                ? 'bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700'
                                : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white'
                            )}
                            title={
                              client.bloqueado_no_show
                                ? 'Desbloquear y sacar de la lista negra'
                                : 'Bloquear cliente por no presentarse (no-show)'
                            }
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">
                              {client.bloqueado_no_show ? 'Desbloquear' : 'Bloquear No-Show'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
