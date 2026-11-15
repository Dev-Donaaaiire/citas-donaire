import { NextResponse } from 'next/server'
import { isDbDemoModeActive } from '@/lib/demo-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { DEMO_SANDBOX_COOKIE_NAME } from '@/lib/demo-sandbox'

export async function POST() {
  try {
    if (!(await isDbDemoModeActive())) {
      const response = NextResponse.json({
        success: true,
        sandbox: true,
        message: 'Entorno sandbox reiniciado sin tocar datos de producción.',
      })
      response.cookies.set(DEMO_SANDBOX_COOKIE_NAME, '', {
        path: '/',
        maxAge: 0,
      })
      return response
    }

    const db = getSupabaseAdmin()
    const { data, error } = await db.rpc('reset_demo_data', { force: false })
    if (error) {
      return NextResponse.json(
        { error: `No se pudo restaurar la demo: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[api/demo/reset][POST] Error:', err)
    return NextResponse.json(
      { error: 'Error restaurando el entorno demo.' },
      { status: 500 }
    )
  }
}
