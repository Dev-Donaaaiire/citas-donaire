import React, { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { ReservarContent } from '@/components/booking/ReservarContent'

export default function DemoClientPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      }
    >
      <ReservarContent />
    </Suspense>
  )
}
