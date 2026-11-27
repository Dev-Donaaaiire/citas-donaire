-- ============================================================================
-- Cierre de políticas RLS permisivas, permisos de funciones privadas y
-- unicidad de licencia por pago. Idempotente.
-- La app accede a datos privados solo desde el servidor con service_role.
-- ============================================================================

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

-- Lectura pública: únicamente servicios activos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'services' AND policyname = 'services_select_anon') THEN
    CREATE POLICY "services_select_anon" ON public.services FOR SELECT TO anon USING (activo = true);
  END IF;
END
$$;

-- Funciones privadas: el antiguo script de /setup concedía EXECUTE a anon
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.consume_rate_limit(text, integer, integer)',
    'public.record_client_no_show(uuid)',
    'public.increment_client_appointments(uuid, integer)',
    'public.reset_demo_data(boolean)'
  ]
  LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    END IF;
  END LOOP;

  IF to_regclass('public.rate_limits') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC, anon, authenticated;
  END IF;
END
$$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;

-- Una sola licencia por pago
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_payment_session_unique
    ON public.licenses(stripe_session_id)
    WHERE stripe_session_id IS NOT NULL;
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'Hay licencias duplicadas por pago: revisalas y vuelve a ejecutar esta migracion.';
END
$$;

NOTIFY pgrst, 'reload schema';
