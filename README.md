# Krono / Donaire Citas — Sistema Élite de Reservas, Retención y Temas en Vivo

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdonaire%2Fkrono-citas&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,RESEND_API_KEY,LICENSE_KEY&envDescription=Introduce%20tus%20credenciales%20de%20Supabase%2C%20Resend%20y%20tu%20clave%20LICENSE_KEY&project-name=krono-citas&repository-name=krono-citas)

Plataforma profesional de gestión de citas sin llamadas, diseñada con Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, Resend (`.ics` + emails automáticos) y Supabase.

---

## Despliegue en 1 Clic para Compradores (Deploy with Vercel)

Código oficial listo para incrustar en tu página de ventas o correos de bienvenida (sustituye `https%3A%2F%2Fgithub.com%2Fdonaire%2Fkrono-citas` por la URL de tu repositorio si usas otro slug):

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdonaire%2Fkrono-citas&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,RESEND_API_KEY,LICENSE_KEY&envDescription=Introduce%20tus%20credenciales%20de%20Supabase%2C%20Resend%20y%20tu%20clave%20LICENSE_KEY&project-name=krono-citas&repository-name=krono-citas)
```

O en formato HTML para correos electrónicos:

```html
<a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdonaire%2Fkrono-citas&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,RESEND_API_KEY,LICENSE_KEY&envDescription=Introduce%20tus%20credenciales%20de%20Supabase%2C%20Resend%20y%20tu%20clave%20LICENSE_KEY&project-name=krono-citas&repository-name=krono-citas">
  <img src="https://vercel.com/button" alt="Deploy with Vercel" />
</a>
```

---

## Guía Rápida de Instalación (5 minutos)

1. **Pulsa el botón "Deploy with Vercel"** superior. Vercel clonará el proyecto en tu cuenta de GitHub y te pedirá las 4 variables obligatorias:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `RESEND_API_KEY`
   - `LICENSE_KEY` (tu clave con formato `DONAIRE-XXXX-XXXX-2027`)
2. **Abre `/setup` tras el despliegue**:
   - Entra en `https://tu-web.vercel.app/setup`.
   - El asistente detectará si tu proyecto de Supabase está vacío y te dará un botón de **Copiar Script SQL Inicial** para pegarlo en el **SQL Editor** de Supabase en 1 clic.
   - Configura desde la interfaz gráfica el nombre de tu negocio, estética (`Dark Luxury`, `Clean Minimal` o `Neon Creator`), horarios y catálogo de servicios.
3. **Empieza a recibir reservas**:
   - Vista pública para clientes (Instagram bio): `/reservar`
   - Panel de control del dueño + Seguimiento (+30 días): `/admin`
   - Demo interactiva con barra de temas en vivo: `/demo`

---

## Variables de Entorno (`.env.example`)

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Anon Public Key de Supabase |
| `RESEND_API_KEY` | Sí | API Key de [Resend](https://resend.com) para enviar correos y `.ics` |
| `LICENSE_KEY` | Sí | Clave de licencia `DONAIRE-XXXX-XXXX-2027` |
| `RESEND_FROM_EMAIL` | Opcional | Remitente verificado en Resend |
| `OWNER_NOTIFICATION_EMAIL` | Opcional | Email de respaldo del dueño |
| `PAYPAL_WEBHOOK_ID` | Vendedor | ID del webhook de PayPal en Developer Dashboard (opcional si se usa verificación estándar) |
| `NEXT_PUBLIC_PAYPAL_URL_15` | Vendedor | Enlace de pago directo / Botón de PayPal para el plan de 14,99 € |
| `NEXT_PUBLIC_PAYPAL_URL_99` | Vendedor | Enlace de pago directo / Botón de PayPal para el plan de 99,00 € |
| `MASTER_SUPABASE_URL` / `MASTER_SUPABASE_ANON_KEY` | Opcional | Supabase maestro para validar licencias desde instalaciones externas |
| `LICENSE_VERIFY_API_URL` | Opcional | Endpoint remoto (`/api/license/verify`) en el dominio principal |

---

## Automatización Comercial "Entregar y Olvidar"

- **Validador de Licencias (`/api/license/verify` y `src/lib/license.ts`)**:
  - Comprueba `process.env.LICENSE_KEY` en el servidor contra la tabla `public.licenses` del Supabase maestro (o mediante endpoint remoto en `LICENSE_VERIFY_API_URL`).
- **Webhook Automático de PayPal (`/api/webhooks/paypal`)**:
  - Escucha eventos de pago de PayPal (`PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.APPROVED`, `PAYMENT.SALE.COMPLETED`).
  - Detecta automáticamente si el pago corresponde al plan de **14,99 €** (`autoinstalable_15`) o al de **99 €** (`llave_en_mano_99`).
  - Genera una licencia criptográfica única `DONAIRE-XXXX-XXXX-2027`, la guarda de forma idempotente en `public.licenses` y envía al instante un email HTML vía Resend con la clave, el enlace al vídeo tutorial de 5 minutos y el botón de despliegue automático en Vercel.
  - Además, se mantiene compatibilidad con `/api/webhooks/stripe` para transiciones si fuera necesario.

---

## Desarrollo Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) o [http://localhost:3000/setup](http://localhost:3000/setup).
