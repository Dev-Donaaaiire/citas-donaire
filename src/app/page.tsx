import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/LandingPage'

export const metadata: Metadata = {
  title: 'Krono / Donaire Citas · Reservas online por 14,99 € pago único',
  description:
    'Sistema propio de citas para barberías, clínicas, centros de estética, tatuadores y coaches. 3 diseños de lujo, panel del dueño anti no-show y cero cuotas mensuales.',
  openGraph: {
    title: 'Krono / Donaire Citas · Reservas online por 14,99 € pago único',
    description:
      'Sistema propio de citas para barberías, clínicas, centros de estética, tatuadores y coaches. 3 diseños de lujo, panel del dueño anti no-show y cero cuotas mensuales.',
    type: 'website',
    locale: 'es_ES',
    siteName: 'Krono / Donaire Citas',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Krono / Donaire Citas · Reservas online por 14,99 € pago único',
    description:
      'Sistema propio de citas para barberías, clínicas, centros de estética, tatuadores y coaches. 3 diseños de lujo, panel del dueño anti no-show y cero cuotas mensuales.',
  },
}

export default function Home() {
  return <LandingPage />
}
