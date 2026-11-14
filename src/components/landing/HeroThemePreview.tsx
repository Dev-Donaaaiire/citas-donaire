'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck, Check, Clock, Sparkles } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import { cn } from '@/lib/utils'

const SERVICES = [
  { name: 'Corte Signature', meta: '45 min', price: '35 €' },
  { name: 'Ritual Barba', meta: '30 min', price: '25 €' },
  { name: 'Pack Completo', meta: '75 min', price: '55 €' },
]
const DAYS = ['L', 'M', 'X', 'J', 'V', 'S']
const SLOTS = ['10:00', '10:45', '12:30', '16:00', '17:15', '18:30']
const TAKEN = new Set(['10:45', '17:15'])

const SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const

export function HeroThemePreview() {
  const { theme, themes, setTheme } = useTheme()
  const [service, setService] = useState(0)
  const [day, setDay] = useState(2)
  const [slot, setSlot] = useState<string | null>('12:30')

  return (
    <div className="w-full max-w-md space-y-3">
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
                'relative flex h-12 touch-manipulation items-center justify-center gap-2 rounded-xl text-xs font-medium transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
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
                aria-hidden
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

      <div className="space-y-4 rounded-3xl border border-white/10 bg-zinc-900/70 p-4 shadow-xl backdrop-blur-md sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">Tu Negocio</p>
            <p className="font-mono text-[11px] text-zinc-400">Reserva en 30 segundos</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            En vivo
          </span>
        </div>

        <div className="space-y-1.5">
          {SERVICES.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setService(i)}
              className={cn(
                'flex h-12 w-full items-center justify-between rounded-xl border px-3.5 text-left text-xs transition-all active:scale-[0.98]',
                i === service
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                  : 'border-white/10 text-zinc-300 hover:border-white/20'
              )}
            >
              <span className="font-medium">{s.name}</span>
              <span className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
                <Clock className="h-3 w-3" />
                {s.meta}
                <span className="text-white">{s.price}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          {DAYS.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(i)}
              className={cn(
                'flex h-12 flex-col items-center justify-center rounded-xl border font-mono text-[11px] transition-all active:scale-[0.97]',
                i === day
                  ? 'border-emerald-500 bg-emerald-500 text-zinc-950'
                  : 'border-white/10 text-zinc-300 hover:border-white/20'
              )}
            >
              <span className="text-[9px] opacity-70">{d}</span>
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
                onClick={() => setSlot(t)}
                className={cn(
                  'h-12 rounded-xl border font-mono text-xs transition-all active:scale-[0.97]',
                  taken
                    ? 'cursor-not-allowed border-white/5 text-zinc-600 line-through'
                    : t === slot
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                      : 'border-white/10 text-zinc-200 hover:border-emerald-500/40'
                )}
              >
                {t}
              </button>
            )
          })}
        </div>

        <div className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-zinc-950 shadow-[0_0_20px_rgb(var(--glow-rgb)/0.3)]">
          {slot ? (
            <>
              <Check className="h-4 w-4" />
              Confirmar {SERVICES[service].name} · {slot}
            </>
          ) : (
            <>
              <CalendarCheck className="h-4 w-4" />
              Elige una hora libre
            </>
          )}
        </div>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center font-mono text-[11px] text-zinc-500">
        <Sparkles className="h-3 w-3" />
        Toda la página cambia con el diseño que elijas
      </p>
    </div>
  )
}
