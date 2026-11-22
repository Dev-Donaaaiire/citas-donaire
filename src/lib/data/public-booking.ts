import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase-admin'
import { checkProductionLicenseGate } from '@/lib/license'
import {
  DEMO_SANDBOX_COOKIE_NAME,
  DEMO_SANDBOX_SERVICES,
  DEMO_SANDBOX_SETTINGS,
  getDemoSandboxBusyIntervals,
} from '@/lib/demo-sandbox'
import type {
  BusinessPublicSettings,
  PublicBusyInterval,
  Service,
} from '@/types/booking'
import {
  addDaysToIsoDate,
  getTodayIsoInTimeZone,
  sanitizeTimeZone,
  zonedDateTimeToUtc,
} from '@/lib/timezone'
import { normalizeFormFields } from '@/lib/form-field-rules'

export interface PublicBookingInitialData {
  services: Service[]
  settings: BusinessPublicSettings
  busyIntervals: PublicBusyInterval[]
  isSandboxFallback: boolean
  licenseBlocked: boolean
  licenseMessage: string | null
  needsSetup: boolean
}

const resolveSandboxDelta = async (explicitCookie?: string | null) => {
  if (typeof explicitCookie === 'string') return explicitCookie
  try {
    const cookieStore = await cookies()
    return cookieStore.get(DEMO_SANDBOX_COOKIE_NAME)?.value || null
  } catch {
    return null
  }
}

