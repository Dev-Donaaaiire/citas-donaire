'use client'

import { usePathname } from 'next/navigation'

/** true cuando estamos dentro de la ruta pública de demo (/demo/...) */
export function useIsDemo(): boolean {
  const pathname = usePathname()
  return pathname === '/demo' || pathname.startsWith('/demo/')
}
