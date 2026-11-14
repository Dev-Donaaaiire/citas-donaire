import type { Database } from './database.types'

export type Service = Database['public']['Tables']['services']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  clients?: Client | null
  services?: Service | null
}
export type BlockedSlot = Database['public']['Tables']['blocked_slots']['Row']
export type BusinessSettings = Database['public']['Tables']['business_settings']['Row']

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
  clientName: string
  clientEmail: string
  clientPhone?: string
  notes?: string
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
}
