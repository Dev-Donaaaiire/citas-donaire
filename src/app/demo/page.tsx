import { showSalesLanding } from '@/lib/sales-landing'
import React, { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Loader2 } from 'lucide-react'
import { ReservarContent } from '@/components/booking/ReservarContent'
import { getPublicBookingInitialData } from '@/lib/data/public-booking'

interface DemoClientPageProps {
  searchParams: Promise<{
    rescheduleToken?: string | string[]
    serviceId?: string | string[]
  }>
}

async function DemoReservarLoader({ searchParams }: DemoClientPageProps) {
  if (!showSalesLanding) {
    redirect('/')
  }

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

  const initialData = await getPublicBookingInitialData({ isDemoRoute: true })

  return (
    <ReservarContent
      key={rescheduleToken || 'demo-booking'}
      initialData={initialData}
      rescheduleToken={rescheduleToken}
      initialServiceId={initialServiceId}
    />
  )
}

export default function DemoClientPage({ searchParams }: DemoClientPageProps) {
  return (
    <Suspense
      fallback={
        <div aria-busy="true" className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <span className="sr-only">Cargando vista demo...</span>
        </div>
      }
    >
      <DemoReservarLoader searchParams={searchParams} />
    </Suspense>
  )
}
