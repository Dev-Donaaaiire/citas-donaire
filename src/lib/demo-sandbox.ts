import crypto from 'node:crypto'
import type {
  Appointment,
  BlockedSlot,
  BusinessPublicSettings,
  Client,
  PublicBusyInterval,
  Service,
} from '@/types/booking'
import {
  addDaysToIsoDate,
  getTodayIsoInTimeZone,
  zonedDateTimeToUtc,
} from '@/lib/timezone'
import { DEFAULT_FORM_FIELDS } from '@/lib/form-field-rules'

export const DEMO_SANDBOX_COOKIE_NAME = 'krono_demo_sandbox_delta'

export const DEMO_SANDBOX_SETTINGS: BusinessPublicSettings = {
  id: '00000000-0000-0000-0000-00000000d300',
  nombre_negocio: 'Krono Studio Demo',
  logo_url: null,
  horario_apertura: '09:30:00',
  horario_cierre: '20:00:00',
  dias_laborables: [1, 2, 3, 4, 5, 6],
  duracion_cita_minutos: 30,
  tema_activo: 'dark_luxury',
  modo_demo: true,
  direccion: 'Calle Serrano 45, Madrid',
  telefono_contacto: '+34 612 345 678',
  timezone: 'Europe/Madrid',
  campos_formulario: DEFAULT_FORM_FIELDS,
}

export const DEMO_SANDBOX_SERVICES: Service[] = [
  {
    id: '00000000-0000-0000-0000-00000000s001',
    nombre: 'Corte Signature & Styling',
    duracion_minutos: 30,
    precio: 24,
    activo: true,
    orden: 1,
    created_at: '2026-01-01T10:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-00000000s002',
    nombre: 'Corte + Ritual Barba Vapor',
    duracion_minutos: 60,
    precio: 38,
    activo: true,
    orden: 2,
    created_at: '2026-01-01T10:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-00000000s003',
    nombre: 'Sesión Diagnóstico & Tratamiento',
    duracion_minutos: 45,
    precio: 45,
    activo: true,
    orden: 3,
    created_at: '2026-01-01T10:00:00.000Z',
  },
]

export interface DemoSandboxDelta {
  addedAppointments?: Appointment[]
  updatedStatuses?: Record<string, 'confirmada' | 'cancelada' | 'completada' | 'no_show'>
  addedBlockedSlots?: BlockedSlot[]
  deletedBlockedSlotIds?: string[]
  addedClients?: Client[]
  clientBlacklists?: Record<string, boolean>
}

export function parseDemoSandboxDelta(raw?: string | null): DemoSandboxDelta {
  if (!raw) return {}
  try {
    const unencoded = decodeURIComponent(raw)
    const parsed = JSON.parse(unencoded)
    if (parsed && typeof parsed === 'object') {
      return parsed as DemoSandboxDelta
    }
  } catch {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return parsed as DemoSandboxDelta
      }
    } catch {
      // ignore
    }
  }
  return {}
}

export function serializeDemoSandboxDelta(delta: DemoSandboxDelta): string {
  try {
    return encodeURIComponent(JSON.stringify(delta))
  } catch {
    return ''
  }
}

