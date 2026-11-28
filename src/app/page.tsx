import { showSalesLanding } from '@/lib/sales-landing'
import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { headers } from 'next/headers'
import { Loader2 } from 'lucide-react'
import { LandingPage } from '@/components/landing/LandingPage'
import { ReservarContent } from '@/components/booking/ReservarContent'
import { getPublicBookingInitialData } from '@/lib/data/public-booking'

export async function generateMetadata(): Promise<Metadata> {
  if (showSalesLanding) {
    return {
      title: 'Krono / Donaire Citas · Reservas online por 14,99 € pago único',
      description:
        'Sistema propio de citas para barberías, clínicas, centros de estética, tatuadores y coaches. 3 diseños de lujo, panel del dueño anti no-show y sin cuotas mensuales del software.',
      openGraph: {
        title: 'Krono / Donaire Citas · Reservas online por 14,99 € pago único',
        description:
          'Sistema propio de citas para barberías, clínicas, centros de estética, tatuadores y coaches. 3 diseños de lujo, panel del dueño anti no-show y sin cuotas mensuales del software.',
        type: 'website',
        locale: 'es_ES',
        siteName: 'Krono / Donaire Citas',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Krono / Donaire Citas · Reservas online por 14,99 € pago único',
        description:
          'Sistema propio de citas para barberías, clínicas, centros de estética, tatuadores y coaches. 3 diseños de lujo, panel del dueño anti no-show y sin cuotas mensuales del software.',
      },
    }
  }

  const initialData = await getPublicBookingInitialData({ isDemoRoute: false })
  const businessName = initialData.settings.nombre_negocio || 'Krono Studio'
  const title = `Reservar Cita Online | ${businessName}`
  const description = `Elige tu servicio y reserva tu cita en segundos en ${businessName}. Confirmación instantánea y cita para tu calendario.`

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

interface HomePageProps {
  searchParams?: Promise<{
    rescheduleToken?: string | string[]
    serviceId?: string | string[]
  }>
}

async function HomeBookingLoader({ searchParams }: HomePageProps) {
  await connection()

  const headerList = await headers().catch(() => null)
  const host = (headerList?.get('host') || '').toLowerCase()
  if (
    host.includes('citas.donaire.dev') ||
    host.includes('citas-donaire') ||
    host.includes('donaire.dev')
  ) {
    return <LandingPage />
  }

  const resolved = (await searchParams) || {}
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

export default function Home({ searchParams }: HomePageProps) {
  if (showSalesLanding) {
    return <LandingPage />
  }

  return (
    <Suspense
      fallback={
        <div aria-busy="true" className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <span className="sr-only">Cargando reservas...</span>
        </div>
      }
    >
      <HomeBookingLoader searchParams={searchParams} />
    </Suspense>
  )
}
