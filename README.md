# Krono / Donaire Citas · Sistema de Reservas Profesional para Negocios

Plataforma Next.js 16 (App Router, `proxy.ts`, Server Components, React 19, Tailwind v4) y Supabase con RLS estricto, prevención física de reservas duplicadas mediante índice `btree_gist`, notificaciones por email con archivo `.ics`, autenticación HMAC administrativa y multi-tema adaptativo (`dark_luxury`, `clean_minimal`, `neon_creator`).

---

## Despliegue en 1 clic (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDev-Donaaaiire%2Fcitas-donaire%2Ftree%2Fmain&env=NEXT_PUBLIC_APP_URL,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,ADMIN_PASSWORD,ADMIN_SESSION_SECRET,RESEND_API_KEY,LICENSE_KEY&envDescription=Introduce%20tus%20credenciales%20de%20Supabase%2C%20clave%20de%20administrador%2C%20Resend%20y%20tu%20LICENSE_KEY&project-name=agenda-citas&repository-name=agenda-citas)

---

## Puesta en marcha rápida

1. **Clonar e instalar dependencias**:
   ```bash
   git clone https://github.com/Dev-Donaaaiire/citas-donaire.git
   cd citas-donaire
   npm install
   ```
2. **Configurar variables de entorno**:
   Copia `.env.example` a `.env.local` y rellena:
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD` (mínimo 10 caracteres) y `ADMIN_SESSION_SECRET` (mínimo 16 caracteres, obligatorio en producción)
   - `RESEND_API_KEY` y `RESEND_FROM_EMAIL` (verifica tu dominio en Resend para envíos a clientes externos)
   - `LICENSE_KEY` (desbloquea producción cuando `modo_demo = false`)
3. **Aplicar migraciones SQL en Supabase**:
   Ejecuta las migraciones de `supabase/migrations/` en orden (incluyendo `20261115000000_security_hardening_rls_constraints_rpc.sql` y `20261115010000_rate_limit_and_atomic_counters.sql`) o utiliza el bloque SQL completo sincronizado disponible dentro de `/setup` o en `src/lib/initial-sql.ts`.
4. **Verificar en local**:
   ```bash
   npm run dev
   ```

---

## Flujo recomendado para compradores

1. Accede a `/setup` tras iniciar sesión en `/admin/login`.
2. Revisa el diagnóstico de entorno (`Service Role`, tablas SQL, RLS y licencia).
3. Configura nombre del negocio, dirección, teléfono, zona horaria (por defecto `Europe/Madrid`), horario, tema visual y catálogo de servicios.
4. Comparte `/reservar` en tu biografía de Instagram, WhatsApp o Google Maps.

## Notas operativas de Seguridad

- El tráfico anónimo público nunca accede directamente a tablas con datos personales (`clients`, `appointments`, `licenses`): utiliza funciones PostgreSQL `SECURITY DEFINER` mínimas (`get_public_busy_intervals`, `get_appointment_by_cancel_token`, `cancel_appointment_by_token`) y el endpoint `POST /api/bookings`.
- Las rutas `/admin`, `/setup`, `/api/admin/*` y `/api/notifications/reminder` requieren cookie de sesión `HttpOnly` firmada con HMAC.
- El webhook de PayPal valida firma criptográfica obligatoria, moneda `EUR` e importe cobrado de forma fail-closed.

---

## Licencia y Propiedad Intelectual

**Copyright © 2026-2027 Álvaro. Todos los derechos reservados.**

Este proyecto está protegido bajo una **Licencia Comercial Propietaria Anti-Plagio** ([LICENSE.md](LICENSE.md)). 
- **NO es software de código abierto (Not Open Source).** 
- La publicación de este código fuente en GitHub tiene como único fin permitir el despliegue automatizado en Vercel para clientes con licencia oficial.
- Queda **estrictamente prohibida** la copia, reventa, sublicencia, plagio, distribución pública, modificación de marca (White-Labeling) o explotación comercial sin una clave de licencia (`LICENSE_KEY`) legalmente emitida por el titular.
- Cualquier vulneración de los derechos de autor será perseguida judicialmente ante los Tribunales competentes conforme al RDL 1/1996 de Propiedad Intelectual y el Código Penal. Para licencias comerciales o soporte: `[correo eliminado]`.

