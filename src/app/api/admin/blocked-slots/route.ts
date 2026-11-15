import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin-auth'
import {
  createBlockedSlotServer,
  deleteBlockedSlotServer,
} from '@/lib/data/admin-dashboard'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminSession()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = (await request.json().catch(() => ({}))) as {
      fechaInicio?: string
      fechaFin?: string
      motivo?: string
    }

    const slot = await createBlockedSlotServer({
      fechaInicio: typeof body.fechaInicio === 'string' ? body.fechaInicio : '',
      fechaFin: typeof body.fechaFin === 'string' ? body.fechaFin : '',
      motivo: typeof body.motivo === 'string' ? body.motivo : undefined,
    })

    return NextResponse.json({ blockedSlot: slot }, { status: 201 })
  } catch (err) {
    console.error('[api/admin/blocked-slots][POST] Error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'No se pudo crear el bloqueo horario.',
      },
      { status: 400 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminSession()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const id = request.nextUrl.searchParams.get('id')?.trim() || ''
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'ID de bloqueo inválido.' },
        { status: 400 }
      )
    }

    const result = await deleteBlockedSlotServer(id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/admin/blocked-slots][DELETE] Error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'No se pudo eliminar el bloqueo horario.',
      },
      { status: 500 }
    )
  }
}
