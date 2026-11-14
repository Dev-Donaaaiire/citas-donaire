import React, { Suspense } from 'react'
import { ReservarContent } from '@/components/booking/ReservarContent'
import { Loader2 } from 'lucide-react'

export default function ReservarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      }
    >
      <ReservarContent />
    </Suspense>
  )
}
