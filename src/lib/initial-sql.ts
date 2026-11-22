export const INITIAL_SUPABASE_SQL_SCRIPT = `-- ============================================================================
-- KRONO / DONAIRE CITAS — Esquema SQL Endurecido (Producción Segura)
-- Copia y pega este bloque completo en Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 1. Configuración del negocio
CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_negocio TEXT NOT NULL DEFAULT 'Krono Studio',
  logo_url TEXT,
  horario_apertura TIME NOT NULL DEFAULT '09:00',
  horario_cierre TIME NOT NULL DEFAULT '20:00',
  dias_laborables JSONB NOT NULL DEFAULT '[1, 2, 3, 4, 5, 6]'::jsonb,
  duracion_cita_minutos INTEGER NOT NULL DEFAULT 30 CHECK (duracion_cita_minutos > 0),
  tema_activo TEXT NOT NULL DEFAULT 'dark_luxury'
    CHECK (tema_activo IN ('dark_luxury', 'clean_minimal', 'neon_creator')),
  email_notificaciones TEXT,
  direccion TEXT,
  telefono_contacto TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  modo_demo BOOLEAN NOT NULL DEFAULT false,
  ultima_restauracion_demo TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS telefono_contacto TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Madrid';

DROP TRIGGER IF EXISTS trg_business_settings_updated_at ON public.business_settings;
CREATE TRIGGER trg_business_settings_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Catálogo de servicios
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  duracion_minutos INTEGER NOT NULL CHECK (duracion_minutos > 0),
  precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_activo_orden ON public.services(activo, orden);

-- 3. Clientes (PII protegida: solo service_role / authenticated)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefono TEXT NOT NULL,
  total_citas INTEGER NOT NULL DEFAULT 0 CHECK (total_citas >= 0),
  no_shows INTEGER NOT NULL DEFAULT 0 CHECK (no_shows >= 0),
  bloqueado_no_show BOOLEAN NOT NULL DEFAULT false,
  ultima_visita TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_ultima_visita ON public.clients(ultima_visita);

-- 4. Citas (con exclusión GiST contra race conditions)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  fecha_hora_inicio TIMESTAMPTZ NOT NULL,
  fecha_hora_fin TIMESTAMPTZ NOT NULL,
  estado TEXT NOT NULL DEFAULT 'confirmada'
    CHECK (estado IN ('confirmada', 'cancelada', 'completada', 'no_show')),
  token_cancelacion UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fecha_hora_fin > fecha_hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_appointments_inicio ON public.appointments(fecha_hora_inicio);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_token ON public.appointments(token_cancelacion);
CREATE INDEX IF NOT EXISTS idx_appointments_estado ON public.appointments(estado);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_no_overlap'
      AND conrelid = 'public.appointments'::regclass
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_no_overlap
      EXCLUDE USING gist (tstzrange(fecha_hora_inicio, fecha_hora_fin) WITH &&)
      WHERE (estado <> 'cancelada');
  END IF;
END
$$;

-- 5. Bloqueos de agenda
CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fecha_fin > fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_fechas ON public.blocked_slots(fecha_inicio, fecha_fin);

-- 6. Licencias comerciales
CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT NOT NULL UNIQUE,
  comprador_email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'autoinstalable_15'
    CHECK (plan IN ('autoinstalable_15', 'llave_en_mano_99')),
  dominio_autorizado TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_key ON public.licenses(license_key);

-- 7. Row Level Security (RLS estricto: cero escritura o lectura de PII para anon)
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Eliminar cualquier política anon heredada o insegura
DROP POLICY IF EXISTS "clients_select_anon" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_anon" ON public.clients;
DROP POLICY IF EXISTS "clients_update_anon" ON public.clients;
DROP POLICY IF EXISTS "appointments_select_anon" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_anon" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_anon" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_cancel_anon" ON public.appointments;
DROP POLICY IF EXISTS "blocked_slots_insert_anon" ON public.blocked_slots;
DROP POLICY IF EXISTS "blocked_slots_delete_anon" ON public.blocked_slots;
DROP POLICY IF EXISTS "blocked_slots_select_all" ON public.blocked_slots;
DROP POLICY IF EXISTS "licenses_select_anon" ON public.licenses;
DROP POLICY IF EXISTS "licenses_insert_anon" ON public.licenses;
DROP POLICY IF EXISTS "licenses_update_anon" ON public.licenses;
DROP POLICY IF EXISTS "settings_insert_anon" ON public.business_settings;
DROP POLICY IF EXISTS "settings_update_anon" ON public.business_settings;
DROP POLICY IF EXISTS "settings_select_all" ON public.business_settings;
DROP POLICY IF EXISTS "services_select_all_anon" ON public.services;
DROP POLICY IF EXISTS "services_insert_anon" ON public.services;
DROP POLICY IF EXISTS "services_update_anon" ON public.services;
DROP POLICY IF EXISTS "services_delete_anon" ON public.services;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_settings' AND policyname = 'settings_all_policy') THEN
    CREATE POLICY "settings_all_policy" ON public.business_settings FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'services' AND policyname = 'services_all_policy') THEN
    CREATE POLICY "services_all_policy" ON public.services FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_select_authenticated') THEN
    CREATE POLICY "clients_select_authenticated" ON public.clients FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_insert_authenticated') THEN
    CREATE POLICY "clients_insert_authenticated" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_update_authenticated') THEN
    CREATE POLICY "clients_update_authenticated" ON public.clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'appointments' AND policyname = 'appointments_select_authenticated') THEN
    CREATE POLICY "appointments_select_authenticated" ON public.appointments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'appointments' AND policyname = 'appointments_insert_authenticated') THEN
    CREATE POLICY "appointments_insert_authenticated" ON public.appointments FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'appointments' AND policyname = 'appointments_update_authenticated') THEN
    CREATE POLICY "appointments_update_authenticated" ON public.appointments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blocked_slots' AND policyname = 'blocked_slots_select_authenticated') THEN
    CREATE POLICY "blocked_slots_select_authenticated" ON public.blocked_slots FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blocked_slots' AND policyname = 'blocked_slots_insert_authenticated') THEN
    CREATE POLICY "blocked_slots_insert_authenticated" ON public.blocked_slots FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blocked_slots' AND policyname = 'blocked_slots_delete_authenticated') THEN
    CREATE POLICY "blocked_slots_delete_authenticated" ON public.blocked_slots FOR DELETE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'licenses' AND policyname = 'licenses_select_authenticated') THEN
    CREATE POLICY "licenses_select_authenticated" ON public.licenses FOR SELECT TO authenticated USING (true);
  END IF;
END
$$;

-- 8. RPCs SECURITY DEFINER seguras para el frontend público sin exponer PII

CREATE OR REPLACE FUNCTION public.get_public_business_settings()
RETURNS TABLE (
  id UUID,
  nombre_negocio TEXT,
  logo_url TEXT,
  horario_apertura TIME,
  horario_cierre TIME,
  dias_laborables JSONB,
  duracion_cita_minutos INTEGER,
  tema_activo TEXT,
  modo_demo BOOLEAN,
  direccion TEXT,
  telefono_contacto TEXT,
  timezone TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    bs.id,
    bs.nombre_negocio,
    bs.logo_url,
    bs.horario_apertura,
    bs.horario_cierre,
    bs.dias_laborables,
    bs.duracion_cita_minutos,
    bs.tema_activo,
    bs.modo_demo,
    bs.direccion,
    bs.telefono_contacto,
    COALESCE(NULLIF(bs.timezone, ''), 'Europe/Madrid') AS timezone
  FROM public.business_settings bs
  ORDER BY bs.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_business_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_business_settings() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_public_busy_intervals(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS TABLE (
  inicio TIMESTAMPTZ,
  fin TIMESTAMPTZ,
  kind TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_to TIMESTAMPTZ;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to <= p_from THEN
    RETURN;
  END IF;

  v_to := LEAST(p_to, p_from + INTERVAL '95 days');

  RETURN QUERY
  SELECT
    a.fecha_hora_inicio AS inicio,
    a.fecha_hora_fin AS fin,
    'appointment'::TEXT AS kind
  FROM public.appointments a
  WHERE a.estado <> 'cancelada'
    AND a.fecha_hora_fin > p_from
    AND a.fecha_hora_inicio < v_to
  UNION ALL
  SELECT
    b.fecha_inicio AS inicio,
    b.fecha_fin AS fin,
    'blocked'::TEXT AS kind
  FROM public.blocked_slots b
  WHERE b.fecha_fin > p_from
    AND b.fecha_inicio < v_to
  ORDER BY inicio ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_busy_intervals(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_busy_intervals(TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_appointment_by_cancel_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_token IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', a.id,
    'estado', a.estado,
    'fecha_hora_inicio', a.fecha_hora_inicio,
    'fecha_hora_fin', a.fecha_hora_fin,
    'service_id', a.service_id,
    'service_nombre', COALESCE(s.nombre, 'Servicio reservado'),
    'service_precio', COALESCE(s.precio, 0),
    'service_duracion_minutos', COALESCE(s.duracion_minutos, 30),
    'client_nombre', COALESCE(c.nombre, 'Cliente'),
    'business_name', COALESCE(bs.nombre_negocio, 'Reserva'),
    'direccion', bs.direccion,
    'telefono_contacto', bs.telefono_contacto,
    'timezone', COALESCE(NULLIF(bs.timezone, ''), 'Europe/Madrid')
  )
  INTO v_result
  FROM public.appointments a
  LEFT JOIN public.services s ON s.id = a.service_id
  LEFT JOIN public.clients c ON c.id = a.client_id
  LEFT JOIN LATERAL (
    SELECT nombre_negocio, direccion, telefono_contacto, timezone
    FROM public.business_settings
    ORDER BY created_at ASC
    LIMIT 1
  ) bs ON true
  WHERE a.token_cancelacion = p_token
  LIMIT 1;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_appointment_by_cancel_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_appointment_by_cancel_token(UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancel_appointment_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_estado TEXT;
BEGIN
  IF p_token IS NULL THEN
    RETURN jsonb_build_object('cancelled', false, 'reason', 'invalid_token');
  END IF;

  SELECT a.id, a.estado
  INTO v_id, v_estado
  FROM public.appointments a
  WHERE a.token_cancelacion = p_token
  FOR UPDATE;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('cancelled', false, 'reason', 'not_found');
  END IF;

  IF v_estado = 'cancelada' THEN
    RETURN jsonb_build_object('cancelled', false, 'reason', 'already_cancelled', 'id', v_id, 'estado', v_estado);
  END IF;

  IF v_estado = 'completada' THEN
    RETURN jsonb_build_object('cancelled', false, 'reason', 'already_completed', 'id', v_id, 'estado', v_estado);
  END IF;

  UPDATE public.appointments
  SET estado = 'cancelada'
  WHERE id = v_id
    AND estado = 'confirmada';

  RETURN jsonb_build_object('cancelled', true, 'id', v_id, 'estado', 'cancelada');
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_appointment_by_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_appointment_by_token(UUID) TO anon, authenticated, service_role;

-- ============================================================================
-- Rate limiting persistente + contadores atómicos de clientes
-- ============================================================================

-- 1. Tabla de rate limits (solo accesible con service_role: RLS activo sin políticas)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC, anon, authenticated;

-- 2. consume_rate_limit: incremento atómico con ventana deslizante fija
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_reset_at TIMESTAMPTZ;
  v_retry INTEGER;
BEGIN
  IF p_key IS NULL OR length(p_key) = 0 OR p_max_requests < 1 OR p_window_seconds < 1 THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'retry_after_seconds', 1);
  END IF;

  -- Limpieza oportunista de filas expiradas
  DELETE FROM public.rate_limits WHERE reset_at <= NOW() - INTERVAL '1 day';

  INSERT INTO public.rate_limits AS rl (key, count, reset_at, updated_at)
  VALUES (p_key, 1, NOW() + make_interval(secs => p_window_seconds), NOW())
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN rl.reset_at <= NOW() THEN 1
          ELSE rl.count + 1
        END,
        reset_at = CASE
          WHEN rl.reset_at <= NOW() THEN NOW() + make_interval(secs => p_window_seconds)
          ELSE rl.reset_at
        END,
        updated_at = NOW()
  RETURNING rl.count, rl.reset_at INTO v_count, v_reset_at;

  v_retry := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_reset_at - NOW())))::INTEGER);

  RETURN jsonb_build_object(
    'allowed', v_count <= p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_count),
    'retry_after_seconds', CASE WHEN v_count <= p_max_requests THEN 0 ELSE v_retry END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- 3. record_client_no_show: incremento atómico y bloqueo al segundo no-show
CREATE OR REPLACE FUNCTION public.record_client_no_show(p_client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_no_shows INTEGER;
  v_blocked BOOLEAN;
BEGIN
  UPDATE public.clients
  SET no_shows = no_shows + 1,
      bloqueado_no_show = (no_shows + 1 >= 2)
  WHERE id = p_client_id
  RETURNING no_shows, bloqueado_no_show INTO v_no_shows, v_blocked;

  IF v_no_shows IS NULL THEN
    RETURN jsonb_build_object('updated', false);
  END IF;

  RETURN jsonb_build_object('updated', true, 'no_shows', v_no_shows, 'bloqueado_no_show', v_blocked);
END;
$$;

REVOKE ALL ON FUNCTION public.record_client_no_show(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_client_no_show(UUID) TO service_role;

-- 4. increment_client_appointments: delta atómico sin races
CREATE OR REPLACE FUNCTION public.increment_client_appointments(
  p_client_id UUID,
  p_delta INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  UPDATE public.clients
  SET total_citas = GREATEST(0, total_citas + COALESCE(p_delta, 0))
  WHERE id = p_client_id
  RETURNING total_citas INTO v_total;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_client_appointments(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_client_appointments(UUID, INTEGER) TO service_role;

-- 5. cancel_appointment_by_token ahora devuelve client_id para ajustar total_citas en servidor
CREATE OR REPLACE FUNCTION public.cancel_appointment_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_client_id UUID;
  v_estado TEXT;
BEGIN
  IF p_token IS NULL THEN
    RETURN jsonb_build_object('cancelled', false, 'reason', 'invalid_token');
  END IF;

  SELECT a.id, a.client_id, a.estado
  INTO v_id, v_client_id, v_estado
  FROM public.appointments a
  WHERE a.token_cancelacion = p_token
  FOR UPDATE;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('cancelled', false, 'reason', 'not_found');
  END IF;

  IF v_estado = 'cancelada' THEN
    RETURN jsonb_build_object('cancelled', false, 'reason', 'already_cancelled', 'id', v_id, 'estado', v_estado);
  END IF;

  IF v_estado = 'completada' THEN
    RETURN jsonb_build_object('cancelled', false, 'reason', 'already_completed', 'id', v_id, 'estado', v_estado);
  END IF;

  UPDATE public.appointments
  SET estado = 'cancelada'
  WHERE id = v_id
    AND estado = 'confirmada';

  RETURN jsonb_build_object(
    'cancelled', true,
    'id', v_id,
    'client_id', v_client_id,
    'previous_estado', v_estado,
    'estado', 'cancelada'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_appointment_by_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_appointment_by_token(UUID) TO anon, authenticated, service_role;

-- 9. Permisos globales de Supabase (esquema, tablas, secuencias y recarga de caché)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
`;
