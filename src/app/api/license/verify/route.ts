import { NextRequest, NextResponse } from 'next/server'
import {
  maskLicenseKey,
  resolveTrustedDeploymentDomain,
  verifyLicenseServer,
} from '@/lib/license'
import { getAdminSessionStatus } from '@/lib/admin-auth'
import {
  checkPersistentRateLimit,
  getClientIp,
  rateLimitHeaders,
} from '@/lib/rate-limit'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-license-verify-secret',
}

// Margen amplio: las instalaciones cliente consultan este endpoint con frecuencia
const VERIFY_MAX_PER_IP = 600
const VERIFY_WINDOW_SECONDS = 10 * 60

async function enforceVerifyRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const limit = await checkPersistentRateLimit({
    key: `license-verify:ip:${getClientIp(request)}`,
    maxRequests: VERIFY_MAX_PER_IP,
    windowSeconds: VERIFY_WINDOW_SECONDS,
  })
  if (limit.allowed) return null

  return NextResponse.json(
    { error: 'Demasiadas verificaciones. Inténtalo de nuevo en unos minutos.' },
    { status: 429, headers: { ...corsHeaders, ...rateLimitHeaders(limit) } }
  )
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function GET(request: NextRequest) {
  try {
    const limited = await enforceVerifyRateLimit(request)
    if (limited) return limited

    const session = await getAdminSessionStatus()
    const trustedDomain = resolveTrustedDeploymentDomain()

    // Solo lectura: nunca permite vincular dominio arbitrario por query GET pública
    const result = await verifyLicenseServer({
      domain: trustedDomain,
      allowDomainBind: false,
    })

    const safePayload = {
      ...result,
      licenseKey: session.authenticated
        ? result.licenseKey
        : maskLicenseKey(result.licenseKey),
      dominioAutorizado: session.authenticated
        ? result.dominioAutorizado
        : null,
    }

    // 200 si la licencia es válida (o demo); 403 si está inactiva, ausente o no coincide el dominio
    return NextResponse.json(safePayload, {
      status: result.valid || result.status === 'demo' ? 200 : 403,
      headers: corsHeaders,
    })
  } catch (err) {
    console.error('[api/license/verify][GET] Error:', err)
    return NextResponse.json(
      { error: 'No se pudo comprobar el estado de la licencia.' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const limited = await enforceVerifyRateLimit(request)
    if (limited) return limited

    const body = (await request.json().catch(() => ({}))) as {
      licenseKey?: string
      domain?: string
      bindDomain?: boolean
    }

    if (typeof body.licenseKey !== 'string' || !body.licenseKey.trim()) {
      return NextResponse.json(
        { error: 'Debes proporcionar una clave de licencia (licenseKey).' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validación pública contra la base de datos maestra de Álvaro
    const result = await verifyLicenseServer({
      keyOverride: body.licenseKey,
      domain: body.domain || null,
      allowDomainBind: Boolean(body.bindDomain),
      skipRemoteApi: true,
    })

    return NextResponse.json(
      {
        ...result,
        licenseKey: maskLicenseKey(result.licenseKey),
      },
      { headers: corsHeaders }
    )
  } catch (err) {
    console.error('[api/license/verify][POST] Error:', err)
    return NextResponse.json(
      { error: 'Error al validar la licencia.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
