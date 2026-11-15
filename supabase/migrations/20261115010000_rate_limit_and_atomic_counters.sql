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
