import 'server-only'

import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase-admin'

/** Las rutas públicas de /demo solo tocan la BD real con opt-in explícito. */
export function isPublicDemoDbAllowed(): boolean {
  return process.env.ALLOW_PUBLIC_DEMO_DB === 'true'
}

export async function isDbDemoModeActive(): Promise<boolean> {
  if (!isPublicDemoDbAllowed() || !hasSupabaseAdminConfig()) return false
  try {
    const db = getSupabaseAdmin()
    const { data } = await db
      .from('business_settings')
      .select('modo_demo')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    return Boolean(data?.modo_demo)
  } catch {
    return false
  }
}
