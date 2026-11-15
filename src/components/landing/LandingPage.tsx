'use client'

import React, { useCallback, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BellRing,
  CalendarPlus,
  Check,
  CircleCheck,
  CircleX,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserX,
} from 'lucide-react'
import { HeroThemePreview } from '@/components/landing/HeroThemePreview'
import {
  LegalCheckoutModal,
  type CheckoutPlan,
} from '@/components/landing/LegalCheckoutModal'
import { CHECKOUT_URL_AUTOINSTALABLE, CHECKOUT_URL_LLAVE_EN_MANO } from '@/lib/pricing'

const PLAN_15: CheckoutPlan = {
  name: 'Código Autoinstalable',
  priceLabel: '14,99 €',
  href: CHECKOUT_URL_AUTOINSTALABLE,
}
const PLAN_99: CheckoutPlan = {
  name: 'Llave en Mano',
  priceLabel: '99 €',
  href: CHECKOUT_URL_LLAVE_EN_MANO,
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { type: 'spring', stiffness: 220, damping: 28 },
} as const

const COMPARISON: { row: string; old: string; ours: string }[] = [
  { row: 'Coste en 5 años', old: '500 € (100 €/año)', ours: '14,99 € una sola vez' },
  { row: 'Cuotas mensuales', old: 'Cada año, para siempre', ours: 'Ninguna · para siempre' },
  { row: 'Diseño', old: 'Interfaces antiguas, iguales para todos', ours: '3 diseños de lujo intercambiables' },
  { row: 'Propiedad', old: 'Alquilas: si dejas de pagar, lo pierdes', ours: 'Tuyo al 100%, con tu código' },
  { row: 'Clientes que no vuelven', old: 'Extra o inexistente', ours: 'Seguimiento automático incluido' },
  { row: 'Avisos al calendario', old: 'Manual o de pago', ours: 'Google Calendar y .ics en 1 toque' },
]

const FEATURES = [
  {
    icon: UserX,
    title: 'Cero llamadas',
    text: 'Tus clientes reservan solos desde Instagram en 30 segundos, sin registro.',
  },
  {
    icon: BellRing,
    title: 'Recupera a quien no vuelve',
    text: 'Detecta clientes con más de 30 días sin visita y les envías un recordatorio en 1 clic.',
  },
  {
    icon: CalendarPlus,
    title: 'Directo a tu calendario',
    text: 'Cada cita llega con archivo .ics y botón de Google Calendar. También para el cliente.',
  },
  {
    icon: ShieldCheck,
    title: 'Lista negra anti no-show',
    text: 'Bloquea por email a quienes no se presentan. No vuelven a reservar.',
  },
]

const PLAN_1_FEATURES = [
  'Licencia de por vida',
  'Los 3 diseños exclusivos (Dark Luxury, Clean Minimal, Neon Creator)',
  'Instalación en 1 clic en cuentas gratuitas (0 €/mes de servidor)',
  'Vídeo paso a paso',
]
const PLAN_2_FEATURES = [
  'Todo lo del plan Autoinstalable',
  'Yo mismo te lo configuro con tu logo, tus horarios y tus servicios en menos de 24 h',
  'Te lo entrego funcionando sin que toques nada técnico',
]

