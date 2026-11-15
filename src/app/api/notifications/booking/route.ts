import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin-auth'

export async function POST() {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  return NextResponse.json(
    {
      error:
        'Endpoint desactivado por seguridad: los correos de confirmación se envían directamente desde POST /api/bookings.',
    },
    { status: 410 }
  )
}
