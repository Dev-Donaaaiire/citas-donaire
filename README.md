# Krono · Reservas online gratis para negocios con cita previa

Hecho por **Álvaro, 15 años**. Si te gusta, deja una ⭐ en este repositorio: es la forma de apoyar el proyecto.

Barberías, clínicas, centros de estética, tatuadores o coaches: los clientes reservan desde un enlace y el dueño gestiona la agenda en su panel.

**Qué resuelve**

- Citas sin llamadas ni mensajes sueltos, con confirmación y archivo de calendario.
- Dos personas no pueden reservar la misma hora: lo impide la base de datos.
- Señala a los clientes que no han vuelto y frena a quien acumula plantones.
- Tres diseños y demo pública en `/demo` y `/demo/admin`.

**Con qué está hecho:** Next.js 16 (App Router, Server Components), React 19, TypeScript, Tailwind v4, Supabase con RLS e índice `btree_gist`, Resend y sesiones firmadas con HMAC.

---

## Instalación (Vercel + Supabase)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDev-Donaaaiire%2Fcitas-donaire%2Ftree%2Fmain&env=ADMIN_PASSWORD&envDescription=Contrase%C3%B1a%20para%20tu%20panel%20(m%C3%ADnimo%2010%20caracteres)&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%2C%22protocol%22%3A%22storage%22%7D%5D&project-name=agenda-citas&repository-name=agenda-citas)

1. Pulsa el botón y entra con GitHub.
2. Acepta crear la base de datos Supabase: las claves se rellenan solas.
3. Escribe `ADMIN_PASSWORD` (mínimo 10 caracteres).
4. Al terminar, entra en `/setup` y configura tu negocio.

La base de datos se crea y actualiza sola durante la compilación. Para enviar emails añade después `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (dominio verificado) y `OWNER_NOTIFICATION_EMAIL`.

> Krono es gratis, pero cada servicio tiene sus condiciones: el plan Hobby de Vercel no permite uso comercial, así que un negocio necesita un plan que lo permita u otro alojamiento.

### Certificado de la base de datos (una sola vez, quien publica versiones)
Las migraciones validan siempre el certificado del servidor. Descarga el certificado raíz en Supabase → Project Settings → Database → SSL Configuration y guárdalo como `src/db/supabase-ca.crt` antes de publicar la versión. Es público y viaja con las actualizaciones. Alternativa por instalación: variable `SUPABASE_DB_CA` con su contenido.

### Instalación manual
Copia `.env.example` a `.env.local`, rellena las variables y define `SUPABASE_DB_URL` para que `npm run build` (o `npm run migrate` con la variable exportada) prepare la base. Sin ella, ejecuta el script de `/setup` en el SQL Editor.

## Actualizaciones

Cada lunes, el workflow `krono-sync.yml` trae la última versión publicada, ejecuta los tests, compila y solo entonces la sube; Vercel la despliega y aplica los cambios de base de datos. También puede lanzarse a mano (Actions → Run workflow).

- Si una actualización falla, se abre un aviso (Issue) en tu repositorio y el panel lo señala pasados 9 días.
- Para desactivar la automática: Settings → Secrets and variables → Actions → Variables → `KRONO_AUTO_UPDATE=false`.
- Se sobrescriben `src`, `supabase`, `scripts`, `tests` y la configuración del proyecto: no los edites si quieres recibir actualizaciones.
- Instalaciones anteriores a la 1.5.0: sustituye una vez `.github/workflows/krono-sync.yml` por el que muestra el panel.

### Publicar una versión (solo el autor)
1. Sube `version` en `package.json` y actualiza `RELEASE_NOTES` en `src/lib/version.ts`.
2. Si cambia la base de datos, añade un archivo nuevo en `supabase/migrations/` posterior al último. Solo debe añadir cosas, sin borrar datos.
3. Al fusionar en `main`, GitHub comprueba lint, tests y compilación, crea la etiqueta `vX.Y.Z` y mueve `v1` (el actualizador que usan los clientes).

**Retirar una versión defectuosa:** añádela a `withdrawn-versions.json` en `main` (p. ej. `["v1.6.0"]`). Nadie la instalará desde ese momento. A quien ya la tenga no se le revierte: publica una versión superior con la corrección.

## Funciones para crecer

| Función | Dónde | Qué necesita |
|---|---|---|
| Huecos para Stories | Panel → "Huecos para Stories" | Nada |
| Recordatorio por WhatsApp | Agenda, en cada cita | Teléfono del cliente |
| Pedir reseña | Agenda, en citas completadas | Enlace de reseñas en `/setup` |
| Te toca volver | Panel → Clientes | Historial de citas |
| Recordatorio del día antes con confirmación | Automático, cada tarde (`vercel.json`) | Resend con dominio verificado |
| Lista de espera | Página de reserva | Resend con dominio verificado |

El recordatorio lo lanza el cron de Vercel a las 16:00 UTC. En otro alojamiento hay que llamar una vez al día a `/api/cron/reminders`. Si se define `CRON_SECRET`, la llamada debe enviar `Authorization: Bearer <valor>` (Vercel lo hace solo).

## Primeros pasos

1. Accede a `/setup` tras iniciar sesión en `/admin/login`.
2. Revisa el diagnóstico de entorno (`Service Role`, tablas SQL y RLS).
3. Configura nombre del negocio, dirección, teléfono, zona horaria (por defecto `Europe/Madrid`), horario, tema visual y catálogo de servicios.
4. Comparte `/reservar` en tu biografía de Instagram, WhatsApp o Google Maps.

## Notas operativas de Seguridad

- El tráfico anónimo público nunca accede directamente a tablas con datos personales (`clients`, `appointments`): utiliza funciones PostgreSQL `SECURITY DEFINER` mínimas (`get_public_busy_intervals`, `get_appointment_by_cancel_token`, `cancel_appointment_by_token`) y el endpoint `POST /api/bookings`.
- Las rutas `/admin`, `/setup`, `/api/admin/*` y `/api/notifications/reminder` requieren cookie de sesión `HttpOnly` firmada con HMAC.

## Uso

Gratis para tu propio negocio. No se puede vender ni presentar como propio. Se ofrece sin garantías: ver [LICENSE](LICENSE).