export function getBaseDemoSandboxAdminDataset(): {
  settings: BusinessPublicSettings
  services: Service[]
  appointments: Appointment[]
  blockedSlots: BlockedSlot[]
  clients: Client[]
} {
  const tz = DEMO_SANDBOX_SETTINGS.timezone
  const todayIso = getTodayIsoInTimeZone(tz)
  const tomorrowIso = addDaysToIsoDate(todayIso, 1)

  const clients: Client[] = [
    {
      id: '00000000-0000-0000-0000-00000000c001',
      nombre: 'Carlos Mendoza (Ejemplo)',
      email: 'carlos.ejemplo@krono-demo.invalid',
      telefono: '+34 600 111 222',
      total_citas: 6,
      no_shows: 0,
      bloqueado_no_show: false,
      ultima_visita: new Date(Date.now() - 36 * 86_400_000).toISOString(),
      created_at: '2026-01-01T10:00:00.000Z',
    },
    {
      id: '00000000-0000-0000-0000-00000000c002',
      nombre: 'Lucía Navarro (Ejemplo)',
      email: 'lucia.ejemplo@krono-demo.invalid',
      telefono: '+34 600 333 444',
      total_citas: 4,
      no_shows: 0,
      bloqueado_no_show: false,
      ultima_visita: new Date(Date.now() - 12 * 86_400_000).toISOString(),
      created_at: '2026-01-01T10:00:00.000Z',
    },
    {
      id: '00000000-0000-0000-0000-00000000c003',
      nombre: 'Sergio Blanco (Ejemplo)',
      email: 'sergio.ejemplo@krono-demo.invalid',
      telefono: '+34 600 555 666',
      total_citas: 2,
      no_shows: 2,
      bloqueado_no_show: true,
      ultima_visita: new Date(Date.now() - 45 * 86_400_000).toISOString(),
      created_at: '2026-01-01T10:00:00.000Z',
    },
  ]

  const appointments: Appointment[] = [
    {
      id: '00000000-0000-0000-0000-00000000a001',
      client_id: clients[1].id,
      service_id: DEMO_SANDBOX_SERVICES[0].id,
      fecha_hora_inicio: zonedDateTimeToUtc(todayIso, '18:00', tz).toISOString(),
      fecha_hora_fin: zonedDateTimeToUtc(todayIso, '18:30', tz).toISOString(),
      estado: 'confirmada',
      token_cancelacion: '00000000-0000-4000-8000-00000000d001',
      notas: 'Reserva ficticia de demostración',
      created_at: '2026-01-01T10:00:00.000Z',
      client: clients[1],
      service: DEMO_SANDBOX_SERVICES[0],
    },
    {
      id: '00000000-0000-0000-0000-00000000a002',
      client_id: clients[0].id,
      service_id: DEMO_SANDBOX_SERVICES[1].id,
      fecha_hora_inicio: zonedDateTimeToUtc(tomorrowIso, '11:00', tz).toISOString(),
      fecha_hora_fin: zonedDateTimeToUtc(tomorrowIso, '12:00', tz).toISOString(),
      estado: 'confirmada',
      token_cancelacion: '00000000-0000-4000-8000-00000000d002',
      notas: null,
      created_at: '2026-01-01T10:00:00.000Z',
      client: clients[0],
      service: DEMO_SANDBOX_SERVICES[1],
    },
  ]

  const blockedSlots: BlockedSlot[] = [
    {
      id: '00000000-0000-0000-0000-00000000b001',
      fecha_inicio: zonedDateTimeToUtc(tomorrowIso, '14:00', tz).toISOString(),
      fecha_fin: zonedDateTimeToUtc(tomorrowIso, '15:30', tz).toISOString(),
      motivo: 'Pausa comida (Ejemplo Sandbox)',
      created_at: '2026-01-01T10:00:00.000Z',
    },
  ]

  return {
    settings: DEMO_SANDBOX_SETTINGS,
    services: DEMO_SANDBOX_SERVICES,
    appointments,
    blockedSlots,
    clients,
  }
}

export function getDemoSandboxDataset(deltaOrRaw?: DemoSandboxDelta | string | null): {
  settings: BusinessPublicSettings
  services: Service[]
  appointments: Appointment[]
  blockedSlots: BlockedSlot[]
  clients: Client[]
} {
  const delta =
    typeof deltaOrRaw === 'string'
      ? parseDemoSandboxDelta(deltaOrRaw)
      : deltaOrRaw || {}
  const base = getBaseDemoSandboxAdminDataset()

  // 1. Clientes
  let clients = [...base.clients]
  if (Array.isArray(delta.addedClients) && delta.addedClients.length > 0) {
    for (const newClient of delta.addedClients) {
      const existingIdx = clients.findIndex(
        (c) =>
          c.id === newClient.id ||
          (c.email && c.email.toLowerCase() === newClient.email.toLowerCase()) ||
          (c.telefono && c.telefono === newClient.telefono)
      )
      if (existingIdx >= 0) {
        clients[existingIdx] = { ...clients[existingIdx], ...newClient }
      } else {
        clients.unshift(newClient)
      }
    }
  }

  if (delta.clientBlacklists) {
    clients = clients.map((c) => {
      if (delta.clientBlacklists![c.id] !== undefined) {
        return { ...c, bloqueado_no_show: delta.clientBlacklists![c.id] }
      }
      return c
    })
  }

  // 2. Bloqueos de horario
  let blockedSlots = [...base.blockedSlots]
  if (Array.isArray(delta.deletedBlockedSlotIds) && delta.deletedBlockedSlotIds.length > 0) {
    const deletedSet = new Set(delta.deletedBlockedSlotIds)
    blockedSlots = blockedSlots.filter((b) => !deletedSet.has(b.id))
  }
  if (Array.isArray(delta.addedBlockedSlots) && delta.addedBlockedSlots.length > 0) {
    blockedSlots = [...delta.addedBlockedSlots, ...blockedSlots]
  }

  // 3. Citas
  let appointments = [...base.appointments]
  if (Array.isArray(delta.addedAppointments) && delta.addedAppointments.length > 0) {
    appointments = [...delta.addedAppointments, ...appointments]
  }
  if (delta.updatedStatuses) {
    appointments = appointments.map((a) => {
      const updated = delta.updatedStatuses![a.id]
      if (updated) {
        return { ...a, estado: updated }
      }
      return a
    })
  }

  // Orden cronológico por inicio
  appointments.sort(
    (a, b) =>
      new Date(a.fecha_hora_inicio).getTime() -
      new Date(b.fecha_hora_inicio).getTime()
  )

  return {
    settings: base.settings,
    services: base.services,
    appointments,
    blockedSlots,
    clients,
  }
}

