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
    version: '1.2.2',
    commitHash: 'v1.2.2',
    releaseDate: '2026-11-16',
    upstreamRepo: UPSTREAM_GITHUB_REPO,
    changelog: [
      '📋 Nueva guía visual con instrucciones detalladas paso a paso para actualizar.',
      '✨ Botón de actualización enriquecido con enlace directo a Actions y comprobaciones de seguridad.',
      '🛡️ Sincronización limpia de archivos de negocio garantizada.',
      '🏷️ Etiqueta de versión v1.2.2 activa.',
    ],
  }

  return NextResponse.json(versionPayload, {
    headers: corsHeaders,
  })
}
