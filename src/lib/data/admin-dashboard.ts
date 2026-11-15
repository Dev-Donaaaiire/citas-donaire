import 'server-only'

import { cookies } from 'next/headers'
import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase-admin'
import {
  checkProductionLicenseGate,
  type LicenseVerificationResult,
} from '@/lib/license'
import {
  DEMO_SANDBOX_COOKIE_NAME,
  getDemoSandboxAdminDataset,
} from '@/lib/demo-sandbox'
import type {
  Appointment,
  BlockedSlot,
  BusinessSettings,
  Client,
  Service,
} from '@/types/booking'
import {
  addDaysToIsoDate,
  getTodayIsoInTimeZone,
  getZonedDateParts,
  sanitizeTimeZone,
  zonedDateTimeToUtc,
} from '@/lib/timezone'

export interface ExecutiveMetrics {
  todayAppointmentsCount: number
  weeklyEstimatedRevenue: number
}

interface MetricAppointmentInput {
  fecha_hora_inicio: string
  estado: string
  service?: { precio?: number | string | null } | null
}

/**
 * KPIs ejecutivos siempre sobre [hoy, hoy + 7 días] en la zona horaria del negocio,
 * con independencia del rango de agenda que esté navegando el dueño.
 */
export function computeExecutiveMetrics(
  appointments: MetricAppointmentInput[],
  timeZone: string
): ExecutiveMetrics {
  const tz = sanitizeTimeZone(timeZone)
  const todayIso = getTodayIsoInTimeZone(tz)
  const startMs = zonedDateTimeToUtc(todayIso, '00:00', tz).getTime()
  const endMs = zonedDateTimeToUtc(
    addDaysToIsoDate(todayIso, 7),
    '23:59',
    tz
  ).getTime()

  let todayAppointmentsCount = 0
  let weeklyEstimatedRevenue = 0

  for (const apt of appointments) {
    if (apt.estado === 'cancelada' || apt.estado === 'no_show') continue
    const start = new Date(apt.fecha_hora_inicio)
    const ms = start.getTime()
    if (Number.isNaN(ms) || ms < startMs || ms > endMs) continue

    if (getZonedDateParts(start, tz).isoDate === todayIso) {
      todayAppointmentsCount += 1
    }
    weeklyEstimatedRevenue += Number(apt.service?.precio || 0)
  }

  return { todayAppointmentsCount, weeklyEstimatedRevenue }
}

export interface AdminDashboardPayload {
  settings: BusinessSettings | null
  services: Service[]
  appointments: Appointment[]
  blockedSlots: BlockedSlot[]
  clients: Client[]
  executiveMetrics: ExecutiveMetrics
  clientsPagination: {
    page: number
    pageSize: number
    totalFiltered: number
    totalClients: number
    atRiskCount: number
    blockedCount: number
  }
  range: {
    fromIso: string
    toIso: string
  }
  license: LicenseVerificationResult
  licenseBlocked: boolean
  isSandboxFallback: boolean
}

