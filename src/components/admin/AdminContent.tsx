'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle } from 'lucide-react'
import { getAdminDashboardData, type AdminDashboardData } from '@/lib/booking-service'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminMetricsGrid } from '@/components/admin/AdminMetricsGrid'
import { AdminAgendaView } from '@/components/admin/AdminAgendaView'
import { AdminClientRetentionTable } from '@/components/admin/AdminClientRetentionTable'

export function AdminContent() {
  const [activeTab, setActiveTab] = useState<'agenda' | 'retention'>('agenda')
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboardData = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await getAdminDashboardData()
      setData(res)
    } catch (err: unknown) {
      console.error(err)
      setError('No se pudieron cargar los datos del panel. Verifica la conexión a Supabase.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    getAdminDashboardData()
      .then((res) => {
        if (active) {
          setData(res)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          console.error(err)
          setError('No se pudieron cargar los datos del panel. Verifica la conexión a Supabase.')
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-zinc-950 pb-16">
      {/* Encabezado del administrador */}
      <AdminHeader
        settings={data?.settings || null}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onDataRefresh={loadDashboardData}
      />

      {/* Contenido principal */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs text-red-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={loadDashboardData}
              className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-xs text-white transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {isLoading && !data ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-xs font-mono text-zinc-400">
              Conectando con Supabase y calculando métricas...
            </p>
          </div>
        ) : data ? (
          <>
            {/* Métricas rápidas (KPI Dashboard) */}
            <AdminMetricsGrid metrics={data.metrics} />

            {/* Pestañas de contenido */}
            <AnimatePresence mode="wait">
              {activeTab === 'agenda' ? (
                <motion.div
                  key="tab-agenda"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <AdminAgendaView
                    appointments={data.appointments}
                    blockedSlots={data.blockedSlots}
                    onRefresh={loadDashboardData}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="tab-retention"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <AdminClientRetentionTable
                    clients={data.clients}
                    onRefresh={loadDashboardData}
                    businessName={data.settings?.nombre_negocio || 'Krono / Donaire Salon'}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : null}
      </main>
    </div>
  )
}
