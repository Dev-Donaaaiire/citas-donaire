import 'server-only'
import crypto from 'node:crypto'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { checkProductionLicenseGate } from '@/lib/license'
import { sendBookingConfirmationEmails } from '@/lib/email-service'
import { normalizeFormFields } from '@/lib/form-field-rules'
import {
  getZonedDateParts,
  getZonedDayOfWeek,
  normalizeWorkingDays,
  sanitizeTimeZone,
} from '@/lib/timezone'
import {
  MAX_BOOKING_DAYS_AHEAD,
  calculateAvailableSlots,
  timeStringToMinutes,
} from '@/lib/calendar'
import type {
  Appointment,
  BusinessPublicSettings,
  Client,
  Service,
} from '@/types/booking'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/



export class BookingApiError extends Error {
  status: number
  code: string

  constructor(message: string, status = 400, code = 'BAD_REQUEST') {
    super(message)
    this.status = status
    this.code = code
  }
}

export interface CreateServerBookingInput {
  serviceId: string
  nombre: string
  email: string
  telefono: string
  notas?: string | null
  slotDatetime: string
  rescheduleToken?: string | null
  baseUrl: string
  isDemoRequest?: boolean
}

export type BookingEmailJob = Parameters<
  typeof sendBookingConfirmationEmails
>[0]

export interface CreateServerBookingResult {
  appointment: Appointment
  service: Service
  client: Pick<Client, 'id' | 'nombre'>
  businessSettings: BusinessPublicSettings
  rescheduled: boolean
  emailResult: {
    success: boolean
    simulated: boolean
    status: 'queued' | 'sent' | 'simulated'
    reason?: string
  }
}

export interface CreateServerBookingOutcome {
  result: CreateServerBookingResult
  emailJob: BookingEmailJob | null
}

