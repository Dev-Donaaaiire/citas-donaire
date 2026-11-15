import 'server-only'

import crypto from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase-admin'

export const LICENSE_KEY_REGEX =
  /^(DONAIRE|DONA)-[A-Z0-9]{4}-[A-Z0-9]{4}(-[A-Z0-9]{4})?$/

export type LicensePlan = 'autoinstalable_15' | 'llave_en_mano_99'

export type LicenseVerificationStatus =
  | 'active'
  | 'demo'
  | 'missing'
  | 'invalid'
  | 'inactive'
  | 'domain_mismatch'
  | 'unconfigured'

export interface LicenseVerificationResult {
  valid: boolean
  unlimited: boolean
  status: LicenseVerificationStatus
  licenseKey: string | null
  plan: LicensePlan | null
  dominioAutorizado: string | null
  checkedAt: string
  source: 'master_supabase' | 'remote_api' | 'demo_mode' | 'validation'
  message: string
}

const LICENSE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateSegment(length = 4): string {
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += LICENSE_ALPHABET[bytes[i] % LICENSE_ALPHABET.length]
  }
  return out
}

/**
 * Genera criptográficamente una clave única compatible con public.licenses (DONAIRE-XXXX-XXXX-2027)
 */
export function generateLicenseKey(): string {
  return `DONAIRE-${generateSegment()}-${generateSegment()}-2027`
}

export function normalizeDomain(domain?: string | null): string | null {
  if (!domain) return null
  return (
    domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      ?.split(':')[0] || null
  )
}

export function isLocalHostname(domain?: string | null): boolean {
  const clean = normalizeDomain(domain)
  if (!clean) return false
  return clean === 'localhost' || clean === '127.0.0.1'
}

export function resolveTrustedDeploymentDomain(): string | null {
  return normalizeDomain(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL ||
      null
  )
}

