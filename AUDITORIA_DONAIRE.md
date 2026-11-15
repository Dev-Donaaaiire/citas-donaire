# Auditoría QA, Rendimiento y Experiencia de Usuario — `https://citas.donaire.dev`

> **Fecha de auditoría**: 15 de noviembre de 2026  
> **Entorno auditado en vivo**: `https://citas.donaire.dev` (Desktop `1440×900` y Móvil `390×844`)  
> **Herramientas**: Playwright (`@playwright/mcp@latest` + Chromium 159 / `chromium-1255`) y Google Lighthouse

---

## 1. Resumen Ejecutivo

La aplicación desplegada en `https://citas.donaire.dev` ofrece una experiencia visual muy cuidada y funciona sin errores de hidratación de React ni caídas en las rutas principales (`/`, `/demo`, `/admin`, `/reservar`, `/setup`, `/legal`). Sin embargo, la auditoría en vivo ha detectado **1 error crítico HTTP 500 en red/consola**, **2 fallos de diseño responsive en móvil (`390×844`)** en el panel de administración, **1 fallo de UX en el selector de fecha** del flujo de reservas y **2 fallos de accesibilidad + oportunidad de mejora de LCP** detectados por Google Lighthouse.

---

## 2. Resultados Oficiales de Google Lighthouse (`https://citas.donaire.dev/`)

