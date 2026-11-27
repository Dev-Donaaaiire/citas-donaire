# Krono / Donaire Citas · Sistema de Reservas Profesional para Negocios

Plataforma Next.js 16 (App Router, `proxy.ts`, Server Components, React 19, Tailwind v4) y Supabase con RLS estricto, prevención física de reservas duplicadas mediante índice `btree_gist`, notificaciones por email con archivo `.ics`, autenticación HMAC administrativa y multi-tema adaptativo (`dark_luxury`, `clean_minimal`, `neon_creator`).

---

## Instalación (Vercel + Supabase)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDev-Donaaaiire%2Fcitas-donaire%2Ftree%2Fmain&env=ADMIN_PASSWORD,LICENSE_KEY&envDescription=Contrase%C3%B1a%20del%20panel%20(m%C3%ADn.%2010)%20y%20clave%20de%20licencia&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%2C%22protocol%22%3A%22storage%22%7D%5D&project-name=agenda-citas&repository-name=agenda-citas)

1. Pulsa el botón y entra con GitHub.
2. Acepta crear la base de datos Supabase: las claves se rellenan solas.
3. Escribe `ADMIN_PASSWORD` (mínimo 10 caracteres) y `LICENSE_KEY`.
4. Al terminar, entra en `/setup` y configura tu negocio.

La base de datos se crea y actualiza sola durante la compilación. Para enviar emails añade después `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (dominio verificado) y `OWNER_NOTIFICATION_EMAIL`.

> El plan Hobby de Vercel no permite uso comercial: un negocio necesita un plan que lo permita.

### Certificado de la base de datos (una sola vez, el autor)
Las migraciones validan siempre el certificado del servidor. Descarga el certificado raíz en Supabase → Project Settings → Database → SSL Configuration y guárdalo como `src/db/supabase-ca.crt` antes de publicar la versión. Es público y viaja con las actualizaciones. Alternativa por instalación: variable `SUPABASE_DB_CA` con su contenido.

### Instalación manual
Copia `.env.example` a `.env.local`, rellena las variables y define `SUPABASE_DB_URL` para que `npm run build` (o `npm run migrate` con la variable exportada) prepare la base. Sin ella, ejecuta el script de `/setup` en el SQL Editor.

## Actualizaciones

Cada lunes, el workflow `krono-sync.yml` trae la última versión publicada, ejecuta los tests, compila y solo entonces la sube; Vercel la despliega y aplica los cambios de base de datos. También puede lanzarse a mano (Actions → Run workflow).

- Para desactivar la automática: Settings → Secrets and variables → Actions → Variables → `KRONO_AUTO_UPDATE=false`.
- Se sobrescriben `src`, `supabase`, `scripts`, `tests` y la configuración del proyecto: no los edites si quieres recibir actualizaciones.
- Instalaciones anteriores a la 1.5.0: sustituye una vez `.github/workflows/krono-sync.yml` por el que muestra el panel.

### Publicar una versión (solo el autor)
1. Sube `version` en `package.json` y actualiza `RELEASE_NOTES` en `src/lib/version.ts`.
2. Si cambia la base de datos, añade un archivo nuevo en `supabase/migrations/` posterior al último. Solo debe añadir cosas, sin borrar datos.
3. Al fusionar en `main`, GitHub comprueba lint, tests y compilación y crea la etiqueta `vX.Y.Z`.

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

