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
    version: CURRENT_SYSTEM_VERSION,
    commitHash: '54c9f0a',
    releaseDate: '2026-11-15',
    upstreamRepo: UPSTREAM_GITHUB_REPO,
    changelog: [
      '✨ Modal interactivo para enviar correos a clientes con plantillas editables y selector de reactivación/disponibilidad.',
      '⚡ Envío de emails reales en producción con la API de Resend.',
      '🔑 Puente de validación de licencias transparente para despliegues independientes en 1 clic.',
      '📱 Ajustes de diseño de élite: touch targets ≥ 48px y superficies táctiles en modo oscuro.',
    ],
  }

  return NextResponse.json(versionPayload, {
    headers: corsHeaders,
  })
}
