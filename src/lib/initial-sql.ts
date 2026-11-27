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
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  ADD COLUMN IF NOT EXISTS campos_formulario JSONB NOT NULL DEFAULT '{"nombre":{"activo":true,"requerido":true},"email":{"activo":true,"requerido":true},"telefono":{"activo":true,"requerido":true},"notas":{"activo":true,"requerido":false}}'::jsonb;

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
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS orden INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descripcion TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_services_activo_orden ON public.services(activo, orden);

-- 3. Clientes (PII protegida: solo service_role / authenticated)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT UNIQUE,
  telefono TEXT,
  total_citas INTEGER NOT NULL DEFAULT 0 CHECK (total_citas >= 0),
  no_shows INTEGER NOT NULL DEFAULT 0 CHECK (no_shows >= 0),
  bloqueado_no_show BOOLEAN NOT NULL DEFAULT false,
  ultima_visita TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS no_shows INTEGER NOT NULL DEFAULT 0 CHECK (no_shows >= 0),
  ADD COLUMN IF NOT EXISTS notas TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Permite reservar sin email o sin teléfono si el negocio los marca como opcionales
ALTER TABLE public.clients
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN telefono DROP NOT NULL;

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fecha_hora_fin > fecha_hora_inicio)
);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS notas TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Admitir el estado 'no_show' en instalaciones antiguas
DO $$
DECLARE
  chk RECORD;
BEGIN
  FOR chk IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.appointments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%estado%'
      AND conname <> 'appointments_no_overlap'
  LOOP
    EXECUTE format('ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS %I', chk.conname);
  END LOOP;

  ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_estado_check
    CHECK (estado IN ('confirmada', 'cancelada', 'completada', 'no_show'));
END
$$;

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fecha_fin > fecha_inicio)
);

ALTER TABLE public.blocked_slots
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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
  stripe_session_id TEXT,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'licenses_license_key_check'
      AND conrelid = 'public.licenses'::regclass
  ) THEN
    ALTER TABLE public.licenses
      ADD CONSTRAINT licenses_license_key_check
      CHECK (license_key ~ '^DONAIRE-[A-Z0-9]{4}-[A-Z0-9]{4}(-[A-Z0-9]{4})?$') NOT VALID;
  END IF;

  -- Una sola licencia por pago (se omite si ya hay duplicados que revisar a mano)
  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_payment_session_unique
      ON public.licenses(stripe_session_id)
      WHERE stripe_session_id IS NOT NULL;
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Hay licencias duplicadas por pago: revisalas y vuelve a crear el indice.';
  END;
END
$$;

CREATE INDEX IF NOT EXISTS idx_licenses_key ON public.licenses(license_key);

DROP TRIGGER IF EXISTS trg_services_updated_at ON public.services;
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_blocked_slots_updated_at ON public.blocked_slots;
CREATE TRIGGER trg_blocked_slots_updated_at
  BEFORE UPDATE ON public.blocked_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_licenses_updated_at ON public.licenses;
