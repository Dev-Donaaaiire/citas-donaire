'use client'

import React, { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ChevronDown,
} from 'lucide-react'
import {
  formatDateKey,
  getMonthDaysGrid,
  MAX_BOOKING_DAYS_AHEAD,
  calculateAvailableSlots,
} from '@/lib/calendar'
import {
  addDaysToIsoDate,
  getTodayIsoInTimeZone,
  getZonedDateParts,
  sanitizeTimeZone,
  zonedDateTimeToUtc,
} from '@/lib/timezone'
import type {
  Appointment,
  BlockedSlot,
  BusinessPublicSettings,
  PublicBusyInterval,
} from '@/types/booking'
import { cn } from '@/lib/utils'

interface CalendarMonthProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  durationMinutes: number
  settings: BusinessPublicSettings
  busyIntervals?: PublicBusyInterval[]
  appointments?: Appointment[]
  blockedSlots?: BlockedSlot[]
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
  busyIntervals,
  appointments,
  blockedSlots,
}: CalendarMonthProps) {
  const tz = sanitizeTimeZone(settings.timezone)
  const todayIso = getTodayIsoInTimeZone(tz)
  const [todayYearNum, todayMonthOneNum] = todayIso.split('-').map(Number)
  const todayParts = {
    year: todayYearNum,
    month: todayMonthOneNum - 1,
  }

  const maxIso = addDaysToIsoDate(todayIso, MAX_BOOKING_DAYS_AHEAD - 1)
  const selectedKey = formatDateKey(selectedDate, tz)
  const initialSelectedParts = getZonedDateParts(selectedDate, tz)

  const [currentMonth, setCurrentMonth] = useState<number>(
    initialSelectedParts.month - 1
  )
  const [currentYear, setCurrentYear] = useState<number>(
    initialSelectedParts.year
  )
  const [showFullMonthMobile, setShowFullMonthMobile] = useState(false)

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const isPrevDisabled =
    currentYear < todayParts.year ||
    (currentYear === todayParts.year && currentMonth <= todayParts.month)

  const isNextDisabled =
    `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}` >=
    maxIso.slice(0, 7)

  const daysGrid = useMemo(
    () => getMonthDaysGrid(currentYear, currentMonth, tz),
    [currentYear, currentMonth, tz]
  )

  const quickDays = useMemo(() => {
    const list: { date: Date; key: string }[] = []
    for (let i = 0; i < 14; i += 1) {
      const iso = addDaysToIsoDate(todayIso, i)
      list.push({
        key: iso,
        date: zonedDateTimeToUtc(iso, '12:00', tz),
      })
    }
    return list
  }, [todayIso, tz])

  // Memorizar mapa diario de disponibilidad para evitar ~45 recálculos en cada clic de día
  const availabilityMap = useMemo(() => {
    const map = new Map<string, { availableCount: number }>()
    const allCandidateDates: { key: string; date: Date }[] = [...quickDays]

    for (const dayDate of daysGrid) {
      if (!dayDate) continue
      const key = formatDateKey(dayDate, tz)
      if (!map.has(key)) {
        allCandidateDates.push({ key, date: dayDate })
      }
    }

    const now = new Date()
    for (const item of allCandidateDates) {
      if (map.has(item.key)) continue
      if (item.key < todayIso) {
        map.set(item.key, { availableCount: 0 })
        continue
      }

      const slots = calculateAvailableSlots({
        date: item.key,
        serviceDurationMinutes: durationMinutes,
        settings,
        busyIntervals,
        appointments,
        blockedSlots,
        now,
      })

      const availableCount = slots.filter((s) => s.isAvailable).length
      map.set(item.key, { availableCount })
    }

    return map
  }, [
    quickDays,
    daysGrid,
    durationMinutes,
    settings,
    busyIntervals,
    appointments,
    blockedSlots,
    todayIso,
    tz,
  ])

  const weekdayShortFmt = useMemo(
    () =>
      new Intl.DateTimeFormat('es-ES', {
        weekday: 'short',
        timeZone: tz,
      }),
    [tz]
  )

  const monthShortFmt = useMemo(
    () =>
      new Intl.DateTimeFormat('es-ES', {
        month: 'short',
        timeZone: tz,
      }),
    [tz]
  )

  return (
    <div className="space-y-4">
      {/* Tira rápida de próximos 14 días para móvil (Instagram / Pulgar) */}
      <div className="sm:hidden space-y-2.5">
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span>Próximas fechas rápidas</span>
          <span className="font-mono text-zinc-500">14 días</span>
        </div>
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar -mx-4 px-4">
          {quickDays.map(({ date: d, key }) => {
            const isSelected = key === selectedKey
            const info = availabilityMap.get(key)
            const availableCount = info?.availableCount ?? 0
            const isUnavailable = availableCount === 0
            const parts = getZonedDateParts(d, tz)

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDate(d)}
                disabled={isUnavailable}
                aria-pressed={isSelected}
                aria-label={`${parts.day} ${monthShortFmt.format(d)}, ${availableCount} huecos disponibles`}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[64px] min-h-[72px] rounded-2xl p-2 transition-all duration-200 border select-none shrink-0',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                  isSelected
                    ? 'ui-btn-contrast border-transparent shadow-md font-semibold'
                    : isUnavailable
                      ? 'ui-slot-disabled cursor-not-allowed'
                      : 'bg-zinc-900/60 border-white/10 text-zinc-200 hover:border-white/25 active:scale-[0.98]'
                )}
              >
                <span
                  className={cn(
                    'text-[10px] uppercase font-medium tracking-wider',
                    isSelected ? 'opacity-80' : 'text-zinc-400'
                  )}
                >
                  {weekdayShortFmt.format(d).slice(0, 3)}
                </span>
                <span className="text-lg font-bold font-mono my-0.5">
                  {parts.day}
                </span>
                <span
                  className={cn(
                    'text-[10px]',
                    isSelected
                      ? 'text-emerald-600 font-semibold'
                      : isUnavailable
                        ? 'font-normal'
                        : 'text-emerald-400 font-medium'
                  )}
                >
                  {isUnavailable ? 'Cerrado' : `${availableCount} libres`}
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowFullMonthMobile((prev) => !prev)}
          aria-expanded={showFullMonthMobile}
          className="w-full min-h-12 px-4 rounded-xl bg-zinc-900/60 border border-white/10 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-all active:scale-[0.98] flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-400" />
            <span>
              {showFullMonthMobile
                ? 'Ocultar calendario completo del mes'
                : 'Ver calendario completo del mes'}
            </span>
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-zinc-400 transition-transform duration-200',
              showFullMonthMobile && 'rotate-180'
            )}
          />
        </button>
      </div>

      {/* Calendario mensual completo (visible en desktop y colapsable en móvil) */}
      <div
        className={cn(
          'p-4 sm:p-5 rounded-2xl bg-zinc-900/40 border border-white/10 backdrop-blur-md shadow-sm',
          showFullMonthMobile ? 'block' : 'hidden sm:block'
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-zinc-400" />
            <h3 className="text-base font-medium text-zinc-100">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isPrevDisabled}
              aria-label="Mes anterior"
              className="min-w-12 min-h-12 rounded-xl flex items-center justify-center border border-white/10 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isNextDisabled}
              aria-label="Mes siguiente"
              className="min-w-12 min-h-12 rounded-xl flex items-center justify-center border border-white/10 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
          {WEEKDAY_NAMES.map((day) => (
            <div
              key={day}
              className="text-[11px] font-medium text-zinc-400 py-1 uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {daysGrid.map((dayDate, index) => {
            if (!dayDate) {
              return <div key={`empty-${index}`} className="min-h-12" />
            }

            const key = formatDateKey(dayDate, tz)
            const parts = getZonedDateParts(dayDate, tz)
            const isSelected = key === selectedKey
            const isToday = key === todayIso
            const isPast = key < todayIso
            const info = availabilityMap.get(key)
            const availableCount = info?.availableCount ?? 0
            const isDisabled = isPast || key > maxIso || availableCount === 0

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onSelectDate(dayDate)
                  setShowFullMonthMobile(false)
                }}
                disabled={isDisabled}
                aria-pressed={isSelected}
                aria-label={`${parts.day} de ${MONTH_NAMES[currentMonth]}, ${availableCount} huecos`}
                className={cn(
                  'relative min-h-12 w-full rounded-xl flex flex-col items-center justify-center transition-all duration-200 select-none text-xs font-mono',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                  isSelected
                    ? 'ui-btn-contrast font-bold shadow-md ring-2 ring-emerald-500/60'
                    : isToday && !isDisabled
                      ? 'border border-emerald-500/60 text-emerald-400 hover:bg-zinc-800'
                      : isDisabled
                        ? 'ui-slot-disabled border cursor-not-allowed'
                        : 'text-zinc-200 hover:bg-zinc-800/80 hover:text-white border border-transparent active:scale-[0.98]'
                )}
              >
                <span>{parts.day}</span>
                {!isDisabled && (
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full mt-0.5',
                      isSelected ? 'bg-emerald-500' : 'bg-emerald-500/70'
                    )}
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Huecos libres
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              Completo / Cerrado
            </span>
          </div>
          <span className="font-mono text-zinc-400">{tz}</span>
        </div>
      </div>
    </div>
  )
}
