import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { LegalDocument } from '@/components/legal/LegalDocument'
import {
  LEGAL_DOCS,
  LEGAL_LAST_UPDATE,
  getMissingLegalFields,
} from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Información legal · Krono',
  description:
    'Condiciones de uso y política de privacidad.',
}

export default function LegalPage() {
  const missingLegalFields = getMissingLegalFields()

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
          <p className="font-mono text-xs text-zinc-400">
            Última actualización: {LEGAL_LAST_UPDATE}
          </p>
        </div>

        {missingLegalFields.length > 0 && (
          <div
            role="alert"
            className="space-y-2 rounded-2xl border border-amber-500/35 bg-amber-950/30 p-4 text-xs leading-relaxed text-amber-200"
          >
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Aviso de configuración (solo visible hasta completarla)</span>
            </div>
            <p>
              Faltan datos del responsable. Define estas variables de entorno
              antes de publicar; los marcadores entre corchetes del texto
              inferior son provisionales y no son datos reales:
            </p>
            <p className="font-mono text-amber-100">
              {missingLegalFields.join(' · ')}
            </p>
          </div>
        )}
        {LEGAL_DOCS.map((doc) => (
          <LegalDocument key={doc.id} doc={doc} />
        ))}
      </main>
    </div>
  )
}
