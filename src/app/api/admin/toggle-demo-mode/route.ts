import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminSession()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = (await request.json().catch(() => ({}))) as {
      enabled?: boolean
    }

    const db = getSupabaseAdmin()
    const { data: existing } = await db
      .from('business_settings')
      .select('id, modo_demo')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json(
        { error: 'No se encontró la configuración del negocio.' },
        { status: 404 }
      )
    }

    const newMode =
      typeof body.enabled === 'boolean' ? body.enabled : !existing.modo_demo

    const { error: updateErr } = await db
      .from('business_settings')
      .update({ modo_demo: newMode })
      .eq('id', existing.id)

    if (updateErr) {
      return NextResponse.json(
        { error: `Error al cambiar modo demo: ${updateErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      modoDemo: newMode,
      message: newMode
        ? 'Modo Demo activado con éxito.'
        : 'Modo Producción activado con éxito.',
    })
  } catch (err) {
    console.error('[api/admin/toggle-demo-mode][POST] Error:', err)
    return NextResponse.json(
      { error: 'Error al cambiar el modo demo.' },
      { status: 500 }
    )
  }
}
