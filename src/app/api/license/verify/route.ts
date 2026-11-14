import { NextRequest, NextResponse } from 'next/server'
import { verifyLicenseServer } from '@/lib/license'

function extractDomainFromHeaders(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    null
  )
}

export async function GET(request: NextRequest) {
  try {
    const keyParam = request.nextUrl.searchParams.get('key')
    const domainParam =
      request.nextUrl.searchParams.get('domain') ||
      extractDomainFromHeaders(request)
    const strict = request.nextUrl.searchParams.get('strict') === 'true'

    const result = await verifyLicenseServer({
      licenseKey: keyParam || undefined,
      domain: domainParam,
      skipRemoteApi: Boolean(keyParam),
    })

    return NextResponse.json(result, {
      status: strict && !result.valid ? 403 : 200,
    })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error verificando licencia.'
    return NextResponse.json(
      {
        valid: false,
        unlimited: false,
        status: 'unconfigured',
        message,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      licenseKey?: string
      domain?: string
      strict?: boolean
    }

    const domain = body.domain || extractDomainFromHeaders(request)

    const result = await verifyLicenseServer({
      licenseKey: body.licenseKey,
      domain,
      skipRemoteApi: Boolean(body.licenseKey),
    })

    return NextResponse.json(result, {
      status: body.strict && !result.valid ? 403 : 200,
    })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error verificando licencia.'
    return NextResponse.json(
      {
        valid: false,
        unlimited: false,
        status: 'unconfigured',
        message,
      },
      { status: 500 }
    )
  }
}
