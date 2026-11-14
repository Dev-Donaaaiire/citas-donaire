import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { LEGAL_DOCS, LEGAL_LAST_UPDATE } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Información legal · Krono / Donaire Citas',
  description:
    'Términos de Licencia de Software, Aviso Legal y Política de Privacidad (España).',
}

export default function LegalPage() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex h-12 items-center gap-2 rounded-xl px-2 text-sm text-zinc-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </Link>
          <nav className="flex items-center gap-1 text-xs font-mono">
            {LEGAL_DOCS.map((d) => (
              <a
                key={d.id}
                href={`#${d.id}`}
                className="flex h-12 items-center rounded-lg px-2.5 text-zinc-400 transition-colors hover:text-white"
              >
                {d.short}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-14 px-4 py-10 sm:px-6 sm:py-14">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Información legal
          </h1>
          <p className="font-mono text-xs text-zinc-500">
            Última actualización: {LEGAL_LAST_UPDATE}
          </p>
        </div>
        {LEGAL_DOCS.map((doc) => (
          <LegalDocument key={doc.id} doc={doc} />
        ))}
      </main>
    </div>
  )
}
