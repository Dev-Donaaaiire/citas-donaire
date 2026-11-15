import { connection, NextRequest, NextResponse } from 'next/server'
import { getAdminDashboardData } from '@/lib/data/admin-dashboard'

export async function GET(request: NextRequest) {
  await connection()
  try {
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
      demoRoute: true,
    })

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (err) {
    console.error('[api/demo/dashboard][GET] Error:', err)
    return NextResponse.json(
      { error: 'Error al cargar la vista de demostración.' },
      { status: 500 }
    )
  }
}
