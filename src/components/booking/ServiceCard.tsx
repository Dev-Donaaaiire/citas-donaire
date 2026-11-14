'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Clock, Check } from 'lucide-react'
import type { Service } from '@/types/booking'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ServiceCardProps {
  service: Service
  isSelected: boolean
  onSelect: (service: Service) => void
}

export function ServiceCard({ service, isSelected, onSelect }: ServiceCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(service)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'group relative w-full text-left p-5 rounded-2xl transition-all duration-200 cursor-pointer select-none',
        'border backdrop-blur-md',
        isSelected
          ? 'bg-zinc-900/90 border-emerald-500/60 shadow-[0_0_24px_-4px_rgb(var(--glow-rgb)/0.25)] ring-1 ring-emerald-500/50'
          : 'bg-zinc-900/40 border-white/10 hover:border-white/20 hover:bg-zinc-900/70'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-medium text-base text-zinc-100 tracking-tight group-hover:text-white transition-colors truncate">
              {service.nombre}
            </h3>
          </div>

          {service.descripcion && (
            <p className="text-xs leading-relaxed text-zinc-400 line-clamp-2 mb-3">
              {service.descripcion}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-1 font-mono text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{service.duracion_minutos} min</span>
            </div>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-400">Atención personalizada</span>
          </div>
        </div>

        <div className="flex flex-col items-end justify-between self-stretch shrink-0">
          <div className="font-mono text-lg font-semibold tracking-tight text-emerald-400">
            {formatCurrency(Number(service.precio))}
          </div>

          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 mt-2',
              isSelected
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'border border-white/20 bg-zinc-800/50 text-transparent group-hover:border-white/40'
            )}
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </div>
      </div>
    </motion.button>
  )
}
