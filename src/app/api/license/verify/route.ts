import { NextResponse } from 'next/server'

// Compatibilidad: las instalaciones anteriores a la 1.6.0 consultan aquí su
// licencia y pausan las reservas si no obtienen respuesta. Krono es gratuito, así
// que siempre es válida. No borrar mientras queden instalaciones antiguas.
const reply = () =>
  NextResponse.json({ valid: true, status: 'active', message: 'Krono es gratuito.' })

export const GET = reply
export const POST = reply
