import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Panel del Dueño · Gestión de Citas',
    short_name: 'Panel Citas',
    description: 'Gestión de agenda, clientes y citas del negocio en tiempo real',
    start_url: '/admin',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    orientation: 'portrait',
    icons: [
      {
        src: '/window.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
