import { NextResponse } from 'next/server'
import {
  createAdminSessionToken,
  isAdminAuthConfigured,
  sanitizeNextAdminPath,
  verifyAdminPassword,
} from '@/lib/admin-session-token'
import { setAdminSessionCookie } from '@/lib/admin-auth'
import {
  checkPersistentRateLimit,
  getClientIp,
  rateLimitHeaders,
} from '@/lib/rate-limit'

const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_WINDOW_SECONDS = 15 * 60

export async function POST(request: Request) {
  try {
    if (!isAdminAuthConfigured()) {
      return NextResponse.json(
        {
          error:
            'Autenticación no configurada en el servidor. Define ADMIN_PASSWORD (mín. 10 caracteres) y conecta Supabase en tus variables de entorno.',
        },
        { status: 503 }
      )
    }

    const limit = await checkPersistentRateLimit({
      key: `admin-login:${getClientIp(request)}`,
      maxRequests: LOGIN_MAX_ATTEMPTS,
      windowSeconds: LOGIN_WINDOW_SECONDS,
    })

    if (!limit.allowed) {
      const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60))
      return NextResponse.json(
        {
          error: `Demasiados intentos de acceso. Inténtalo de nuevo en ${minutes} min.`,
        },
        { status: 429, headers: rateLimitHeaders(limit) }
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      password?: string
      next?: string
    }

    const password = typeof body.password === 'string' ? body.password : ''
    if (!password) {
      return NextResponse.json(
        { error: 'Introduce la contraseña de administrador.' },
        { status: 400 }
      )
    }

    const isValid = await verifyAdminPassword(password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta.' },
        { status: 401 }
      )
    }

    const token = await createAdminSessionToken()
    const redirectTo = sanitizeNextAdminPath(body.next)
    const response = NextResponse.json({ ok: true, redirectTo })
    setAdminSessionCookie(response, token)
    return response
  } catch (err) {
    console.error('[api/admin/login] Error:', err)
    return NextResponse.json(
      { error: 'Error interno al iniciar sesión.' },
      { status: 500 }
    )
  }
}
