import 'server-only'

import { supabaseServiceKey } from '@/lib/supabase-env'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

let cachedAdminClient: SupabaseClient<Database> | null = null

export function isAnonKey(key?: string | null): boolean {
  if (!key) return false
  try {
    const parts = key.split('.')
    if (parts.length < 2) return false
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    ) as { role?: string }
    return payload.role === 'anon'
  } catch {
    return false
  }
}

export function hasSupabaseAdminConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = supabaseServiceKey()
  return Boolean(url && serviceKey && !isAnonKey(serviceKey))
}

export function getSupabaseAdmin(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = supabaseServiceKey()

  if (!url || !serviceKey) {
    throw new Error(
      'Falta configurar NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor. No se permite operar sin la Service Role Key en rutas administrativas.'
    )
  }

  if (isAnonKey(serviceKey)) {
    throw new Error(
      'Error de configuración en Vercel: Has pegado la clave pública "anon" dentro de la variable "SUPABASE_SERVICE_ROLE_KEY". Debes ir a Supabase -> Project Settings -> API, hacer clic en Reveal en "service_role" (secret), copiar esa clave y pegarla en Vercel.'
    )
  }

  if (!cachedAdminClient) {
    cachedAdminClient = createClient<Database>(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }

  return cachedAdminClient
}
