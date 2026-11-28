import { supabaseAnonKey } from '@/lib/supabase-env'
import 'server-only'

import { isAdminAuthConfigured } from '@/lib/admin-session-token'
import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase-admin'
import { normalizeFormFields } from '@/lib/form-field-rules'
import type { BusinessSettings, Service } from '@/types/booking'

export interface SetupDiagnosticsData {
  hasSupabaseUrl: boolean
  hasSupabaseAnonKey: boolean
  hasServiceRole: boolean
  hasResendKey: boolean
  hasAdminSecret: boolean
  schemaReady: boolean
  missingTables: string[]
  dbErrorDetail?: string | null
}

export interface InitialSetupPayload {
  diagnostics: SetupDiagnosticsData
  settings: BusinessSettings | null
  services: Service[]
}

export async function getAdminSetupData(): Promise<InitialSetupPayload> {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim())
  const hasSupabaseAnonKey = Boolean(
    supabaseAnonKey()
  )
  const hasServiceRole = hasSupabaseAdminConfig()
  const hasResendKey = Boolean(
    process.env.RESEND_API_KEY?.trim()?.startsWith('re_')
  )
  const hasAdminSecret = isAdminAuthConfigured()

  let schemaReady = false
  let dbErrorDetail: string | null = null
  const missingTables: string[] = []
  let settings: BusinessSettings | null = null
  let services: Service[] = []

  if (hasServiceRole) {
    const db = getSupabaseAdmin()
    const [settingsRes, servicesRes, clientsRes, appointmentsRes] =
      await Promise.all([
        db
          .from('business_settings')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        db
          .from('services')
          .select('*')
          .eq('activo', true)
          .order('orden', { ascending: true }),
        db.from('clients').select('id').limit(1),
        db.from('appointments').select('id').limit(1),
      ])

    if (settingsRes.error) {
      missingTables.push('business_settings')
      dbErrorDetail = settingsRes.error.message || settingsRes.error.details || JSON.stringify(settingsRes.error)
    }
    if (servicesRes.error) {
      missingTables.push('services')
      if (!dbErrorDetail) dbErrorDetail = servicesRes.error.message
    }
    if (clientsRes.error) missingTables.push('clients')
    if (appointmentsRes.error) missingTables.push('appointments')

    schemaReady = missingTables.length === 0
    settings = settingsRes.data
      ? {
          ...settingsRes.data,
          campos_formulario: normalizeFormFields(settingsRes.data.campos_formulario),
        }
      : null
    services = servicesRes.data ?? []

    if (!schemaReady) {
      console.error('[getAdminSetupData] DB diagnostics error:', {
        missingTables,
        settingsError: settingsRes.error,
        servicesError: servicesRes.error,
      })
    }
  }

  return {
    diagnostics: {
      hasSupabaseUrl,
      hasSupabaseAnonKey,
      hasServiceRole,
      hasResendKey,
      hasAdminSecret,
      schemaReady,
      missingTables,
      dbErrorDetail: dbErrorDetail || null,
    },
    settings,
    services,
  }
}
