import 'server-only'

import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase-admin'
import { getDemoSandboxAdminDataset } from '@/lib/demo-sandbox'
import { DEFAULT_THEME, isThemeId, type ThemeId } from '@/lib/themes'
import type { CancelAppointmentDetails } from '@/types/booking'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const DEMO_CANCEL_TOKEN_PREFIX = '00000000-0000-4000-8000-00000000d'

export interface CancelAppointmentLoadResult {
  appointment: CancelAppointmentDetails | null
  temaActivo: ThemeId
  error: string | null
  /** Código HTTP sugerido para consumidores API. */
  status: 200 | 400 | 404 | 500
}

/**
 * Carga la cita asociada a un token de cancelación (solo esa cita, sin PII extra)
 * y el tema activo corporativo del negocio para mantener la coherencia de marca.
 * Se usa tanto en el Server Component de /cancelar como en GET /api/bookings/cancel.
 */
export async function getCancelAppointmentInitialData(
  rawToken: string | null | undefined
): Promise<CancelAppointmentLoadResult> {
  const token = rawToken?.trim() || ''

  if (!token) {
    return {
      appointment: null,
      temaActivo: DEFAULT_THEME,
      error:
        'Enlace de cancelación inválido o incompleto. Revisa el correo de tu reserva.',
      status: 400,
    }
  }

  if (!UUID_REGEX.test(token)) {
    return {
      appointment: null,
      temaActivo: DEFAULT_THEME,
      error: 'Token de cita inválido o no proporcionado.',
      status: 400,
    }
  }

  // Tokens de sandbox demo en memoria
  if (token.startsWith(DEMO_CANCEL_TOKEN_PREFIX)) {
    const demo = getDemoSandboxAdminDataset()
    const demoTheme: ThemeId = isThemeId(demo.settings.tema_activo)
      ? demo.settings.tema_activo
      : DEFAULT_THEME

    const match = demo.appointments.find((a) => a.token_cancelacion === token)
    if (!match) {
      return {
        appointment: null,
        temaActivo: demoTheme,
        error: 'No se encontró ninguna cita asociada a este enlace.',
        status: 404,
      }
    }
    return {
      appointment: {
        id: match.id,
        estado: match.estado,
        fecha_hora_inicio: match.fecha_hora_inicio,
        fecha_hora_fin: match.fecha_hora_fin,
        service_id: match.service_id,
        service_nombre: match.service?.nombre || 'Servicio Demo',
        service_precio: Number(match.service?.precio || 0),
        service_duracion_minutos: match.service?.duracion_minutos || 30,
        client_nombre: match.client?.nombre || 'Cliente Demo',
        business_name: demo.settings.nombre_negocio,
        direccion: demo.settings.direccion,
        telefono_contacto: demo.settings.telefono_contacto,
        timezone: demo.settings.timezone,
      },
      temaActivo: demoTheme,
      error: null,
      status: 200,
    }
  }

  try {
    const client = hasSupabaseAdminConfig() ? getSupabaseAdmin() : supabase
    const [aptRes, settingsRes] = await Promise.all([
      client.rpc('get_appointment_by_cancel_token', {
        p_token: token,
      }),
      hasSupabaseAdminConfig()
        ? getSupabaseAdmin()
            .from('business_settings')
            .select('tema_activo')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()
        : supabase.rpc('get_public_business_settings'),
    ])

    let rawTheme: string | null = null
    if (hasSupabaseAdminConfig()) {
      const s = settingsRes.data as { tema_activo?: string | null } | null
      rawTheme = s?.tema_activo ?? null
    } else {
      const list = settingsRes.data as Array<{ tema_activo?: string | null }> | null
      rawTheme = list?.[0]?.tema_activo ?? null
    }
    const temaActivo: ThemeId = isThemeId(rawTheme) ? rawTheme : DEFAULT_THEME

    if (aptRes.error) {
      return {
        appointment: null,
        temaActivo,
        error: 'No se pudo consultar la cita.',
        status: 500,
      }
    }

    if (!aptRes.data) {
      return {
        appointment: null,
        temaActivo,
        error: 'No se encontró ninguna cita asociada a este enlace.',
        status: 404,
      }
    }

    return {
      appointment: aptRes.data as unknown as CancelAppointmentDetails,
      temaActivo,
      error: null,
      status: 200,
    }
  } catch (err) {
    console.error('[getCancelAppointmentInitialData] Error:', err)
    return {
      appointment: null,
      temaActivo: DEFAULT_THEME,
      error: 'Error al consultar la cita.',
      status: 500,
    }
  }
}
