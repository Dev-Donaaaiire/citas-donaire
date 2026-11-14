import { supabase } from '@/lib/supabase'
import type {
  Appointment,
  BlockedSlot,
  BusinessSettings,
  Client,
  Service,
} from '@/types/booking'

export interface InitialBookingData {
  services: Service[]
  settings: BusinessSettings | null
  appointments: Appointment[]
  blockedSlots: BlockedSlot[]
}

export interface AdminDashboardData {
  appointments: Appointment[]
  clients: Client[]
  blockedSlots: BlockedSlot[]
  settings: BusinessSettings | null
  metrics: {
    todayAppointmentsCount: number
    weeklyEstimatedRevenue: number
    totalClientsCount: number
    inactiveClientsCount: number // Clientes sin visita > 30 días
  }
}

/**
 * Carga los datos necesarios para la vista pública de reservas
 */
export async function getBookingInitialData(): Promise<InitialBookingData> {
  const [servicesRes, settingsRes, apptsRes, blocksRes] = await Promise.all([
    supabase
      .from('services')
      .select('*')
      .eq('activo', true)
      .order('precio', { ascending: true }),
    supabase.from('business_settings').select('*').limit(1).maybeSingle(),
    supabase
      .from('appointments')
      .select('id, client_id, service_id, fecha_hora_inicio, fecha_hora_fin, estado, token_cancelacion, created_at, updated_at')
      .neq('estado', 'cancelada'),
    supabase
      .from('blocked_slots')
      .select('*')
      .order('fecha_inicio', { ascending: true }),
  ])

  if (servicesRes.error) {
    console.error('Error fetching services:', servicesRes.error)
  }

  return {
    services: (servicesRes.data as Service[]) || [],
    settings: (settingsRes.data as BusinessSettings) || null,
    appointments: (apptsRes.data as Appointment[]) || [],
    blockedSlots: (blocksRes.data as BlockedSlot[]) || [],
  }
}

/**
 * Comprueba si un email está en la lista negra (bloqueado_no_show)
 */
export async function isEmailBlacklisted(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase()
  const { data } = await supabase
    .from('clients')
    .select('id, bloqueado_no_show')
    .ilike('email', cleanEmail)
    .maybeSingle()

  return Boolean(data?.bloqueado_no_show)
}

/**
 * Crea una nueva cita sin registro previo (nombre, email, teléfono)
 */
export async function createBookingAppointment({
  serviceId,
  slotDatetime,
  clientName,
  clientEmail,
  clientPhone,
  notes,
}: {
  serviceId: string
  slotDatetime: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  notes?: string
}) {
  const cleanEmail = clientEmail.trim().toLowerCase()
  const cleanName = clientName.trim()
  const cleanPhone = clientPhone?.trim() || null

  // 1. Obtener el servicio para conocer su duración
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single()

  if (serviceError || !service) {
    throw new Error('El servicio seleccionado no está disponible.')
  }

  // 2. Calcular fecha fin
  const startDate = new Date(slotDatetime)
  const endDate = new Date(startDate.getTime() + service.duracion_minutos * 60 * 1000)

  // 3. Verificar si el cliente está en lista negra
  const { data: existingClient } = await supabase
    .from('clients')
    .select('*')
    .ilike('email', cleanEmail)
    .maybeSingle()

  if (existingClient?.bloqueado_no_show) {
    throw new Error(
      'Este correo tiene restringidas las reservas automáticas por inasistencias previas sin aviso. Por favor contacta al salón.'
    )
  }

  // 4. Verificar colisión en tiempo real (anti doble reserva)
  const { data: overlappingAppts } = await supabase
    .from('appointments')
    .select('id')
    .neq('estado', 'cancelada')
    .lt('fecha_hora_inicio', endDate.toISOString())
    .gt('fecha_hora_fin', startDate.toISOString())

  if (overlappingAppts && overlappingAppts.length > 0) {
    throw new Error('Lo sentimos, este hueco acaba de ser reservado. Por favor selecciona otra hora.')
  }

  const { data: overlappingBlocks } = await supabase
    .from('blocked_slots')
    .select('id')
    .lt('fecha_inicio', endDate.toISOString())
    .gt('fecha_fin', startDate.toISOString())

  if (overlappingBlocks && overlappingBlocks.length > 0) {
    throw new Error('El horario seleccionado coincide con un descanso o bloqueo del salón.')
  }

  // 5. Crear o actualizar cliente
  let clientId: string

  if (existingClient) {
    clientId = existingClient.id
    // Actualizar teléfono y nombre si han cambiado
    await supabase
      .from('clients')
      .update({
        nombre: cleanName,
        telefono: cleanPhone || existingClient.telefono,
        notas: notes ? `${existingClient.notas ? existingClient.notas + ' | ' : ''}${notes}` : existingClient.notas,
        total_citas: (existingClient.total_citas || 0) + 1,
      })
      .eq('id', clientId)
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        nombre: cleanName,
        email: cleanEmail,
        telefono: cleanPhone,
        notas: notes || null,
        total_citas: 1,
        bloqueado_no_show: false,
      })
      .select('*')
      .single()

    if (clientError || !newClient) {
      throw new Error(`Error al registrar tus datos de cliente: ${clientError?.message || 'Desconocido'}`)
    }
    clientId = newClient.id
  }

  // 6. Crear la cita
  const { data: newAppointment, error: apptError } = await supabase
    .from('appointments')
    .insert({
      client_id: clientId,
      service_id: service.id,
      fecha_hora_inicio: startDate.toISOString(),
      fecha_hora_fin: endDate.toISOString(),
      estado: 'confirmada',
    })
    .select('*, services(*), clients(*)')
    .single()

  if (apptError || !newAppointment) {
    throw new Error(`No se pudo confirmar la cita: ${apptError?.message || 'Error desconocido'}`)
  }

  return {
    appointment: newAppointment as Appointment,
    service: service as Service,
    startDate,
    endDate,
  }
}

