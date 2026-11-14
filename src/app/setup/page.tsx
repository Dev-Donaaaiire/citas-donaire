import React, { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { SetupContent } from '@/components/setup/SetupContent'

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      }
    >
      <SetupContent />
    </Suspense>
  )
}
