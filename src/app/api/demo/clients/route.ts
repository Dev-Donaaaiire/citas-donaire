import { NextRequest, NextResponse } from 'next/server'
import { isDbDemoModeActive } from '@/lib/demo-guard'
import { toggleClientBlacklistServer } from '@/lib/data/admin-dashboard'
import {
  DEMO_SANDBOX_COOKIE_NAME,
  toggleDemoSandboxClientBlacklist,
} from '@/lib/demo-sandbox'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      clientId?: string
      currentlyBlocked?: boolean
    }

    const clientId =
      typeof body.clientId === 'string' ? body.clientId.trim() : ''
    if (!UUID_REGEX.test(clientId) || typeof body.currentlyBlocked !== 'boolean') {
      return NextResponse.json(
        { error: 'Parámetros inválidos.' },
        { status: 400 }
      )
    }

    if (!(await isDbDemoModeActive())) {
      const deltaCookie = request.cookies.get(DEMO_SANDBOX_COOKIE_NAME)?.value
      const result = toggleDemoSandboxClientBlacklist(
        clientId,
        body.currentlyBlocked,
        deltaCookie
      )

      const response = NextResponse.json({
        success: true,
        sandbox: true,
        newStatus: result.newStatus,
      })

      response.cookies.set(DEMO_SANDBOX_COOKIE_NAME, result.serializedCookie, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 86400 * 7,
      })

      return response
    }

    const result = await toggleClientBlacklistServer(
      clientId,
      body.currentlyBlocked
    )
    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/demo/clients][PATCH] Error:', err)
    return NextResponse.json(
      { error: 'Error actualizando el cliente demo.' },
      { status: 500 }
    )
  }
}
