import { NextResponse } from 'next/server'
import { sendBookingConfirmationEmails } from '@/lib/email-service'

interface BookingNotificationBody {
  appointmentId?: string
  tokenCancelacion?: string
  businessName?: string
  ownerEmail?: string | null
  serviceName?: string
  servicePrice?: number
  durationMinutes?: number
  clientName?: string
  clientEmail?: string
  clientPhone?: string | null
  notes?: string | null
  startIso?: string
  endIso?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BookingNotificationBody

    if (
      !body.appointmentId ||
      !body.tokenCancelacion ||
      !body.serviceName ||
      !body.clientName ||
      !body.clientEmail ||
      !body.startIso ||
      !body.endIso
    ) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios para enviar las notificaciones.' },
        { status: 400 }
      )
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin

    const result = await sendBookingConfirmationEmails({
      appointmentId: body.appointmentId,
      tokenCancelacion: body.tokenCancelacion,
      businessName: body.businessName || 'Krono / Donaire Luxury Hair & Styling',
      ownerEmail: body.ownerEmail,
      serviceName: body.serviceName,
      servicePrice: Number(body.servicePrice ?? 0),
      durationMinutes: Number(body.durationMinutes ?? 45),
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      clientPhone: body.clientPhone,
      notes: body.notes,
      startIso: body.startIso,
      endIso: body.endIso,
      baseUrl: origin,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    console.error('Error en /api/notifications/booking:', err)
    const message =
      err instanceof Error
        ? err.message
        : 'Error interno al procesar las notificaciones de reserva.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
