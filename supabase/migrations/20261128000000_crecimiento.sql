-- Reseñas, recordatorio del día antes y lista de espera. Solo añade; idempotente.

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS url_resenas TEXT;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS recordatorio_enviado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmada_cliente_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  fecha DATE NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email, fecha, service_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_fecha ON public.waitlist(fecha) WHERE notified_at IS NULL;

-- Datos personales: solo el servidor
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.waitlist FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.waitlist TO service_role;

NOTIFY pgrst, 'reload schema';
