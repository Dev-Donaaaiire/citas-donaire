-- ============================================================================
-- MIGRACIÓN: Personalización de campos del formulario de reserva
-- Sistema: Krono / Donaire Citas
-- Permite al dueño del negocio decidir qué campos son obligatorios u opcionales
-- ============================================================================

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS campos_formulario JSONB NOT NULL DEFAULT '{"nombre":{"activo":true,"requerido":true},"email":{"activo":true,"requerido":true},"telefono":{"activo":true,"requerido":true},"notas":{"activo":true,"requerido":false}}'::jsonb;

-- Permitir que clientes puedan reservar sin email o sin teléfono si el dueño lo configuró como opcional
ALTER TABLE public.clients
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN telefono DROP NOT NULL;

-- Actualizar la función get_public_business_settings para devolver la configuración de campos
DROP FUNCTION IF EXISTS public.get_public_business_settings();

CREATE OR REPLACE FUNCTION public.get_public_business_settings()
 RETURNS TABLE(
   id uuid,
   nombre_negocio text,
   logo_url text,
   horario_apertura time without time zone,
   horario_cierre time without time zone,
   dias_laborables jsonb,
   duracion_cita_minutos integer,
   tema_activo text,
   modo_demo boolean,
   direccion text,
   telefono_contacto text,
   timezone text,
   campos_formulario jsonb
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
