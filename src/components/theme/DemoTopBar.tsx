'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { CalendarCheck, LayoutDashboard, ShoppingBag } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import { cn } from '@/lib/utils'

const SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const

export function DemoTopBar() {
  const pathname = usePathname()
  const { theme, themes, setTheme } = useTheme()
  const isAdminView = pathname.startsWith('/demo/admin')

  const views = [
    {
      href: '/demo',
      active: !isAdminView,
      icon: CalendarCheck,
      short: 'Cliente',
      long: 'Ver como Cliente (Reservar)',
    },
    {
      href: '/demo/admin',
      active: isAdminView,
      icon: LayoutDashboard,
      short: 'Dueño',
      long: 'Ver como Dueño (Panel Admin)',
    },
  ]

  return (
    <div className="sticky top-0 z-50 w-full border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl shadow-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-2.5 sm:gap-3 sm:px-6">
        {/* Etiqueta DEMO */}
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400 xl:inline-flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Demo en vivo
        </span>

        {/* Selector de tema */}
        <div
          role="radiogroup"
          aria-label="Diseño del sistema"
          className="flex shrink-0 items-center gap-0.5 rounded-xl border border-white/10 bg-zinc-900/70 p-0.5"
        >
          {themes.map((t) => {
            const active = t.id === theme
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`Tema ${t.label}`}
                title={`${t.label} · ${t.tagline}`}
                onClick={() => setTheme(t.id)}
                className={cn(
                  'relative flex h-10 min-w-10 touch-manipulation select-none items-center justify-center gap-2 rounded-[10px] px-2.5 text-xs font-medium transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                  active ? 'text-white' : 'text-zinc-400 hover:text-white'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="demo-theme-pill"
                    transition={SPRING}
                    className="absolute inset-0 rounded-[10px] border border-white/15 bg-zinc-700/70"
                  />
                )}
                <span
                  aria-hidden
                  className="relative h-4 w-4 shrink-0 rounded-full ring-1 ring-white/30"
                  style={{
                    background: `linear-gradient(135deg, ${t.swatch.bg} 50%, ${t.swatch.accent} 50%)`,
                  }}
                />
                <span className="relative hidden sm:inline">{t.short}</span>
              </button>
            )
          })}
        </div>

        {/* Cliente / Dueño */}
        <nav
          aria-label="Vista de la demo"
          className="flex shrink-0 items-center gap-0.5 rounded-xl border border-white/10 bg-zinc-900/70 p-0.5"
        >
          {views.map((v) => {
            const Icon = v.icon
            return (
              <Link
                key={v.href}
                href={v.href}
                aria-current={v.active ? 'page' : undefined}
                aria-label={v.long}
                title={v.long}
                className={cn(
                  'relative flex h-10 min-w-10 touch-manipulation select-none items-center justify-center gap-1.5 rounded-[10px] px-2.5 text-xs font-medium transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                  v.active ? 'text-white' : 'text-zinc-400 hover:text-white'
                )}
              >
                {v.active && (
                  <motion.span
                    layoutId="demo-view-pill"
                    transition={SPRING}
                    className="absolute inset-0 rounded-[10px] border border-white/15 bg-zinc-700/70"
                  />
                )}
                <Icon className="relative h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="relative hidden sm:inline lg:hidden">{v.short}</span>
                <span className="relative hidden lg:inline">{v.long}</span>
              </Link>
            )
          })}
        </nav>

        {/* CTA de compra */}
        <Link
          href="/#precios"
          className="ml-auto flex h-10 shrink-0 touch-manipulation select-none items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 text-xs font-semibold text-zinc-950 shadow-[0_0_22px_rgba(16,185,129,0.35)] transition-all hover:bg-emerald-400 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:px-4 sm:text-sm"
        >
          <ShoppingBag className="h-4 w-4 shrink-0" strokeWidth={1.9} />
          <span className="whitespace-nowrap xl:hidden">
            <span className="hidden sm:inline">Comprar · </span>14,99 €
          </span>
          <span className="hidden whitespace-nowrap xl:inline">
            Comprar este sistema por 14,99 € (Pago único)
          </span>
        </Link>
      </div>
    </div>
  )
}
