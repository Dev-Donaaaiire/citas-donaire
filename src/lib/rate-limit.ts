import 'server-only'

import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase-admin'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

interface RateLimitParams {
  key: string
  maxRequests: number
  windowSeconds: number
}

interface MemoryBucket {
  count: number
  resetAt: number
}

// Fallback en memoria: solo se usa si falta service_role o la migración aún no está aplicada.
const memoryBuckets = new Map<string, MemoryBucket>()

function consumeInMemory({
  key,
  maxRequests,
  windowSeconds,
}: RateLimitParams): RateLimitResult {
  const now = Date.now()

  if (memoryBuckets.size > 5000) {
    for (const [k, v] of memoryBuckets) {
      if (v.resetAt <= now) memoryBuckets.delete(k)
    }
  }

  const current = memoryBuckets.get(key)
  if (!current || current.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return { allowed: true, remaining: maxRequests - 1, retryAfterSeconds: 0 }
  }

  current.count += 1
  const allowed = current.count <= maxRequests
  return {
    allowed,
    remaining: Math.max(0, maxRequests - current.count),
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  }
}

/**
 * Rate limit persistente en Supabase (RPC atómica `consume_rate_limit`).
 * Hace fallback seguro a memoria si la RPC no existe todavía o falta service_role.
 */
export async function checkPersistentRateLimit(
  params: RateLimitParams
): Promise<RateLimitResult> {
  if (!hasSupabaseAdminConfig()) {
    return consumeInMemory(params)
  }

  try {
    const { data, error } = await getSupabaseAdmin().rpc('consume_rate_limit', {
      p_key: params.key,
      p_max_requests: params.maxRequests,
      p_window_seconds: params.windowSeconds,
    })

    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      if (error) {
        console.warn(
          '[rate-limit] RPC consume_rate_limit no disponible, usando memoria:',
          error.message
        )
      }
      return consumeInMemory(params)
    }

    const row = data as {
      allowed?: boolean
      remaining?: number
      retry_after_seconds?: number
    }

    return {
      allowed: Boolean(row.allowed),
      remaining: Number(row.remaining ?? 0),
      retryAfterSeconds: Number(row.retry_after_seconds ?? 0),
    }
  } catch (err) {
    console.warn('[rate-limit] Error inesperado, usando memoria:', err)
    return consumeInMemory(params)
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first.slice(0, 64)
  }
  const real = request.headers.get('x-real-ip')?.trim()
  return (real || 'unknown').slice(0, 64)
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return { 'Retry-After': String(Math.max(1, result.retryAfterSeconds)) }
}
