import 'server-only'

import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  isAdminAuthConfigured,
  verifyAdminSessionToken,
} from './admin-session-token'

export async function getAdminSessionStatus(): Promise<{
  authenticated: boolean
  configured: boolean
  reason?: string
}> {
  const configured = isAdminAuthConfigured()
  if (!configured) {
    return {
      authenticated: false,
      configured: false,
      reason: 'auth_not_configured',
    }
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value
  const verification = await verifyAdminSessionToken(token)

  return {
    authenticated: verification.valid,
    configured: true,
    reason: verification.reason,
  }
}

export async function requireAdminSession(): Promise<
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string }
> {
  const status = await getAdminSessionStatus()
  if (!status.configured) {
    return {
      ok: false,
      status: 503,
      error:
        'Panel administrativo bloqueado: falta configurar ADMIN_PASSWORD en las variables de entorno.',
    }
  }

  if (!status.authenticated) {
    return {
      ok: false,
      status: 401,
      error: 'No autorizado. Inicia sesión como administrador.',
    }
  }

  return { ok: true }
}

export function setAdminSessionCookie(
  response: NextResponse,
  token: string
): void {
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  })
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
