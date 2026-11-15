'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ExternalLink,
  Lock,
  Mail,
  PlayCircle,
  ScrollText,
  X,
} from 'lucide-react'
import { AccessibleModal } from '@/components/ui/AccessibleModal'
import { LegalDocument } from '@/components/legal/LegalDocument'
import {
  CHECKOUT_CONSENTS,
  LEGAL_DOCS,
  LEGAL_OWNER,
  getMissingLegalFields,
  getSalesContactLink,
} from '@/lib/legal'
import { cn } from '@/lib/utils'

export interface CheckoutPlan {
  id: '15' | '99'
  name: string
  priceLabel: string
  subtitle: string
  href: string
}

interface Props {
  plan: CheckoutPlan | null
  onClose: () => void
}

function isValidCheckoutHref(href: string): boolean {
  if (!href || href.startsWith('#') || href.includes('configura-tu-')) {
    return false
  }
  try {
    const parsed = new URL(href)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function hasConfiguredContactEmail(email: string): boolean {
  return Boolean(email && !email.includes('[') && email.includes('@'))
}

function CheckoutModalBody({
  plan,
  onClose,
}: {
  plan: CheckoutPlan
  onClose: () => void
}) {
  const consent = CHECKOUT_CONSENTS[0]
  const [accepted, setAccepted] = useState(false)
  const [activeDoc, setActiveDoc] = useState(LEGAL_DOCS[0].id)
  const [redirectError, setRedirectError] = useState<string | null>(null)

  const checkoutReady = isValidCheckoutHref(plan.href)
  const doc = LEGAL_DOCS.find((d) => d.id === activeDoc) ?? LEGAL_DOCS[0]
  const contactEmailAvailable = hasConfiguredContactEmail(LEGAL_OWNER.email)
  const missingLegalFields = getMissingLegalFields()
  const salesContact = plan.id === '99' ? getSalesContactLink(plan.name) : null

  const handleProceed = () => {
    setRedirectError(null)
    if (!accepted) return
    if (!checkoutReady) {
      setRedirectError(
        'La pasarela de pago directa no está disponible en este momento. Puedes probar la demo completa o solicitar tu licencia por contacto directo.'
      )
      return
    }

    try {
      window.location.assign(plan.href)
    } catch {
      setRedirectError(
        'No se pudo abrir la pasarela de pago externa. Inténtalo de nuevo en unos segundos.'
      )
    }
  }

  return (
    <div className="flex flex-col max-h-[90dvh] overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5 sm:p-6">
        <div className="space-y-1 min-w-0">
          <p className="font-mono text-xs uppercase tracking-wider text-emerald-400">
            Resumen antes del pago
          </p>
          <h2
            id="checkout-legal-title"
            className="flex items-center gap-2 text-lg sm:text-xl font-semibold tracking-tight text-white"
          >
            <ScrollText className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>
              {plan.name} ·{' '}
              <span className="font-mono text-emerald-400">{plan.priceLabel}</span>
            </span>
          </h2>
          <p className="text-xs text-zinc-400">{plan.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana de confirmación"
          className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/60 text-zinc-300 transition-all hover:border-white/25 hover:text-white active:scale-[0.98]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
        {/* Selector de documentos */}
        <div
          role="tablist"
          aria-label="Documentos legales aplicables"
          className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-zinc-950/60 p-1"
        >
          {LEGAL_DOCS.map((d) => {
            const active = d.id === activeDoc
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveDoc(d.id)}
                className={cn(
                  'min-h-12 rounded-lg px-2 text-xs font-medium transition-all active:scale-[0.98]',
                  active
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                {d.short}
              </button>
            )
          })}
        </div>

        {/* Extracto legal desplazable */}
        <div className="max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/60 p-4">
          <LegalDocument doc={doc} headingLevel="h3" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
          <Link
            href="/legal"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center gap-1.5 underline underline-offset-4 hover:text-white transition-colors"
          >
            <span>Leer texto completo en /legal</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <span className="font-mono text-[11px] text-zinc-400">
            Art. 103.m TRLGDCU · Entrega digital inmediata
          </span>
        </div>

        {/* Checkbox único legal */}
        <label
          htmlFor="checkout-single-consent"
          className={cn(
            'flex min-h-12 cursor-pointer items-start gap-3.5 rounded-2xl border p-4 text-xs sm:text-[13px] leading-relaxed transition-colors',
            accepted
              ? 'border-emerald-500/60 bg-emerald-500/10 text-zinc-100'
              : 'border-white/15 bg-zinc-950/40 text-zinc-200 hover:border-white/30'
          )}
        >
          <input
            id="checkout-single-consent"
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-emerald-500"
          />
          <span>
            {consent.label}{' '}
            <span className="inline-flex flex-wrap gap-x-2 text-emerald-400">
              <Link
                href="/legal#licencia"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-emerald-300"
              >
                Licencia
              </Link>
              <Link
                href="/legal#aviso-legal"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-emerald-300"
              >
                Aviso Legal
              </Link>
              <Link
                href="/legal#privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-emerald-300"
              >
                Privacidad
              </Link>
            </span>
          </span>
        </label>

        {missingLegalFields.length > 0 && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-amber-500/35 bg-amber-950/30 p-4 text-xs leading-relaxed text-amber-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p>
              Aviso de configuración: faltan datos legales del titular (
              <span className="font-mono text-amber-100">
                {missingLegalFields.join(', ')}
              </span>
              ). Los textos con corchetes son provisionales.
            </p>
          </div>
        )}

        {(!checkoutReady || redirectError) && (
          <div
            role="status"
            className="rounded-2xl border border-amber-500/35 bg-amber-950/30 p-4 space-y-3"
          >
            <div className="flex items-start gap-2.5 text-xs text-amber-200 leading-relaxed">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                {redirectError ||
                  'El enlace de pago automático no está habilitado todavía en esta instalación. Mientras tanto puedes explorar la demo sin límites o solicitar el alta directa.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href="/demo"
                onClick={onClose}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-900/80 px-4 text-xs font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.98]"
              >
                <PlayCircle className="h-4 w-4 text-emerald-400" />
                <span>Explorar Demo en Vivo</span>
              </Link>
              {contactEmailAvailable && (
                <a
                  href={`mailto:${LEGAL_OWNER.email}?subject=${encodeURIComponent(
                    `Solicitud de licencia ${plan.name} (${plan.priceLabel})`
                  )}`}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-zinc-950 transition-all hover:bg-emerald-400 active:scale-[0.98]"
                >
                  <Mail className="h-4 w-4" />
                  <span>Solicitar enlace de pago</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-zinc-950/50 p-5 sm:p-6">
        <button
          type="button"
          onClick={handleProceed}
          disabled={!accepted || !checkoutReady}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_rgb(var(--glow-rgb)/0.25)] transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            {checkoutReady
              ? `Aceptar y pagar ${plan.priceLabel} con PayPal`
              : 'Pago online pendiente de activación'}
          </span>
        </button>

        {salesContact && (
          <a
            href={salesContact.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex min-h-12 items-center justify-center rounded-xl px-3 text-center text-xs text-zinc-300 underline underline-offset-4 transition-colors hover:text-white"
          >
            ¿Dudas técnicas antes de contratar Llave en Mano? Escríbenos por{' '}
            {salesContact.label}
          </a>
        )}
      </div>
    </div>
  )
}

export function LegalCheckoutModal({ plan, onClose }: Props) {
  return (
    <AccessibleModal
      isOpen={plan !== null}
      onClose={onClose}
      labelledBy="checkout-legal-title"
      panelClassName="max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl"
    >
      {plan && <CheckoutModalBody key={plan.id} plan={plan} onClose={onClose} />}
    </AccessibleModal>
  )
}
