import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Loader2 } from 'lucide-react'
import { SetupContent } from '@/components/setup/SetupContent'
import { getAdminSessionStatus } from '@/lib/admin-auth'
import { getAdminSetupData } from '@/lib/data/admin-setup'

export const metadata: Metadata = {
  title: 'Configuración Inicial | Krono',
  robots: { index: false, follow: false },
}

async function SetupLoader() {
  await connection()
  const session = await getAdminSessionStatus()
  if (!session.configured || !session.authenticated) {
    redirect('/admin/login?next=/setup')
  }

  const initialSetupData = await getAdminSetupData()
  return <SetupContent initialSetupData={initialSetupData} />
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div
          aria-busy="true"
          className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center"
        >
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="sr-only">Cargando configuración inicial...</span>
        </div>
      }
    >
      <SetupLoader />
    </Suspense>
  )
}
