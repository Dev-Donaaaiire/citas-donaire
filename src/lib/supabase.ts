import { supabaseAnonKey as readAnonKey } from '@/lib/supabase-env'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const fallbackUrl = 'https://placeholder.supabase.co'
const fallbackAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || fallbackUrl
const supabaseAnonKey =
  readAnonKey() || fallbackAnonKey

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
)

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = readAnonKey()
  return Boolean(url && key && !url.includes('placeholder'))
}
