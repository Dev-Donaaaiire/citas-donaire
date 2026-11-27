export const ADMIN_SESSION_COOKIE_NAME = 'krono_admin_session'
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 horas

interface AdminSessionPayload {
  sub: 'admin'
  iat: number
  exp: number
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(input: string): Uint8Array | null {
  try {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } catch {
    return null
  }
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

function getHmacSecretMaterial(): string | null {
  const explicitSecret = process.env.ADMIN_SESSION_SECRET?.trim()
  if (explicitSecret && explicitSecret.length >= 16) {
    return `krono-session-secret-v1:${explicitSecret}`
  }
  // En producción exigimos secreto explícito; solo en desarrollo derivamos de la contraseña.
  if (process.env.NODE_ENV === 'production') {
    return null
  }
  const passwordFallback = process.env.ADMIN_PASSWORD?.trim()
  if (passwordFallback && passwordFallback.length >= MIN_ADMIN_PASSWORD_LENGTH) {
    return `krono-session-pw-derived-v1:${passwordFallback}`
  }
  return null
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export const MIN_ADMIN_PASSWORD_LENGTH = 10

export function isAdminAuthConfigured(): boolean {
  const password = process.env.ADMIN_PASSWORD?.trim()
  const passwordOk = Boolean(
    password && password.length >= MIN_ADMIN_PASSWORD_LENGTH
  )
  // En producción además se exige ADMIN_SESSION_SECRET explícito (>= 16 caracteres).
  return passwordOk && getHmacSecretMaterial() !== null
}

export function hasExplicitSessionSecret(): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim()
  return Boolean(secret && secret.length >= 16)
}

export async function verifyAdminPassword(candidate: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD?.trim()
  if (!expected || !candidate) return false

  const [expectedHash, candidateHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', textEncoder.encode(expected)),
    crypto.subtle.digest('SHA-256', textEncoder.encode(candidate)),
  ])

  return constantTimeEqual(
    new Uint8Array(expectedHash),
    new Uint8Array(candidateHash)
  )
}

export async function createAdminSessionToken(): Promise<string> {
  const secret = getHmacSecretMaterial()
  if (!secret) {
    throw new Error(
      'Falta ADMIN_PASSWORD o ADMIN_SESSION_SECRET para firmar la sesión administrativa.'
    )
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const payload: AdminSessionPayload = {
    sub: 'admin',
    iat: nowSeconds,
    exp: nowSeconds + ADMIN_SESSION_TTL_SECONDS,
  }

  const encodedPayload = toBase64Url(
    textEncoder.encode(JSON.stringify(payload))
  )
  const key = await importHmacKey(secret)
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    textEncoder.encode(encodedPayload)
  )
  const encodedSignature = toBase64Url(new Uint8Array(signatureBuffer))

  return `${encodedPayload}.${encodedSignature}`
}

export async function verifyAdminSessionToken(
  token: string | undefined | null
): Promise<{ valid: boolean; reason?: string }> {
  if (!token || !token.includes('.')) {
    return { valid: false, reason: 'missing_or_malformed' }
  }

  if (!isAdminAuthConfigured()) {
    return { valid: false, reason: 'auth_not_configured' }
  }

  const secret = getHmacSecretMaterial()
  if (!secret) {
    return { valid: false, reason: 'secret_missing' }
  }

  const parts = token.split('.')
  if (parts.length !== 2) {
    return { valid: false, reason: 'malformed_parts' }
  }

  const [encodedPayload, encodedSignature] = parts
  const signatureBytes = fromBase64Url(encodedSignature)
  if (!signatureBytes) {
    return { valid: false, reason: 'invalid_signature_encoding' }
  }

  try {
    const key = await importHmacKey(secret)
    const expectedSignature = new Uint8Array(
      await crypto.subtle.sign(
        'HMAC',
        key,
        textEncoder.encode(encodedPayload)
      )
    )

    if (!constantTimeEqual(signatureBytes, expectedSignature)) {
      return { valid: false, reason: 'invalid_signature' }
    }

    const payloadBytes = fromBase64Url(encodedPayload)
    if (!payloadBytes) {
      return { valid: false, reason: 'invalid_payload_encoding' }
    }

    const parsed = JSON.parse(
      textDecoder.decode(payloadBytes)
    ) as Partial<AdminSessionPayload>

    if (
      parsed.sub !== 'admin' ||
      typeof parsed.exp !== 'number' ||
      typeof parsed.iat !== 'number'
    ) {
      return { valid: false, reason: 'invalid_payload_claims' }
    }

    const nowSeconds = Math.floor(Date.now() / 1000)
    if (parsed.exp <= nowSeconds) {
      return { valid: false, reason: 'expired' }
    }

    return { valid: true }
  } catch {
    return { valid: false, reason: 'verification_error' }
  }
}

export function sanitizeNextAdminPath(rawNext: string | null | undefined): string {
  if (!rawNext) return '/admin'
  const trimmed = rawNext.trim()
  // Los navegadores tratan "\" como "/" y descartan tabs y saltos de línea
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/admin/login') ||
    /[\\\u0000-\u001f\u007f]/.test(trimmed)
  ) {
    return '/admin'
  }
  const base = 'http://internal.invalid'
  const resolved = new URL(trimmed, base)
  if (resolved.origin !== base || resolved.pathname.startsWith('//')) {
    return '/admin'
  }
  return trimmed
}
