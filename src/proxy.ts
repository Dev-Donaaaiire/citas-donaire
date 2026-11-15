import { NextResponse, type NextRequest } from 'next/server'
import {
  ADMIN_SESSION_COOKIE_NAME,
  isAdminAuthConfigured,
  sanitizeNextAdminPath,
  verifyAdminSessionToken,
} from '@/lib/admin-session-token'

const PUBLIC_ADMIN_AUTH_ROUTES = new Set([
  '/api/admin/login',
  '/api/admin/logout',
])

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value
  const authConfigured = isAdminAuthConfigured()
  const session = await verifyAdminSessionToken(token)

  if (PUBLIC_ADMIN_AUTH_ROUTES.has(pathname)) {
    return NextResponse.next()
  }

  if (pathname === '/admin/login') {
    if (authConfigured && session.valid) {
      const nextTarget = sanitizeNextAdminPath(
        request.nextUrl.searchParams.get('next')
      )
      return NextResponse.redirect(new URL(nextTarget, request.url))
    }
    return NextResponse.next()
  }

  if (
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/notifications')
  ) {
    if (!authConfigured) {
      return NextResponse.json(
        {
          error:
            'Panel administrativo sin configurar. Define ADMIN_PASSWORD en las variables de entorno.',
        },
        { status: 503 }
      )
    }

    if (!session.valid) {
      return NextResponse.json(
        { error: 'No autorizado. Inicia sesión como administrador.' },
        { status: 401 }
      )
    }

    return NextResponse.next()
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/setup')) {
    if (!authConfigured || !session.valid) {
      const loginUrl = new URL('/admin/login', request.url)
      const requestedPath = `${pathname}${search}`
      loginUrl.searchParams.set('next', sanitizeNextAdminPath(requestedPath))
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/setup',
    '/setup/:path*',
    '/api/admin/:path*',
    '/api/notifications/:path*',
  ],
}
