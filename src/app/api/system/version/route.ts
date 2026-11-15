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
    version: '1.2.1',
    commitHash: 'v1.2.1-live',
    releaseDate: '2026-11-15',
    upstreamRepo: UPSTREAM_GITHUB_REPO,
    changelog: [
      '🏷️ Nuevo indicador visual de versión (v1.2.1) en la cabecera del panel de administración.',
      '✨ Modal interactivo para enviar correos a clientes con plantillas editables.',
      '⚡ Envío de emails reales con la API de Resend.',
      '🔄 Sistema centralizado de sincronización y actualizaciones.',
    ],
  }

  return NextResponse.json(versionPayload, {
    headers: corsHeaders,
  })
}
