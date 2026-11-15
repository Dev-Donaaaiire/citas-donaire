import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST() {
  try {
    const auth = await requireAdminSession()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const db = getSupabaseAdmin()
    const { data, error } = await db.rpc('reset_demo_data', { force: true })
    if (error) {
      return NextResponse.json(
        { error: `No se pudo restaurar la demo: ${error.message}` },
        { status: 500 }
      )
    }

    // Asegurar dirección, teléfono y timezone por defecto en modo demo
    await db
      .from('business_settings')
      .update({
        direccion: 'Calle Serrano 45, Madrid',
        telefono_contacto: '+34 612 345 678',
        timezone: 'Europe/Madrid',
      })
      .eq('modo_demo', true)

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[api/admin/demo-reset][POST] Error:', err)
    return NextResponse.json(
      { error: 'Error al restaurar el entorno demo.' },
      { status: 500 }
    )
  }
}