Extraído de [`lighthouse-report.json`](file:///c:/Users/akerm/Desktop/META2027/lighthouse-report.json):

| Categoría | Puntuación (0–100) |
| --- | :---: |
| **Performance (Rendimiento)** | **95** |
| **Accessibility (Accesibilidad)** | **94** |
| **Best Practices (Buenas Prácticas)** | **100** |
| **SEO** | **100** |

### Métricas Core Web Vitals y Carga

| Métrica | Valor medido | Puntuación Lighthouse |
| --- | :---: | :---: |
| **FCP** (First Contentful Paint) | `1.0 s` | `1.00` |
| **LCP** (Largest Contentful Paint) | `2.7 s` | `0.86` |
| **TBT** (Total Blocking Time) | `130 ms` | `0.96` |
| **CLS** (Cumulative Layout Shift) | `0` | `1.00` |
| **Speed Index** | `1.9 s` | `1.00` |
| **TTI** (Time to Interactive) | `2.7 s` | `0.97` |

### Auditorías Fallidas o Mejorables en Lighthouse

1. **`color-contrast` (Score: 0)** — Contraste insuficiente (**4.12:1**, mínimo WCAG AA **4.5:1**) en el tema por defecto `dark_luxury`: `--color-zinc-500: #77725f` sobre fondo `#09090b` (`text-zinc-500` en textos legales, subtítulo bajo el CTA del Hero, pie de vista previa y footer). Al revisar los otros dos temas en [`themes.css`](file:///c:/Users/akerm/Desktop/META2027/src/app/themes.css), `clean_minimal` (`#7d7971` sobre `#f7f6f4` = **4.01:1**) y `neon_creator` (`#5f6f8c` sobre `#05070d` = **3.97:1**) también incumplían 4.5:1.
2. **`heading-order` (Score: 0)** — En [`LandingPage.tsx`](file:///c:/Users/akerm/Desktop/META2027/src/components/landing/LandingPage.tsx), tras el `<h1>` del Hero se pasa directamente a tarjetas con `<h3>` (`Cero llamadas`, `Recupera a quien no vuelve`, etc.) sin ningún `<h2>` intermedio.
3. **LCP (`2.7 s`) por animación inicial en Hero** — El `<h1>` y el bloque inicial del Hero en [`LandingPage.tsx`](file:///c:/Users/akerm/Desktop/META2027/src/components/landing/LandingPage.tsx) usaban `motion` con `initial={{ opacity: 0, y: 18 }}` (`whileInView`), ocultando el elemento LCP hasta que se completa la hidratación de JS.
4. **JavaScript no usado / Legacy (`unused-javascript`: ~120 KiB, `legacy-javascript-insight`: ~14 KiB)** — Chunks de cliente cargados en la landing (Framer Motion + bundle compartido).

---

## 3. Consola, Red e Hidratación (`/`, `/demo`, `/admin`, `/reservar`, `/setup`, `/legal`)

### Estado inicial por ruta (Desktop `1440×900` y Móvil `390×844`)

- **`/` (Landing)**: Sin errores de consola ni peticiones de red fallidas. Sin desbordamiento horizontal (`scrollWidth === innerWidth`).
- **`/demo` (Reserva cliente)**: Carga inicial limpia sin errores de hidratación (incluso tras guardar `clean_minimal` o `neon_creator` en `localStorage` y recargar).
- **`/admin` y `/demo/admin`**: Sin errores de consola ni fallos HTTP en la carga inicial, pero con **desbordamiento en móvil** (ver sección 4).
- **`/reservar`, `/setup`, `/legal`**: Carga limpia, HTTP 200 en todos los recursos, `scrollWidth === 390`.

### Error Crítico Detectado Durante la Prueba Interactiva

- **`POST https://citas.donaire.dev/api/notifications/booking` → `500 Internal Server Error`**
  - **Reproducción**: Completar el flujo de reserva en `/demo` y pulsar **"Confirmar Cita Ahora"**.
  - **Mensaje real devuelto por el servidor**:
    ```json
    {"error":"No se pudieron enviar los correos con Resend: You can only send testing emails to your own email address (akerman0789@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain. | ..."}
    ```
  - **Causa raíz**: `RESEND_API_KEY` está configurada en producción, pero `RESEND_FROM_EMAIL` no utiliza un dominio verificado en Resend (sigue con `onboarding@resend.dev`). En [`email-service.ts`](file:///c:/Users/akerm/Desktop/META2027/src/lib/email-service.ts), cuando ambos envíos de Resend devuelven error de sandbox, `sendBookingConfirmationEmails` (y `sendClientReminderEmail` en `/api/notifications/reminder`) lanzan una excepción no controlada, provocando un **HTTP 500** y un error rojo en la consola del navegador (`Failed to load resource: the server responded with a status of 500 ()`).

---

## 4. Prueba Interactiva en Móvil (`390×844`) — UI, Temas y Flujo de Reserva

1. **Cambio entre los 3 temas visuales (`Dark Luxury`, `Clean Minimal`, `Neon Creator`)**:
   - Tanto en la vista previa de `/` (`HeroThemePreview`) como en la barra superior de `/demo` (`DemoTopBar`), los 3 temas cambian correctamente el atributo `<html data-theme="...">` sin errores de hidratación ni solapamientos.
2. **Header de `/admin` y `/demo/admin` cortado en móvil (`390×844`)**:
   - En [`AdminHeader.tsx`](file:///c:/Users/akerm/Desktop/META2027/src/components/admin/AdminHeader.tsx), el botón **"Ver Reserva Pública"** desbordaba el borde derecho (`right: 407.6px` sobre viewport de `390px`, forzando el ancho a `408px`), envolvía el texto en 3 líneas (`height: 60px`) y recortaba el icono externo.
   - Las pestañas **"Agenda & Bloqueos"** y **"Seguimiento de Clientes"** + badge **"Valor Clave"** envolvían el texto en dos líneas de forma irregular.
3. **Colisión en tarjeta de métricas en móvil (`390×844`)**:
   - En [`AdminMetricsGrid.tsx`](file:///c:/Users/akerm/Desktop/META2027/src/components/admin/AdminMetricsGrid.tsx), dentro del grid de 2 columnas en móvil, el título **"EN RIESGO (+30 DÍAS SIN VISITA)"** colisionaba visualmente con el badge **"Reactivar"**.
4. **Filtros en tabla de retención**:
   - En [`AdminClientRetentionTable.tsx`](file:///c:/Users/akerm/Desktop/META2027/src/components/admin/AdminClientRetentionTable.tsx), la barra de filtros (`En riesgo (+30 días)`, `Todos`, `Lista Negra`) no permitía `flex-wrap` en pantallas estrechas y el toast flotante (`right-6`) no se adaptaba al ancho móvil.
5. **Calendario en Paso 2 iniciando en día cerrado**:
   - En [`ReservarContent.tsx`](file:///c:/Users/akerm/Desktop/META2027/src/components/booking/ReservarContent.tsx), al entrar el domingo 15 de noviembre de 2026 al Paso 2, `selectedDate` se inicializaba en `new Date()` (día cerrado), mostrando **"DOM 15 · Cerrado"** resaltado en blanco y 0 huecos disponibles, obligando al usuario a tocar otro día para ver horarios.
6. **Confirmación y cancelación de cita**:
   - La creación en Supabase, la pantalla de confirmación (Google Calendar + descarga `.ics`) y la cancelación por token en `/cancelar?token=...` funcionaron sin recorte de botones en `390×844` (salvo el error 500 de `/api/notifications/booking` ya detallado).

---

## 5. Correcciones Aplicadas en el Código Local

| # | Problema | Archivo modificado | Solución implementada | Estado |
| --- | --- | --- | --- | --- |
| 1 | Error `HTTP 500` en `/api/notifications/booking` y `/api/notifications/reminder` cuando Resend está en modo sandbox | [email-service.ts](file:///c:/Users/akerm/Desktop/META2027/src/lib/email-service.ts) | Añadida detección `isResendSandboxOrDomainError` para degradar con HTTP 200 y `{ simulated: true, reason: 'resend_domain_unverified' }` sin lanzar 500 en consola | Corregido y verificado |
| 2 | Botón `Ver Reserva Pública` cortado y desbordamiento (`408px`) en `/admin` y `/demo/admin` móvil | [AdminHeader.tsx](file:///c:/Users/akerm/Desktop/META2027/src/components/admin/AdminHeader.tsx) | Añadido `min-w-0` al título, texto corto `Reservar` en `<640px` (`sm:hidden`), botones táctiles `h-10` y pestañas en una línea con `overflow-x-auto` | Corregido y verificado |
| 3 | Colisión entre título y badge `Reactivar` en métricas móviles | [AdminMetricsGrid.tsx](file:///c:/Users/akerm/Desktop/META2027/src/components/admin/AdminMetricsGrid.tsx) | Cambio a `items-start justify-between gap-2`, `min-w-0` en título y `shrink-0` en badge | Corregido y verificado |
| 4 | Filtros sin `wrap` y toast rígido en tabla de clientes | [AdminClientRetentionTable.tsx](file:///c:/Users/akerm/Desktop/META2027/src/components/admin/AdminClientRetentionTable.tsx) | Añadido `flex-wrap`, `min-h-[40px]` táctil y toast adaptable (`left-4 right-4 sm:left-auto`) | Corregido y verificado |
| 5 | Paso 2 de reserva inicia en un día cerrado ("Cerrado") | [ReservarContent.tsx](file:///c:/Users/akerm/Desktop/META2027/src/components/booking/ReservarContent.tsx) | Añadido `pickFirstAvailableDate` al cargar datos y al cambiar de servicio si el día actual no tiene huecos | Corregido y verificado |
| 6 | Contraste `< 4.5:1` en `text-zinc-500` en los 3 temas | [themes.css](file:///c:/Users/akerm/Desktop/META2027/src/app/themes.css) | Ajustados `--color-zinc-500` (y `--color-zinc-400` en `clean_minimal`) para cumplir ratio `> 5.0:1` WCAG AA | Corregido y verificado |
| 7 | `heading-order` inválido (`h1` → `h3`) y `opacity: 0` en Hero LCP | [LandingPage.tsx](file:///c:/Users/akerm/Desktop/META2027/src/components/landing/LandingPage.tsx) | Añadido `<h2 className="sr-only">` antes de las tarjetas de beneficios y eliminado `initial={{ opacity: 0 }}` en el Hero above-the-fold | Corregido y verificado |

### Verificación Post-Corrección (Build de Producción Local)

- `npm run lint` (`eslint`): **0 errores**.
- `npx tsc --noEmit`: **0 errores**.
- `npm run build` (`next build`): **Compilado con éxito** (16/16 páginas generadas).
- **Playwright móvil (`390×844`) sobre `next start` local**:
  - `/demo/admin`: `scrollWidth === 390` (`innerWidth === 390`), botón `Reservar` dentro del viewport (`right: 378px`), pestañas sin solapamiento.
  - `/demo` Paso 2: Preselecciona automáticamente el primer día disponible (`18 disponibles`) en lugar de quedar en día cerrado.
  - `POST /api/notifications/booking`: Responde **HTTP 200** con `{ simulated: true, reason: "resend_domain_unverified" }` en lugar de HTTP 500.
- **Google Lighthouse sobre build local (`next start`)**:
  - **Accessibility**: **100 / 100** (`color-contrast`: `1`, `heading-order`: `1`).
  - **Best Practices**: **100 / 100**, **SEO**: **100 / 100**.
  - **LCP**: **0.9 s** (score `1.00`), **CLS**: **0** (score `1.00`).

---

## 6. Acción Manual Pendiente en Producción (Infraestructura)

Para que **Resend envíe emails reales a cualquier cliente** en `https://citas.donaire.dev` (y no quede en modo simulado por restricción sandbox):
1. Verificar el dominio `donaire.dev` (registros DKIM/SPF) en [resend.com/domains](https://resend.com/domains).
2. Añadir la variable de entorno `RESEND_FROM_EMAIL=Krono / Donaire Citas <citas@donaire.dev>` en Vercel y redesplegar.
3. Desplegar estos cambios locales (`git push` / `vercel --prod`) para llevar todas las correcciones a `https://citas.donaire.dev`.
