import 'server-only'

import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase-admin'

export async function isDbDemoModeActive(): Promise<boolean> {
  if (!hasSupabaseAdminConfig()) return false
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
