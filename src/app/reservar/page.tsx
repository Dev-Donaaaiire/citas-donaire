import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Loader2 } from 'lucide-react'
import { ReservarContent } from '@/components/booking/ReservarContent'
import { getPublicBookingInitialData } from '@/lib/data/public-booking'

export async function generateMetadata(): Promise<Metadata> {
  const initialData = await getPublicBookingInitialData({ isDemoRoute: false })
  const businessName = initialData.settings.nombre_negocio || 'Krono Studio'
  const title = `Reservar Cita Online | ${businessName}`
  const description = `Elige tu servicio y reserva tu cita en segundos en ${businessName}. Confirmación instantánea y recordatorios automáticos.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'es_ES',
      siteName: businessName,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

interface ReservarPageProps {
  searchParams: Promise<{
    rescheduleToken?: string | string[]
    serviceId?: string | string[]
  }>
}

async function ReservarLoader({ searchParams }: ReservarPageProps) {
  await connection()
  const resolved = await searchParams
  const rescheduleToken =
    typeof resolved.rescheduleToken === 'string' && resolved.rescheduleToken.trim()
      ? resolved.rescheduleToken.trim()
      : null
  const initialServiceId =
    typeof resolved.serviceId === 'string' && resolved.serviceId.trim()
      ? resolved.serviceId.trim()
      : null

  const initialData = await getPublicBookingInitialData({ isDemoRoute: false })

  return (
    <ReservarContent
      key={rescheduleToken || 'new-booking'}
      initialData={initialData}
      rescheduleToken={rescheduleToken}
      initialServiceId={initialServiceId}
    />
  )
}

export default function ReservarPage({ searchParams }: ReservarPageProps) {
  return (
    <Suspense
      fallback={
        <div
          aria-busy="true"
          className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center"
        >
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="sr-only">Cargando reserva...</span>
        </div>
      }
    >
      <ReservarLoader searchParams={searchParams} />
    </Suspense>
  )
}
