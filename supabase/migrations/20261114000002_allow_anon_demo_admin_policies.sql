-- ==========================================================
-- MIGRACIÓN: Políticas RLS para demo y panel de administración
-- Sistema: Krono / Donaire Citas
-- Permite acceso anónimo para la demo interactiva y panel admin
-- ==========================================================

DO $$ 
BEGIN
  -- 1. Permitir SELECT a clientes para anon (necesario para verificar blacklist y mostrar en admin)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'clients_select_anon') THEN
    CREATE POLICY "clients_select_anon" ON public.clients FOR SELECT TO anon USING (true);
  END IF;

  -- 2. Permitir UPDATE a clientes para anon (para marcar no-show o actualizar última visita)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'clients_update_anon') THEN
    CREATE POLICY "clients_update_anon" ON public.clients FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;

  -- 3. Permitir UPDATE a appointments para anon (para marcar como completada o cancelada)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'appointments_update_anon') THEN
    CREATE POLICY "appointments_update_anon" ON public.appointments FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;

  -- 4. Permitir INSERT a blocked_slots para anon (para bloquear horas/días desde el admin)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'blocked_slots_insert_anon') THEN
    CREATE POLICY "blocked_slots_insert_anon" ON public.blocked_slots FOR INSERT TO anon WITH CHECK (true);
  END IF;

  -- 5. Permitir DELETE a blocked_slots para anon (para desbloquear horas/días)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'blocked_slots_delete_anon') THEN
    CREATE POLICY "blocked_slots_delete_anon" ON public.blocked_slots FOR DELETE TO anon USING (true);
  END IF;
END $$;
