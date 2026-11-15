import { NextRequest, NextResponse } from 'next/server'
import { isDbDemoModeActive } from '@/lib/demo-guard'
import {
  createBlockedSlotServer,
  deleteBlockedSlotServer,
} from '@/lib/data/admin-dashboard'
import {
  addDemoSandboxBlockedSlot,
  deleteDemoSandboxBlockedSlot,
  DEMO_SANDBOX_COOKIE_NAME,
} from '@/lib/demo-sandbox'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      fechaInicio?: string
      fechaFin?: string
      motivo?: string
    }

    if (!(await isDbDemoModeActive())) {
      const deltaCookie = request.cookies.get(DEMO_SANDBOX_COOKIE_NAME)?.value
      const result = addDemoSandboxBlockedSlot(
        {
          fechaInicio: body.fechaInicio || new Date().toISOString(),
          fechaFin: body.fechaFin || new Date().toISOString(),
          motivo: body.motivo?.trim() || 'Bloqueo de prueba (Sandbox)',
        },
        deltaCookie
      )

      const response = NextResponse.json(
        {
          sandbox: true,
          blockedSlot: result.blockedSlot,
        },
        { status: 201 }
      )

      response.cookies.set(DEMO_SANDBOX_COOKIE_NAME, result.serializedCookie, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 86400 * 7,
      })

      return response
    }

    const slot = await createBlockedSlotServer({
      fechaInicio: typeof body.fechaInicio === 'string' ? body.fechaInicio : '',
      fechaFin: typeof body.fechaFin === 'string' ? body.fechaFin : '',
      motivo: typeof body.motivo === 'string' ? body.motivo : undefined,
    })

    return NextResponse.json({ blockedSlot: slot }, { status: 201 })
  } catch (err) {
    console.error('[api/demo/blocked-slots][POST] Error:', err)
    return NextResponse.json(
      { error: 'No se pudo crear el bloqueo demo.' },
      { status: 400 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')?.trim() || ''
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'ID de bloqueo inválido.' },
        { status: 400 }
      )
    }

    if (!(await isDbDemoModeActive())) {
      const deltaCookie = request.cookies.get(DEMO_SANDBOX_COOKIE_NAME)?.value
      const result = deleteDemoSandboxBlockedSlot(id, deltaCookie)

      const response = NextResponse.json({ success: true, sandbox: true })

      response.cookies.set(DEMO_SANDBOX_COOKIE_NAME, result.serializedCookie, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 86400 * 7,
      })

      return response
    }

    const result = await deleteBlockedSlotServer(id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/demo/blocked-slots][DELETE] Error:', err)
    return NextResponse.json(
      { error: 'No se pudo eliminar el bloqueo demo.' },
      { status: 500 }
    )
  }
}
