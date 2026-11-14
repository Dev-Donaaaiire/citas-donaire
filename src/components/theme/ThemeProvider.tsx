'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react'
import {
  DEFAULT_THEME,
  THEMES,
  THEME_STORAGE_KEY,
  isThemeId,
  type ThemeId,
  type ThemeMeta,
} from '@/lib/themes'

const THEME_EVENT = 'krono-theme-change'

interface ThemeContextValue {
  theme: ThemeId
  meta: ThemeMeta
  themes: ThemeMeta[]
  setTheme: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/* Store externo: la fuente de verdad es el atributo data-theme de <html>,
   que un script inline fija antes del primer pintado (cero flash). */
function getSnapshot(): ThemeId {
  const value = document.documentElement.dataset.theme
  return isThemeId(value) ? value : DEFAULT_THEME
}

function getServerSnapshot(): ThemeId {
  return DEFAULT_THEME
}

function subscribe(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY && isThemeId(e.newValue)) {
      document.documentElement.dataset.theme = e.newValue
      callback()
    }
  }
  window.addEventListener(THEME_EVENT, callback)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(THEME_EVENT, callback)
    window.removeEventListener('storage', onStorage)
  }
}

let switchTimer: ReturnType<typeof setTimeout> | undefined

function applyTheme(id: ThemeId) {
  const root = document.documentElement
  root.classList.add('theme-switching')
  root.dataset.theme = id
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch {
    /* modo privado: ignorar */
  }
  window.dispatchEvent(new Event(THEME_EVENT))
  clearTimeout(switchTimer)
  switchTimer = setTimeout(() => root.classList.remove('theme-switching'), 500)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setTheme = useCallback((id: ThemeId) => applyTheme(id), [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      meta: THEMES.find((t) => t.id === theme) ?? THEMES[0],
      themes: THEMES,
      setTheme,
    }),
    [theme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}