export async function getAdminDashboardData(options?: {
  fromIso?: string | null
  toIso?: string | null
  clientPage?: number
  clientPageSize?: number
  clientFilter?: 'all' | 'risk' | 'blocked'
  clientSearch?: string | null
  demoRoute?: boolean
  sandboxDeltaCookie?: string | null
}): Promise<AdminDashboardPayload> {
  const demoRoute = Boolean(options?.demoRoute)
  const page = Math.max(1, Number(options?.clientPage || 1))
  const pageSize = Math.min(100, Math.max(5, Number(options?.clientPageSize || 25)))
  const filter = options?.clientFilter || 'all'
  const search = options?.clientSearch?.trim() || ''

  const fallbackLicense: LicenseVerificationResult = {
    valid: true,
    unlimited: false,
    status: 'demo',
    licenseKey: null,
    plan: null,
    dominioAutorizado: null,
    checkedAt: new Date().toISOString(),
    source: 'demo_mode',
    message: 'Entorno sandbox aislado de demostración.',
  }

  const resolveSandboxDelta = async () => {
    if (typeof options?.sandboxDeltaCookie === 'string') {
      return options.sandboxDeltaCookie
    }
    try {
      const cookieStore = await cookies()
      return cookieStore.get(DEMO_SANDBOX_COOKIE_NAME)?.value || null
    } catch {
      return null
    }
  }

  if (!hasSupabaseAdminConfig()) {
    const deltaCookie = await resolveSandboxDelta()
    const sandbox = getDemoSandboxAdminDataset(deltaCookie)
    return {
      settings: {
        ...sandbox.settings,
        email_notificaciones: null,
        ultima_restauracion_demo: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      services: sandbox.services,
      appointments: sandbox.appointments,
      blockedSlots: sandbox.blockedSlots,
      clients: sandbox.clients,
      executiveMetrics: computeExecutiveMetrics(
        sandbox.appointments,
        sandbox.settings.timezone
      ),
      clientsPagination: {
        page: 1,
        pageSize,
        totalFiltered: sandbox.clients.length,
        totalClients: sandbox.clients.length,
        atRiskCount: 1,
        blockedCount: 1,
      },
      range: {
        fromIso: new Date(Date.now() - 7 * 86_400_000).toISOString(),
        toIso: new Date(Date.now() + 45 * 86_400_000).toISOString(),
      },
      license: fallbackLicense,
      licenseBlocked: false,
      isSandboxFallback: true,
    }
  }

  const db = getSupabaseAdmin()

  const { data: settingsRow } = await db
    .from('business_settings')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // Si es /demo/admin y la BD está en modo producción real (modo_demo = false),
  // jamás leemos datos de clientes reales ni permitimos mutaciones sobre BD real.
  if (demoRoute && settingsRow && !settingsRow.modo_demo) {
    const deltaCookie = await resolveSandboxDelta()
    const sandbox = getDemoSandboxAdminDataset(deltaCookie)
    return {
      settings: {
        ...sandbox.settings,
        email_notificaciones: null,
        ultima_restauracion_demo: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      services: sandbox.services,
      appointments: sandbox.appointments,
      blockedSlots: sandbox.blockedSlots,
      clients: sandbox.clients,
      executiveMetrics: computeExecutiveMetrics(
        sandbox.appointments,
        sandbox.settings.timezone
      ),
      clientsPagination: {
        page: 1,
        pageSize,
        totalFiltered: sandbox.clients.length,
        totalClients: sandbox.clients.length,
        atRiskCount: 1,
        blockedCount: 1,
      },
      range: {
        fromIso: new Date(Date.now() - 7 * 86_400_000).toISOString(),
        toIso: new Date(Date.now() + 45 * 86_400_000).toISOString(),
      },
      license: fallbackLicense,
      licenseBlocked: false,
      isSandboxFallback: true,
    }
  }

  const tz = sanitizeTimeZone(settingsRow?.timezone)
  const todayIso = getTodayIsoInTimeZone(tz)
  const defaultFrom = zonedDateTimeToUtc(
    addDaysToIsoDate(todayIso, -7),
    '00:00',
    tz
  ).toISOString()
  const defaultTo = zonedDateTimeToUtc(
    addDaysToIsoDate(todayIso, 46),
    '23:59',
    tz
  ).toISOString()

  const fromIso =
    options?.fromIso && !Number.isNaN(new Date(options.fromIso).getTime())
      ? new Date(options.fromIso).toISOString()
      : defaultFrom
  const toIso =
    options?.toIso && !Number.isNaN(new Date(options.toIso).getTime())
      ? new Date(options.toIso).toISOString()
      : defaultTo

  const riskCutoffIso = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const riskOrClause = `or(ultima_visita.is.null,ultima_visita.lt.${riskCutoffIso})`

  let clientsQuery = db
    .from('clients')
    .select('*', { count: 'exact' })
    .order('ultima_visita', { ascending: true, nullsFirst: false })

  if (filter === 'blocked') {
    clientsQuery = clientsQuery.eq('bloqueado_no_show', true)
  } else if (filter === 'risk') {
    clientsQuery = clientsQuery.eq('bloqueado_no_show', false)
  }

  // Combinación explícita de grupos `or(...)` (riesgo + búsqueda) sin ambigüedad.
  const searchTerm = search.replace(/[%_(),*\\]/g, ' ').replace(/\s+/g, ' ').trim()
  const searchOrClause = searchTerm
    ? `or(nombre.ilike.*${searchTerm}*,email.ilike.*${searchTerm}*,telefono.ilike.*${searchTerm}*)`
    : null

  const structuredClauses: string[] = []
  if (filter === 'risk') structuredClauses.push(riskOrClause)
  if (searchOrClause) structuredClauses.push(searchOrClause)

  if (structuredClauses.length === 1) {
    // Un solo grupo: se aplica directamente como `or=(...)`
    clientsQuery = clientsQuery.or(structuredClauses[0].slice(3, -1))
  } else if (structuredClauses.length > 1) {
    // Riesgo + búsqueda: `or=(and(or(...),or(...)))` evita dos `or` independientes ambiguos
    clientsQuery = clientsQuery.or(`and(${structuredClauses.join(',')})`)
  }

  const offset = (page - 1) * pageSize
  clientsQuery = clientsQuery.range(offset, offset + pageSize - 1)

  const metricsFromIso = zonedDateTimeToUtc(todayIso, '00:00', tz).toISOString()
  const metricsToIso = zonedDateTimeToUtc(
    addDaysToIsoDate(todayIso, 7),
    '23:59',
    tz
  ).toISOString()

  const [
    servicesRes,
    apptsRes,
    blocksRes,
    clientsRes,
    totalClientsRes,
    atRiskCountRes,
    blockedCountRes,
    metricsApptsRes,
    gate,
  ] = await Promise.all([
    db.from('services').select('*').order('orden', { ascending: true }),
    db
      .from('appointments')
      .select('*, client:clients(*), service:services(*)')
      .gte('fecha_hora_inicio', fromIso)
      .lte('fecha_hora_inicio', toIso)
      .order('fecha_hora_inicio', { ascending: true })
      .limit(400),
    db
      .from('blocked_slots')
      .select('*')
      .gt('fecha_fin', fromIso)
      .lt('fecha_inicio', toIso)
      .order('fecha_inicio', { ascending: true })
      .limit(200),
    clientsQuery,
    db.from('clients').select('id', { count: 'exact', head: true }),
    db
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('bloqueado_no_show', false)
      .or(`ultima_visita.is.null,ultima_visita.lt.${riskCutoffIso}`),
    db
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('bloqueado_no_show', true),
    db
      .from('appointments')
      .select('fecha_hora_inicio, estado, service:services(precio)')
      .gte('fecha_hora_inicio', metricsFromIso)
      .lte('fecha_hora_inicio', metricsToIso)
      .neq('estado', 'cancelada')
      .limit(1000),
    demoRoute
      ? Promise.resolve({ blocked: false, license: fallbackLicense })
      : checkProductionLicenseGate(Boolean(settingsRow?.modo_demo)),
  ])

  const normalizedSettings = settingsRow
    ? {
        ...settingsRow,
        timezone: tz,
      }
    : null

  return {
    settings: normalizedSettings,
    services: servicesRes.data ?? [],
    appointments: (apptsRes.data ?? []) as Appointment[],
    blockedSlots: blocksRes.data ?? [],
    clients: clientsRes.data ?? [],
    executiveMetrics: computeExecutiveMetrics(
      (metricsApptsRes.data ?? []) as unknown as MetricAppointmentInput[],
      tz
    ),
    clientsPagination: {
      page,
      pageSize,
      totalFiltered: clientsRes.count ?? (clientsRes.data?.length ?? 0),
      totalClients: totalClientsRes.count ?? 0,
      atRiskCount: atRiskCountRes.count ?? 0,
      blockedCount: blockedCountRes.count ?? 0,
    },
    range: {
      fromIso,
      toIso,
    },
    license: gate.license,
    licenseBlocked: demoRoute ? false : gate.blocked,
    isSandboxFallback: false,
  }
}

export async function updateAppointmentStatusServer(
  appointmentId: string,
  newStatus: 'confirmada' | 'cancelada' | 'completada' | 'no_show'
) {
  const db = getSupabaseAdmin()
  const { data: currentAppt, error: fetchErr } = await db
    .from('appointments')
    .select('id, client_id, fecha_hora_fin, estado')
    .eq('id', appointmentId)
    .maybeSingle()

  if (fetchErr || !currentAppt) {
    throw new Error('Cita no encontrada.')
  }

  const { error: updateErr } = await db
    .from('appointments')
    .update({ estado: newStatus })
    .eq('id', appointmentId)

  if (updateErr) {
    throw new Error(`Error al actualizar la cita: ${updateErr.message}`)
  }

  if (newStatus === 'completada' && currentAppt.client_id) {
    await db
      .from('clients')
      .update({
        ultima_visita: currentAppt.fecha_hora_fin || new Date().toISOString(),
      })
      .eq('id', currentAppt.client_id)
  } else if (
    newStatus === 'no_show' &&
    currentAppt.estado !== 'no_show' &&
    currentAppt.client_id
  ) {
    // Incremento + bloqueo atómicos en PostgreSQL (sin race conditions)
    const { error: noShowErr } = await db.rpc('record_client_no_show', {
      p_client_id: currentAppt.client_id,
    })
    if (noShowErr) {
      console.error(
        '[updateAppointmentStatusServer] Error registrando no-show:',
        noShowErr
      )
    }
  }

  // Ajuste atómico del contador de citas si el dueño anula o reactiva una cita
  if (currentAppt.client_id && currentAppt.estado !== newStatus) {
    const delta =
      newStatus === 'cancelada' && currentAppt.estado === 'confirmada'
        ? -1
        : newStatus === 'confirmada' && currentAppt.estado === 'cancelada'
          ? 1
          : 0

    if (delta !== 0) {
      const { error: counterErr } = await db.rpc(
        'increment_client_appointments',
        { p_client_id: currentAppt.client_id, p_delta: delta }
      )
      if (counterErr) {
        console.error(
          '[updateAppointmentStatusServer] Error ajustando total_citas:',
          counterErr
        )
      }
    }
  }

  return { success: true }
}

export async function toggleClientBlacklistServer(
  clientId: string,
  currentlyBlocked: boolean
) {
  const db = getSupabaseAdmin()
  const nextBlocked = !currentlyBlocked
  const { error } = await db
    .from('clients')
    .update({ bloqueado_no_show: nextBlocked })
    .eq('id', clientId)

  if (error) {
    throw new Error(`Error al actualizar estado del cliente: ${error.message}`)
  }

  return { success: true, newStatus: nextBlocked }
}

export async function createBlockedSlotServer(params: {
  fechaInicio: string
  fechaFin: string
  motivo?: string
}): Promise<BlockedSlot> {
  const start = new Date(params.fechaInicio)
  const end = new Date(params.fechaFin)
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    throw new Error('El rango horario de bloqueo no es válido.')
  }

  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('blocked_slots')
    .insert({
      fecha_inicio: start.toISOString(),
      fecha_fin: end.toISOString(),
      motivo: params.motivo?.trim() || 'Bloqueo manual por el propietario',
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Error al crear bloqueo: ${error?.message || 'desconocido'}`)
  }

  return data
}

export async function deleteBlockedSlotServer(id: string) {
  const db = getSupabaseAdmin()
  const { error } = await db.from('blocked_slots').delete().eq('id', id)
  if (error) {
    throw new Error(`Error al eliminar bloqueo: ${error.message}`)
  }
  return { success: true }
}