/**
 * Carga todos los datos para el panel de administración del dueño
 */
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [apptsRes, clientsRes, blocksRes, settingsRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('*, clients(*), services(*)')
      .order('fecha_hora_inicio', { ascending: false }),
    supabase
      .from('clients')
      .select('*')
      .order('ultima_visita', { ascending: false, nullsFirst: false }),
    supabase
      .from('blocked_slots')
      .select('*')
      .order('fecha_inicio', { ascending: true }),
    supabase.from('business_settings').select('*').limit(1).maybeSingle(),
  ])

  const appointments = (apptsRes.data as Appointment[]) || []
  const clients = (clientsRes.data as Client[]) || []
  const blockedSlots = (blocksRes.data as BlockedSlot[]) || []
  const settings = (settingsRes.data as BusinessSettings) || null

  // Calcular métricas
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  // Citas de hoy
  const todayAppointments = appointments.filter((appt) => {
    const d = new Date(appt.fecha_hora_inicio)
    return d >= todayStart && d <= todayEnd && appt.estado !== 'cancelada'
  })

  // Semana actual: lunes a domingo
  const currentDayOfWeek = now.getDay()
  const daysSinceMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday, 0, 0, 0)
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

  const weeklyAppointments = appointments.filter((appt) => {
    const d = new Date(appt.fecha_hora_inicio)
    return d >= weekStart && d < weekEnd && appt.estado !== 'cancelada'
  })

  const weeklyEstimatedRevenue = weeklyAppointments.reduce((acc, appt) => {
    return acc + Number(appt.services?.precio || 0)
  }, 0)

  // Clientes inactivos (> 30 días sin visita o sin visitas)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const inactiveClients = clients.filter((c) => {
    if (!c.ultima_visita) return true
    return new Date(c.ultima_visita) < thirtyDaysAgo
  })

  return {
    appointments,
    clients,
    blockedSlots,
    settings,
    metrics: {
      todayAppointmentsCount: todayAppointments.length,
      weeklyEstimatedRevenue,
      totalClientsCount: clients.length,
      inactiveClientsCount: inactiveClients.length,
    },
  }
}

/**
 * Actualiza el estado de una cita (completada, cancelada, confirmada)
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: 'confirmada' | 'cancelada' | 'completada'
) {
  // 1. Obtener la cita actual para saber el cliente
  const { data: currentAppt, error: fetchErr } = await supabase
    .from('appointments')
    .select('id, client_id, fecha_hora_fin')
    .eq('id', appointmentId)
    .single()

  if (fetchErr || !currentAppt) {
    throw new Error('Cita no encontrada.')
  }

  // 2. Actualizar estado
  const { error: updateErr } = await supabase
    .from('appointments')
    .update({ estado: newStatus })
    .eq('id', appointmentId)

  if (updateErr) {
    throw new Error(`Error al actualizar la cita: ${updateErr.message}`)
  }

  // 3. Si se marca como completada, actualizar la última visita del cliente
  if (newStatus === 'completada' && currentAppt.client_id) {
    await supabase
      .from('clients')
      .update({ ultima_visita: currentAppt.fecha_hora_fin || new Date().toISOString() })
      .eq('id', currentAppt.client_id)
  }

  return { success: true }
}

/**
 * Alterna el estado de lista negra (bloqueado_no_show) para un cliente
 */
export async function toggleClientBlacklist(clientId: string, currentlyBlocked: boolean) {
  const { error } = await supabase
    .from('clients')
    .update({ bloqueado_no_show: !currentlyBlocked })
    .eq('id', clientId)

  if (error) {
    throw new Error(`Error al actualizar estado del cliente: ${error.message}`)
  }

  return { success: true, newStatus: !currentlyBlocked }
}

/**
 * Crea un bloqueo de horario o día
 */
export async function createBlockedSlot({
  fechaInicio,
  fechaFin,
  motivo,
}: {
  fechaInicio: string
  fechaFin: string
  motivo?: string
}) {
  const { data, error } = await supabase
    .from('blocked_slots')
    .insert({
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      motivo: motivo || 'Bloqueo manual por el dueño',
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Error al crear bloqueo: ${error.message}`)
  }

  return data as BlockedSlot
}

/**
 * Elimina un bloqueo existente
 */
export async function deleteBlockedSlot(id: string) {
  const { error } = await supabase.from('blocked_slots').delete().eq('id', id)
  if (error) {
    throw new Error(`Error al desbloquear: ${error.message}`)
  }
  return { success: true }
}

/**
 * Llama a la función RPC reset_demo_data
 */
export async function triggerResetDemoData() {
  const { data, error } = await supabase.rpc('reset_demo_data', { force: true })
  if (error) {
    throw new Error(error.message)
  }
  return data
}
