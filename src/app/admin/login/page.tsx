import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getAdminSessionStatus } from '@/lib/admin-auth'
import { sanitizeNextAdminPath } from '@/lib/admin-session-token'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'

export const metadata: Metadata = {
  title: 'Acceso Administrador | Krono',
  robots: { index: false, follow: false },
}

async function AdminLoginGate({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const resolvedParams = await searchParams
  const nextPath = sanitizeNextAdminPath(resolvedParams.next)
  const session = await getAdminSessionStatus()

  if (session.configured && session.authenticated) {
    redirect(nextPath)
  }

  return (
    <AdminLoginForm
      nextPath={nextPath}
      authConfigured={session.configured}
    />
  )
}

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-zinc-950 flex items-center justify-center p-6">
          <div className="w-full max-w-md h-80 rounded-2xl bg-zinc-900/60 border border-white/10 animate-pulse" />
        </div>
      }
    >
      <AdminLoginGate searchParams={searchParams} />
    </Suspense>
  )
}
