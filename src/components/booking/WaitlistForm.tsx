'use client'

import React, { useState } from 'react'
import { BellRing, CheckCircle2, Loader2 } from 'lucide-react'
import { MAX_BOOKING_DAYS_AHEAD } from '@/lib/calendar'
import { addDaysToIsoDate, getTodayIsoInTimeZone } from '@/lib/timezone'

const inputClass =
  'w-full min-h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/60'

export function WaitlistForm({ serviceId, timezone }: { serviceId: string; timezone: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setStatus('sending')
    setError(null)
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, ...Object.fromEntries(form) }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error)
      }
      setStatus('done')
    } catch (err) {
      setStatus('idle')
      setError((err instanceof Error && err.message) || 'No se pudo apuntarte. Inténtalo de nuevo.')
    }
  }

  if (status === 'done') {
    return (
      <p role="status" className="flex items-center gap-2 p-4 rounded-2xl border border-white/10 bg-zinc-900/40 text-sm text-zinc-200">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        Apuntado. Te escribiremos si se libera un hueco ese día.
      </p>
    )
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full min-h-12 px-4 rounded-xl border border-white/10 bg-zinc-900/40 text-sm text-zinc-200 hover:bg-zinc-800 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
      >
        <BellRing className="w-4 h-4 text-emerald-400" />
        ¿No encuentras hueco? Avísame si se libera
      </button>
    )
  }

  const today = getTodayIsoInTimeZone(timezone)
  return (
    <form onSubmit={submit} className="space-y-3 p-4 rounded-2xl border border-white/10 bg-zinc-900/40">
      <label className="block space-y-1.5 text-xs text-zinc-300">
        <span>Día que te interesa</span>
        <input
          type="date"
          name="date"
          required
          min={today}
          max={addDaysToIsoDate(today, MAX_BOOKING_DAYS_AHEAD)}
          className={inputClass}
        />
      </label>
      <label className="block space-y-1.5 text-xs text-zinc-300">
        <span>Tu nombre</span>
        <input name="nombre" required minLength={2} maxLength={120} autoComplete="name" className={inputClass} />
      </label>
      <label className="block space-y-1.5 text-xs text-zinc-300">
        <span>Tu correo</span>
        <input type="email" name="email" required maxLength={180} autoComplete="email" className={inputClass} />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {error && (
        <p role="alert" className="text-xs text-amber-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full min-h-12 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
      >
        {status === 'sending' && <Loader2 className="w-4 h-4 animate-spin" />}
        Avisarme
      </button>
      <p className="text-[11px] text-zinc-400">
        Usaremos tu nombre y correo solo para avisarte sobre ese día; se borran después.
      </p>
    </form>
  )
}
