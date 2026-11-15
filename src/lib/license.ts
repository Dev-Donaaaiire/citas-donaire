import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const LICENSE_KEY_REGEX =
  /^DONAIRE-[A-Z0-9]{4}-[A-Z0-9]{4}(-[A-Z0-9]{4})?$/

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
  compradorEmail: string | null
  dominioAutorizado: string | null
  checkedAt: string
  source: 'master_supabase' | 'remote_api' | 'demo_mode' | 'validation'
  message: string
}

const LICENSE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomCodeBlock(length = 4): string {
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += LICENSE_ALPHABET[bytes[i] % LICENSE_ALPHABET.length]
  }
  return out
}

/**
 * Genera una clave única criptográfica con formato DONAIRE-XXXX-XXXX-2027
 */
export function generateLicenseKey(): string {
  return `DONAIRE-${randomCodeBlock(4)}-${randomCodeBlock(4)}-2027`
}

function normalizeDomain(domain?: string | null): string | null {
  if (!domain) return null
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0] || null
}

function getMasterSupabase() {
  const url =
    process.env.MASTER_SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key =
    process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.MASTER_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !key || !url.startsWith('http')) {
    return null
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function getLocalSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !key || !url.startsWith('http')) {
    return null
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Comprueba en servidor la validez de LICENSE_KEY contra el Supabase maestro
 * o contra el endpoint remoto configurado en LICENSE_VERIFY_API_URL.
 */
export async function verifyLicenseServer(options?: {
  licenseKey?: string | null
  domain?: string | null
  skipRemoteApi?: boolean
}): Promise<LicenseVerificationResult> {
  const checkedAt = new Date().toISOString()
  const rawKey = (
    options?.licenseKey ??
    process.env.LICENSE_KEY ??
    process.env.NEXT_PUBLIC_LICENSE_KEY ??
    ''
  )
    .trim()
    .toUpperCase()
  const cleanDomain = normalizeDomain(options?.domain)

  // 1. Validación opcional contra endpoint maestro si el comprador lo definió
  const remoteApiUrl = process.env.LICENSE_VERIFY_API_URL?.trim()
  if (remoteApiUrl && !options?.skipRemoteApi && rawKey) {
    try {
      const response = await fetch(remoteApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: rawKey, domain: cleanDomain }),
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
            compradorEmail: json.compradorEmail ?? null,
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

  // 2. Si falta LICENSE_KEY, comprobar si el entorno está en modo demo
  if (!rawKey) {
    const localClient = getLocalSupabase()
    if (localClient) {
      const { data: settings } = await localClient
        .from('business_settings')
        .select('modo_demo')
        .limit(1)
        .maybeSingle()

      if (settings?.modo_demo) {
        return {
          valid: true,
          unlimited: true,
          status: 'demo',
          licenseKey: 'DONAIRE-DEMO-2027-2027',
          plan: 'llave_en_mano_99',
          compradorEmail: 'demo@donaire.dev',
          dominioAutorizado: cleanDomain || 'localhost',
          checkedAt,
          source: 'demo_mode',
          message:
            'Modo Demo activo. Añade tu variable LICENSE_KEY para activar producción sin marcas de demo.',
        }
      }
    }

    return {
      valid: false,
      unlimited: false,
      status: 'missing',
      licenseKey: null,
      plan: null,
      compradorEmail: null,
      dominioAutorizado: null,
      checkedAt,
      source: 'validation',
      message:
        'No se ha detectado la variable de entorno LICENSE_KEY en el servidor.',
    }
  }

  // 3. Validar formato estricto DONAIRE-XXXX-XXXX(-2027)
  if (!LICENSE_KEY_REGEX.test(rawKey)) {
    return {
      valid: false,
      unlimited: false,
      status: 'invalid',
      licenseKey: rawKey,
      plan: null,
      compradorEmail: null,
      dominioAutorizado: null,
      checkedAt,
      source: 'validation',
      message:
        'Formato de licencia incorrecto. Debe seguir el patrón DONAIRE-XXXX-XXXX-2027.',
    }
  }

  // 4. Consultar tabla licenses en Supabase maestro
  const masterClient = getMasterSupabase()
  if (!masterClient) {
    return {
      valid: false,
      unlimited: false,
      status: 'unconfigured',
      licenseKey: rawKey,
      plan: null,
      compradorEmail: null,
      dominioAutorizado: null,
      checkedAt,
      source: 'master_supabase',
      message:
        'Faltan credenciales de Supabase para verificar la licencia en el servidor.',
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
      compradorEmail: null,
      dominioAutorizado: null,
      checkedAt,
      source: 'master_supabase',
      message: `No se pudo consultar la tabla licenses: ${error.message}`,
    }
  }

  if (!licenseRow) {
    return {
      valid: false,
      unlimited: false,
      status: 'invalid',
      licenseKey: rawKey,
      plan: null,
      compradorEmail: null,
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
      compradorEmail: licenseRow.comprador_email,
      dominioAutorizado: licenseRow.dominio_autorizado,
      checkedAt,
      source: 'master_supabase',
      message: 'Esta licencia está desactivada o fue reembolsada.',
    }
  }

  // 5. Vinculación automática de dominio en el primer despliegue en producción
  const isDemoKey = rawKey.startsWith('DONAIRE-DEMO')
  const isLocalHost =
    !cleanDomain || cleanDomain === 'localhost' || cleanDomain === '127.0.0.1'

  let authorizedDomain = licenseRow.dominio_autorizado

  if (!isDemoKey && !isLocalHost) {
    if (!authorizedDomain || authorizedDomain === 'localhost') {
      const { error: updateErr } = await masterClient
        .from('licenses')
        .update({ dominio_autorizado: cleanDomain })
        .eq('id', licenseRow.id)
      if (!updateErr) {
        authorizedDomain = cleanDomain
      }
    } else if (
      authorizedDomain !== cleanDomain &&
      !cleanDomain.endsWith('.vercel.app') &&
      !authorizedDomain.endsWith('.vercel.app')
    ) {
      return {
        valid: false,
        unlimited: false,
        status: 'domain_mismatch',
        licenseKey: licenseRow.license_key,
        plan: licenseRow.plan,
        compradorEmail: licenseRow.comprador_email,
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
    compradorEmail: licenseRow.comprador_email,
    dominioAutorizado: authorizedDomain,
    checkedAt,
    source: 'master_supabase',
    message: isDemoKey
      ? 'Licencia Demo oficial verificada.'
      : 'Licencia comercial verificada. Programa desbloqueado sin límites.',
  }
}

/**
 * Crea o recupera (idempotente por id de pago de PayPal o Stripe) una licencia en Supabase maestro
 */
export async function issueOrGetLicenseForPaymentSession(params: {
  compradorEmail: string
  paymentSessionId: string
  plan: LicensePlan
}) {
  const masterClient = getMasterSupabase()
  if (!masterClient) {
    throw new Error(
      'Faltan variables de entorno de Supabase para emitir licencias.'
    )
  }

  // Idempotencia: comprobar si esta sesión de pago ya generó una clave
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

  // Reintentar hasta 5 veces ante improbable colisión de randomBytes
  let lastError: string | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const licenseKey = generateLicenseKey()
    const { data, error } = await masterClient
      .from('licenses')
      .insert({
        license_key: licenseKey,
        comprador_email: params.compradorEmail.trim().toLowerCase(),
        stripe_session_id: params.paymentSessionId,
        plan: params.plan,
        activa: true,
      })
      .select('*')
      .single()

    if (!error && data) {
      return {
        license: data,
        alreadyExisted: false,
      }
    }

    lastError = error?.message || 'Error desconocido al insertar licencia'
  }

  throw new Error(
    `No se pudo registrar la licencia en Supabase tras varios intentos: ${lastError}`
  )
}

/**
 * Alias de compatibilidad para sesiones de pago
 */
export async function issueOrGetLicenseForStripeSession(params: {
  compradorEmail: string
  stripeSessionId: string
  plan: LicensePlan
}) {
  return issueOrGetLicenseForPaymentSession({
    compradorEmail: params.compradorEmail,
    paymentSessionId: params.stripeSessionId,
    plan: params.plan,
  })
}
