import type {
  BlockedSlot,
  BookingSubmission,
  CancelAppointmentDetails,
} from '@/types/booking'
import type { PublicBookingInitialData } from '@/lib/data/public-booking'
import type { AdminDashboardPayload } from '@/lib/data/admin-dashboard'
import type { CreateServerBookingResult } from '@/lib/booking-server'

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string
  }
  if (!response.ok) {
    throw new Error(data.error || `Error de servidor (${response.status}).`)
  }
  return data
}

export async function fetchPublicAvailabilityData(
  isDemo = false
): Promise<PublicBookingInitialData> {
  const url = isDemo
    ? '/api/bookings/availability?demo=1'
    : '/api/bookings/availability'
  const res = await fetch(url, { cache: 'no-store' })
  return parseJsonOrThrow<PublicBookingInitialData>(res)
}

export async function submitPublicBooking(
  submission: BookingSubmission & {
    rescheduleToken?: string | null
    isDemo?: boolean
  }
): Promise<CreateServerBookingResult & { sandbox?: boolean }> {
  const endpoint = submission.isDemo ? '/api/demo/bookings' : '/api/bookings'
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: submission.serviceId,
      nombre: submission.nombre,
      email: submission.email,
      telefono: submission.telefono,
      notas: submission.notas,
      website: submission.website || '',
      slotDatetime: submission.slotDatetime,
      rescheduleToken: submission.rescheduleToken || null,
    }),
  })
  return parseJsonOrThrow<CreateServerBookingResult & { sandbox?: boolean }>(res)
}

export async function fetchCancelAppointmentDetails(
  token: string
): Promise<CancelAppointmentDetails> {
  const res = await fetch(
    `/api/bookings/cancel?token=${encodeURIComponent(token)}`,
    { cache: 'no-store' }
  )
  const data = await parseJsonOrThrow<{ appointment: CancelAppointmentDetails }>(
    res
  )
  return data.appointment
}

export async function confirmCancelAppointment(token: string): Promise<{
  cancelled: boolean
  alreadyCancelled?: boolean
  estado?: string
  sandbox?: boolean
}> {
  const res = await fetch('/api/bookings/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  return parseJsonOrThrow(res)
}

export async function fetchAdminDashboardClient(params: {
  isDemo?: boolean
  fromIso?: string
  toIso?: string
  clientPage?: number
  clientPageSize?: number
  clientFilter?: 'all' | 'risk' | 'blocked'
  clientSearch?: string
}): Promise<AdminDashboardPayload> {
  const sp = new URLSearchParams()
  if (params.fromIso) sp.set('from', params.fromIso)
  if (params.toIso) sp.set('to', params.toIso)
  if (params.clientPage) sp.set('clientPage', String(params.clientPage))
  if (params.clientPageSize) sp.set('clientPageSize', String(params.clientPageSize))
  if (params.clientFilter) sp.set('clientFilter', params.clientFilter)
  if (params.clientSearch) sp.set('clientSearch', params.clientSearch)

  const base = params.isDemo ? '/api/demo/dashboard' : '/api/admin/dashboard'
  const res = await fetch(`${base}?${sp.toString()}`, { cache: 'no-store' })
  return parseJsonOrThrow<AdminDashboardPayload>(res)
}

export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: 'confirmada' | 'cancelada' | 'completada' | 'no_show',
  isDemo = false
): Promise<{ success: boolean; sandbox?: boolean }> {
  const endpoint = isDemo ? '/api/demo/appointments' : '/api/admin/appointments'
  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointmentId, estado: newStatus }),
  })
  return parseJsonOrThrow(res)
}

export async function toggleClientBlacklist(
  clientId: string,
  currentlyBlocked: boolean,
  isDemo = false
): Promise<{ success: boolean; newStatus: boolean; sandbox?: boolean }> {
  const endpoint = isDemo ? '/api/demo/clients' : '/api/admin/clients'
  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, currentlyBlocked }),
  })
  return parseJsonOrThrow(res)
}

export async function createBlockedSlot({
  fechaInicio,
  fechaFin,
  motivo,
  isDemo = false,
}: {
  fechaInicio: string
  fechaFin: string
  motivo?: string
  isDemo?: boolean
}): Promise<{ blockedSlot: BlockedSlot; sandbox?: boolean }> {
  const endpoint = isDemo ? '/api/demo/blocked-slots' : '/api/admin/blocked-slots'
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fechaInicio, fechaFin, motivo }),
  })
  return parseJsonOrThrow(res)
}

export async function deleteBlockedSlot(
  id: string,
  isDemo = false
): Promise<{ success: boolean; sandbox?: boolean }> {
  const base = isDemo ? '/api/demo/blocked-slots' : '/api/admin/blocked-slots'
  const res = await fetch(`${base}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  return parseJsonOrThrow(res)
}

export async function sendRetentionReminder(
  clientId: string,
  isDemo = false
): Promise<{ success: boolean; simulated?: boolean; sandbox?: boolean }> {
  const endpoint = isDemo
    ? '/api/demo/reminder'
    : '/api/notifications/reminder'
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId }),
  })
  return parseJsonOrThrow(res)
}

export async function triggerDemoReset(isDemo = false): Promise<{
  success: boolean
  sandbox?: boolean
}> {
  const endpoint = isDemo ? '/api/demo/reset' : '/api/admin/demo-reset'
  const res = await fetch(endpoint, { method: 'POST' })
  return parseJsonOrThrow(res)
}
