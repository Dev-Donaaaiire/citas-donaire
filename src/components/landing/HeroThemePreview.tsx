'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck, Check, Clock, Sparkles } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import { cn } from '@/lib/utils'

interface NichePreview {
  id: string
  label: string
  business: string
  services: { name: string; meta: string; price: string }[]
}

const NICHES: NichePreview[] = [
  {
    id: 'barberia',
    label: 'Barbería',
    business: 'Studio Donaire Barber',
    services: [
      { name: 'Corte Signature', meta: '45 min', price: '28 €' },
      { name: 'Ritual Barba Vapor', meta: '30 min', price: '18 €' },
      { name: 'Pack Corte + Barba', meta: '75 min', price: '42 €' },
    ],
  },
  {
    id: 'estetica',
    label: 'Estética',
    business: 'Atelier Lúa Estética',
    services: [
      { name: 'Lifting de Pestañas', meta: '60 min', price: '48 €' },
      { name: 'Higiene Facial Glow', meta: '50 min', price: '55 €' },
      { name: 'Diseño + Laminado Cejas', meta: '40 min', price: '38 €' },
    ],
  },
  {
    id: 'clinica',
    label: 'Clínica',
    business: 'Fisio & Salud Central',
    services: [
      { name: 'Valoración + Fisioterapia', meta: '50 min', price: '45 €' },
      { name: 'Punción Seca Local', meta: '30 min', price: '35 €' },
      { name: 'Readaptación Deportiva', meta: '60 min', price: '55 €' },
    ],
  },
  {
    id: 'tatuajes',
    label: 'Tatuajes',
    business: 'Norte Ink Studio',
    services: [
      { name: 'Consulta + Diseño', meta: '30 min', price: '25 €' },
      { name: 'Pieza Fine Line', meta: '90 min', price: '110 €' },
      { name: 'Media Sesión Custom', meta: '180 min', price: '220 €' },
    ],
  },
]

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S']
const SLOTS = ['10:00', '10:45', '12:30', '16:00', '17:15', '18:30']
const TAKEN = new Set(['10:45', '17:15'])

const SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const

export function HeroThemePreview() {
  const { theme, themes, setTheme } = useTheme()
  const [nicheIdx, setNicheIdx] = useState(0)
  const [service, setService] = useState(0)
  const [day, setDay] = useState(2)
  const [slot, setSlot] = useState<string | null>('12:30')

  const activeNiche = NICHES[nicheIdx] ?? NICHES[0]
  const activeService = activeNiche.services[service] ?? activeNiche.services[0]

  return (
    <div className="w-full max-w-md space-y-3">
      {/* Selector rápido de tema */}
      <div
        role="radiogroup"
        aria-label="Elige el diseño de la vista previa"
        className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-zinc-900/70 p-1 backdrop-blur-md"
      >
        {themes.map((t) => {
          const active = t.id === theme
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(t.id)}
              className={cn(
                'relative flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-xl text-xs font-medium transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                active ? 'text-white' : 'text-zinc-400 hover:text-white'
              )}
            >
              {active && (
                <motion.span
                  layoutId="hero-theme-pill"
                  transition={SPRING}
                  className="absolute inset-0 rounded-xl border border-white/15 bg-zinc-700/70"
                />
              )}
              <span
                aria-hidden="true"
                className="relative h-3.5 w-3.5 rounded-full ring-1 ring-white/30"
                style={{
                  background: `linear-gradient(135deg, ${t.swatch.bg} 50%, ${t.swatch.accent} 50%)`,
                }}
              />
              <span className="relative">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Selector multi-nicho */}
      <div
        role="tablist"
        aria-label="Ejemplos por sector"
        className="grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-zinc-900/50 p-1 backdrop-blur-md"
      >
        {NICHES.map((niche, idx) => {
          const active = idx === nicheIdx
          return (
            <button
              key={niche.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setNicheIdx(idx)
                setService(0)
              }}
              className={cn(
                'min-h-12 rounded-xl px-1.5 text-[11px] font-medium transition-all active:scale-[0.98]',
                active
                  ? 'bg-emerald-500 text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              )}
            >
              {niche.label}
            </button>
          )
        })}
      </div>

      {/* Tarjeta interactiva simulada */}
      <div className="space-y-4 rounded-3xl border border-white/10 bg-zinc-900/70 p-4 shadow-xl backdrop-blur-md sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-white truncate">
              {activeNiche.business}
            </p>
            <p className="font-mono text-[11px] text-zinc-400">
              Reserva desde bio sin registro · 30s
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            En vivo
          </span>
        </div>

        <div className="space-y-1.5">
          {activeNiche.services.map((s, i) => (
            <button
              key={s.name}
              type="button"
              aria-pressed={i === service}
              onClick={() => setService(i)}
              className={cn(
                'flex min-h-12 w-full items-center justify-between rounded-xl border px-3.5 py-2 text-left text-xs transition-all active:scale-[0.98]',
                i === service
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                  : 'border-white/10 text-zinc-300 hover:border-white/25'
              )}
            >
              <span className="font-medium truncate pr-2">{s.name}</span>
              <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-zinc-400">
                <Clock className="h-3 w-3" />
                {s.meta}
                <span className="text-white font-semibold">{s.price}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          {DAYS.map((d, i) => (
            <button
              key={d}
              type="button"
              aria-pressed={i === day}
              onClick={() => setDay(i)}
              className={cn(
                'flex min-h-12 flex-col items-center justify-center rounded-xl border font-mono text-[11px] transition-all active:scale-[0.98]',
                i === day
                  ? 'border-emerald-500 bg-emerald-500 text-zinc-950 font-semibold'
                  : 'border-white/10 text-zinc-300 hover:border-white/25'
              )}
            >
              <span className="text-[9px] opacity-80">{d}</span>
              <span className="font-semibold">{16 + i}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {SLOTS.map((t) => {
            const taken = TAKEN.has(t)
            return (
              <button
                key={t}
                type="button"
                disabled={taken}
                aria-pressed={t === slot}
                onClick={() => setSlot(t)}
                className={cn(
                  'min-h-12 rounded-xl border font-mono text-xs transition-all active:scale-[0.98]',
                  taken
                    ? 'ui-slot-disabled cursor-not-allowed line-through'
                    : t === slot
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-semibold'
                      : 'border-white/10 text-zinc-200 hover:border-emerald-500/40'
                )}
              >
                {t}
              </button>
            )
          })}
        </div>

        <div className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 text-xs sm:text-sm font-semibold text-zinc-950 shadow-[0_0_20px_rgb(var(--glow-rgb)/0.3)]">
          {slot ? (
            <>
              <Check className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Confirmar {activeService.name} · {slot}
              </span>
            </>
          ) : (
            <>
              <CalendarCheck className="h-4 w-4 shrink-0" />
              <span>Elige una hora libre</span>
            </>
          )}
        </div>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center font-mono text-[11px] text-zinc-400">
        <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        Cambia el diseño arriba y toda la web responde en directo
      </p>
    </div>
  )
}
