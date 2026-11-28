import { REPO_URL } from './project'
import { showSalesLanding } from './sales-landing'

/**
 * Contenido de /legal. Quien instala Krono pone su nombre y un correo de contacto
 * en las variables NEXT_PUBLIC_LEGAL_*. NIF y domicilio son opcionales.
 */

const officialOwner = {
  name: 'Álvaro, 15 años',
  nif: '',
  address: '',
  email: `${REPO_URL}/issues`,
}

const installationOwner = {
  name:
    process.env.NEXT_PUBLIC_LEGAL_NAME ||
    process.env.NEXT_PUBLIC_LEGAL_TITULAR ||
    '[NOMBRE DEL RESPONSABLE]',
  nif: process.env.NEXT_PUBLIC_LEGAL_NIF || '',
  address:
    process.env.NEXT_PUBLIC_LEGAL_ADDRESS ||
    process.env.NEXT_PUBLIC_LEGAL_DOMICILIO ||
    '',
  email: process.env.NEXT_PUBLIC_LEGAL_EMAIL || '[EMAIL DE CONTACTO]',
}

export const LEGAL_OWNER = showSalesLanding ? officialOwner : installationOwner

export const LEGAL_LAST_UPDATE = '28 de noviembre de 2026'

/** Campos legales obligatorios que aún conservan el marcador `[...]`. */
export function getMissingLegalFields(): string[] {
  const entries: Array<[string, string]> = [
    ['NEXT_PUBLIC_LEGAL_NAME', LEGAL_OWNER.name],
    ['NEXT_PUBLIC_LEGAL_EMAIL', LEGAL_OWNER.email],
  ]
  return entries
    .filter(([, value]) => !value.trim() || value.includes('['))
    .map(([key]) => key)
}

export interface LegalSection {
  heading: string
  paragraphs: string[]
}

export interface LegalDoc {
  id: 'licencia' | 'privacidad'
  title: string
  short: string
  sections: LegalSection[]
}

const o = LEGAL_OWNER
const responsible = [
  o.name,
  o.nif && `NIF ${o.nif}`,
  o.address,
  `Contacto: ${o.email}`,
]
  .filter(Boolean)
  .join(' · ')

export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: 'licencia',
    title: 'Condiciones de uso',
    short: 'Condiciones',
    sections: [
      {
        heading: '1. Software gratuito',
        paragraphs: [
          'Krono es un programa de reservas que se ofrece gratis. Puedes instalarlo, usarlo en tu negocio y adaptarlo. No puedes venderlo ni presentarlo como creación propia.',
        ],
      },
      {
        heading: '2. Sin garantías',
        paragraphs: [
          'Se entrega «tal cual», sin garantía de funcionamiento ni soporte asegurado. En la medida permitida por la ley, el autor no responde de los daños derivados de su uso.',
        ],
      },
      {
        heading: '3. Responsabilidad de quien lo instala',
        paragraphs: [
          'Quien instala Krono es responsable de su instalación, de los datos de sus clientes, de cumplir la normativa de su actividad y de las condiciones de los servicios que utilice (Supabase, Vercel, Resend u otros).',
        ],
      },
    ],
  },
  {
    id: 'privacidad',
    title: 'Política de Privacidad',
    short: 'Privacidad',
    sections: [
      {
        heading: '1. Responsable del tratamiento',
        paragraphs: [
          `${responsible}. Los datos se tratan conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).`,
        ],
      },
      {
        heading: '2. Datos y finalidades',
        paragraphs: [
          'Al reservar se guardan nombre, correo, teléfono, los datos que pida el formulario y los de la cita, para gestionarla y enviarte confirmaciones y un recordatorio el día anterior.',
          'La lista de espera guarda nombre, correo, servicio y fecha deseada para avisarte si queda un hueco, y se borra una vez pasada la fecha.',
          'La demo usa datos ficticios. No introduzcas en ella datos de otras personas.',
        ],
      },
      {
        heading: '3. Destinatarios',
        paragraphs: [
          'Supabase (base de datos), Resend (correo) y Vercel (alojamiento) acceden a los datos para prestar el servicio. Puede haber transferencias internacionales amparadas en cláusulas contractuales tipo o en el Marco de Privacidad de Datos UE-EE. UU.',
        ],
      },
      {
        heading: '4. Derechos',
        paragraphs: [
          `Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${o.email}, y reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).`,
        ],
      },
      {
        heading: '5. Cookies',
        paragraphs: [
          'Solo se usa almacenamiento técnico (sesión del panel, diseño elegido y datos de la demo). No hay cookies publicitarias ni de analítica.',
        ],
      },
    ],
  },
]