export function LandingPage() {
  const [plan, setPlan] = useState<CheckoutPlan | null>(null)
  const closeModal = useCallback(() => setPlan(null), [])

  return (
    <div className="min-h-dvh bg-zinc-950 pb-24 font-sans text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950 md:pb-0">
      {/* Navegación */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 font-mono text-sm font-bold text-emerald-400">
              KD
            </span>
            <span className="hidden text-sm font-semibold tracking-tight text-white sm:block">
              Krono / Donaire Citas
            </span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-zinc-400 md:flex">
            <a href="#comparativa" className="flex h-12 items-center rounded-lg px-3 hover:text-white">
              Comparativa
            </a>
            <a href="#precios" className="flex h-12 items-center rounded-lg px-3 hover:text-white">
              Precios
            </a>
            <Link href="/demo" className="flex h-12 items-center rounded-lg px-3 hover:text-white">
              Demo
            </Link>
          </nav>
          <button
            type="button"
            onClick={() => setPlan(PLAN_15)}
            className="flex h-12 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 shadow-[0_0_20px_rgb(var(--glow-rgb)/0.25)] transition-all hover:bg-emerald-400 active:scale-[0.98]"
          >
            Obtener · 14,99 €
          </button>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <motion.span
              {...fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900 px-3 py-1 font-mono text-xs text-emerald-400"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Pago único · Sin cuotas mensuales
            </motion.span>
            <motion.h1
              {...fadeUp}
              className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Deja de perder clientes por teléfono.{' '}
              <span className="text-zinc-400">
                Tu propio sistema de citas con diseño exclusivo por un pago único de{' '}
                <span className="text-emerald-400">14,99 €</span>.
              </span>
            </motion.h1>
            <motion.p
              {...fadeUp}
              className="max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg"
            >
              Sin cuotas mensuales. Con seguimiento automático de clientes que no vuelven y
              avisos directo al calendario.
            </motion.p>
            <motion.div
              {...fadeUp}
              className="flex flex-col gap-3 pt-2 sm:flex-row"
            >
              <Link
                href="/demo"
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900/70 px-6 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.98]"
              >
                <PlayCircle className="h-4 w-4 text-emerald-400" />
                Probar Demo Interactiva en Vivo
              </Link>
              <button
                type="button"
                onClick={() => setPlan(PLAN_15)}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_rgb(var(--glow-rgb)/0.3)] transition-all hover:bg-emerald-400 active:scale-[0.98]"
              >
                Obtener ahora por 14,99 €
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
            <p className="font-mono text-xs text-zinc-500">
              Licencia de por vida · Entrega inmediata · Pruébalo entero antes de pagar
            </p>
          </div>

          <motion.div {...fadeUp} className="flex justify-center lg:justify-end">
            <HeroThemePreview />
          </motion.div>
        </section>

        {/* Beneficios */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                {...fadeUp}
                className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-5 shadow-sm backdrop-blur-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-950 text-emerald-400">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="text-base font-semibold tracking-tight text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* COMPARATIVA */}
        <section id="comparativa" className="scroll-mt-20 border-t border-white/10 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6">
            <motion.div {...fadeUp} className="space-y-3 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                500 € en 5 años o 14,99 € para siempre
              </h2>
              <p className="mx-auto max-w-xl text-sm text-zinc-400 sm:text-base">
                Lo que pagas por alquilar un programa de citas frente a tenerlo tuyo.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/60 shadow-md backdrop-blur-md"
            >
              <div className="grid grid-cols-[1fr_1fr] md:grid-cols-[0.8fr_1fr_1fr]">
                <div className="hidden border-b border-white/10 p-4 md:block" />
                <div className="border-b border-white/10 p-4">
                  <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Programas tradicionales
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-300">
                    100 €/año = 500 € en 5 años + diseños antiguos
                  </p>
                </div>
                <div className="border-b border-l border-white/10 bg-emerald-500/5 p-4">
                  <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                    Nuestro sistema
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    14,99 € una sola vez para siempre + diseño de lujo + tuyo al 100%
                  </p>
                </div>

                {COMPARISON.map((r) => (
                  <React.Fragment key={r.row}>
                    <div className="col-span-2 border-b border-white/5 px-4 pt-3 text-xs font-mono text-zinc-500 md:col-span-1 md:flex md:items-center md:p-4 md:text-sm md:text-zinc-300">
                      {r.row}
                    </div>
                    <div className="flex items-start gap-2 border-b border-white/5 p-4 text-sm text-zinc-400">
                      <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                      {r.old}
                    </div>
                    <div className="flex items-start gap-2 border-b border-l border-white/5 bg-emerald-500/5 p-4 text-sm text-white">
                      <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      {r.ours}
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 bg-zinc-950/50 p-5 sm:flex-row">
                <p className="text-sm text-zinc-300">
                  Ahorro en 5 años:{' '}
                  <span className="font-mono text-lg font-bold text-emerald-400">485,01 €</span>
                </p>
                <button
                  type="button"
                  onClick={() => setPlan(PLAN_15)}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-zinc-950 transition-all hover:bg-emerald-400 active:scale-[0.98] sm:w-auto"
                >
                  Quiero el mío por 14,99 €
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* PRECIOS */}
        <section id="precios" className="scroll-mt-20 border-t border-white/10 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6">
            <motion.div {...fadeUp} className="space-y-3 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Un pago. Tu sistema para siempre.
              </h2>
              <p className="text-sm text-zinc-400 sm:text-base">
                Elige cómo lo quieres. Pago seguro con PayPal.
              </p>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-2">
              <motion.div
                {...fadeUp}
                className="flex flex-col justify-between rounded-3xl border border-white/10 bg-zinc-900/60 p-6 shadow-md backdrop-blur-md sm:p-8"
              >
                <div className="space-y-5">
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    Código Autoinstalable
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-5xl font-bold text-white">14,99 €</span>
                    <span className="font-mono text-xs text-zinc-400">Pago único</span>
                  </div>
                  <ul className="space-y-3 text-sm text-zinc-300">
                    {PLAN_1_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => setPlan(PLAN_15)}
                  className="mt-8 flex h-12 w-full items-center justify-center rounded-xl border border-white/15 bg-zinc-800 text-sm font-semibold text-white transition-all hover:bg-zinc-700 active:scale-[0.98]"
                >
                  Obtener por 14,99 €
                </button>
              </motion.div>

              <motion.div
                {...fadeUp}
                className="relative flex flex-col justify-between rounded-3xl border border-emerald-500/50 bg-zinc-900/80 p-6 shadow-xl backdrop-blur-md sm:p-8"
              >
                <span className="absolute -top-3 left-6 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-zinc-950">
                  Más cómodo para negocios
                </span>
                <div className="space-y-5">
                  <h3 className="text-lg font-semibold tracking-tight text-white">Llave en Mano</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-5xl font-bold text-white">99 €</span>
                    <span className="font-mono text-xs text-zinc-400">Pago único</span>
                  </div>
                  <ul className="space-y-3 text-sm text-zinc-300">
                    {PLAN_2_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => setPlan(PLAN_99)}
                  className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_rgb(var(--glow-rgb)/0.3)] transition-all hover:bg-emerald-400 active:scale-[0.98]"
                >
                  Quiero la Llave en Mano · 99 €
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            </div>

            <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-zinc-500">
              Antes de pagar podrás revisar y aceptar los{' '}
              <Link href="/legal#licencia" className="underline underline-offset-4 hover:text-zinc-300">
                Términos de Licencia
              </Link>
              . Entrega inmediata de licencia digital: no hay derecho de desistimiento (art. 103.m
              TRLGDCU). Por eso la Demo es libre e ilimitada.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-zinc-500 sm:flex-row sm:px-6">
          <p>© 2026 Krono / Donaire Citas · Pago único, para siempre.</p>
          <nav className="flex flex-wrap items-center justify-center gap-1">
            <Link href="/legal#licencia" className="flex h-12 items-center px-2.5 hover:text-white">
              Licencia
            </Link>
            <Link href="/legal#aviso-legal" className="flex h-12 items-center px-2.5 hover:text-white">
              Aviso Legal
            </Link>
            <Link href="/legal#privacidad" className="flex h-12 items-center px-2.5 hover:text-white">
              Privacidad
            </Link>
            <Link href="/demo" className="flex h-12 items-center px-2.5 hover:text-white">
              Demo
            </Link>
          </nav>
        </div>
      </footer>

      {/* Barra de conversión móvil */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/90 p-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md gap-2">
          <Link
            href="/demo"
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-sm font-medium text-white active:scale-[0.98]"
          >
            Ver demo
          </Link>
          <button
            type="button"
            onClick={() => setPlan(PLAN_15)}
            className="flex h-12 flex-[1.4] items-center justify-center rounded-xl bg-emerald-500 text-sm font-semibold text-zinc-950 active:scale-[0.98]"
          >
            Obtener · 14,99 €
          </button>
        </div>
      </div>

      <LegalCheckoutModal plan={plan} onClose={closeModal} />
    </div>
  )
}
