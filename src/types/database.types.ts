export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          client_id: string
          created_at: string
          estado: 'confirmada' | 'cancelada' | 'completada'
          fecha_hora_fin: string
          fecha_hora_inicio: string
          id: string
          service_id: string
          token_cancelacion: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          estado?: 'confirmada' | 'cancelada' | 'completada'
          fecha_hora_fin: string
          fecha_hora_inicio: string
          id?: string
          service_id: string
          token_cancelacion?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          estado?: 'confirmada' | 'cancelada' | 'completada'
          fecha_hora_fin?: string
          fecha_hora_inicio?: string
          id?: string
          service_id?: string
          token_cancelacion?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_slots: {
        Row: {
          created_at: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          motivo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          motivo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          motivo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          created_at: string
          dias_laborables: Json
          duracion_cita_minutos: number
          email_notificaciones: string | null
          horario_apertura: string
          horario_cierre: string
          id: string
          logo_url: string | null
          modo_demo: boolean
          nombre_negocio: string
          tema_activo: 'dark_luxury' | 'clean_minimal' | 'neon_creator'
          ultima_restauracion_demo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dias_laborables?: Json
          duracion_cita_minutos?: number
          email_notificaciones?: string | null
          horario_apertura?: string
          horario_cierre?: string
          id?: string
          logo_url?: string | null
          modo_demo?: boolean
          nombre_negocio?: string
          tema_activo?: 'dark_luxury' | 'clean_minimal' | 'neon_creator'
          ultima_restauracion_demo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dias_laborables?: Json
          duracion_cita_minutos?: number
          email_notificaciones?: string | null
          horario_apertura?: string
          horario_cierre?: string
          id?: string
          logo_url?: string | null
          modo_demo?: boolean
          nombre_negocio?: string
          tema_activo?: 'dark_luxury' | 'clean_minimal' | 'neon_creator'
          ultima_restauracion_demo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          bloqueado_no_show: boolean
          created_at: string
          email: string
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
          total_citas: number
          ultima_visita: string | null
          updated_at: string
        }
        Insert: {
          bloqueado_no_show?: boolean
          created_at?: string
          email: string
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
          total_citas?: number
          ultima_visita?: string | null
          updated_at?: string
        }
        Update: {
          bloqueado_no_show?: boolean
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
          total_citas?: number
          ultima_visita?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      licenses: {
        Row: {
          activa: boolean
          comprador_email: string
          created_at: string
          dominio_autorizado: string | null
          fecha_creacion: string
          id: string
          license_key: string
          plan: 'autoinstalable_15' | 'llave_en_mano_99'
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          activa?: boolean
          comprador_email: string
          created_at?: string
          dominio_autorizado?: string | null
          fecha_creacion?: string
          id?: string
          license_key: string
          plan: 'autoinstalable_15' | 'llave_en_mano_99'
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          activa?: boolean
          comprador_email?: string
          created_at?: string
          dominio_autorizado?: string | null
          fecha_creacion?: string
          id?: string
          license_key?: string
          plan?: 'autoinstalable_15' | 'llave_en_mano_99'
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          duracion_minutos: number
          id: string
          nombre: string
          precio: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          duracion_minutos?: number
          id?: string
          nombre: string
          precio?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          duracion_minutos?: number
          id?: string
          nombre?: string
          precio?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reset_demo_data: { Args: { force?: boolean }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
