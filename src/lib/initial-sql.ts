export const INITIAL_SUPABASE_SQL_SCRIPT = `-- ==========================================================
-- KRONO / DONAIRE CITAS — SCRIPT SQL DE INSTALACIÓN INICIAL
-- Ejecuta este script una única vez en Supabase -> SQL Editor
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Configuración del negocio
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_negocio TEXT NOT NULL DEFAULT 'Krono / Donaire Citas',
    logo_url TEXT,
    tema_activo TEXT NOT NULL DEFAULT 'dark_luxury' CHECK (tema_activo IN ('dark_luxury', 'clean_minimal', 'neon_creator')),
    horario_apertura TIME NOT NULL DEFAULT '09:00:00',
    horario_cierre TIME NOT NULL DEFAULT '20:00:00',
    dias_laborables JSONB NOT NULL DEFAULT '["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]'::jsonb,
    duracion_cita_minutos INTEGER NOT NULL DEFAULT 45 CHECK (duracion_cita_minutos > 0),
    email_notificaciones TEXT,
    modo_demo BOOLEAN NOT NULL DEFAULT false,
    ultima_restauracion_demo TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Catálogo de servicios
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

-- 3. Clientes y seguimiento anti no-show
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

-- 4. Citas
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

-- 5. Bloqueos de agenda
CREATE TABLE IF NOT EXISTS public.blocked_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    motivo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_blocked_dates CHECK (fecha_fin > fecha_inicio)
);

-- 6. Licencias comerciales
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key TEXT NOT NULL UNIQUE CHECK (license_key ~ '^DONAIRE-[A-Z0-9]{4}-[A-Z0-9]{4}(-[A-Z0-9]{4})?$'),
    comprador_email TEXT NOT NULL,
    stripe_session_id TEXT,
    plan TEXT NOT NULL CHECK (plan IN ('autoinstalable_15', 'llave_en_mano_99')),
    activa BOOLEAN NOT NULL DEFAULT true,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dominio_autorizado TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_services_activo ON public.services(activo);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_appointments_fechas ON public.appointments(fecha_hora_inicio, fecha_hora_fin);
CREATE INDEX IF NOT EXISTS idx_appointments_token_cancelacion ON public.appointments(token_cancelacion);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_fechas ON public.blocked_slots(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON public.licenses(license_key);

-- Habilitar RLS
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS idempotentes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_settings' AND policyname = 'settings_select_all') THEN
    CREATE POLICY "settings_select_all" ON public.business_settings FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_settings' AND policyname = 'settings_insert_anon') THEN
    CREATE POLICY "settings_insert_anon" ON public.business_settings FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_settings' AND policyname = 'settings_update_anon') THEN
    CREATE POLICY "settings_update_anon" ON public.business_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'services_select_all_anon') THEN
    CREATE POLICY "services_select_all_anon" ON public.services FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'services_insert_anon') THEN
    CREATE POLICY "services_insert_anon" ON public.services FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'services_update_anon') THEN
    CREATE POLICY "services_update_anon" ON public.services FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'services_delete_anon') THEN
    CREATE POLICY "services_delete_anon" ON public.services FOR DELETE TO anon USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'clients_select_anon') THEN
    CREATE POLICY "clients_select_anon" ON public.clients FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'clients_insert_anon') THEN
    CREATE POLICY "clients_insert_anon" ON public.clients FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'clients_update_anon') THEN
    CREATE POLICY "clients_update_anon" ON public.clients FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'appointments_select_anon') THEN
    CREATE POLICY "appointments_select_anon" ON public.appointments FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'appointments_insert_anon') THEN
    CREATE POLICY "appointments_insert_anon" ON public.appointments FOR INSERT TO anon WITH CHECK (estado = 'confirmada');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'appointments_update_anon') THEN
    CREATE POLICY "appointments_update_anon" ON public.appointments FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blocked_slots' AND policyname = 'blocked_slots_select_all') THEN
    CREATE POLICY "blocked_slots_select_all" ON public.blocked_slots FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blocked_slots' AND policyname = 'blocked_slots_insert_anon') THEN
    CREATE POLICY "blocked_slots_insert_anon" ON public.blocked_slots FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blocked_slots' AND policyname = 'blocked_slots_delete_anon') THEN
    CREATE POLICY "blocked_slots_delete_anon" ON public.blocked_slots FOR DELETE TO anon USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'licenses' AND policyname = 'licenses_select_anon') THEN
    CREATE POLICY "licenses_select_anon" ON public.licenses FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'licenses' AND policyname = 'licenses_insert_anon') THEN
    CREATE POLICY "licenses_insert_anon" ON public.licenses FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'licenses' AND policyname = 'licenses_update_anon') THEN
    CREATE POLICY "licenses_update_anon" ON public.licenses FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Licencia demo inicial
INSERT INTO public.licenses (license_key, comprador_email, plan, activa)
VALUES ('DONAIRE-DEMO-2027-2027', 'demo@donaire.dev', 'llave_en_mano_99', true)
ON CONFLICT (license_key) DO NOTHING;
`
