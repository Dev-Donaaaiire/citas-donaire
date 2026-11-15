'use client'

import React, { useId, useState } from 'react'
import {
  X,
  Sparkles,
  ExternalLink,
  GitBranch,
  Copy,
  Check,
  RefreshCw,
  Zap,
  CheckCircle2,
  Terminal,
} from 'lucide-react'
import type { SystemVersionInfo } from '@/lib/version'
import { AccessibleModal } from '@/components/ui/AccessibleModal'

interface AdminUpdateModalProps {
  isOpen: boolean
  versionInfo: SystemVersionInfo | null
  onClose: () => void
}

export function AdminUpdateModal({
  isOpen,
  versionInfo,
  onClose,
}: AdminUpdateModalProps) {
  const titleId = useId()
  const [copiedCmd, setCopiedCmd] = useState(false)

  if (!versionInfo) return null

  const isUpToDate = !versionInfo.updateAvailable
  const syncUrl = versionInfo.oneClickSyncUrl || 'https://github.com/Dev-Donaaaiire/citas-donaire'

  const terminalCmd =
    'git remote add upstream https://github.com/Dev-Donaaaiire/citas-donaire.git\ngit pull upstream main --allow-unrelated-histories\ngit push origin main'

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(terminalCmd)
    setCopiedCmd(true)
    setTimeout(() => setCopiedCmd(false), 2500)
  }

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      panelClassName="max-w-xl w-full rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden my-4"
    >
      <div className="flex flex-col max-h-[90dvh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-zinc-900/60 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isUpToDate
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              {isUpToDate ? <CheckCircle2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h2
                id={titleId}
                className="text-base font-semibold text-white tracking-tight"
              >
                {isUpToDate
                  ? 'Sistema actualizado a la última versión'
                  : `Nueva versión disponible: v${versionInfo.latestVersion}`}
              </h2>
              <p className="text-xs text-zinc-400">
                Versión instalada: <span className="font-mono text-zinc-300">v{versionInfo.currentVersion}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors active:scale-[0.98]"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Novedades / Changelog */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Novedades de esta versión
            </h3>
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-white/10 space-y-2 text-xs text-zinc-300">
              {versionInfo.changelog && versionInfo.changelog.length > 0 ? (
                versionInfo.changelog.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 font-bold">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))
              ) : (
                <p className="text-zinc-400">Mejoras de rendimiento, estabilidad y diseño.</p>
              )}
            </div>
          </div>

          {/* Cómo actualizar */}
          <div className="space-y-2.5 pt-2">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              Cómo aplicar la actualización
            </h3>

            {/* Opción 1: Enlace directo en 1 clic */}
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-emerald-400" />
                  Opción 1: Fusión en 1 Clic desde GitHub
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono">
                  Recomendada
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Abre la comparación oficial contra el repositorio maestro. Solo pulsa en <strong>«Create Pull Request»</strong> y <strong>«Merge»</strong>. Vercel desplegará la actualización solo en 30 segundos.
              </p>
              <a
                href={syncUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <span>Sincronizar en GitHub y desplegar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Opción 2: Terminal rápido */}
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-zinc-400" />
                  Opción 2: Desde la terminal de tu proyecto
                </span>
                <button
                  type="button"
                  onClick={handleCopyCmd}
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded-lg bg-zinc-800 border border-white/5 active:scale-95 transition-all"
                >
                  {copiedCmd ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-zinc-950 border border-white/5 font-mono text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
                {terminalCmd}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-zinc-900/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-medium transition-colors active:scale-[0.98]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </AccessibleModal>
  )
}
