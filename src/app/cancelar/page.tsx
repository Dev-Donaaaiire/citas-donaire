import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Loader2 } from 'lucide-react'
import { CancelarContent } from '@/components/booking/CancelarContent'
import { getCancelAppointmentInitialData } from '@/lib/data/cancel-booking'

export const metadata: Metadata = {
  title: 'Gestionar Cita | Krono',
  robots: { index: false, follow: false },
}

interface CancelarPageProps {
  searchParams: Promise<{ token?: string | string[] }>
}

async function CancelarLoader({ searchParams }: CancelarPageProps) {
  await connection()
  const resolved = await searchParams
  const token =
    typeof resolved.token === 'string' ? resolved.token.trim() : ''

  const { appointment, temaActivo, error } =
    await getCancelAppointmentInitialData(token)

  return (
    <CancelarContent
      key={token || 'empty'}
      token={token}
      initialAppointment={appointment}
      initialError={error}
      temaActivo={temaActivo}
    />
  )
}

export default function CancelarPage({ searchParams }: CancelarPageProps) {
  return (
    <Suspense
      fallback={
        <div
          aria-busy="true"
          className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center"
        >
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="sr-only">Cargando gestión de cita...</span>
        </div>
      }
    >
      <CancelarLoader searchParams={searchParams} />
    </Suspense>
  )
}
