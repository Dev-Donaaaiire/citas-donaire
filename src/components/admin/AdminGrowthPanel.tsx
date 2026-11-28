'use client'

import React from 'react'
import { BellRing, RotateCcw } from 'lucide-react'
import { WhatsAppButton } from '@/components/admin/WhatsAppButton'
import type { DueClient } from '@/lib/retention'

export interface WaitingEntry {
  id: string
  nombre: string
  fecha: string
}

interface AdminGrowthPanelProps {
  dueClients: DueClient[]
  waiting: WaitingEntry[]
  businessName: string
  isDemo: boolean
}

const cardClass = 'rounded-2xl border border-white/10 bg-zinc-900/40 p-4 space-y-3'

function rhythm(client: DueClient): string {
  const since = `lleva ${client.daysSince} días sin venir`
  return client.usualDays === null
    ? since
    : `suele venir cada ${client.usualDays} días y ${since}`
}

export function AdminGrowthPanel({ dueClients, waiting, businessName, isDemo }: AdminGrowthPanelProps) {
  if (dueClients.length === 0 && waiting.length === 0) return null
  const day = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })

  return (
    <div className="space-y-4 mb-6">
      {dueClients.length > 0 && (
        <section className={cardClass}>
          <h3 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            Te toca volver ({dueClients.length})
          </h3>
          <ul className="divide-y divide-white/10">
            {dueClients.map((client) => (
              <li key={client.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-100 truncate">{client.nombre}</p>
                  <p className="text-xs text-zinc-400">{rhythm(client)}</p>
                </div>
                <WhatsAppButton
                  phone={client.telefono}
                  label="Invitar"
                  ariaLabel={`Invitar por WhatsApp a ${client.nombre}`}
                  isDemo={isDemo}
                  message={(origin) =>
                    `Hola ${client.nombre.split(/\s+/)[0]}, ¡hace tiempo que no te vemos en ${businessName}! Cuando quieras, reserva tu próxima cita aquí: ${origin}/reservar`
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {waiting.length > 0 && (
        <section className={cardClass}>
          <h3 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
            <BellRing className="w-4 h-4 text-emerald-400" />
            Lista de espera ({waiting.length})
          </h3>
          <ul className="text-xs text-zinc-300 space-y-1">
            {waiting.map((entry) => (
              <li key={entry.id}>
                {entry.nombre} · {day.format(new Date(`${entry.fecha}T12:00:00Z`))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
