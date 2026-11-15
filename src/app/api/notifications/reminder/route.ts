import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendClientReminderEmail } from '@/lib/email-service'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminSession()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = (await request.json().catch(() => ({}))) as {
      clientId?: string
      subject?: string
      message?: string
    }

    const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : ''
    if (!UUID_REGEX.test(clientId)) {
      return NextResponse.json(
        { error: 'Se requiere un clientId válido para enviar el recordatorio.' },
        { status: 400 }
      )
    }

    const db = getSupabaseAdmin()

    const [{ data: client, error: clientError }, { data: settings }] =
      await Promise.all([
        db
          .from('clients')
          .select('id, nombre, email, ultima_visita, bloqueado_no_show')
          .eq('id', clientId)
          .maybeSingle(),
        db
          .from('business_settings')
          .select('nombre_negocio, timezone, modo_demo')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ])

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Cliente no encontrado en la base de datos.' },
        { status: 404 }
      )
    }

    if (client.bloqueado_no_show) {
      return NextResponse.json(
        {
          error:
            'Este cliente está bloqueado por no-shows previos y no puede recibir campañas automáticas.',
        },
        { status: 400 }
      )
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') ||
      'http://localhost:3000'

    const result = await sendClientReminderEmail({
      clientName: client.nombre,
      clientEmail: client.email,
      businessName: settings?.nombre_negocio || 'Krono Studio',
      lastVisit: client.ultima_visita,
      timezone: settings?.timezone || 'Europe/Madrid',
      baseUrl,
      customSubject: body.subject,
      customMessage: body.message,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/notifications/reminder] Error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'No se pudo enviar el recordatorio al cliente.',
      },
      { status: 500 }
    )
  }
}
