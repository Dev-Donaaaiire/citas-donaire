'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, Users, RefreshCw, ShieldAlert } from 'lucide-react'
import type { AdminDashboardPayload } from '@/lib/data/admin-dashboard'
import { fetchAdminDashboardClient } from '@/lib/booking-service'
import { sanitizeTimeZone } from '@/lib/timezone'
import { useIsDemo } from '@/lib/use-is-demo'
import { useBusinessTheme } from '@/components/theme/BusinessThemeSync'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminMetricsGrid } from '@/components/admin/AdminMetricsGrid'
import { AdminAgendaView } from '@/components/admin/AdminAgendaView'
import { AdminClientRetentionTable } from '@/components/admin/AdminClientRetentionTable'
import { AdminUpdateBanner } from '@/components/admin/AdminUpdateBanner'
import { AdminStoryButton } from '@/components/admin/AdminStoryButton'
import { FeedbackProvider } from '@/components/ui/FeedbackProvider'
import { cn } from '@/lib/utils'

interface AdminContentProps {
  initialData: AdminDashboardPayload
}

function AdminDashboardInner({ initialData }: AdminContentProps) {
  const isDemoRoute = useIsDemo()

  const [data, setData] = useState<AdminDashboardPayload>(initialData)
  const [activeTab, setActiveTab] = useState<'agenda' | 'clientes'>('agenda')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [clientFilter, setClientFilter] = useState<'all' | 'risk' | 'blocked'>(
    'all'
  )
  const [clientSearch, setClientSearch] = useState('')
  const [clientPage, setClientPage] = useState(1)
  const [range, setRange] = useState(initialData.range)

  const refreshDashboard = async (overrides?: {
    fromIso?: string
    toIso?: string
    page?: number
    filter?: 'all' | 'risk' | 'blocked'
    search?: string
  }) => {
    setIsRefreshing(true)
    const nextRange =
      overrides?.fromIso && overrides?.toIso
        ? { fromIso: overrides.fromIso, toIso: overrides.toIso }
        : range
    const nextFilter = overrides?.filter ?? clientFilter
    const nextSearch = overrides?.search ?? clientSearch
    const nextPage = overrides?.page ?? clientPage

    if (overrides?.fromIso && overrides?.toIso) setRange(nextRange)
    if (overrides?.filter !== undefined) setClientFilter(overrides.filter)
    if (overrides?.search !== undefined) setClientSearch(overrides.search)
    if (overrides?.page !== undefined) setClientPage(overrides.page)

    try {
      const updated = await fetchAdminDashboardClient({
        isDemo: isDemoRoute,
        fromIso: nextRange.fromIso,
        toIso: nextRange.toIso,
        clientPage: nextPage,
        clientPageSize: 25,
        clientFilter: nextFilter,
        clientSearch: nextSearch,
      })
      setData(updated)
    } catch (err) {
      console.error('Error refrescando dashboard:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const tz = sanitizeTimeZone(data.settings?.timezone)

  // KPIs calculados en servidor sobre [hoy, hoy + 7d], independientes del rango de agenda
  const metrics = useMemo(
    () => ({
      todayAppointmentsCount: data.executiveMetrics.todayAppointmentsCount,
      weeklyEstimatedRevenue: data.executiveMetrics.weeklyEstimatedRevenue,
      totalClientsCount: data.clientsPagination.totalClients,
      inactiveClientsCount: data.clientsPagination.atRiskCount,
    }),
    [data.executiveMetrics, data.clientsPagination]
  )

  // El panel real refleja el tema configurado en /setup
  useBusinessTheme(data.settings?.tema_activo, !isDemoRoute)

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      <AdminHeader
        settings={data.settings}
        license={data.license}
        isSandboxFallback={data.isSandboxFallback}
        onDemoReset={() => void refreshDashboard()}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {data.isSandboxFallback && (
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/10 text-xs text-zinc-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              <strong className="text-emerald-400">
                Modo Sandbox Protegido:
              </strong>{' '}
              la base de datos real está en producción (
              <code className="font-mono text-zinc-200">modo_demo = false</code>
              ). Estás interactuando con datos ficticios aislados sin acceso ni
              escritura sobre clientes reales.
            </span>
          </div>
        )}

        {data.licenseBlocked && !isDemoRoute && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-amber-950/35 border border-amber-500/35 text-xs sm:text-sm text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">
                  Licencia comercial requerida para aceptar reservas públicas
                </p>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  {data.license.message}
                </p>
              </div>
            </div>
            <Link
              href="/setup"
              className="min-h-12 px-4 rounded-xl bg-amber-400 text-zinc-950 font-semibold text-xs flex items-center justify-center shrink-0 hover:bg-amber-300 transition-colors"
            >
              Activar en /setup
            </Link>
          </div>
        )}

        {/* Banner de actualización de versión (si hay novedades en el repo maestro) */}
        <AdminUpdateBanner />

        {/* Métricas ejecutivas */}
        <AdminMetricsGrid metrics={metrics} />

        {/* Pestañas de navegación internas >= 48px */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('agenda')}
              className={cn(
                'min-h-12 px-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 transition-all active:scale-[0.98]',
                activeTab === 'agenda'
                  ? 'ui-btn-contrast font-semibold shadow-sm'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
              )}
            >
              <Calendar className="w-4 h-4" />
              <span>Agenda &amp; Bloqueos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('clientes')}
              className={cn(
                'min-h-12 px-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 transition-all active:scale-[0.98]',
                activeTab === 'clientes'
                  ? 'ui-btn-contrast font-semibold shadow-sm'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
              )}
            >
              <Users className="w-4 h-4" />
              <span>Clientes &amp; Retención</span>
              {metrics.inactiveClientsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full font-mono bg-amber-500 text-zinc-950 font-bold">
                  {metrics.inactiveClientsCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
          <AdminStoryButton isDemo={isDemoRoute} />
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void refreshDashboard()}
            className="min-h-12 px-3.5 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 rounded-xl bg-zinc-900/60 border border-white/10 hover:bg-zinc-800 transition-all active:scale-[0.98]"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')}
            />
            <span>Actualizar</span>
          </button>
          </div>
        </div>

        {/* Vistas principales */}
        <div>
          {activeTab === 'agenda' ? (
            <AdminAgendaView
              appointments={data.appointments}
              blockedSlots={data.blockedSlots}
              timezone={tz}
              businessName={data.settings?.nombre_negocio}
              isDemo={isDemoRoute}
              isSandboxFallback={data.isSandboxFallback}
              onRefresh={(newRange) => {
                if (newRange) {
                  void refreshDashboard({
                    fromIso: newRange.fromIso,
                    toIso: newRange.toIso,
                  })
                } else {
                  void refreshDashboard()
                }
              }}
              onSandboxStatusUpdate={(appointmentId, newStatus) => {
                setData((prev) => ({
                  ...prev,
                  appointments: prev.appointments.map((a) =>
                    a.id === appointmentId ? { ...a, estado: newStatus } : a
                  ),
                }))
              }}
              onSandboxBlockAdd={(slot) => {
                setData((prev) => ({
                  ...prev,
                  blockedSlots: [...prev.blockedSlots, slot],
                }))
              }}
              onSandboxBlockDelete={(id) => {
                setData((prev) => ({
                  ...prev,
                  blockedSlots: prev.blockedSlots.filter((b) => b.id !== id),
                }))
              }}
            />
          ) : (
            <AdminClientRetentionTable
              clients={data.clients}
              pagination={data.clientsPagination}
              timezone={tz}
              businessName={data.settings?.nombre_negocio || 'Krono Studio'}
              isDemo={isDemoRoute}
              isSandboxFallback={data.isSandboxFallback}
              activeFilter={clientFilter}
              searchQuery={clientSearch}
              onQueryChange={(q) => void refreshDashboard(q)}
              onRefresh={() => void refreshDashboard()}
              onSandboxBlacklistToggle={(clientId, newStatus) => {
                setData((prev) => ({
                  ...prev,
                  clients: prev.clients.map((c) =>
                    c.id === clientId
                      ? { ...c, bloqueado_no_show: newStatus }
                      : c
                  ),
                }))
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export function AdminContent({ initialData }: AdminContentProps) {
  return (
    <FeedbackProvider>
      <AdminDashboardInner initialData={initialData} />
    </FeedbackProvider>
  )
}
