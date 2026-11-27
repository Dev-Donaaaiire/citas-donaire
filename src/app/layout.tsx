import type { Metadata } from 'next'
import { Geist, Geist_Mono, Playfair_Display, Space_Grotesk } from 'next/font/google'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { DEFAULT_THEME, THEME_STORAGE_KEY } from '@/lib/themes'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const playfair = Playfair_Display({ variable: '--font-playfair', subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ variable: '--font-space', subsets: ['latin'] })

function getValidMetadataBase(raw?: string): URL | undefined {
  if (!raw) return undefined
  let clean = raw.trim()
  const mdMatch = clean.match(/\]\((https?:\/\/[^)]+)\)/i)
  if (mdMatch) {
    clean = mdMatch[1]
  } else {
    clean = clean.replace(/^[\[\(]+|[\]\)]+$/g, '')
  }
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`
  }
  try {
    return new URL(clean)
  } catch {
    return undefined
  }
}

export const metadata: Metadata = {
  metadataBase: getValidMetadataBase(process.env.NEXT_PUBLIC_APP_URL),
  title: 'Sistema de citas online por 14,99 € · Pago único | Krono / Donaire Citas',
  description:
    'Deja de perder clientes por teléfono. Sistema de citas con 3 diseños exclusivos, seguimiento de clientes que no vuelven y avisos al calendario. Sin cuotas mensuales del software.',
  openGraph: {
    title:
      'Sistema de citas online por 14,99 € · Pago único | Krono / Donaire Citas',
    description:
      'Deja de perder clientes por teléfono. Sistema de citas con 3 diseños exclusivos, seguimiento de clientes que no vuelven y avisos al calendario. Sin cuotas mensuales del software.',
    type: 'website',
    locale: 'es_ES',
    siteName: 'Krono / Donaire Citas',
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'Sistema de citas online por 14,99 € · Pago único | Krono / Donaire Citas',
    description:
      'Deja de perder clientes por teléfono. Sistema de citas con 3 diseños exclusivos, seguimiento de clientes que no vuelven y avisos al calendario. Sin cuotas mensuales del software.',
  },
}

/* Aplica el tema guardado ANTES del primer pintado → cero flash. */
const themeBootScript = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark_luxury'||t==='clean_minimal'||t==='neon_creator'){document.documentElement.dataset.theme=t}}catch(e){}`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${spaceGrotesk.variable} dark h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
