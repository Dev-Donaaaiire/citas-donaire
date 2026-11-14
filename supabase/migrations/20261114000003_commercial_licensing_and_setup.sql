-- ==========================================================
-- MIGRACIÓN 3: Automatización Comercial, Licencias y Setup
-- Sistema: Krono / Donaire Citas
-- ==========================================================

-- 1. Ampliar el formato permitido de license_key para aceptar
-- tanto DONAIRE-XXXX-XXXX como DONAIRE-XXXX-XXXX-2027
ALTER TABLE public.licenses
  DROP CONSTRAINT IF EXISTS licenses_license_key_check;

ALTER TABLE public.licenses
  ADD CONSTRAINT licenses_license_key_check
  CHECK (license_key ~ '^DONAIRE-[A-Z0-9]{4}-[A-Z0-9]{4}(-[A-Z0-9]{4})?$');

-- 2. Insertar licencia demo en formato de 4 bloques (junto a DONAIRE-DEMO-2027)
INSERT INTO public.licenses (license_key, comprador_email, plan, activa)
VALUES ('DONAIRE-DEMO-2027-2027', 'demo@donaire.dev', 'llave_en_mano_99', true)
ON CONFLICT (license_key) DO UPDATE
SET activa = true;

-- 3. Políticas RLS para webhooks (Stripe -> licenses) y asistente /setup (business_settings y services)
DO $$
BEGIN
  -- Licenses: permitir INSERT y UPDATE para anon
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'licenses' AND policyname = 'licenses_insert_anon') THEN
    CREATE POLICY "licenses_insert_anon"
      ON public.licenses FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'licenses' AND policyname = 'licenses_update_anon') THEN
    CREATE POLICY "licenses_update_anon"
      ON public.licenses FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Business Settings: permitir INSERT y UPDATE para anon (usado en /setup)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_settings' AND policyname = 'settings_insert_anon') THEN
    CREATE POLICY "settings_insert_anon"
      ON public.business_settings FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_settings' AND policyname = 'settings_update_anon') THEN
    CREATE POLICY "settings_update_anon"
      ON public.business_settings FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Services: permitir SELECT completo, INSERT, UPDATE y DELETE para anon (usado en /setup)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'services_select_all_anon') THEN
    CREATE POLICY "services_select_all_anon"
      ON public.services FOR SELECT
      TO anon
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'services_insert_anon') THEN
    CREATE POLICY "services_insert_anon"
      ON public.services FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'services_update_anon') THEN
    CREATE POLICY "services_update_anon"
      ON public.services FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'services_delete_anon') THEN
    CREATE POLICY "services_delete_anon"
      ON public.services FOR DELETE
      TO anon
      USING (true);
  END IF;
END $$;
