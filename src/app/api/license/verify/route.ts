import { NextRequest, NextResponse } from 'next/server'
import {
  maskLicenseKey,
  resolveTrustedDeploymentDomain,
  verifyLicenseServer,
} from '@/lib/license'
import { getAdminSessionStatus } from '@/lib/admin-auth'

export async function GET() {
  try {
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
    })
  } catch (err) {
    console.error('[api/license/verify][GET] Error:', err)
    return NextResponse.json(
      { error: 'No se pudo comprobar el estado de la licencia.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSessionStatus()
    const verifySecret = process.env.LICENSE_VERIFY_SECRET?.trim()
    const providedSecret = request.headers.get('x-license-verify-secret')?.trim()
    const hasSecretAccess = Boolean(
      verifySecret && providedSecret && verifySecret === providedSecret
    )

    if (!session.authenticated && !hasSecretAccess) {
      return NextResponse.json(
        { error: 'No autorizado para validar o vincular licencias.' },
        { status: 401 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      licenseKey?: string
      domain?: string
      bindDomain?: boolean
    }

    const result = await verifyLicenseServer({
      keyOverride: body.licenseKey || null,
      domain: body.domain || resolveTrustedDeploymentDomain(),
      allowDomainBind: Boolean(body.bindDomain && (session.authenticated || hasSecretAccess)),
      skipRemoteApi: true,
    })

    return NextResponse.json({
      ...result,
      licenseKey: maskLicenseKey(result.licenseKey),
    })
  } catch (err) {
    console.error('[api/license/verify][POST] Error:', err)
    return NextResponse.json(
      { error: 'Error al validar la licencia.' },
      { status: 500 }
    )
  }
}