export async function createServerBooking(
  input: CreateServerBookingInput
): Promise<CreateServerBookingOutcome> {
  const serviceId = input.serviceId?.trim() || ''
  const rescheduleToken = input.rescheduleToken?.trim() || null

  if (!UUID_REGEX.test(serviceId)) {
    throw new BookingApiError(
      'El servicio seleccionado no es válido.',
      400,
      'INVALID_SERVICE'
    )
  }

  if (rescheduleToken && !UUID_REGEX.test(rescheduleToken)) {
    throw new BookingApiError(
      'El token de reprogramación no tiene un formato válido.',
      400,
      'INVALID_RESCHEDULE_TOKEN'
    )
  }

  const startDate = new Date(input.slotDatetime)
  if (Number.isNaN(startDate.getTime())) {
    throw new BookingApiError(
      'La fecha u hora seleccionada no es válida.',
      400,
      'INVALID_DATETIME'
    )
  }

  if (startDate.getTime() <= Date.now() + 5 * 60_000) {
    throw new BookingApiError(
      'No se pueden confirmar reservas para horarios pasados o inmediatos.',
      400,
      'PAST_SLOT'
    )
  }

  if (startDate.getTime() > Date.now() + MAX_BOOKING_DAYS_AHEAD * 86_400_000) {
    throw new BookingApiError(
      `Solo se admiten reservas con un máximo de ${MAX_BOOKING_DAYS_AHEAD} días de antelación.`,
      400,
      'TOO_FAR_AHEAD'
    )
  }

  const db = getSupabaseAdmin()

  // 1. Leer business_settings desde BD (jamás desde el body del cliente)
  const { data: settingsRow, error: settingsError } = await db
    .from('business_settings')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (settingsError || !settingsRow) {
    throw new BookingApiError(
      'El negocio aún no ha completado la configuración inicial de agenda.',
      503,
      'BUSINESS_NOT_CONFIGURED'
    )
  }

  // 2. Personalización de campos del formulario
  const formRules = normalizeFormFields(settingsRow.campos_formulario)

  let effectiveNombre = input.nombre?.trim() || ''
  const rawEmail = input.email?.trim().toLowerCase() || ''
  const rawPhone = input.telefono?.trim() || ''
  const effectiveNotas = formRules.notas.activo
    ? input.notas?.trim().slice(0, 500) || null
    : null

  // Validación de nombre
  if (formRules.nombre.requerido) {
    if (effectiveNombre.length < 2 || effectiveNombre.length > 120) {
      throw new BookingApiError(
        'Introduce tu nombre completo (mínimo 2 caracteres).',
        400,
        'INVALID_NAME'
      )
    }
  } else {
    if (!effectiveNombre) effectiveNombre = 'Cliente'
  }

  // Validación de correo electrónico
  let effectiveEmail: string | null = null
  if (formRules.email.activo && formRules.email.requerido) {
    if (!EMAIL_REGEX.test(rawEmail) || rawEmail.length > 180) {
      throw new BookingApiError(
        'Introduce un correo electrónico válido para enviarte la confirmación.',
        400,
        'INVALID_EMAIL'
      )
    }
    effectiveEmail = rawEmail
  } else if (rawEmail) {
    if (!EMAIL_REGEX.test(rawEmail) || rawEmail.length > 180) {
      throw new BookingApiError(
        'El correo introducido no tiene un formato válido.',
        400,
        'INVALID_EMAIL'
      )
    }
    effectiveEmail = rawEmail
  }

  // Validación de teléfono
  let effectivePhone: string | null = null
  if (formRules.telefono.activo && formRules.telefono.requerido) {
    if (rawPhone.length < 6 || rawPhone.length > 40) {
      throw new BookingApiError(
        'Introduce un número de teléfono de contacto válido.',
        400,
        'INVALID_PHONE'
      )
    }
    effectivePhone = rawPhone
  } else if (rawPhone) {
    if (rawPhone.length < 6 || rawPhone.length > 40) {
      throw new BookingApiError(
        'El teléfono introducido no es válido.',
        400,
        'INVALID_PHONE'
      )
    }
    effectivePhone = rawPhone
  }

  // Verificar licencia del sistema: previene bypass con modo_demo en producción en dominios reales
  const isRealBookingInProduction = !input.isDemoRequest
  const licenseGate = await checkProductionLicenseGate(
    Boolean(settingsRow.modo_demo),
    { isRealBookingInProduction }
  )
  if (licenseGate.blocked) {
    throw new BookingApiError(
      'Las reservas online están pausadas temporalmente por estado de licencia.',
      403,
      'LICENSE_REQUIRED'
    )
  }

  // 2. Validar servicio existente y activo
  const { data: serviceRow, error: serviceError } = await db
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .eq('activo', true)
    .maybeSingle()

  if (serviceError || !serviceRow) {
    throw new BookingApiError(
      'El servicio seleccionado no existe o ya no está disponible.',
      400,
      'SERVICE_UNAVAILABLE'
    )
  }

  const endDate = new Date(
    startDate.getTime() + serviceRow.duracion_minutos * 60_000
  )
  const startIso = startDate.toISOString()
  const endIso = endDate.toISOString()

  // 3. Validar horario laboral en la zona horaria del negocio
  const tz = sanitizeTimeZone(settingsRow.timezone)
  const zonedStart = getZonedDateParts(startDate, tz)
  const zonedEnd = getZonedDateParts(endDate, tz)
  const laborables = normalizeWorkingDays(settingsRow.dias_laborables)

  if (!laborables.includes(getZonedDayOfWeek(zonedStart.isoDate))) {
    throw new BookingApiError(
      'El día seleccionado no es laborable para este negocio.',
      400,
      'CLOSED_DAY'
    )
  }

  const startMinutes = zonedStart.hour * 60 + zonedStart.minute
  const endMinutes =
    zonedEnd.isoDate === zonedStart.isoDate
      ? zonedEnd.hour * 60 + zonedEnd.minute
      : 24 * 60 + zonedEnd.hour * 60 + zonedEnd.minute
  const openMin = timeStringToMinutes(settingsRow.horario_apertura || '09:00')
  const closeMin = timeStringToMinutes(settingsRow.horario_cierre || '20:00')

  if (startMinutes < openMin || endMinutes > closeMin) {
    throw new BookingApiError(
      'El horario seleccionado está fuera del horario de apertura del negocio.',
      400,
      'OUTSIDE_HOURS'
    )
  }

  // La hora debe ser uno de los huecos que ofrece el calendario público
  const isOfferedSlot = calculateAvailableSlots({
    date: zonedStart.isoDate,
    serviceDurationMinutes: serviceRow.duracion_minutos,
    settings: settingsRow,
  }).some((slot) => slot.datetime === startIso)

  if (!isOfferedSlot) {
    throw new BookingApiError(
      'La hora seleccionada no es un hueco disponible. Actualiza la página y elige otra.',
      400,
      'INVALID_SLOT'
    )
  }

  // 4. Comprobar bloqueos de agenda
  const { data: overlappingBlocks, error: blocksError } = await db
    .from('blocked_slots')
    .select('id')
    .gt('fecha_fin', startIso)
    .lt('fecha_inicio', endIso)
    .limit(1)

  if (blocksError) {
    throw new BookingApiError(
      'No se pudo validar la disponibilidad del calendario.',
      500,
      'AVAILABILITY_CHECK_FAILED'
    )
  }

  if (overlappingBlocks && overlappingBlocks.length > 0) {
    throw new BookingApiError(
      'Ese tramo horario está bloqueado por el negocio. Elige otro horario.',
      409,
      'SLOT_BLOCKED'
    )
  }

  // 5. Validar rescheduleToken si viene en la petición
  let rescheduleApt: {
    id: string
    estado: string
    fecha_hora_inicio: string
    fecha_hora_fin: string
  } | null = null

  if (rescheduleToken) {
    const { data: oldApt, error: oldErr } = await db
      .from('appointments')
      .select('id, estado, fecha_hora_inicio, fecha_hora_fin')
      .eq('token_cancelacion', rescheduleToken)
      .maybeSingle()

    if (oldErr || !oldApt) {
      throw new BookingApiError(
        'La cita original que intentas cambiar no existe.',
        404,
        'RESCHEDULE_NOT_FOUND'
      )
    }

    if (oldApt.estado !== 'confirmada') {
      throw new BookingApiError(
        `No se puede cambiar una cita en estado "${oldApt.estado}".`,
        409,
        'RESCHEDULE_INVALID_STATE'
      )
    }

    rescheduleApt = oldApt
  }

  // 6. Verificación de bloqueo previo y mutación segura del cliente (sin mutar si bloqueado)
  let clientRow: Client

  if (effectiveEmail) {
    const { data: existingClient, error: selectClientErr } = await db
      .from('clients')
      .select('*')
      .eq('email', effectiveEmail)
      .maybeSingle()

    if (selectClientErr) {
      throw new BookingApiError(
        'No se pudo verificar el historial del cliente para la reserva.',
        500,
        'CLIENT_VERIFICATION_FAILED'
      )
    }

    if (existingClient?.bloqueado_no_show) {
      const contactPhone = settingsRow.telefono_contacto?.trim()
      const contactDetail = contactPhone
        ? ` Contacta directamente al ${contactPhone} para validar tu reserva.`
        : ' Ponte en contacto directamente con el establecimiento para validar tu reserva.'

      throw new BookingApiError(
        `No se pudo completar la reserva online para este correo por inasistencias previas sin aviso.${contactDetail}`,
        403,
        'CLIENT_BLOCKED'
      )
    }

    if (existingClient) {
      // Una reserva pública no sobrescribe datos existentes: solo rellena vacíos
      const missingData: { nombre?: string; telefono?: string } = {}
      const storedName = existingClient.nombre?.trim()
      if (
        (!storedName || storedName === 'Cliente') &&
        effectiveNombre !== storedName
      ) {
        missingData.nombre = effectiveNombre
      }
      if (!existingClient.telefono?.trim() && effectivePhone) {
        missingData.telefono = effectivePhone
      }

      const { data: updatedClient, error: updateClientErr } =
        Object.keys(missingData).length === 0
          ? { data: existingClient, error: null }
          : await db
              .from('clients')
              .update(missingData)
              .eq('id', existingClient.id)
              .select('*')
              .single()

      if (updateClientErr || !updatedClient) {
        throw new BookingApiError(
          'No se pudo actualizar los datos del cliente para confirmar la cita.',
          500,
          'CLIENT_UPDATE_FAILED'
        )
      }
      clientRow = updatedClient
    } else {
      const { data: insertedClient, error: insertClientErr } = await db
        .from('clients')
        .insert({
          nombre: effectiveNombre,
          email: effectiveEmail,
          telefono: effectivePhone,
        })
        .select('*')
        .single()

      if (insertClientErr || !insertedClient) {
        throw new BookingApiError(
          'No se pudo registrar al cliente para confirmar la cita.',
          500,
          'CLIENT_INSERT_FAILED'
        )
      }
      clientRow = insertedClient
    }
  } else {
    // Cliente sin correo electrónico: guardamos identificador seguro que no colisiona
    const dummyEmail = `no-email-${crypto.randomUUID().slice(0, 8)}@citas.local`
    const { data: insertedClient, error: insertClientErr } = await db
      .from('clients')
      .insert({
        nombre: effectiveNombre,
        email: dummyEmail,
        telefono: effectivePhone,
      })
      .select('*')
      .single()

    if (insertClientErr || !insertedClient) {
      throw new BookingApiError(
        'No se pudo registrar al cliente para confirmar la cita.',
        500,
        'CLIENT_INSERT_FAILED'
      )
    }
    clientRow = insertedClient
  }

  // 7. Insertar cita de forma atómica protegida por restricción GiST 23P01
  const overlapsReschedule =
    rescheduleApt !== null &&
    new Date(rescheduleApt.fecha_hora_inicio) < endDate &&
    new Date(rescheduleApt.fecha_hora_fin) > startDate

  let preCancelledForOverlap = false
  if (rescheduleApt && overlapsReschedule) {
    const { data: released, error: tempCancelErr } = await db
      .from('appointments')
      .update({ estado: 'cancelada' })
      .eq('id', rescheduleApt.id)
      .eq('estado', 'confirmada')
      .select('id')

    // Sin filas afectadas: otra petición simultánea ya usó este token
    if (tempCancelErr || !released?.length) {
      throw new BookingApiError(
        'No se pudo liberar temporalmente el hueco original para reprogramar.',
        409,
        'RESCHEDULE_LOCK_FAILED'
      )
    }
    preCancelledForOverlap = true
  }

  const { data: insertedAppointment, error: insertAptErr } = await db
    .from('appointments')
    .insert({
      client_id: clientRow.id,
      service_id: serviceRow.id,
      fecha_hora_inicio: startIso,
      fecha_hora_fin: endIso,
      estado: 'confirmada',
      notas: effectiveNotas,
    })
    .select('*')
    .single()

  if (insertAptErr || !insertedAppointment) {
    // Si falló la nueva inserción y habíamos cancelado temporalmente por solape propio, restaurar
    if (preCancelledForOverlap && rescheduleApt) {
      await db
        .from('appointments')
        .update({ estado: 'confirmada' })
        .eq('id', rescheduleApt.id)
        .eq('estado', 'cancelada')
    }

    if (
      insertAptErr?.code === '23P01' ||
      /appointments_no_overlap|exclusion/i.test(insertAptErr?.message || '')
    ) {
      throw new BookingApiError(
        'Ese horario acaba de ser reservado hace unos segundos por otro cliente. Selecciona otra hora libre.',
        409,
        'SLOT_CONFLICT'
      )
    }

    throw new BookingApiError(
      'No se pudo registrar la cita en base de datos.',
      500,
      'APPOINTMENT_INSERT_FAILED'
    )
  }

  // Si es reprogramación sin solape previo, cancelar la cita antigua SOLO tras confirmar la nueva
  if (rescheduleApt && !preCancelledForOverlap) {
    const { data: replaced, error: cancelOldErr } = await db
      .from('appointments')
      .update({ estado: 'cancelada' })
      .eq('id', rescheduleApt.id)
      .eq('estado', 'confirmada')
      .select('id')

    // Solo una reprogramación simultánea puede anular la cita antigua;
    // la que pierde deshace su cita nueva para no duplicar.
    if (cancelOldErr || !replaced?.length) {
      const { error: rollbackErr } = await db
        .from('appointments')
        .delete()
        .eq('id', insertedAppointment.id)

      if (cancelOldErr || rollbackErr) {
        console.error(
          '[createServerBooking] Error en reprogramación:',
          cancelOldErr || rollbackErr
        )
      }

      throw new BookingApiError(
        'No se pudo cambiar la cita: puede que ya se haya modificado. Revisa tu correo.',
        409,
        'RESCHEDULE_CONFLICT'
      )
    }
  }

  // 8. Contador de citas atómico (solo cita nueva; una reprogramación no suma).
  //    `ultima_visita` NO se toca aquí: se fija cuando el dueño marca la cita como completada.
  if (!rescheduleApt) {
    const { error: statsUpdateErr } = await db.rpc(
      'increment_client_appointments',
      { p_client_id: clientRow.id, p_delta: 1 }
    )

    if (statsUpdateErr) {
      console.error(
        '[createServerBooking] Error incrementando total_citas tras crear cita:',
        statsUpdateErr
      )
    }
  }

  // 9. Preparar el envío de emails de confirmación
  const isSimulated = Boolean(input.isDemoRequest)
  const emailJob: BookingEmailJob = {
    appointmentId: insertedAppointment.id,
    tokenCancelacion: insertedAppointment.token_cancelacion,
    businessName: settingsRow.nombre_negocio,
    businessAddress: settingsRow.direccion,
    businessPhone: settingsRow.telefono_contacto,
    businessTimezone: tz,
    serviceName: serviceRow.nombre,
    servicePrice: Number(serviceRow.precio),
    durationMinutes: serviceRow.duracion_minutos,
    clientName: effectiveNombre,
    clientEmail: effectiveEmail || '',
    clientPhone: effectivePhone,
    notes: effectiveNotas,
    startIso,
    endIso,
    ownerEmail: settingsRow.email_notificaciones,
    baseUrl: input.baseUrl,
  }

  const emailResult: CreateServerBookingResult['emailResult'] = {
    success: true,
    simulated: isSimulated,
    status: isSimulated ? 'simulated' : 'queued',
  }

  const businessSettings: BusinessPublicSettings = {
    id: settingsRow.id,
    nombre_negocio: settingsRow.nombre_negocio,
    logo_url: settingsRow.logo_url,
    horario_apertura: settingsRow.horario_apertura,
    horario_cierre: settingsRow.horario_cierre,
    dias_laborables: settingsRow.dias_laborables,
    duracion_cita_minutos: settingsRow.duracion_cita_minutos,
    tema_activo: settingsRow.tema_activo,
    modo_demo: settingsRow.modo_demo,
    direccion: settingsRow.direccion,
    telefono_contacto: settingsRow.telefono_contacto,
    timezone: tz,
    campos_formulario: formRules,
  }

  return {
    result: {
      appointment: {
        ...insertedAppointment,
        service: serviceRow,
      },
      service: serviceRow,
      client: {
        id: clientRow.id,
        nombre: effectiveNombre,
      },
      businessSettings,
      rescheduled: Boolean(rescheduleApt),
      emailResult,
    },
    emailJob: isSimulated ? null : emailJob,
  }
}

/**
 * Envía los emails de confirmación. Pensado para ejecutarse dentro de `after()`
 * tras responder al cliente; nunca lanza excepciones.
 */
export async function dispatchBookingEmailJob(
  job: BookingEmailJob
): Promise<void> {
  try {
    const sent = await sendBookingConfirmationEmails(job)
    if (!sent.success) {
      console.error(
        '[dispatchBookingEmailJob] Email de confirmación no entregado:',
        sent.reason
      )
    }
  } catch (emailErr) {
    console.error(
      '[dispatchBookingEmailJob] Error no bloqueante al enviar emails:',
      emailErr
    )
  }
}
