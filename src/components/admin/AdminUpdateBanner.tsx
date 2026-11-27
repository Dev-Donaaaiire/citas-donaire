'use client'

import React, { useEffect, useState } from 'react'
import { Sparkles, ArrowRight, X } from 'lucide-react'
import type { SystemVersionInfo } from '@/lib/version'
import { AdminUpdateModal } from '@/components/admin/AdminUpdateModal'

export function AdminUpdateBanner() {
  const [versionInfo, setVersionInfo] = useState<SystemVersionInfo | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadVersion() {
      try {
        const res = await fetch('/api/admin/system/status')
        if (res.ok) {
          const data = (await res.json()) as SystemVersionInfo
          if (isMounted) {
            setVersionInfo(data)
          }
        }
      } catch {
        // Silencioso
      }
    }

    loadVersion()

    return () => {
      isMounted = false
    }
  }, [])

  if (!versionInfo || !versionInfo.updateAvailable || dismissed) {
    return (
      <AdminUpdateModal
        isOpen={isModalOpen}
        versionInfo={versionInfo}
        onClose={() => setIsModalOpen(false)}
      />
    )
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/30 p-3.5 sm:p-4 text-xs shadow-lg shadow-emerald-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  Nueva actualización disponible (v{versionInfo.latestVersion})
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  Nuevo
                </span>
              </div>
              <p className="text-zinc-400 text-[11px] line-clamp-1">
                {versionInfo.changelog[0] || 'Mejoras de rendimiento y nuevas funcionalidades.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="min-h-10 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <span>Ver novedades y actualizar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="min-h-10 w-10 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors active:scale-[0.98]"
              aria-label="Ocultar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <AdminUpdateModal
        isOpen={isModalOpen}
        versionInfo={versionInfo}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
