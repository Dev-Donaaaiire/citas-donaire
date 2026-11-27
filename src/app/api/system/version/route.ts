import { NextResponse } from 'next/server'
import { UPSTREAM_GITHUB_REPO } from '@/lib/version'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function GET() {
  const versionPayload = {
    version: '1.4.0',
    commitHash: 'v1.4.0',
    releaseDate: '2026-11-22',
    upstreamRepo: UPSTREAM_GITHUB_REPO,
    changelog: [
      '⚙️ Personalización del formulario de reserva: elige qué campos son obligatorios, opcionales u ocultos.',
      '💡 Análisis de impacto en tiempo real: especificación clara de qué funciones se pierden o ganan con cada campo.',
      '🛡️ Reservas flexibles con compatibilidad universal en base de datos para clientes sin email o teléfono.',
      '📊 Tabla de retención y agenda adaptadas con indicadores de estado para clientes sin datos de contacto.',
    ],
  }

  return NextResponse.json(versionPayload, {
    headers: corsHeaders,
  })
}
