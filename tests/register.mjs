// Resuelve el alias "@/" e imports sin extensión para probar src/ sin dependencias.
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'

const src = new URL('../src/', import.meta.url)

registerHooks({
  resolve(specifier, context, nextResolve) {
    const base = specifier.startsWith('@/')
      ? new URL(specifier.slice(2), src)
      : specifier.startsWith('.') && context.parentURL?.startsWith(src.href)
        ? new URL(specifier, context.parentURL)
        : null
    if (base) {
      for (const suffix of ['', '.ts', '/index.ts']) {
        const url = new URL(base.href + suffix)
        if (/\.ts$/.test(url.pathname) && existsSync(url)) {
          return { url: url.href, format: 'module-typescript', shortCircuit: true }
        }
      }
    }
    return nextResolve(specifier, context)
  },
})
