import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Loader2 } from 'lucide-react'
import { AdminContent } from '@/components/admin/AdminContent'
import { getAdminDashboardData } from '@/lib/data/admin-dashboard'

export const metadata: Metadata = {
  title: 'Demo Panel del Dueño | Krono',
  robots: { index: false, follow: false },
}

async function DemoAdminLoader() {
  await connection()
  const initialData = await getAdminDashboardData({ demoRoute: true })
  return <AdminContent initialData={initialData} />
}

export default function DemoAdminPage() {
  return (
    <Suspense
      fallback={
        <div aria-busy="true" className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <span className="sr-only">Cargando panel demo...</span>
        </div>
      }
    >
      <DemoAdminLoader />
    </Suspense>
  )
}
