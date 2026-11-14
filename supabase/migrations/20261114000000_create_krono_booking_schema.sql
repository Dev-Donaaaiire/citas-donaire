-- ==========================================================
-- MIGRACIÓN 1: Estructura de Tablas, Restricciones e Índices
-- Sistema: Krono / Donaire Citas
-- ==========================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. TABLA: business_settings
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_negocio TEXT NOT NULL DEFAULT 'Krono / Donaire Citas',
    logo_url TEXT,
    tema_activo TEXT NOT NULL DEFAULT 'dark_luxury' CHECK (tema_activo IN ('dark_luxury', 'clean_minimal', 'neon_creator')),
    horario_apertura TIME NOT NULL DEFAULT '09:00:00',
    horario_cierre TIME NOT NULL DEFAULT '20:00:00',
    dias_laborables JSONB NOT NULL DEFAULT '["lunes", "martes", "miercoles", "jueves", "viernes"]'::jsonb,
    duracion_cita_minutos INTEGER NOT NULL DEFAULT 45 CHECK (duracion_cita_minutos > 0),
    email_notificaciones TEXT,
    modo_demo BOOLEAN NOT NULL DEFAULT true,
    ultima_restauracion_demo TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA: services
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (precio >= 0),
    duracion_minutos INTEGER NOT NULL DEFAULT 30 CHECK (duracion_minutos > 0),
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA: clients
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT,
    ultima_visita TIMESTAMPTZ,
    total_citas INTEGER NOT NULL DEFAULT 0 CHECK (total_citas >= 0),
    notas TEXT,
    bloqueado_no_show BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLA: appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    fecha_hora_inicio TIMESTAMPTZ NOT NULL,
    fecha_hora_fin TIMESTAMPTZ NOT NULL,
    estado TEXT NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada', 'cancelada', 'completada')),
    token_cancelacion UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_appointment_dates CHECK (fecha_hora_fin > fecha_hora_inicio)
);

-- 5. TABLA: blocked_slots
CREATE TABLE IF NOT EXISTS public.blocked_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    motivo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_blocked_dates CHECK (fecha_fin > fecha_inicio)
);

-- 6. TABLA: licenses
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key TEXT NOT NULL UNIQUE CHECK (license_key ~ '^DONAIRE-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
    comprador_email TEXT NOT NULL,
    stripe_session_id TEXT,
    plan TEXT NOT NULL CHECK (plan IN ('autoinstalable_15', 'llave_en_mano_99')),
    activa BOOLEAN NOT NULL DEFAULT true,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dominio_autorizado TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_services_activo ON public.services(activo);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_telefono ON public.clients(telefono);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON public.appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_fechas ON public.appointments(fecha_hora_inicio, fecha_hora_fin);
CREATE INDEX IF NOT EXISTS idx_appointments_token_cancelacion ON public.appointments(token_cancelacion);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_fechas ON public.blocked_slots(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON public.licenses(license_key);

-- Triggers de actualización automática updated_at
DROP TRIGGER IF EXISTS trg_business_settings_updated_at ON public.business_settings;
CREATE TRIGGER trg_business_settings_updated_at BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_services_updated_at ON public.services;
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_blocked_slots_updated_at ON public.blocked_slots;
CREATE TRIGGER trg_blocked_slots_updated_at BEFORE UPDATE ON public.blocked_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_licenses_updated_at ON public.licenses;
CREATE TRIGGER trg_licenses_updated_at BEFORE UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
