import { NextRequest, NextResponse, connection } from 'next/server'
import { requireAdminSession } from '@/lib/admin-auth'
import { checkSystemUpdate } from '@/lib/version'

export async function GET(request: NextRequest) {
  await connection()
  try {
    const auth = await requireAdminSession()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const forceFresh = request.nextUrl.searchParams.get('fresh') === 'true'

    const info = await checkSystemUpdate({ forceFresh })
    return NextResponse.json(info, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (err) {
    console.error('[api/admin/system/status] Error:', err)
    return NextResponse.json(
      { error: 'No se pudo comprobar el estado de las actualizaciones.' },
      { status: 500 }
    )
  }
}
