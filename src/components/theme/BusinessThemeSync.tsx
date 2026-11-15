'use client'

import { useEffect } from 'react'
import { isThemeId } from '@/lib/themes'

const THEME_EVENT = 'krono-theme-change'

/**
 * Aplica el tema configurado por el dueño en /setup (business_settings.tema_activo)
 * sin persistirlo en el localStorage del visitante.
 */
export function useBusinessTheme(
  theme: string | null | undefined,
  enabled = true
) {
  useEffect(() => {
    if (!enabled || !isThemeId(theme)) return
    const root = document.documentElement
    if (root.dataset.theme === theme) return
    root.dataset.theme = theme
    window.dispatchEvent(new Event(THEME_EVENT))
  }, [theme, enabled])
}
