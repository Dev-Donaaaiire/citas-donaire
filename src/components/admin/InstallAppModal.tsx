'use client'

import React, { useState } from 'react'
import {
  Smartphone,
  Share2,
  PlusSquare,
  MoreVertical,
  Download,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface InstallAppModalProps {
  isOpen: boolean
  onClose: () => void
  businessName?: string
}

export function InstallAppModal({
  isOpen,
  onClose,
  businessName = 'tu local',
}: InstallAppModalProps) {
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios')

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl p-6 sm:p-7 text-zinc-100 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="install-modal-title"
                className="text-lg font-semibold tracking-tight text-white"
              >
                Guardar en tu Móvil
              </h2>
              <p className="text-xs text-zinc-400">
                Acceso directo a pantalla completa sin escribir URLs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors flex items-center justify-center shrink-0 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de plataforma: iOS vs Android */}
        <div
          role="tablist"
          className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-900/80 border border-white/10 text-xs font-medium"
        >
          <button
            type="button"
            role="tab"
            aria-selected={platform === 'ios'}
            onClick={() => setPlatform('ios')}
            className={cn(
              'py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98',
              platform === 'ios'
                ? 'bg-zinc-800 text-white font-semibold shadow-sm border border-white/10'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <span>iPhone (Safari)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={platform === 'android'}
            onClick={() => setPlatform('android')}
            className={cn(
              'py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98',
              platform === 'android'
                ? 'bg-zinc-800 text-white font-semibold shadow-sm border border-white/10'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <span>Android (Chrome)</span>
          </button>
        </div>

        {/* Pasos visuales según plataforma */}
        {platform === 'ios' ? (
          <div className="space-y-3.5 text-xs text-zinc-300">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/50 border border-white/5">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Share2 className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <span className="font-semibold text-white block">1. Pulsa en Compartir</span>
                <span className="text-zinc-400 leading-relaxed block">
                  En la barra inferior de Safari, toca el icono cuadrado con la flecha hacia arriba.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/50 border border-white/5">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <PlusSquare className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <span className="font-semibold text-white block">2. Añadir a pantalla de inicio</span>
                <span className="text-zinc-400 leading-relaxed block">
                  Desliza las opciones y pulsa <strong className="text-zinc-200">“Añadir a pantalla de inicio”</strong>.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/50 border border-white/5">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <span className="font-semibold text-white block">3. Pulsa Añadir</span>
                <span className="text-zinc-400 leading-relaxed block">
                  Toca <strong className="text-zinc-200">“Añadir”</strong> arriba a la derecha. ¡Listo! Ya tienes el icono de {businessName}.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 text-xs text-zinc-300">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/50 border border-white/5">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <MoreVertical className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <span className="font-semibold text-white block">1. Menú de Chrome</span>
                <span className="text-zinc-400 leading-relaxed block">
                  Toca los 3 puntos verticales en la esquina superior derecha del navegador.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/50 border border-white/5">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Download className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <span className="font-semibold text-white block">2. Instalar o Añadir</span>
                <span className="text-zinc-400 leading-relaxed block">
                  Pulsa en <strong className="text-zinc-200">“Instalar aplicación”</strong> o <strong className="text-zinc-200">“Añadir a pantalla principal”</strong>.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/50 border border-white/5">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <span className="font-semibold text-white block">3. Confirmar</span>
                <span className="text-zinc-400 leading-relaxed block">
                  Pulsa en <strong className="text-zinc-200">“Instalar”</strong>. La App se colocará junto a tus otras aplicaciones.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Ventaja */}
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-300">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Se abrirá a pantalla completa y sin barras de navegador, directo a tu agenda.
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white text-xs font-semibold transition-all active:scale-98"
        >
          Entendido, cerrar
        </button>
      </div>
    </div>
  )
}
