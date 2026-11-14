import React from 'react'
import type { LegalDoc } from '@/lib/legal'

export function LegalDocument({ doc, headingLevel = 'h2' }: { doc: LegalDoc; headingLevel?: 'h2' | 'h3' }) {
  const Heading = headingLevel
  return (
    <article id={doc.id} className="scroll-mt-28 space-y-5">
      <Heading className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
        {doc.title}
      </Heading>
      {doc.sections.map((section) => (
        <div key={section.heading} className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-100">{section.heading}</h3>
          {section.paragraphs.map((p, i) => (
            <p key={i} className="text-[13px] leading-relaxed text-zinc-400">
              {p}
            </p>
          ))}
        </div>
      ))}
    </article>
  )
}