export function getDemoSandboxBusyIntervals(
  deltaOrRaw?: DemoSandboxDelta | string | null
): PublicBusyInterval[] {
  const dataset = getDemoSandboxDataset(deltaOrRaw)
  const intervals: PublicBusyInterval[] = []

  for (const apt of dataset.appointments) {
    if (apt.estado === 'cancelada') continue
    intervals.push({
      inicio: apt.fecha_hora_inicio,
      fin: apt.fecha_hora_fin,
      kind: 'appointment',
    })
  }

  for (const blk of dataset.blockedSlots) {
    intervals.push({
      inicio: blk.fecha_inicio,
      fin: blk.fecha_fin,
      kind: 'blocked',
    })
  }

  return intervals.sort(
    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
  )
}

export function getDemoSandboxAdminDataset(
  deltaOrRaw?: DemoSandboxDelta | string | null
): {
  settings: BusinessPublicSettings
  services: Service[]
  appointments: Appointment[]
  blockedSlots: BlockedSlot[]
  clients: Client[]
} {
  return getDemoSandboxDataset(deltaOrRaw)
}

export function addDemoSandboxBooking(
  body: {
    serviceId?: string
    nombre?: string
    email?: string
    telefono?: string
    notas?: string | null
    slotDatetime?: string
  },
  deltaOrRaw?: DemoSandboxDelta | string | null
): {
  delta: DemoSandboxDelta
  appointment: Appointment
  client: Client
  service: Service
  serializedCookie: string
} {
  const delta =
    typeof deltaOrRaw === 'string'
      ? parseDemoSandboxDelta(deltaOrRaw)
      : { ...(deltaOrRaw || {}) }

  const currentDataset = getDemoSandboxDataset(delta)
  const service =
    currentDataset.services.find((s) => s.id === body.serviceId) ||
    currentDataset.services[0]

  const slotDatetime = (body.slotDatetime || '').trim()
  const startDate = new Date(slotDatetime)
  const endDate = new Date(
    startDate.getTime() + service.duracion_minutos * 60_000
  )

  const nombre = (body.nombre || '').trim() || 'Cliente Demo'
  const email = (body.email || '').trim().toLowerCase() || 'demo@krono-demo.invalid'
  const telefono = (body.telefono || '').trim() || '+34 600 000 000'

  // Buscar cliente existente o crear uno nuevo
  let client = currentDataset.clients.find(
    (c) =>
      c.email.toLowerCase() === email.toLowerCase() ||
      c.telefono === telefono
  )

  if (client) {
    client = {
      ...client,
      nombre,
      telefono,
      email,
      total_citas: (client.total_citas || 0) + 1,
      ultima_visita: startDate.toISOString(),
    }
  } else {
    client = {
      id: crypto.randomUUID(),
      nombre,
      email,
      telefono,
      total_citas: 1,
      no_shows: 0,
      bloqueado_no_show: false,
      ultima_visita: startDate.toISOString(),
      created_at: new Date().toISOString(),
    }
  }

  const appointmentId = crypto.randomUUID()
  const appointment: Appointment = {
    id: appointmentId,
    client_id: client.id,
    service_id: service.id,
    fecha_hora_inicio: startDate.toISOString(),
    fecha_hora_fin: endDate.toISOString(),
    estado: 'confirmada',
    token_cancelacion: crypto.randomUUID(),
    notas: (body.notas || '').trim() || null,
    created_at: new Date().toISOString(),
    client,
    service,
  }

  const addedAppointments = [
    appointment,
    ...(delta.addedAppointments || []).filter((a) => a.id !== appointmentId),
  ]

  const addedClients = [
    client,
    ...(delta.addedClients || []).filter((c) => c.id !== client.id),
  ]

  delta.addedAppointments = addedAppointments
  delta.addedClients = addedClients

  return {
    delta,
    appointment,
    client,
    service,
    serializedCookie: serializeDemoSandboxDelta(delta),
  }
}

