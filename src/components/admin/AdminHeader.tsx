'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  ExternalLink,
  RotateCcw,
  Loader2,
  CalendarDays,
  Users,
  ShieldCheck,
  ShieldAlert,
  Wrench,
} from 'lucide-react'
import { triggerResetDemoData } from '@/lib/booking-service'
import type { BusinessSettings } from '@/types/booking'
import { useIsDemo } from '@/lib/use-is-demo'
import type { LicenseVerificationResult } from '@/lib/license'

interface AdminHeaderProps {
  settings: BusinessSettings | null
  activeTab: 'agenda' | 'retention'
  onTabChange: (tab: 'agenda' | 'retention') => void
  onDataRefresh: () => void
}

export function AdminHeader({
  settings,
  activeTab,
  onTabChange,
  onDataRefresh,
}: AdminHeaderProps) {
  const isDemo = useIsDemo()
  const [isResetting, setIsResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const [licenseStatus, setLicenseStatus] =
    useState<LicenseVerificationResult | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/license/verify')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LicenseVerificationResult | null) => {
        if (active && data) {
          setLicenseStatus(data)
        }
      })
      .catch(() => {
        // Silencioso en caso de fallo de red puntual
      })
    return () => {
      active = false
    }
  }, [])

  const handleResetDemo = async () => {
    if (
      !confirm(
        '¿Deseas restaurar los datos de prueba de la demo? Se volverán a sembrar citas de hoy, bloqueos y clientes con >30 días sin visita.'
      )
    ) {
      return
    }

    setIsResetting(true)
    setResetMessage(null)
    try {
      await triggerResetDemoData()
      setResetMessage('¡Datos restaurados con éxito!')
      onDataRefresh()
      setTimeout(() => setResetMessage(null), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al restaurar'
      setResetMessage(msg)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <header className="sticky top-[var(--demo-bar-h,0px)] z-30 w-full border-b border-white/10 bg-zinc-950/85 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Logo y título */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm shadow-sm">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white truncate">
                  {settings?.nombre_negocio || 'Krono / Donaire Salon'}
                </h1>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-white/10">
                  Panel Dueño
                </span>
                {licenseStatus && (
                  <Link
                    href="/setup"
                    title={licenseStatus.message}
                    className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border transition-colors ${
                      licenseStatus.valid
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                    }`}
                  >
                    {licenseStatus.valid ? (
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-3 h-3 text-amber-400" />
                    )}
                    <span>
                      {licenseStatus.status === 'active'
                        ? 'Licencia Activa · Sin límites'
                        : licenseStatus.status === 'demo'
                          ? 'Licencia Demo'
                          : 'Licencia Pendiente'}
                    </span>
                  </Link>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Control de agenda y retención
              </p>
            </div>
          </div>

          {/* Acciones del encabezado */}
          <div className="flex items-center gap-2">
            {/* Acceso directo al asistente /setup */}
            <Link
              href="/setup"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-zinc-900/60 text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all active:scale-95"
              title="Asistente de instalación, SQL y Licencia"
            >
              <Wrench className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden lg:inline">Asistente / Licencia</span>
            </Link>

            {/* Botón restaurar demo */}
            <button
              type="button"
              onClick={handleResetDemo}
              disabled={isResetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-zinc-900/60 text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50"
              title="Restaurar base de datos de demo"
            >
              {isResetting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="hidden sm:inline">Restaurar Demo</span>
            </button>

            {/* Enlace a vista pública */}
            <Link
              href={isDemo ? '/demo' : '/reservar'}
              target={isDemo ? undefined : '_blank'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-semibold hover:bg-emerald-400 transition-all active:scale-95 shadow-[0_0_15px_rgb(var(--glow-rgb)/0.25)]"
            >
              <span>Ver Reserva Pública</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Banner si la licencia no es válida en producción */}
        {licenseStatus && !licenseStatus.valid && (
          <div className="py-2 px-3 mb-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between gap-3">
            <span className="font-mono">
              ⚠️ {licenseStatus.message}
            </span>
            <Link
              href="/setup"
              className="shrink-0 px-2.5 py-1 rounded-md bg-amber-400 text-zinc-950 font-semibold hover:bg-amber-300 transition-colors"
            >
              Configurar licencia
            </Link>
          </div>
        )}

        {/* Mensaje de restauración */}
        {resetMessage && (
          <div className="py-2 px-3 mb-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 text-center font-mono">
            {resetMessage}
          </div>
        )}

        {/* Selector de pestañas */}
        <div className="flex gap-2 border-t border-white/5 pt-2 pb-2">
          <button
            type="button"
            onClick={() => onTabChange('agenda')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all select-none ${
              activeTab === 'agenda'
                ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-emerald-400" />
            <span>Agenda & Bloqueos</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('retention')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all select-none ${
              activeTab === 'retention'
                ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>Seguimiento de Clientes</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Valor Clave
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
