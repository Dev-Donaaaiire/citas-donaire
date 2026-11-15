'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Ban,
  CalendarClock,
  CheckCircle2,
  Euro,
  Mail,
  MessageCircle,
  ShieldAlert,
  TrendingUp,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ShowcaseTab = 'retencion' | 'agenda' | 'antinoshow'

interface RetentionSample {
  id: string
  name: string
  lastService: string
  daysAgo: number
  visits: number
}

const RETENTION_SAMPLES: RetentionSample[] = [
  {
    id: 'c1',
    name: 'Carlos Navarro',
    lastService: 'Corte Signature',
    daysAgo: 38,
    visits: 6,
  },
  {
    id: 'c2',
    name: 'Sofía Mendoza',
    lastService: 'Higiene Facial Glow',
    daysAgo: 44,
    visits: 4,
  },
  {
    id: 'c3',
    name: 'Hugo Serrano',
    lastService: 'Sesión Fisioterapia',
    daysAgo: 33,
    visits: 9,
  },
]

const AGENDA_SAMPLES = [
  {
    id: 'a1',
    time: '10:30',
    client: 'Lucía Martín',
    service: 'Lifting de Pestañas',
    price: '48 €',
    status: 'Confirmada',
  },
  {
    id: 'a2',
    time: '12:00',
    client: 'Álvaro Ruiz',
    service: 'Pack Corte + Barba',
    price: '42 €',
    status: 'Confirmada',
  },
  {
    id: 'a3',
    time: '16:30',
    client: 'Blanca Ortega',
    service: 'Diseño + Laminado',
    price: '38 €',
    status: 'Pendiente',
  },
]

export function OwnerPanelShowcase() {
  const [tab, setTab] = useState<ShowcaseTab>('retencion')
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({})
  const [blockedClient, setBlockedClient] = useState(true)

  const handleTriggerRecall = (id: string) => {
    setSentIds((prev) => ({ ...prev, [id]: true }))
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-4 sm:p-6 shadow-xl backdrop-blur-md space-y-5">
      {/* Cabecera del mockup */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div className="space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-400">
            Vista previa real · /admin
          </p>
          <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-white">
            Tu Panel del Dueño: control total sin Excel
          </h3>
        </div>
        <Link
          href="/demo/admin"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-950/70 px-4 text-xs font-semibold text-white transition-all hover:border-emerald-500/50 hover:bg-zinc-800 active:scale-[0.98]"
        >
          <span>Abrir panel demo real</span>
          <ArrowRight className="h-4 w-4 text-emerald-400" />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Ingresos estimados (mes)</span>
            <Euro className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-white tabular-nums">
            2.460 €
          </p>
          <p className="mt-1 font-mono text-[11px] text-emerald-400">
            +18% frente al mes pasado
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Citas hoy / Ocupación</span>
            <CalendarClock className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-white tabular-nums">
            7 · 88%
          </p>
          <p className="mt-1 font-mono text-[11px] text-zinc-400">
            Sincronizadas con .ics / Google
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
          <div className="flex items-center justify-between text-xs text-amber-200">
            <span>En riesgo (+30 días sin volver)</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-white tabular-nums">
            3 clientes
          </p>
          <p className="mt-1 font-mono text-[11px] text-amber-300">
            ~125 € recuperables en 1 clic
          </p>
        </div>
      </div>

      {/* Tabs interactivos */}
      <div
        role="tablist"
        aria-label="Módulos del panel del dueño"
        className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-zinc-950/60 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'retencion'}
          onClick={() => setTab('retencion')}
          className={cn(
            'min-h-12 rounded-xl px-2 text-xs font-medium transition-all active:scale-[0.98]',
            tab === 'retencion'
              ? 'bg-emerald-500 text-zinc-950 font-semibold'
              : 'text-zinc-400 hover:text-white'
          )}
        >
          Retención +30d
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'agenda'}
          onClick={() => setTab('agenda')}
          className={cn(
            'min-h-12 rounded-xl px-2 text-xs font-medium transition-all active:scale-[0.98]',
            tab === 'agenda'
              ? 'bg-emerald-500 text-zinc-950 font-semibold'
              : 'text-zinc-400 hover:text-white'
          )}
        >
          Agenda del Día
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'antinoshow'}
          onClick={() => setTab('antinoshow')}
          className={cn(
            'min-h-12 rounded-xl px-2 text-xs font-medium transition-all active:scale-[0.98]',
            tab === 'antinoshow'
              ? 'bg-emerald-500 text-zinc-950 font-semibold'
              : 'text-zinc-400 hover:text-white'
          )}
        >
          Anti No-Show
        </button>
      </div>

      {/* Contenido de cada tab */}
      {tab === 'retencion' && (
        <div className="space-y-2.5">
          <p className="text-xs text-zinc-400">
            Prueba aquí cómo recuperas clientes inactivos en 1 toque por WhatsApp o Email:
          </p>
          {RETENTION_SAMPLES.map((client) => {
            const wasSent = Boolean(sentIds[client.id])
            return (
              <div
                key={client.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-3.5"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {client.name}
                    </span>
                    <span className="rounded-full border border-amber-500/35 bg-amber-950/40 px-2.5 py-0.5 font-mono text-[11px] text-amber-300">
                      {client.daysAgo} días sin visita
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Último servicio: {client.lastService} · {client.visits} visitas
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTriggerRecall(`${client.id}-wa`)}
                    className="flex min-h-12 flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 text-xs font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 active:scale-[0.98]"
                  >
                    {sentIds[`${client.id}-wa`] ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>WhatsApp preparado</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4" />
                        <span>WhatsApp</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTriggerRecall(`${client.id}-mail`)}
                    className="flex min-h-12 flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-zinc-900 px-3.5 text-xs font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.98]"
                  >
                    {sentIds[`${client.id}-mail`] || wasSent ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>Enviado</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        <span>Email 1-clic</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'agenda' && (
        <div className="space-y-2.5">
          <p className="text-xs text-zinc-400">
            Citas ordenadas cronológicamente con bloqueo manual de vacaciones o descansos:
          </p>
          {AGENDA_SAMPLES.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-3.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-12 min-w-16 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 font-mono text-sm font-semibold text-emerald-400 tabular-nums">
                  {item.time}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {item.client}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">{item.service}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-white">
                  {item.price}
                </span>
                <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] text-emerald-400">
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'antinoshow' && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-400">
            La validación anti no-show se ejecuta en servidor: si bloqueas a un cliente reincidente, no volverá a ocupar huecos.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  Mario Benítez · 2 plantones previos
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px]',
                    blockedClient
                      ? 'ui-badge-danger'
                      : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400'
                  )}
                >
                  {blockedClient ? (
                    <>
                      <ShieldAlert className="h-3 w-3" />
                      Bloqueado en reservas
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3 w-3" />
                      Permitido de nuevo
                    </>
                  )}
                </span>
              </div>
              <p className="font-mono text-xs text-zinc-400">
                ejemplo.cliente@correo.es · Controlado sin exponer tu base de datos
              </p>
            </div>

            <button
              type="button"
              onClick={() => setBlockedClient((prev) => !prev)}
              className={cn(
                'flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-all active:scale-[0.98]',
                blockedClient
                  ? 'border-white/15 bg-zinc-900 text-white hover:bg-zinc-800'
                  : 'ui-btn-danger'
              )}
            >
              <Ban className="h-4 w-4" />
              <span>{blockedClient ? 'Readmitir cliente' : 'Bloquear por No-Show'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
