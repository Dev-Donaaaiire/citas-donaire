'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Calendar, DollarSign, Users, UserX } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

interface AdminMetricsGridProps {
  metrics: {
    todayAppointmentsCount: number
    weeklyEstimatedRevenue: number
    totalClientsCount: number
    inactiveClientsCount: number
  }
}

export function AdminMetricsGrid({ metrics }: AdminMetricsGridProps) {
  const cards = [
    {
      title: 'Citas de Hoy',
      value: metrics.todayAppointmentsCount,
      formatted: `${metrics.todayAppointmentsCount}`,
      subtitle: 'En agenda para la jornada',
      icon: Calendar,
      accentColor: 'text-emerald-400',
      badge: 'Hoy',
    },
    {
      title: 'Ingresos Semanales Estimados',
      value: metrics.weeklyEstimatedRevenue,
      formatted: formatCurrency(metrics.weeklyEstimatedRevenue),
      subtitle: 'Lunes a Domingo (citas activas)',
      icon: DollarSign,
      accentColor: 'text-zinc-100',
      badge: 'Semana',
    },
    {
      title: 'Clientes Totales',
      value: metrics.totalClientsCount,
      formatted: `${metrics.totalClientsCount}`,
      subtitle: 'Registrados en base de datos',
      icon: Users,
      accentColor: 'text-zinc-100',
      badge: 'Total',
    },
    {
      title: 'En Riesgo (+30 días sin visita)',
      value: metrics.inactiveClientsCount,
      formatted: `${metrics.inactiveClientsCount}`,
      subtitle: 'Candidatos para reactivación',
      icon: UserX,
      accentColor: 'text-amber-400',
      badge: 'Reactivar',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon

        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
            className="p-4 sm:p-5 rounded-2xl bg-zinc-900/50 border border-white/10 backdrop-blur-md relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                  {card.title}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/5">
                  {card.badge}
                </span>
              </div>

              <div className="flex items-baseline gap-2 my-1">
                <span
                  className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight ${card.accentColor}`}
                >
                  {card.formatted}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-2">
              <span className="text-[11px] text-zinc-500 truncate">
                {card.subtitle}
              </span>
              <Icon className="w-4 h-4 text-zinc-500 shrink-0" />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
