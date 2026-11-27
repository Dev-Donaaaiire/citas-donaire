'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Settings,
  LogOut,
  Smartphone,
} from 'lucide-react'
import { triggerDemoReset } from '@/lib/booking-service'
import type { BusinessSettings } from '@/types/booking'
import type { LicenseVerificationResult } from '@/lib/license'
import { useIsDemo } from '@/lib/use-is-demo'
import { useFeedback } from '@/components/ui/FeedbackProvider'
import { cn } from '@/lib/utils'
import { InstallAppModal } from '@/components/admin/InstallAppModal'
import { AdminUpdateModal } from '@/components/admin/AdminUpdateModal'
import { CURRENT_SYSTEM_VERSION, type SystemVersionInfo } from '@/lib/version'

interface AdminHeaderProps {
  settings: BusinessSettings | null
  license?: LicenseVerificationResult | null
  isSandboxFallback?: boolean
  onDemoReset?: () => void
  onRefresh?: () => void
}

export function AdminHeader({
  settings,
  license,
  isSandboxFallback = false,
  onDemoReset,
  onRefresh,
}: AdminHeaderProps) {
  const router = useRouter()
  const isDemoRoute = useIsDemo()
  const { notify, confirmAction } = useFeedback()

  const [isResetting, setIsResetting] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isTogglingMode, setIsTogglingMode] = useState(false)
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [versionInfo, setVersionInfo] = useState<SystemVersionInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let isMounted = true
    async function loadVersion() {
      try {
        const res = await fetch('/api/admin/system/status')
        if (res.ok) {
          const data = (await res.json()) as SystemVersionInfo
          if (isMounted) setVersionInfo(data)
        }
      } catch {
        // Silencioso
      }
    }
    void loadVersion()
    return () => {
      isMounted = false
    }
  }, [])

  const handleToggleDemoMode = async () => {
    if (isDemoRoute) return
    const currentMode = Boolean(settings?.modo_demo)
    const targetMode = !currentMode

    const confirmed = await confirmAction({
      title: targetMode ? '¿Activar Modo Demo?' : '¿Cambiar a Modo Producción?',
      description: targetMode
        ? 'En Modo Demo podrás agendar citas de prueba, probar recordatorios y restaurar datos de ejemplo en cualquier momento.'
        : 'En Modo Producción las reservas operarán con clientes reales y la agenda de producción.',
      confirmLabel: targetMode ? 'Sí, activar Demo' : 'Sí, activar Producción',
      cancelLabel: 'Cancelar',
      tone: targetMode ? 'neutral' : 'danger',
    })

    if (!confirmed) return

    setIsTogglingMode(true)
    try {
      const res = await fetch('/api/admin/toggle-demo-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: targetMode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo cambiar el modo.')

      notify({
        type: 'success',
        title: targetMode ? 'Modo Demo Activado' : 'Modo Producción Activado',
        description: data.message,
      })
      onRefresh?.()
      router.refresh()
    } catch (err) {
      notify({
        type: 'error',
        title: 'Error cambiando el modo',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo.',
      })
    } finally {
      setIsTogglingMode(false)
    }
  }

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  const bookingUrlPath = isDemoRoute ? '/demo' : '/reservar'

  const handleCopyBookingLink = async () => {
    const url = `${window.location.origin}${bookingUrlPath}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      notify({
        type: 'success',
        title: 'Enlace copiado',
        description: `Ya puedes pegarlo en tu bio de Instagram (${bookingUrlPath}).`,
      })
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopied(false)
      }, 2200)
    } catch {
      notify({
        type: 'error',
        title: 'No se pudo copiar al portapapeles',
        description: url,
      })
    }
  }

  const handleResetDemo = async () => {
    const confirmed = await confirmAction({
      title: '¿Restaurar entorno Demo?',
      description:
        'Se reestablecerán los horarios, citas ficticias y bloqueos de prueba a su estado inicial.',
      confirmLabel: 'Sí, restaurar demo',
      cancelLabel: 'Cancelar',
      tone: 'neutral',
    })
    if (!confirmed) return

    setIsResetting(true)
    try {
      await triggerDemoReset(isDemoRoute)
      notify({
        type: 'success',
        title: 'Demo restaurada',
        description: isSandboxFallback
          ? 'Los datos del sandbox en memoria han vuelto al estado inicial.'
          : 'Datos de ejemplo regenerados correctamente.',
      })
      // Un único refresco: onDemoReset tiene prioridad para evitar doble GET simultáneo
      if (onDemoReset) onDemoReset()
      else if (onRefresh) onRefresh()
    } catch (err) {
      notify({
        type: 'error',
        title: 'No se pudo restaurar la demo',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setIsResetting(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.replace('/admin/login')
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="border-b border-white/10 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-16 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Marca del propietario */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center font-bold text-white font-mono text-sm shrink-0">
            {settings?.nombre_negocio?.charAt(0).toUpperCase() || 'K'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white truncate">
                {settings?.nombre_negocio || 'Panel Administrativo'}
              </h1>

              {isDemoRoute ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/25">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>{isSandboxFallback ? 'Demo Sandbox' : 'Modo Demo'}</span>
                </span>
              ) : license?.status === 'active' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Licencia Activa</span>
                </span>
              ) : license && license.status !== 'demo' ? (
                <Link
                  href="/setup"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  <span>Licencia: {license.status}</span>
                </Link>
              ) : null}

              {!isDemoRoute && (
                <button
                  type="button"
                  onClick={handleToggleDemoMode}
                  disabled={isTogglingMode}
                  title={
                    settings?.modo_demo
                      ? 'Click para cambiar a Modo Producción'
                      : 'Click para activar Modo Demo'
                  }
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all active:scale-95 cursor-pointer',
                    settings?.modo_demo
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                      : 'bg-zinc-850 text-zinc-400 border border-white/10 hover:text-zinc-200 hover:border-white/20'
                  )}
                >
                  {isTogglingMode ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-2.5 h-2.5" />
                  )}
                  <span>{settings?.modo_demo ? 'Modo Demo' : 'Modo Demo: Off'}</span>
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400 font-mono">
              <span>Gestión de Agenda &amp; Retención · {settings?.timezone || 'Europe/Madrid'}</span>
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(true)}
                title="Ver estado de versiones y actualizaciones"
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-all active:scale-95 cursor-pointer',
                  versionInfo?.updateAvailable
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 animate-pulse'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                )}
              >
                <Sparkles className="w-2.5 h-2.5 shrink-0" />
                <span>v{CURRENT_SYSTEM_VERSION}</span>
                {versionInfo?.updateAvailable ? (
                  <span className="text-[9px] font-bold text-amber-200">
                    (Update!)
                  </span>
                ) : (
                  <span className="text-[9px] text-zinc-400 hidden sm:inline">
                    · Updates
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Acciones táctiles >= 48px */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyBookingLink}
            aria-label="Copiar link para Instagram"
            className="min-h-12 min-w-12 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs font-medium"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline text-emerald-300">
                  Copiado
                </span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="hidden md:inline">Link Bio IG</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsInstallModalOpen(true)}
            aria-label="Instalar app en la pantalla de inicio del móvil"
            title="Guardar icono en tu móvil para entrar en 1 toque"
            className="min-h-12 min-w-12 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="hidden md:inline">App Móvil</span>
          </button>

          {(settings?.modo_demo || isDemoRoute) && (
            <button
              type="button"
              onClick={handleResetDemo}
              disabled={isResetting}
              aria-label="Restaurar datos demo"
              className="min-h-12 min-w-12 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs font-medium disabled:opacity-50"
            >
              {isResetting ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <RotateCcw className="w-4 h-4 text-zinc-400 shrink-0" />
              )}
              <span className="hidden sm:inline">Restaurar Demo</span>
            </button>
          )}

          {!isDemoRoute && (
            <Link
              href="/setup"
              aria-label="Configuración inicial"
              className="min-h-12 min-w-12 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs font-medium"
            >
              <Settings className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="hidden lg:inline">Setup</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsUpdateModalOpen(true)}
            title="Abrir asistente de versiones y actualizaciones"
            className="min-h-12 px-3 rounded-xl bg-zinc-900 border border-white/10 hover:border-emerald-500/30 text-zinc-300 hover:text-white transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden lg:inline">Actualizaciones</span>
          </button>

          <Link
            href={bookingUrlPath}
            aria-label="Abrir vista pública de reservas"
            className="min-h-12 min-w-12 px-3.5 rounded-xl ui-btn-contrast transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs font-semibold"
          >
            <span>Vista Cliente</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </Link>

          {!isDemoRoute && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Cerrar sesión de administrador"
              className="min-h-12 min-w-12 px-3 rounded-xl border border-white/10 bg-zinc-900/70 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs font-medium disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <LogOut className="w-4 h-4 shrink-0" />
              )}
              <span className="hidden xl:inline">Salir</span>
            </button>
          )}
        </div>
      </div>

      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        businessName={settings?.nombre_negocio || 'tu local'}
      />

      <AdminUpdateModal
        isOpen={isUpdateModalOpen}
        versionInfo={versionInfo}
        onClose={() => setIsUpdateModalOpen(false)}
      />
    </header>
  )
}