CREATE TRIGGER trg_licenses_updated_at
  BEFORE UPDATE ON public.licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Row Level Security (RLS estricto: cero escritura o lectura de PII para anon)
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- La app lee y escribe datos privados solo desde el servidor con service_role (omite RLS).
-- El público únicamente lee servicios activos y usa las RPCs de la sección 8.
DROP POLICY IF EXISTS "settings_all_policy" ON public.business_settings;
DROP POLICY IF EXISTS "settings_select_authenticated" ON public.business_settings;
DROP POLICY IF EXISTS "settings_insert_authenticated" ON public.business_settings;
DROP POLICY IF EXISTS "settings_update_authenticated" ON public.business_settings;
DROP POLICY IF EXISTS "settings_delete_authenticated" ON public.business_settings;
DROP POLICY IF EXISTS "settings_insert_anon" ON public.business_settings;
DROP POLICY IF EXISTS "settings_update_anon" ON public.business_settings;
DROP POLICY IF EXISTS "settings_select_all" ON public.business_settings;
DROP POLICY IF EXISTS "services_all_policy" ON public.services;
DROP POLICY IF EXISTS "services_select_authenticated" ON public.services;
DROP POLICY IF EXISTS "services_insert_authenticated" ON public.services;
DROP POLICY IF EXISTS "services_update_authenticated" ON public.services;
DROP POLICY IF EXISTS "services_delete_authenticated" ON public.services;
DROP POLICY IF EXISTS "services_select_all_anon" ON public.services;
DROP POLICY IF EXISTS "services_insert_anon" ON public.services;
DROP POLICY IF EXISTS "services_update_anon" ON public.services;
DROP POLICY IF EXISTS "services_delete_anon" ON public.services;
DROP POLICY IF EXISTS "clients_select_authenticated" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_authenticated" ON public.clients;
DROP POLICY IF EXISTS "clients_update_authenticated" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_authenticated" ON public.clients;
DROP POLICY IF EXISTS "clients_select_anon" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_anon" ON public.clients;
DROP POLICY IF EXISTS "clients_update_anon" ON public.clients;
DROP POLICY IF EXISTS "appointments_select_authenticated" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_authenticated" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_authenticated" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_authenticated" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_anon" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_anon" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_anon" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_cancel_anon" ON public.appointments;
DROP POLICY IF EXISTS "blocked_slots_select_authenticated" ON public.blocked_slots;
DROP POLICY IF EXISTS "blocked_slots_insert_authenticated" ON public.blocked_slots;
DROP POLICY IF EXISTS "blocked_slots_update_authenticated" ON public.blocked_slots;
DROP POLICY IF EXISTS "blocked_slots_delete_authenticated" ON public.blocked_slots;
DROP POLICY IF EXISTS "blocked_slots_insert_anon" ON public.blocked_slots;
DROP POLICY IF EXISTS "blocked_slots_delete_anon" ON public.blocked_slots;
DROP POLICY IF EXISTS "blocked_slots_select_all" ON public.blocked_slots;
DROP POLICY IF EXISTS "licenses_select_authenticated" ON public.licenses;
DROP POLICY IF EXISTS "licenses_insert_authenticated" ON public.licenses;
DROP POLICY IF EXISTS "licenses_update_authenticated" ON public.licenses;
DROP POLICY IF EXISTS "licenses_delete_authenticated" ON public.licenses;
DROP POLICY IF EXISTS "licenses_select_anon" ON public.licenses;
DROP POLICY IF EXISTS "licenses_insert_anon" ON public.licenses;
DROP POLICY IF EXISTS "licenses_update_anon" ON public.licenses;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'services' AND policyname = 'services_select_anon') THEN
    CREATE POLICY "services_select_anon" ON public.services FOR SELECT TO anon USING (activo = true);
  END IF;
END
$$;

-- 8. RPCs SECURITY DEFINER seguras para el frontend público sin exponer PII

DROP FUNCTION IF EXISTS public.get_public_business_settings();

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
  timezone TEXT,
  campos_formulario JSONB
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
    COALESCE(NULLIF(bs.timezone, ''), 'Europe/Madrid') AS timezone,
    COALESCE(bs.campos_formulario, '{"nombre":{"activo":true,"requerido":true},"email":{"activo":true,"requerido":true},"telefono":{"activo":true,"requerido":true},"notas":{"activo":true,"requerido":false}}'::jsonb) AS campos_formulario
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

