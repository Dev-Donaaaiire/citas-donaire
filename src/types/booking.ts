import type { Database } from './database.types'
import type { FormCustomizationSettings } from '@/lib/form-field-rules'

export type { FormCustomizationSettings, FormFieldSetting } from '@/lib/form-field-rules'

export type Service = Database['public']['Tables']['services']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  client?: Client | null
  service?: Service | null
}
export type BlockedSlot = Database['public']['Tables']['blocked_slots']['Row']
export type BusinessSettings = Omit<
  Database['public']['Tables']['business_settings']['Row'],
  'campos_formulario'
> & {
  campos_formulario?: FormCustomizationSettings | null
}

export interface TimeSlot {
  time: string // "09:00", "09:30"
  datetime: string // ISO string of start
  endDatetime: string // ISO string of end
  isAvailable: boolean
  reason?: 'past' | 'booked' | 'blocked' | 'closed'
}

export interface DayAvailability {
  dateString: string // YYYY-MM-DD
  date: Date
  isPast: boolean
  isClosedDay: boolean
  isFullyBooked: boolean
  availableSlotsCount: number
}

export interface BookingSubmission {
  serviceId: string
  slotDatetime: string
  nombre: string
  email: string
  telefono: string
  notas?: string
  /** Honeypot anti-bots (siempre vacío en usuarios reales). */
  website?: string
}

export interface BookingConfirmationDetails {
  appointmentId: string
  tokenCancelacion: string
  service: Service
  clientName: string
  clientEmail: string
  clientPhone?: string
  fechaHoraInicio: string
  fechaHoraFin: string
  businessName: string
  businessAddress?: string | null
  businessPhone?: string | null
  businessTimezone?: string | null
  rescheduled?: boolean
}

export interface PublicBusyInterval {
  inicio: string
  fin: string
  kind: 'appointment' | 'blocked'
}

export type BusinessPublicSettings = Omit<
  BusinessSettings,
  'email_notificaciones' | 'created_at' | 'updated_at' | 'ultima_restauracion_demo'
>

export interface CancelAppointmentDetails {
  id: string
  estado: 'confirmada' | 'cancelada' | 'completada' | 'no_show'
  fecha_hora_inicio: string
  fecha_hora_fin: string
  service_id: string
  service_nombre: string
  service_precio: number
  service_duracion_minutos: number
  client_nombre: string
  business_name: string
  direccion: string | null
  telefono_contacto: string | null
  timezone: string
}
