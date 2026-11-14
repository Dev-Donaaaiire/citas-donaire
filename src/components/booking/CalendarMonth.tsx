'use client'

import React, { useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import {
  formatDateKey,
  getMonthDaysGrid,
  calculateAvailableSlots,
} from '@/lib/calendar'
import type { Appointment, BlockedSlot, BusinessSettings } from '@/types/booking'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface CalendarMonthProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  durationMinutes: number
  settings: BusinessSettings | null
  appointments: Appointment[]
  blockedSlots: BlockedSlot[]
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const WEEKDAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function CalendarMonth({
  selectedDate,
  onSelectDate,
  durationMinutes,
  settings,
  appointments,
  blockedSlots,
}: CalendarMonthProps) {
  const [currentYear, setCurrentYear] = React.useState(selectedDate.getFullYear())
  const [currentMonth, setCurrentMonth] = React.useState(selectedDate.getMonth())

  const today = useMemo(() => new Date(), [])
  const todayKey = formatDateKey(today)
  const selectedKey = formatDateKey(selectedDate)

  // Desplazamiento de meses
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1)
      setCurrentMonth(11)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1)
      setCurrentMonth(0)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  // Comprobar si se puede retroceder de mes (no ir a meses anteriores al actual)
  const isPrevDisabled =
    currentYear < today.getFullYear() ||
    (currentYear === today.getFullYear() && currentMonth <= today.getMonth())

  const daysGrid = useMemo(
    () => getMonthDaysGrid(currentYear, currentMonth),
    [currentYear, currentMonth]
  )

  // Próximos 14 días para la tira horizontal móvil
  const quickDays = useMemo(() => {
    const list: Date[] = []
    for (let i = 0; i < 14; i++) {
      const d = new Date()
      d.setDate(today.getDate() + i)
      list.push(d)
    }
    return list
  }, [today])

  return (
    <div className="w-full space-y-4">
      {/* Tira rápida horizontal para móvil (Instagram ergonomics) */}
      <div className="block sm:hidden">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
            Días sugeridos
          </span>
          <span className="text-[11px] text-zinc-500">Desliza para más fechas →</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth touch-manipulation">
          {quickDays.map((d) => {
            const key = formatDateKey(d)
            const isSelected = key === selectedKey
            const dayNum = d.getDate()
            const weekdayShort = d.toLocaleDateString('es-ES', { weekday: 'short' })

            // Disponibilidad rápida
            const slots = calculateAvailableSlots({
              targetDate: d,
              durationMinutes,
              settings,
              appointments,
              blockedSlots,
            })
            const availableCount = slots.filter((s) => s.isAvailable).length
            const isClosed = slots.length === 0

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDate(d)}
                disabled={isClosed || availableCount === 0}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[62px] h-[72px] rounded-2xl p-2 transition-all duration-200 border cursor-pointer select-none shrink-0',
                  isSelected
                    ? 'bg-white text-zinc-950 border-white shadow-md font-medium'
                    : isClosed || availableCount === 0
                    ? 'bg-zinc-900/20 border-white/5 text-zinc-600 opacity-40 cursor-not-allowed'
                    : 'bg-zinc-900/60 border-white/10 text-zinc-300 hover:border-white/20 active:scale-95'
                )}
              >
                <span className="text-[11px] uppercase tracking-wider font-sans font-normal opacity-80">
                  {weekdayShort}
                </span>
                <span className="text-lg font-mono font-bold leading-tight my-0.5">
                  {dayNum}
                </span>
                <span
                  className={cn(
                    'text-[9px] font-mono leading-none',
                    isSelected
                      ? 'text-zinc-700 font-semibold'
                      : availableCount > 0
                      ? 'text-emerald-400'
                      : 'text-zinc-600'
                  )}
                >
                  {isClosed ? 'Cerrado' : availableCount > 0 ? `${availableCount} libres` : 'Lleno'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Calendario mensual interactivo */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/40 border border-white/10 backdrop-blur-md">
        {/* Encabezado del mes */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-400" />
            <h4 className="text-base font-semibold text-zinc-100 tracking-tight capitalize">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h4>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isPrevDisabled}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
          {WEEKDAY_NAMES.map((name, i) => (
            <div
              key={i}
              className="text-xs font-mono font-medium text-zinc-500 py-1"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Rejilla de días */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {daysGrid.map((dayDate, index) => {
            if (!dayDate) {
              return <div key={`empty-${index}`} className="h-11 sm:h-12" />
            }

            const key = formatDateKey(dayDate)
            const isSelected = key === selectedKey
            const isToday = key === todayKey

            // Calcular disponibilidad de este día
            const slots = calculateAvailableSlots({
              targetDate: dayDate,
              durationMinutes,
              settings,
              appointments,
              blockedSlots,
            })
            const availableCount = slots.filter((s) => s.isAvailable).length
            const isPast = dayDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const isClosed = slots.length === 0
            const isFullyBooked = !isPast && !isClosed && availableCount === 0
            const isDisabled = isPast || isClosed || isFullyBooked

            return (
              <motion.button
                key={key}
                type="button"
                whileTap={{ scale: isDisabled ? 1 : 0.95 }}
                onClick={() => {
                  if (!isDisabled) {
                    onSelectDate(dayDate)
                  }
                }}
                disabled={isDisabled}
                className={cn(
                  'relative h-11 sm:h-12 w-full rounded-xl flex flex-col items-center justify-center transition-all duration-200 select-none text-xs font-mono',
                  isSelected
                    ? 'bg-white text-zinc-950 font-bold shadow-md ring-2 ring-emerald-500/50'
                    : isToday
                    ? 'border border-emerald-500/50 text-emerald-400 hover:bg-zinc-800'
                    : isDisabled
                    ? 'text-zinc-600 cursor-not-allowed bg-zinc-950/20'
                    : 'text-zinc-200 hover:bg-zinc-800/80 hover:text-white border border-transparent'
                )}
              >
                <span className={cn('text-sm', isSelected && 'font-extrabold')}>
                  {dayDate.getDate()}
                </span>

                {/* Indicador de estado */}
                {!isDisabled && (
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full mt-0.5',
                      isSelected ? 'bg-zinc-950' : 'bg-emerald-400'
                    )}
                  />
                )}

                {isFullyBooked && (
                  <span className="text-[9px] text-zinc-600 leading-none">Lleno</span>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Leyenda sutil */}
        <div className="flex items-center justify-center gap-5 mt-4 pt-3 border-t border-white/5 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-700" />
            <span>Ocupado / Cerrado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span>Seleccionado</span>
          </div>
        </div>
      </div>
    </div>
  )
}
