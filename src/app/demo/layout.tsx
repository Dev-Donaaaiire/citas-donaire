import React, { Suspense } from 'react'
import { DemoTopBar } from '@/components/theme/DemoTopBar'

/** Layout exclusivo de /demo: aquí (y solo aquí) vive la barra superior en vivo. */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ '--demo-bar-h': '3.5rem' } as React.CSSProperties}
    >
      <Suspense fallback={<div className="h-14 border-b border-white/10 bg-zinc-950" />}>
        <DemoTopBar />
      </Suspense>
      {children}
    </div>
  )
}