function getMasterSupabase(): SupabaseClient<Database> | null {
  const url =
    process.env.MASTER_SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey =
    process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url || !serviceKey || url.includes('tu-proyecto')) {
    return null
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export function maskLicenseKey(key: string | null): string | null {
  if (!key) return null
  const parts = key.split('-')
  if (parts.length < 3) return 'DONAIRE-****'
  return `${parts[0]}-****-${parts[parts.length - 1]}`
}

/**
 * Comprueba en servidor la validez de LICENSE_KEY contra el Supabase maestro
 * usando únicamente Service Role Key o contra LICENSE_VERIFY_API_URL.
 */
export async function verifyLicenseServer(options?: {
  keyOverride?: string | null
  domain?: string | null
  allowDomainBind?: boolean
  skipRemoteApi?: boolean
  skipDemoFallback?: boolean
}): Promise<LicenseVerificationResult> {
  const checkedAt = new Date().toISOString()
  const rawKey = (
    options?.keyOverride ??
    process.env.LICENSE_KEY ??
    ''
  )
    .trim()
    .toUpperCase()

  const cleanDomain = normalizeDomain(options?.domain)
  const isLocalHost = isLocalHostname(cleanDomain)

  // 1. Identificar si somos el servidor maestro o una instancia cliente del comprador
  const isMasterServer =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('bsxnxzhbvwtsgwkvwqoc') ||
    Boolean(process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY?.trim())

  const remoteApiUrl = (
    process.env.LICENSE_VERIFY_API_URL ||
    (!isMasterServer ? 'https://citas-donaire.vercel.app/api/license/verify' : '')
  ).trim()

  if (remoteApiUrl && !options?.skipRemoteApi && rawKey) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      const remoteSecret = process.env.LICENSE_VERIFY_SECRET?.trim()
      if (remoteSecret) {
        headers['x-license-verify-secret'] = remoteSecret
      }

      const response = await fetch(remoteApiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          licenseKey: rawKey,
          domain: cleanDomain,
          bindDomain: Boolean(options?.allowDomainBind),
        }),
        cache: 'no-store',
      })

      if (response.ok) {
        const json = (await response.json()) as Partial<LicenseVerificationResult>
        if (typeof json.valid === 'boolean') {
          return {
            valid: json.valid,
            unlimited: Boolean(json.valid),
            status: json.status || (json.valid ? 'active' : 'invalid'),
            licenseKey: rawKey,
            plan: json.plan ?? null,
            dominioAutorizado: json.dominioAutorizado ?? null,
            checkedAt,
            source: 'remote_api',
            message:
              json.message ||
              (json.valid
                ? 'Licencia validada correctamente con el servidor maestro.'
                : 'Licencia no válida.'),
          }
        }
      }
    } catch {
      // Si falla el endpoint remoto, continuamos con verificación directa en Supabase
    }
  }

  // 2. Si falta LICENSE_KEY, comprobar si el entorno está explícitamente en modo_demo
  if (!rawKey) {
    if (!options?.skipDemoFallback && hasSupabaseAdminConfig()) {
      try {
        const adminDb = getSupabaseAdmin()
        const { data: settingsRow } = await adminDb
          .from('business_settings')
          .select('modo_demo')
          .limit(1)
          .maybeSingle()

        if (settingsRow?.modo_demo) {
          return {
            valid: true,
            unlimited: false,
            status: 'demo',
            licenseKey: null,
            plan: null,
            dominioAutorizado: null,
            checkedAt,
            source: 'demo_mode',
            message:
              'Modo Demo activo. Añade tu variable LICENSE_KEY para activar producción sin límites.',
          }
        }
      } catch {
        // Ignorar error de consulta
      }
    }

    return {
      valid: false,
      unlimited: false,
      status: 'missing',
      licenseKey: null,
      plan: null,
      dominioAutorizado: null,
      checkedAt,
      source: 'validation',
      message:
        'No se ha detectado la variable de entorno LICENSE_KEY en el servidor.',
    }
  }

  if (!LICENSE_KEY_REGEX.test(rawKey)) {
    return {
      valid: false,
      unlimited: false,
      status: 'invalid',
      licenseKey: rawKey,
      plan: null,
      dominioAutorizado: null,
      checkedAt,
      source: 'validation',
      message:
        'Formato de licencia inválido. Debe ser DONAIRE-XXXX-XXXX-2027 o DONAIRE-XXXX-XXXX.',
    }
  }

  const masterClient = getMasterSupabase()
  if (!masterClient) {
    return {
      valid: false,
      unlimited: false,
      status: 'unconfigured',
      licenseKey: rawKey,
      plan: null,
      dominioAutorizado: null,
      checkedAt,
      source: 'validation',
      message:
        'Falta configurar SUPABASE_SERVICE_ROLE_KEY o MASTER_SUPABASE_SERVICE_ROLE_KEY para validar licencias.',
    }
  }

  const { data: licenseRow, error } = await masterClient
    .from('licenses')
    .select('*')
    .eq('license_key', rawKey)
    .maybeSingle()

  if (error) {
    return {
      valid: false,
      unlimited: false,
      status: 'unconfigured',
      licenseKey: rawKey,
      plan: null,
      dominioAutorizado: null,
      checkedAt,
      source: 'master_supabase',
      message: `No se pudo verificar la licencia en base de datos (${error.message}).`,
    }
  }

  if (!licenseRow) {
    return {
      valid: false,
      unlimited: false,
      status: 'invalid',
      licenseKey: rawKey,
      plan: null,
      dominioAutorizado: null,
      checkedAt,
      source: 'master_supabase',
      message: 'La clave LICENSE_KEY proporcionada no existe o no es válida.',
    }
  }

  if (!licenseRow.activa) {
    return {
      valid: false,
      unlimited: false,
      status: 'inactive',
      licenseKey: licenseRow.license_key,
      plan: licenseRow.plan,
      dominioAutorizado: licenseRow.dominio_autorizado,
      checkedAt,
      source: 'master_supabase',
      message: 'Esta licencia está desactivada o revocada.',
    }
  }

  const isDemoKey =
    licenseRow.license_key.startsWith('DONA-DEMO-') ||
    licenseRow.license_key.startsWith('DONAIRE-DEMO')
  let authorizedDomain = normalizeDomain(licenseRow.dominio_autorizado)

  const isVercelDomain = (d: string | null) =>
    Boolean(d && (d.endsWith('.vercel.app') || d.endsWith('.now.sh')))

  if (!isDemoKey && cleanDomain && !isLocalHost) {
    const canBindOrUpgrade =
      !authorizedDomain ||
      authorizedDomain === 'localhost' ||
      (isVercelDomain(authorizedDomain) && !isVercelDomain(cleanDomain))

    if (canBindOrUpgrade) {
      if (options?.allowDomainBind) {
        const { error: updateErr } = await masterClient
          .from('licenses')
          .update({ dominio_autorizado: cleanDomain })
          .eq('id', licenseRow.id)
        if (!updateErr) {
          authorizedDomain = cleanDomain
        }
      }
    } else if (authorizedDomain !== cleanDomain) {
      return {
        valid: false,
        unlimited: false,
        status: 'domain_mismatch',
        licenseKey: licenseRow.license_key,
        plan: licenseRow.plan,
        dominioAutorizado: authorizedDomain,
        checkedAt,
        source: 'master_supabase',
        message: `Licencia vinculada a otro dominio autorizado (${authorizedDomain}).`,
      }
    }
  }

  return {
    valid: true,
    unlimited: true,
    status: isDemoKey ? 'demo' : 'active',
    licenseKey: licenseRow.license_key,
    plan: licenseRow.plan,
    dominioAutorizado: authorizedDomain,
    checkedAt,
    source: 'master_supabase',
    message: isDemoKey
      ? 'Licencia Demo oficial verificada.'
      : 'Licencia comercial verificada. Programa desbloqueado sin límites.',
  }
}

