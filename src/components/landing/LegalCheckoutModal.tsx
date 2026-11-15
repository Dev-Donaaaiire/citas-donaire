'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock, ScrollText, X } from 'lucide-react'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { CHECKOUT_CONSENTS, LEGAL_DOCS } from '@/lib/legal'
import { cn } from '@/lib/utils'

export interface CheckoutPlan {
  name: string
  priceLabel: string
  href: string
}

interface Props {
  plan: CheckoutPlan | null
  onClose: () => void
}

export function LegalCheckoutModal({ plan, onClose }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [activeDoc, setActiveDoc] = useState(LEGAL_DOCS[0].id)
  const open = plan !== null
  const allChecked = CHECKOUT_CONSENTS.every((c) => checked[c.id])
  const checkoutReady = plan ? !plan.href.startsWith('#') : false

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const doc = LEGAL_DOCS.find((d) => d.id === activeDoc) ?? LEGAL_DOCS[0]

  const handleProceed = () => {
    if (!plan || !allChecked || !checkoutReady) return
    window.location.href = plan.href
  }

  return (
    <AnimatePresence>
      {open && plan && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-legal-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-zinc-900 shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
              <div className="space-y-1">
                <h2
                  id="checkout-legal-title"
                  className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white"
                >
                  <ScrollText className="h-4 w-4 text-emerald-400" />
                  Antes de pagar: {plan.name} · {plan.priceLabel}
                </h2>
                <p className="text-xs text-zinc-400">
                  Lee y confirma las condiciones. Son 3 casillas y ya puedes pagar.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition-all hover:text-white active:scale-[0.98]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="flex gap-1 rounded-xl border border-white/10 bg-zinc-950/60 p-1">
                {LEGAL_DOCS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setActiveDoc(d.id)}
                    className={cn(
                      'h-12 flex-1 rounded-lg text-xs font-medium transition-all active:scale-[0.98]',
                      d.id === activeDoc
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-white'
                    )}
                  >
                    {d.short}
                  </button>
                ))}
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/60 p-4">
                <LegalDocument doc={doc} headingLevel="h3" />
              </div>
              <Link
                href="/legal"
                target="_blank"
                className="inline-block text-xs text-zinc-400 underline underline-offset-4 hover:text-white"
              >
                Abrir texto completo en /legal
              </Link>

              <div className="space-y-2.5">
                {CHECKOUT_CONSENTS.map((c) => (
                  <label
                    key={c.id}
                    className={cn(
                      'flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-[13px] leading-relaxed transition-colors',
                      checked[c.id]
                        ? 'border-emerald-500/50 bg-emerald-500/5 text-zinc-100'
                        : 'border-white/10 text-zinc-300 hover:border-white/20'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(checked[c.id])}
                      onChange={(e) =>
                        setChecked((prev) => ({ ...prev, [c.id]: e.target.checked }))
                      }
                      className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500"
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-white/10 p-5">
              <button
                type="button"
                onClick={handleProceed}
                disabled={!allChecked || !checkoutReady}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-zinc-950 shadow-[0_0_20px_rgb(var(--glow-rgb)/0.25)] transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Lock className="h-4 w-4" />
                Aceptar y pagar {plan.priceLabel} con PayPal
              </button>
              {!checkoutReady && (
                <p className="text-center text-[11px] text-amber-400">
                  Enlace de pago no configurado: define NEXT_PUBLIC_PAYPAL_URL_15 / _99 (Enlace de PayPal).
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
