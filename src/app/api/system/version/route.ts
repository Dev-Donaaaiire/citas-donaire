import { NextResponse } from 'next/server'
import {
  CURRENT_SYSTEM_VERSION,
  RELEASE_DATE,
  RELEASE_NOTES,
  UPSTREAM_GITHUB_REPO,
} from '@/lib/version'

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
    commitHash: `v${CURRENT_SYSTEM_VERSION}`,
    releaseDate: RELEASE_DATE,
    upstreamRepo: UPSTREAM_GITHUB_REPO,
    changelog: RELEASE_NOTES,
  }

  return NextResponse.json(versionPayload, {
    headers: corsHeaders,
  })
}