const fetchPublicBookingInitialData = cache(
  async (
    isDemoRoute: boolean,
    explicitDeltaCookie?: string | null
  ): Promise<PublicBookingInitialData> => {
    const canUseAdmin = hasSupabaseAdminConfig()
    const deltaCookie = await resolveSandboxDelta(explicitDeltaCookie)

  try {
    let settings: BusinessPublicSettings | null = null
    let services: Service[] = []

    if (canUseAdmin) {
      const db = getSupabaseAdmin()
      const [settingsRes, servicesRes] = await Promise.all([
        db
          .from('business_settings')
          .select(
            'id, nombre_negocio, logo_url, horario_apertura, horario_cierre, dias_laborables, duracion_cita_minutos, tema_activo, modo_demo, direccion, telefono_contacto, timezone, campos_formulario'
          )
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        db
          .from('services')
          .select('*')
          .eq('activo', true)
          .order('orden', { ascending: true }),
      ])

      if (settingsRes.data) {
        settings = {
          ...settingsRes.data,
          timezone: sanitizeTimeZone(settingsRes.data.timezone),
          campos_formulario: normalizeFormFields(settingsRes.data.campos_formulario),
        }
      }
      services = servicesRes.data ?? []
    } else {
      const [rpcSettingsRes, servicesRes] = await Promise.all([
        supabase.rpc('get_public_business_settings'),
        supabase
          .from('services')
          .select('*')
          .eq('activo', true)
          .order('orden', { ascending: true }),
      ])

      const first = rpcSettingsRes.data?.[0]
      if (first) {
        const rawTheme = first.tema_activo
        const tema_activo: BusinessPublicSettings['tema_activo'] =
          rawTheme === 'clean_minimal' || rawTheme === 'neon_creator'
            ? rawTheme
            : 'dark_luxury'

        settings = {
          id: first.id,
          nombre_negocio: first.nombre_negocio,
          logo_url: first.logo_url,
          horario_apertura: first.horario_apertura,
          horario_cierre: first.horario_cierre,
          dias_laborables: first.dias_laborables,
          duracion_cita_minutos: first.duracion_cita_minutos,
          tema_activo,
          modo_demo: first.modo_demo,
          direccion: first.direccion,
          telefono_contacto: first.telefono_contacto,
          timezone: sanitizeTimeZone(first.timezone),
          campos_formulario: normalizeFormFields(first.campos_formulario),
        }
      }
      services = servicesRes.data ?? []
    }

    // Si estamos en /demo pero la BD ya está en producción real (modo_demo = false),
    // aislamos completamente /demo con el sandbox en memoria para no leer datos reales.
    if (isDemoRoute && settings && !settings.modo_demo) {
      return {
        services: DEMO_SANDBOX_SERVICES,
        settings: DEMO_SANDBOX_SETTINGS,
        busyIntervals: getDemoSandboxBusyIntervals(deltaCookie),
        isSandboxFallback: true,
        licenseBlocked: false,
        licenseMessage: null,
        needsSetup: false,
      }
    }

    if (!settings) {
      if (isDemoRoute) {
        return {
          services: DEMO_SANDBOX_SERVICES,
          settings: DEMO_SANDBOX_SETTINGS,
          busyIntervals: getDemoSandboxBusyIntervals(deltaCookie),
          isSandboxFallback: true,
          licenseBlocked: false,
          licenseMessage: null,
          needsSetup: false,
        }
      }

      return {
        services: [],
        settings: {
          ...DEMO_SANDBOX_SETTINGS,
          nombre_negocio: 'Agenda pendiente de configuración',
          modo_demo: false,
          direccion: null,
          telefono_contacto: null,
        },
        busyIntervals: [],
        isSandboxFallback: false,
        licenseBlocked: false,
        licenseMessage: null,
        needsSetup: true,
      }
    }

    const tz = sanitizeTimeZone(settings.timezone)
    const todayIso = getTodayIsoInTimeZone(tz)
    const fromUtc = zonedDateTimeToUtc(todayIso, '00:00', tz).toISOString()
    const toIso = addDaysToIsoDate(todayIso, 46)
    const toUtc = zonedDateTimeToUtc(toIso, '23:59', tz).toISOString()

    let busyIntervals: PublicBusyInterval[] = []

    if (canUseAdmin) {
      const db = getSupabaseAdmin()
      const { data: rpcIntervals, error: rpcErr } = await db.rpc(
        'get_public_busy_intervals',
        {
          p_from: fromUtc,
          p_to: toUtc,
        }
      )

      if (!rpcErr && Array.isArray(rpcIntervals)) {
        busyIntervals = rpcIntervals.map((row) => ({
          inicio: row.inicio,
          fin: row.fin,
          kind: row.kind === 'blocked' ? 'blocked' : 'appointment',
        }))
      } else {
        // Fallback directo server-side con service_role si la RPC aún no estuviera migrada
        const [apptsRes, blocksRes] = await Promise.all([
          db
            .from('appointments')
            .select('fecha_hora_inicio, fecha_hora_fin')
            .neq('estado', 'cancelada')
            .gt('fecha_hora_fin', fromUtc)
            .lt('fecha_hora_inicio', toUtc),
          db
            .from('blocked_slots')
            .select('fecha_inicio, fecha_fin')
            .gt('fecha_fin', fromUtc)
            .lt('fecha_inicio', toUtc),
        ])

        busyIntervals = [
          ...(apptsRes.data ?? []).map((a) => ({
            inicio: a.fecha_hora_inicio,
            fin: a.fecha_hora_fin,
            kind: 'appointment' as const,
          })),
          ...(blocksRes.data ?? []).map((b) => ({
            inicio: b.fecha_inicio,
            fin: b.fecha_fin,
            kind: 'blocked' as const,
          })),
        ]
      }
    } else {
      const { data: rpcIntervals } = await supabase.rpc(
        'get_public_busy_intervals',
        {
          p_from: fromUtc,
          p_to: toUtc,
        }
      )

      busyIntervals = (rpcIntervals ?? []).map((row) => ({
        inicio: row.inicio,
        fin: row.fin,
        kind: row.kind === 'blocked' ? 'blocked' : 'appointment',
      }))
    }

    let licenseBlocked = false
    let licenseMessage: string | null = null
    if (!isDemoRoute && !settings.modo_demo) {
      const gate = await checkProductionLicenseGate(false)
      licenseBlocked = gate.blocked
      licenseMessage = gate.blocked ? gate.license.message : null
    }

    return {
      services,
      settings,
      busyIntervals,
      isSandboxFallback: false,
      licenseBlocked,
      licenseMessage,
      needsSetup: false,
    }
  } catch (err) {
    console.error('[public-booking] Error loading initial data:', err)
    if (isDemoRoute) {
      return {
        services: DEMO_SANDBOX_SERVICES,
        settings: DEMO_SANDBOX_SETTINGS,
        busyIntervals: getDemoSandboxBusyIntervals(deltaCookie),
        isSandboxFallback: true,
        licenseBlocked: false,
        licenseMessage: null,
        needsSetup: false,
      }
    }

    return {
      services: [],
      settings: {
        ...DEMO_SANDBOX_SETTINGS,
        nombre_negocio: 'Krono Citas',
        modo_demo: false,
        direccion: null,
        telefono_contacto: null,
      },
      busyIntervals: [],
      isSandboxFallback: false,
      licenseBlocked: false,
      licenseMessage: null,
      needsSetup: true,
    }
  }
})

export async function getPublicBookingInitialData(options?: {
  isDemoRoute?: boolean
  sandboxDeltaCookie?: string | null
}): Promise<PublicBookingInitialData> {
  return fetchPublicBookingInitialData(
    Boolean(options?.isDemoRoute),
    options?.sandboxDeltaCookie || null
  )
}
