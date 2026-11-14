import { NextResponse } from 'next/server'
import { sendClientReminderEmail } from '@/lib/email-service'

interface ReminderNotificationBody {
  clientName?: string
  clientEmail?: string
  businessName?: string
  lastVisit?: string | null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReminderNotificationBody

    if (!body.clientName || !body.clientEmail) {
      return NextResponse.json(
        { error: 'Faltan el nombre o email del cliente.' },
        { status: 400 }
      )
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin

    const result = await sendClientReminderEmail({
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      businessName: body.businessName || 'Krono / Donaire Luxury Hair & Styling',
      lastVisit: body.lastVisit,
      baseUrl: origin,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    console.error('Error en /api/notifications/reminder:', err)
    const message =
      err instanceof Error
        ? err.message
        : 'Error interno al enviar el recordatorio por email.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