-- Restauración de datos demo (solo service_role)
CREATE OR REPLACE FUNCTION public.reset_demo_data(force BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_settings RECORD;
    v_minutos_transcurridos NUMERIC;
    v_service1_id UUID := gen_random_uuid();
    v_service2_id UUID := gen_random_uuid();
    v_service3_id UUID := gen_random_uuid();
    v_service4_id UUID := gen_random_uuid();
    v_client1_id UUID := gen_random_uuid();
    v_client2_id UUID := gen_random_uuid();
    v_client3_id UUID := gen_random_uuid();
    v_client4_id UUID := gen_random_uuid();
BEGIN
    -- Si el invocador es anon, ignorar cualquier intento de forzar bypass del cooldown
    IF COALESCE(auth.role(), 'anon') = 'anon' THEN
        force := false;
    END IF;

    -- Obtener la configuración de negocio existente
    SELECT * INTO v_settings FROM public.business_settings LIMIT 1;

    -- Si no existe ninguna configuración, crear la inicial por defecto
    IF v_settings IS NULL THEN
        INSERT INTO public.business_settings (
            nombre_negocio,
            logo_url,
            tema_activo,
            horario_apertura,
            horario_cierre,
            dias_laborables,
            duracion_cita_minutos,
            email_notificaciones,
            modo_demo,
            ultima_restauracion_demo
        ) VALUES (
            'Krono / Donaire Luxury Hair & Styling',
            'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=128&q=80',
            'dark_luxury',
            '09:00:00',
            '20:00:00',
            '["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]'::jsonb,
            45,
            'reservas@donairecitas.pro',
            true,
            NOW()
        ) RETURNING * INTO v_settings;
    END IF;

    -- Validar si el modo demo está activado
    IF NOT v_settings.modo_demo THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'DEMO_MODE_DISABLED',
            'message', 'El modo demo está desactivado en la configuración del negocio.'
        );
    END IF;

    -- Calcular minutos desde la última restauración
    IF v_settings.ultima_restauracion_demo IS NOT NULL THEN
        v_minutos_transcurridos := EXTRACT(EPOCH FROM (NOW() - v_settings.ultima_restauracion_demo)) / 60.0;
    ELSE
        v_minutos_transcurridos := 9999;
    END IF;

    -- Comprobar si han pasado al menos 60 minutos (a menos que se fuerce por admin autenticado)
    IF NOT force AND v_minutos_transcurridos < 60 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'COOLDOWN_ACTIVE',
            'message', 'Deben transcurrir al menos 60 minutos entre restauraciones de la demo.',
            'minutos_transcurridos', ROUND(v_minutos_transcurridos, 1),
            'minutos_restantes', ROUND(60 - v_minutos_transcurridos, 1)
        );
    END IF;

    -- ==========================================================
    -- RESTAURACIÓN Y RE-SEMILLADO DE DATOS DEMO
    -- ==========================================================
    DELETE FROM public.appointments;
    DELETE FROM public.blocked_slots;
    DELETE FROM public.services;
    DELETE FROM public.clients;

    -- Actualizar configuración a valores estándar
    UPDATE public.business_settings
    SET 
        nombre_negocio = 'Krono / Donaire Luxury Hair & Styling',
        logo_url = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=128&q=80',
        tema_activo = 'dark_luxury',
        horario_apertura = '09:00:00',
        horario_cierre = '20:00:00',
        dias_laborables = '["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]'::jsonb,
        duracion_cita_minutos = 45,
        email_notificaciones = 'reservas@donairecitas.pro',
        modo_demo = true,
        ultima_restauracion_demo = NOW(),
        updated_at = NOW()
    WHERE id = v_settings.id;

    -- Sembrar servicios premium
    INSERT INTO public.services (id, nombre, descripcion, precio, duracion_minutos, activo)
    VALUES
        (v_service1_id, 'Corte Signature & Styling VIP', 'Corte personalizado con tijera y navaja japonesa, lavado con champú orgánico y acabado con fijador premium.', 35.00, 45, true),
        (v_service2_id, 'Ritual Barba & Toalla Caliente', 'Perfilado al milímetro con navaja clásica, exfoliación previa, toalla aromaterapéutica caliente y aceite nutritivo.', 25.00, 30, true),
        (v_service3_id, 'Pack Total Donaire (Corte + Barba VIP)', 'Experiencia completa que incluye Corte Signature, Ritual Barba completo y mascarilla capilar purificante.', 55.00, 75, true),
        (v_service4_id, 'Tratamiento Detox & Masaje Craneal', 'Tratamiento desintoxicante del cuero cabelludo con masaje shiatsu relajante de 20 minutos.', 40.00, 45, true);

    -- Sembrar clientes
    INSERT INTO public.clients (id, nombre, email, telefono, ultima_visita, total_citas, notas, bloqueado_no_show)
    VALUES
        (v_client1_id, 'Carlos Mendoza', 'carlos.mendoza@example.com', '+34 612 345 678', NOW() - INTERVAL '7 days', 8, 'Cliente VIP. Prefiere café espresso sin azúcar y corte con degradado medio.', false),
        (v_client2_id, 'Alejandro Rivera', 'alejandro.rivera@example.com', '+34 623 456 789', NOW() - INTERVAL '15 days', 4, 'Siempre solicita perfilado suave de barba sin rebajar mucho el largo.', false),
        (v_client3_id, 'Sofía Navarro', 'sofia.navarro@example.com', '+34 634 567 890', NOW() - INTERVAL '2 days', 2, 'Piel sensible en cuello, aplicar bálsamo calmante hipoalergénico.', false),
        (v_client4_id, 'Cliente No-Show Demo', 'noshow@example.com', '+34 699 999 999', NOW() - INTERVAL '30 days', 1, 'No asistió a sus 2 últimas citas sin previo aviso. Marcado como no-show.', true);

    -- Sembrar citas
    INSERT INTO public.appointments (client_id, service_id, fecha_hora_inicio, fecha_hora_fin, estado, token_cancelacion)
    VALUES
        (v_client1_id, v_service1_id, CURRENT_DATE + TIME '10:00:00', CURRENT_DATE + TIME '10:45:00', 'completada', gen_random_uuid()),
        (v_client2_id, v_service2_id, CURRENT_DATE + TIME '12:30:00', CURRENT_DATE + TIME '13:00:00', 'confirmada', gen_random_uuid()),
        (v_client3_id, v_service3_id, (CURRENT_DATE + INTERVAL '1 day') + TIME '16:00:00', (CURRENT_DATE + INTERVAL '1 day') + TIME '17:15:00', 'confirmada', gen_random_uuid());

    -- Sembrar bloqueos
    INSERT INTO public.blocked_slots (fecha_inicio, fecha_fin, motivo)
    VALUES
        (CURRENT_DATE + TIME '14:00:00', CURRENT_DATE + TIME '15:00:00', 'Pausa técnica y almuerzo del equipo'),
        ((CURRENT_DATE + INTERVAL '1 day') + TIME '14:00:00', (CURRENT_DATE + INTERVAL '1 day') + TIME '15:00:00', 'Pausa técnica y almuerzo del equipo');

    -- Sembrar licencia
    INSERT INTO public.licenses (license_key, comprador_email, stripe_session_id, plan, activa, dominio_autorizado)
    VALUES ('DONAIRE-DEMO-2027', 'demo@donairecitas.pro', 'cs_test_demo_session_krono', 'llave_en_mano_99', true, 'localhost')
    ON CONFLICT (license_key) DO UPDATE
    SET activa = true, dominio_autorizado = 'localhost';

    RETURN jsonb_build_object(
        'success', true,
        'code', 'RESET_SUCCESSFUL',
        'message', 'Los datos iniciales de prueba de la demo han sido restaurados con éxito.',
        'timestamp', NOW()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.reset_demo_data(BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_demo_data(BOOLEAN) TO service_role;

-- 9. Permisos globales de Supabase (esquema, tablas, secuencias y recarga de caché)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
-- Sin EXECUTE global para anon/authenticated: reabriría las funciones privadas.
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;
REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, service_role;

NOTIFY pgrst, 'reload schema';
`;
