import { connection, NextRequest, NextResponse } from 'next/server'
import { getPublicBookingInitialData } from '@/lib/data/public-booking'

export async function GET(request: NextRequest) {
  await connection()
  try {
    const isDemoRoute = request.nextUrl.searchParams.get('demo') === '1'
    const data = await getPublicBookingInitialData({ isDemoRoute })
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
