import React, { Suspense } from 'react'
import { AdminContent } from '@/components/admin/AdminContent'
import { Loader2 } from 'lucide-react'

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  )
}