export async function checkProductionLicenseGate(
  modoDemo: boolean,
  options?: { isRealBookingInProduction?: boolean }
): Promise<{
  blocked: boolean
  license: LicenseVerificationResult
}> {
  const trustedDomain = resolveTrustedDeploymentDomain()
  const isLocalHost = isLocalHostname(trustedDomain)
  const isShowcaseDemo =
    trustedDomain === 'citas.donaire.dev' ||
    trustedDomain === 'citas-donaire.vercel.app'

  const isProd = process.env.NODE_ENV === 'production'
  const enforceLicense = Boolean(
    options?.isRealBookingInProduction &&
      isProd &&
      !isLocalHost &&
      !isShowcaseDemo
  )

  const license = await verifyLicenseServer({
    domain: trustedDomain,
    allowDomainBind: Boolean(trustedDomain),
    skipDemoFallback: enforceLicense,
  })

  if (modoDemo && !enforceLicense) {
    return { blocked: false, license }
  }

  if (enforceLicense) {
    const isCommercialValid = license.valid && license.status === 'active'
    return { blocked: !isCommercialValid, license }
  }

  const blockedStatuses: LicenseVerificationStatus[] = [
    'invalid',
    'inactive',
    'domain_mismatch',
    'missing',
  ]

  const blocked = !license.valid && blockedStatuses.includes(license.status)
  return { blocked, license }
}

/**
 * Crea o recupera (idempotente por id de pago de PayPal) una licencia en Supabase maestro
 */
export async function issueOrGetLicenseForPaymentSession(params: {
  compradorEmail: string
  paymentSessionId: string
  plan: LicensePlan
}) {
  const masterClient = getMasterSupabase()
  if (!masterClient) {
    throw new Error(
      'Faltan credenciales Service Role de Supabase para emitir licencias.'
    )
  }

  if (params.paymentSessionId) {
    const { data: existing } = await masterClient
      .from('licenses')
      .select('*')
      .eq('stripe_session_id', params.paymentSessionId)
      .maybeSingle()

    if (existing) {
      return {
        license: existing,
        alreadyExisted: true,
      }
    }
  }

  let lastError: string | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const licenseKey = generateLicenseKey()
    const { data, error } = await masterClient
      .from('licenses')
      .insert({
        license_key: licenseKey,
        comprador_email: params.compradorEmail.trim().toLowerCase(),
        plan: params.plan,
        activa: true,
        stripe_session_id: params.paymentSessionId || null,
      })
      .select()
      .single()

    if (!error && data) {
      return {
        license: data,
        alreadyExisted: false,
      }
    }
    lastError = error?.message || 'Error al insertar licencia'
  }

  throw new Error(lastError || 'No se pudo generar la clave de licencia.')
}
