import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin-auth'
import { getAdminDashboardData } from '@/lib/data/admin-dashboard'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminSession()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const sp = request.nextUrl.searchParams
    const rawFilter = sp.get('clientFilter')
    const clientFilter =
      rawFilter === 'risk' || rawFilter === 'blocked' ? rawFilter : 'all'

    const data = await getAdminDashboardData({
      fromIso: sp.get('from'),
      toIso: sp.get('to'),
      clientPage: Number(sp.get('clientPage') || 1),
      clientPageSize: Number(sp.get('clientPageSize') || 25),
      clientFilter,
      clientSearch: sp.get('clientSearch'),
      demoRoute: false,
    })

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err
    }
    console.error('[api/admin/dashboard][GET] Error:', err)
    return NextResponse.json(
      { error: 'Error al cargar los datos del panel administrativo.' },
      { status: 500 }
    )
  }
}
