import React, { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { AdminContent } from '@/components/admin/AdminContent'

export default function DemoAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  )
}
