'use client'

import React, { createContext, useCallback, useContext, useState } from 'react'
import Link from 'next/link'
import {
  LegalCheckoutModal,
  type CheckoutPlan,
} from '@/components/landing/LegalCheckoutModal'
import {
  CHECKOUT_URL_AUTOINSTALABLE,
  CHECKOUT_URL_LLAVE_EN_MANO,
} from '@/lib/pricing'

const PLANS: Record<'15' | '99', CheckoutPlan> = {
  '15': {
    id: '15',
    name: 'Código Autoinstalable',
    priceLabel: '14,99 €',
    subtitle: 'Licencia vitalicia + código fuente Next.js 16 listo para tu Vercel y Supabase gratis.',
    href: CHECKOUT_URL_AUTOINSTALABLE,
  },
  '99': {
    id: '99',
    name: 'Llave en Mano',
    priceLabel: '99 €',
    subtitle:
      'Configuración integral en < 24h con tu marca, dominio propio verificado en Resend, servicios y horarios.',
    href: CHECKOUT_URL_LLAVE_EN_MANO,
  },
}

interface LandingCheckoutContextValue {
  openPlan: (planId: '15' | '99') => void
}

const LandingCheckoutContext = createContext<LandingCheckoutContextValue | null>(null)

export function LandingCheckoutProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlan | null>(null)

  const openPlan = useCallback((planId: '15' | '99') => {
    setSelectedPlan(PLANS[planId])
  }, [])

  const closeModal = useCallback(() => {
    setSelectedPlan(null)
  }, [])

  return (
    <LandingCheckoutContext.Provider value={{ openPlan }}>
      {children}

      {/* Barra pegajosa inferior optimizada para Instagram / móvil */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/90 p-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md gap-2">
          <Link
            href="/demo"
            className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-white/15 bg-zinc-900 px-3 text-xs sm:text-sm font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.98]"
          >
            Probar demo
          </Link>
          <button
            type="button"
            onClick={() => openPlan('15')}
            className="flex min-h-12 flex-[1.35] items-center justify-center rounded-xl bg-emerald-500 px-3 text-xs sm:text-sm font-semibold text-zinc-950 shadow-[0_0_20px_rgb(var(--glow-rgb)/0.25)] transition-all hover:bg-emerald-400 active:scale-[0.98]"
          >
            Obtener · 14,99 €
          </button>
        </div>
      </div>

      <LegalCheckoutModal plan={selectedPlan} onClose={closeModal} />
    </LandingCheckoutContext.Provider>
  )
}

export function CheckoutTriggerButton({
  planId,
  className,
  children,
}: {
  planId: '15' | '99'
  className?: string
  children: React.ReactNode
}) {
  const ctx = useContext(LandingCheckoutContext)

  return (
    <button
      type="button"
      onClick={() => ctx?.openPlan(planId)}
      className={className}
    >
      {children}
    </button>
  )
}
