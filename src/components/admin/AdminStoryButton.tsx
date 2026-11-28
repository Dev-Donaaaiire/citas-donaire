'use client'

import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Camera, Download, Share2, X } from 'lucide-react'
import { AccessibleModal } from '@/components/ui/AccessibleModal'
import { fetchPublicAvailabilityData } from '@/lib/booking-service'
import type { PublicBookingInitialData } from '@/lib/data/public-booking'
import { drawStory, freeTimes, storyDateIso, type StoryDay } from '@/lib/story'
import { cn } from '@/lib/utils'

export function AdminStoryButton({ isDemo }: { isDemo: boolean }) {
  const titleId = useId()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [day, setDay] = useState<StoryDay>('today')
  const [data, setData] = useState<PublicBookingInitialData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const close = useCallback(() => setIsOpen(false), [])

  const open = async () => {
    setIsOpen(true)
    setData(null)
    setError(null)
    try {
      setData(await fetchPublicAvailabilityData(isDemo))
    } catch {
      setError('No se pudo consultar la agenda. Inténtalo de nuevo.')
    }
  }

  const dateIso = data ? storyDateIso(day, data.settings.timezone || 'Europe/Madrid') : null
  const times = data && dateIso ? freeTimes(data, dateIso) : []
  const hasImage = times.length > 0
  const timesKey = times.join(',')

  useEffect(() => {
    if (!isOpen || !data || !dateIso || !timesKey || !canvasRef.current) return
    drawStory(canvasRef.current, {
      businessName: data.settings.nombre_negocio,
      theme: data.settings.tema_activo,
      dateIso,
      day,
      times: timesKey.split(','),
      bookingUrl: `${window.location.host}${isDemo ? '/demo' : '/reservar'}`,
    })
  }, [isOpen, data, dateIso, day, timesKey, isDemo])

  const withFile = (use: (file: File) => void) =>
    canvasRef.current?.toBlob((blob) => {
      if (blob) use(new File([blob], `huecos-${dateIso}.png`, { type: 'image/png' }))
    }, 'image/png')

  const download = () =>
    withFile((file) => {
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    })

  const share = () =>
    withFile((file) => {
      if (navigator.canShare?.({ files: [file] })) {
        // Cancelar el menú de compartir rechaza la promesa: no es un error
        navigator.share({ files: [file] }).catch(() => {})
      } else {
        download()
      }
    })

  const actionClass =
    'min-h-12 flex-1 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]'

  return (
    <>
      <button
        type="button"
        onClick={() => void open()}
        className="min-h-12 px-3.5 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 rounded-xl bg-zinc-900/60 border border-white/10 hover:bg-zinc-800 transition-all active:scale-[0.98]"
      >
        <Camera className="w-3.5 h-3.5" />
        <span>Huecos para Stories</span>
      </button>

      <AccessibleModal isOpen={isOpen} onClose={close} labelledBy={titleId} panelClassName="max-w-sm">
        <div className="max-h-[90dvh] overflow-y-auto rounded-2xl bg-zinc-950 border border-white/10 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-base font-semibold tracking-tight text-white">
              Huecos para tu Story
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="min-h-12 min-w-12 rounded-xl border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center active:scale-[0.98]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2">
            {(['today', 'tomorrow'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={day === value}
                onClick={() => setDay(value)}
                className={cn(
                  actionClass,
                  day === value ? 'ui-btn-contrast' : 'border border-white/10 text-zinc-300'
                )}
              >
                {value === 'today' ? 'Hoy' : 'Mañana'}
              </button>
            ))}
          </div>

          {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
          {!error && !data && <p className="text-sm text-zinc-400">Consultando la agenda...</p>}
          {data && !hasImage && (
            <p className="text-sm text-zinc-400">No quedan huecos libres ese día.</p>
          )}

          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Imagen con las horas libres: ${times.join(', ')}`}
            className={cn('mx-auto w-full max-w-60 rounded-xl border border-white/10', !hasImage && 'hidden')}
          />

          {hasImage && (
            <div className="flex gap-2">
              <button type="button" onClick={share} className={cn(actionClass, 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400')}>
                <Share2 className="w-4 h-4" />
                Compartir
              </button>
              <button type="button" onClick={download} className={cn(actionClass, 'border border-white/10 text-zinc-200')}>
                <Download className="w-4 h-4" />
                Descargar
              </button>
            </div>
          )}
        </div>
      </AccessibleModal>
    </>
  )
}
