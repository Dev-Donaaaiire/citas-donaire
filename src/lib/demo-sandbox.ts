import type {
  Appointment,
  BlockedSlot,
  BusinessPublicSettings,
  Client,
  PublicBusyInterval,
  Service,
} from '@/types/booking'
import { addDaysToIsoDate, getTodayIsoInTimeZone, zonedDateTimeToUtc } from '@/lib/timezone'

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

export function getDemoSandboxBusyIntervals(): PublicBusyInterval[] {
  const tz = DEMO_SANDBOX_SETTINGS.timezone
  const todayIso = getTodayIsoInTimeZone(tz)
  const tomorrowIso = addDaysToIsoDate(todayIso, 1)
  const plusTwoIso = addDaysToIsoDate(todayIso, 2)

  return [
    {
      inicio: zonedDateTimeToUtc(tomorrowIso, '11:00', tz).toISOString(),
      fin: zonedDateTimeToUtc(tomorrowIso, '11:30', tz).toISOString(),
      kind: 'appointment',
    },
    {
      inicio: zonedDateTimeToUtc(tomorrowIso, '17:00', tz).toISOString(),
      fin: zonedDateTimeToUtc(tomorrowIso, '18:00', tz).toISOString(),
      kind: 'appointment',
    },
    {
      inicio: zonedDateTimeToUtc(plusTwoIso, '13:30', tz).toISOString(),
      fin: zonedDateTimeToUtc(plusTwoIso, '15:00', tz).toISOString(),
      kind: 'blocked',
    },
  ]
}

export function getDemoSandboxAdminDataset(): {
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
