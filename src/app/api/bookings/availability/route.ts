import { connection, NextRequest, NextResponse } from 'next/server'
import { getPublicBookingInitialData } from '@/lib/data/public-booking'
import { DEMO_SANDBOX_COOKIE_NAME } from '@/lib/demo-sandbox'

export async function GET(request: NextRequest) {
  await connection()
  try {
    const isDemoRoute = request.nextUrl.searchParams.get('demo') === '1'
    const deltaCookie =
      request.cookies.get(DEMO_SANDBOX_COOKIE_NAME)?.value || null
    const data = await getPublicBookingInitialData({
      isDemoRoute,
      sandboxDeltaCookie: deltaCookie,
    })
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (err) {
    console.error('[api/bookings/availability][GET] Error:', err)
    return NextResponse.json(
      { error: 'No se pudo actualizar la disponibilidad.' },
      { status: 500 }
    )
  }
}
