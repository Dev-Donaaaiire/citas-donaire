import 'server-only'

import { NextResponse } from 'next/server'
import { BookingApiError, type CreateServerBookingInput } from '@/lib/booking-server'
import {
  checkPersistentRateLimit,
  getClientIp,
  rateLimitHeaders,
} from '@/lib/rate-limit'

const BOOKING_WINDOW_SECONDS = 10 * 60
const BOOKING_MAX_PER_IP = 6
const BOOKING_MAX_PER_EMAIL = 3

export interface PublicBookingBody {
  serviceId?: unknown
  nombre?: unknown
  email?: unknown
  telefono?: unknown
  notas?: unknown
  slotDatetime?: unknown
  rescheduleToken?: unknown
  /** Honeypot anti-bots: los humanos nunca lo rellenan. */
  website?: unknown
  company?: unknown
}

export function isHoneypotTriggered(body: PublicBookingBody): boolean {
  return [body.website, body.company].some(
    (value) => typeof value === 'string' && value.trim().length > 0
  )
}

/**
 * URL base fiable para enlaces de email. Prioriza NEXT_PUBLIC_APP_URL y nunca
 * confía en cabeceras Host arbitrarias; el origin de la petición solo se acepta en desarrollo.
 */
export function resolveTrustedBaseUrl(request: {
  nextUrl: { origin: string }
}): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (configured) return configured

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercelProd) return `https://${vercelProd.replace(/\/$/, '')}`

  if (process.env.NODE_ENV !== 'production') {
    return request.nextUrl.origin
  }

  throw new BookingApiError(
    'El servidor no tiene configurada NEXT_PUBLIC_APP_URL. Contacta con el negocio.',
    503,
    'APP_URL_UNCONFIGURED'
  )
}

export function toBookingInput(
  body: PublicBookingBody,
  baseUrl: string,
  isDemoRequest: boolean
): CreateServerBookingInput {
  const str = (value: unknown) => (typeof value === 'string' ? value : '')
  return {
    serviceId: str(body.serviceId),
    nombre: str(body.nombre),
    email: str(body.email),
    telefono: str(body.telefono),
    notas: typeof body.notas === 'string' ? body.notas : null,
    slotDatetime: str(body.slotDatetime),
    rescheduleToken:
      typeof body.rescheduleToken === 'string' ? body.rescheduleToken : null,
    baseUrl,
    isDemoRequest,
  }
}

/**
 * Aplica límites por IP y por email normalizado. Devuelve una respuesta 429
 * lista para retornar, o null si la petición puede continuar.
 */
export async function enforceBookingRateLimits(
  request: Request,
  rawEmail: unknown,
  scope: 'booking' | 'demo-booking'
): Promise<NextResponse | null> {
  const ip = getClientIp(request)
  const ipLimit = await checkPersistentRateLimit({
    key: `${scope}:ip:${ip}`,
    maxRequests: BOOKING_MAX_PER_IP,
    windowSeconds: BOOKING_WINDOW_SECONDS,
  })

  const email =
    typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
  const emailLimit = email
    ? await checkPersistentRateLimit({
        key: `${scope}:email:${email.slice(0, 180)}`,
        maxRequests: BOOKING_MAX_PER_EMAIL,
        windowSeconds: BOOKING_WINDOW_SECONDS,
      })
    : null

  const blocked = !ipLimit.allowed
    ? ipLimit
    : emailLimit && !emailLimit.allowed
      ? emailLimit
      : null

  if (!blocked) return null

  return NextResponse.json(
    {
      error:
        'Has enviado demasiadas solicitudes de reserva en poco tiempo. Espera unos minutos e inténtalo de nuevo.',
      code: 'RATE_LIMITED',
    },
    { status: 429, headers: rateLimitHeaders(blocked) }
  )
}