export function updateDemoSandboxAppointmentStatus(
  appointmentId: string,
  estado: 'confirmada' | 'cancelada' | 'completada' | 'no_show',
  deltaOrRaw?: DemoSandboxDelta | string | null
): { delta: DemoSandboxDelta; serializedCookie: string } {
  const delta =
    typeof deltaOrRaw === 'string'
      ? parseDemoSandboxDelta(deltaOrRaw)
      : { ...(deltaOrRaw || {}) }

  delta.updatedStatuses = {
    ...(delta.updatedStatuses || {}),
    [appointmentId]: estado,
  }

  return {
    delta,
    serializedCookie: serializeDemoSandboxDelta(delta),
  }
}

export function addDemoSandboxBlockedSlot(
  slot: { fechaInicio: string; fechaFin: string; motivo?: string },
  deltaOrRaw?: DemoSandboxDelta | string | null
): { delta: DemoSandboxDelta; blockedSlot: BlockedSlot; serializedCookie: string } {
  const delta =
    typeof deltaOrRaw === 'string'
      ? parseDemoSandboxDelta(deltaOrRaw)
      : { ...(deltaOrRaw || {}) }

  const blockedSlot: BlockedSlot = {
    id: crypto.randomUUID(),
    fecha_inicio: slot.fechaInicio || new Date().toISOString(),
    fecha_fin: slot.fechaFin || new Date().toISOString(),
    motivo: slot.motivo?.trim() || 'Bloqueo demo',
    created_at: new Date().toISOString(),
  }

  delta.addedBlockedSlots = [
    blockedSlot,
    ...(delta.addedBlockedSlots || []).filter((b) => b.id !== blockedSlot.id),
  ]

  return {
    delta,
    blockedSlot,
    serializedCookie: serializeDemoSandboxDelta(delta),
  }
}

export function deleteDemoSandboxBlockedSlot(
  id: string,
  deltaOrRaw?: DemoSandboxDelta | string | null
): { delta: DemoSandboxDelta; serializedCookie: string } {
  const delta =
    typeof deltaOrRaw === 'string'
      ? parseDemoSandboxDelta(deltaOrRaw)
      : { ...(deltaOrRaw || {}) }

  if (delta.addedBlockedSlots) {
    delta.addedBlockedSlots = delta.addedBlockedSlots.filter((b) => b.id !== id)
  }

  const deletedSet = new Set(delta.deletedBlockedSlotIds || [])
  deletedSet.add(id)
  delta.deletedBlockedSlotIds = Array.from(deletedSet)

  return {
    delta,
    serializedCookie: serializeDemoSandboxDelta(delta),
  }
}

export function toggleDemoSandboxClientBlacklist(
  clientId: string,
  currentlyBlocked: boolean,
  deltaOrRaw?: DemoSandboxDelta | string | null
): { delta: DemoSandboxDelta; newStatus: boolean; serializedCookie: string } {
  const delta =
    typeof deltaOrRaw === 'string'
      ? parseDemoSandboxDelta(deltaOrRaw)
      : { ...(deltaOrRaw || {}) }

  const newStatus = !currentlyBlocked
  delta.clientBlacklists = {
    ...(delta.clientBlacklists || {}),
    [clientId]: newStatus,
  }

  return {
    delta,
    newStatus,
    serializedCookie: serializeDemoSandboxDelta(delta),
  }
}

export function resetDemoSandboxState(): {
  delta: DemoSandboxDelta
  serializedCookie: string
} {
  const delta: DemoSandboxDelta = {}
  return {
    delta,
    serializedCookie: '',
  }
}
