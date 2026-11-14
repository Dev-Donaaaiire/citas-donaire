export type ThemeId = 'dark_luxury' | 'clean_minimal' | 'neon_creator'

export interface ThemeMeta {
  id: ThemeId
  label: string
  short: string
  tagline: string
  /** Colores fijos para la muestra (no dependen del tema activo) */
  swatch: { bg: string; accent: string }
}

export const DEFAULT_THEME: ThemeId = 'dark_luxury'
export const THEME_STORAGE_KEY = 'krono-theme'

export const THEMES: ThemeMeta[] = [
  {
    id: 'dark_luxury',
    label: 'Dark Luxury',
    short: 'Luxury',
    tagline: 'Barberías VIP · Tattoo',
    swatch: { bg: '#09090B', accent: '#D4AF37' },
  },
  {
    id: 'clean_minimal',
    label: 'Clean Minimal',
    short: 'Minimal',
    tagline: 'Clínicas · Fisio · Estética',
    swatch: { bg: '#F7F6F4', accent: '#065F46' },
  },
  {
    id: 'neon_creator',
    label: 'Neon Creator',
    short: 'Neon',
    tagline: 'Coaches · Streamers',
    swatch: { bg: '#05070D', accent: '#00D9F5' },
  },
]

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value)
}
