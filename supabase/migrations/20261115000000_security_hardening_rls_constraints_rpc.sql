-- ============================================================================
-- KRONO / DONAIRE CITAS — Hardening Crítico de Seguridad, RLS, Exclusión GiST y RPCs
-- Fecha: 2026-11-15
-- ============================================================================

-- 1. Extensión btree_gist para impedir solapamientos de citas a nivel de motor
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Columnas configurables de ubicación, teléfono y zona horaria en business_settings
--    + columnas requeridas para orden de servicios, historial no_shows y notas de cita
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS telefono_contacto TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Madrid';

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS orden INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_services_activo_orden
  ON public.services(activo, orden);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS no_shows INTEGER NOT NULL DEFAULT 0 CHECK (no_shows >= 0);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS notas TEXT;

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
  LOOP
    EXECUTE format('ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS %I', chk.conname);
  END LOOP;

  ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_estado_check
    CHECK (estado IN ('confirmada', 'cancelada', 'completada', 'no_show'));
END
$$;

-- Valores iniciales solo si el entorno está explícitamente en modo_demo
UPDATE public.business_settings
SET
  direccion = COALESCE(direccion, 'Calle Serrano 45, Madrid'),
  telefono_contacto = COALESCE(telefono_contacto, '+34 612 345 678'),
  timezone = COALESCE(NULLIF(timezone, ''), 'Europe/Madrid')
WHERE modo_demo = true;

-- 3. Restricción de exclusión temporal en appointments para evitar race conditions (código PG 23P01)
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

-- 4. Eliminar TODAS las políticas anon peligrosas y lecturas excesivas
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

-- Reemplazar lecturas seguras necesarias para usuarios autenticados y catálogo público activo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_settings' AND policyname = 'settings_select_authenticated'
  ) THEN
    CREATE POLICY "settings_select_authenticated"
      ON public.business_settings FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blocked_slots' AND policyname = 'blocked_slots_select_authenticated'
  ) THEN
    CREATE POLICY "blocked_slots_select_authenticated"
      ON public.blocked_slots FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'services' AND policyname = 'services_select_anon'
  ) THEN
    CREATE POLICY "services_select_anon"
      ON public.services FOR SELECT
      TO anon
      USING (activo = true);
  END IF;
END
$$;

-- Restringir reset_demo_data únicamente a service_role (evita reseteos desde cliente anónimo)
REVOKE ALL ON FUNCTION public.reset_demo_data(BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_demo_data(BOOLEAN) TO service_role;

-- 5. RPCs SECURITY DEFINER seguras para lectura/cancelación pública sin PII

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

  -- Acotar ventana máxima de consulta pública a 95 días
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
