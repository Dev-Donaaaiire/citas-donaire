import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Loader2 } from 'lucide-react'
import { AdminContent } from '@/components/admin/AdminContent'
import { getAdminSessionStatus } from '@/lib/admin-auth'
import { getAdminDashboardData } from '@/lib/data/admin-dashboard'

export const metadata: Metadata = {
  title: 'Panel del Dueño | Krono',
  robots: { index: false, follow: false },
}

async function AdminLoader() {
  await connection()
  const session = await getAdminSessionStatus()
  if (!session.configured || !session.authenticated) {
    redirect('/admin/login?next=/admin')
  }

  const initialData = await getAdminDashboardData({ demoRoute: false })
  return <AdminContent initialData={initialData} />
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div
          aria-busy="true"
          className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center"
        >
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="sr-only">Cargando panel administrativo...</span>
        </div>
      }
    >
      <AdminLoader />
    </Suspense>
  )
}
