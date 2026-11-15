import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin-auth'
import { toggleClientBlacklistServer } from '@/lib/data/admin-dashboard'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdminSession()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = (await request.json().catch(() => ({}))) as {
      clientId?: string
      currentlyBlocked?: boolean
    }

    const clientId =
      typeof body.clientId === 'string' ? body.clientId.trim() : ''
    if (!UUID_REGEX.test(clientId) || typeof body.currentlyBlocked !== 'boolean') {
      return NextResponse.json(
        { error: 'Parámetros inválidos para actualizar el estado del cliente.' },
        { status: 400 }
      )
    }

    const result = await toggleClientBlacklistServer(
      clientId,
      body.currentlyBlocked
    )
    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/admin/clients][PATCH] Error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'No se pudo actualizar el estado del cliente.',
      },
      { status: 500 }
    )
  }
}
