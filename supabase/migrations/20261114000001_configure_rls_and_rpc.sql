-- ==========================================================
-- MIGRACIÓN 2: Row Level Security (RLS) y Función RPC Demo
-- Sistema: Krono / Donaire Citas
-- ==========================================================

-- ==========================================================
-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
-- ==========================================================
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- 2. POLÍTICAS RLS: business_settings
-- ==========================================================
CREATE POLICY "settings_select_all"
ON public.business_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "settings_insert_authenticated"
ON public.business_settings FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "settings_update_authenticated"
ON public.business_settings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "settings_delete_authenticated"
ON public.business_settings FOR DELETE
TO authenticated
USING (true);

-- ==========================================================
-- 3. POLÍTICAS RLS: services
-- ==========================================================
CREATE POLICY "services_select_anon"
ON public.services FOR SELECT
TO anon
USING (activo = true);

CREATE POLICY "services_select_authenticated"
ON public.services FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "services_insert_authenticated"
ON public.services FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "services_update_authenticated"
ON public.services FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "services_delete_authenticated"
ON public.services FOR DELETE
TO authenticated
USING (true);

-- ==========================================================
-- 4. POLÍTICAS RLS: clients
-- ==========================================================
CREATE POLICY "clients_insert_anon"
ON public.clients FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "clients_select_authenticated"
ON public.clients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "clients_insert_authenticated"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "clients_update_authenticated"
ON public.clients FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "clients_delete_authenticated"
ON public.clients FOR DELETE
TO authenticated
USING (true);

-- ==========================================================
-- 5. POLÍTICAS RLS: appointments
-- ==========================================================
CREATE POLICY "appointments_select_anon"
ON public.appointments FOR SELECT
TO anon
USING (true);

CREATE POLICY "appointments_select_authenticated"
ON public.appointments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "appointments_insert_anon"
ON public.appointments FOR INSERT
TO anon
WITH CHECK (estado = 'confirmada');

CREATE POLICY "appointments_update_cancel_anon"
ON public.appointments FOR UPDATE
TO anon
USING (token_cancelacion IS NOT NULL)
WITH CHECK (estado = 'cancelada');

CREATE POLICY "appointments_insert_authenticated"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "appointments_update_authenticated"
ON public.appointments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "appointments_delete_authenticated"
ON public.appointments FOR DELETE
TO authenticated
USING (true);

-- ==========================================================
-- 6. POLÍTICAS RLS: blocked_slots
-- ==========================================================
CREATE POLICY "blocked_slots_select_all"
ON public.blocked_slots FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "blocked_slots_insert_authenticated"
ON public.blocked_slots FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "blocked_slots_update_authenticated"
ON public.blocked_slots FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "blocked_slots_delete_authenticated"
ON public.blocked_slots FOR DELETE
TO authenticated
USING (true);

-- ==========================================================
-- 7. POLÍTICAS RLS: licenses
-- ==========================================================
CREATE POLICY "licenses_select_anon"
ON public.licenses FOR SELECT
TO anon
USING (activa = true);

CREATE POLICY "licenses_select_authenticated"
ON public.licenses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "licenses_insert_authenticated"
ON public.licenses FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "licenses_update_authenticated"
ON public.licenses FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "licenses_delete_authenticated"
ON public.licenses FOR DELETE
TO authenticated
USING (true);

-- ==========================================================
-- 8. FUNCIÓN RPC: reset_demo_data()
-- ==========================================================
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
