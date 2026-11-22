import { NextResponse } from 'next/server'
import { CURRENT_SYSTEM_VERSION, UPSTREAM_GITHUB_REPO } from '@/lib/version'

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
    version: '1.3.0',
    commitHash: 'v1.3.0',
    releaseDate: '2026-11-22',
    upstreamRepo: UPSTREAM_GITHUB_REPO,
    changelog: [
      '🔔 Notificación por correo al cliente al bloquear fechas u horarios con citas confirmadas.',
      '🔄 Enlace directo de reprogramación en 1 clic sin volver a rellenar datos personales.',
      '🛡️ Protección contra cancelaciones accidentales con confirmación de seguridad en /cancelar.',
      '🚀 Asistente de actualización Krono con soporte para Vercel Clone y scripts automáticos.',
    ],
  }

  return NextResponse.json(versionPayload, {
    headers: corsHeaders,
  })
}
