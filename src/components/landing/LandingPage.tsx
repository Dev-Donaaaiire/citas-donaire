import React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BellRing,
  CalendarPlus,
  Check,
  ChevronDown,
  CircleCheck,
  CircleX,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserX,
  Zap,
} from 'lucide-react'
import { HeroThemePreview } from '@/components/landing/HeroThemePreview'
import { OwnerPanelShowcase } from '@/components/landing/OwnerPanelShowcase'
import { getSalesContactLink } from '@/lib/legal'
import {
  CheckoutTriggerButton,
  LandingCheckoutProvider,
} from '@/components/landing/LandingCheckoutControls'

const TARGET_NICHES = [
  'Barberías',
  'Clínicas',
  'Estética',
  'Tatuadores',
  'Coaches',
] as const

const COMPARISON: { row: string; old: string; ours: string }[] = [
  { row: 'Coste en 5 años', old: '500 € (100 €/año)', ours: '14,99 € una sola vez' },
  { row: 'Cuotas del software', old: 'Cada año, para siempre', ours: 'Ninguna · pago único' },
  { row: 'Diseño', old: 'Interfaces antiguas, iguales para todos', ours: '3 diseños de lujo intercambiables' },
  { row: 'Licencia', old: 'Alquilas: si dejas de pagar, lo pierdes', ours: 'De uso para tu negocio, con código fuente (sin reventa ni marca blanca)' },
  { row: 'Clientes que no vuelven', old: 'Extra o inexistente', ours: 'Detección de inactivos y aviso en un toque' },
  { row: 'Avisos al calendario', old: 'Manual o de pago', ours: 'Google Calendar y .ics en 1 toque' },
]

const FEATURES = [
  {
    icon: UserX,
    title: 'Cero llamadas ni WhatsApps sueltos',
    text: 'Tus clientes reservan solos desde tu enlace en la bio de Instagram en 30 segundos, sin descargar apps ni crear contraseña.',
  },
  {
    icon: BellRing,
    title: 'Recupera a quien lleva +30 días sin volver',
    text: 'El panel detecta clientes fríos y te deja enviarles un recordatorio directo por WhatsApp o Email en un toque.',
  },
  {
    icon: CalendarPlus,
    title: 'Directo a tu calendario y al suyo',
    text: 'Cada confirmación incluye archivo .ics compatible con Apple Calendar, Outlook y botón directo de Google Calendar.',
  },
  {
    icon: ShieldCheck,
    title: 'Escudo anti no-show + bloqueo atómico',
    text: 'Bloquea en servidor a quien acumula dos plantones e impide dobles reservas concurrentes a nivel de PostgreSQL.',
  },
] as const

const EXAMPLE_CASES = [
  {
    niche: 'Barbería · Ticket medio 25 €',
    metric: '+125 €/mes',
    headline: 'Menos huecos muertos en horas valle',
    detail:
      'Supuesto: 4 clientes recuperados al mes (1 por semana) desde el listado de +30 días sin visita y 1 doble reserva evitada, a 25 € cada uno. Tu resultado puede ser distinto.',
    verifyHref: '/demo/admin',
    verifyLabel: 'Ver módulo de retención en vivo',
  },
  {
    niche: 'Clínica / Fisioterapia · 45 €/sesión',
    metric: '485,01 €',
    headline: 'Ahorro estimado en 5 años frente a SaaS',
    detail:
      'Cálculo: 500 € (cuota supuesta de 100 €/año) menos 14,99 € de licencia. No incluye alojamiento, dominio ni otros servicios externos.',
    verifyHref: '/demo',
    verifyLabel: 'Probar flujo de cita clínica',
  },
  {
    niche: 'Estética, Tatuajes y Coaching',
    metric: '30 seg',
    headline: 'De la bio de Instagram a cita cerrada',
    detail:
      'El cliente toca el servicio, elige día y hora disponibles en su huso horario y recibe enlace propio para reprogramar sin llamarte si le surge un imprevisto.',
    verifyHref: '/demo',
    verifyLabel: 'Probar los 3 diseños en la demo',
  },
] as const

const PLAN_1_FEATURES = [
  'Licencia vitalicia de uso comercial para tu negocio',
  'Los 3 diseños exclusivos (Dark Luxury, Clean Minimal, Neon Creator)',
  'Motor anti doble-reserva en PostgreSQL + panel /admin con retención +30d',
  'Código fuente Next.js 16 completo + guía de instalación paso a paso',
]

const PLAN_2_FEATURES = [
  'Todo lo incluido en Código Autoinstalable + licencia de por vida',
  'Instalación completa en tus propias cuentas de Vercel y Supabase en < 24 h',
  'Verificación DNS de tu dominio propio en Resend (SPF/DKIM) para emails sin spam',
  'Carga inicial de tu marca, tema elegido, servicios, precios, horarios y test real',
  'Entrega lista para pegar tu enlace en Instagram sin tocar una sola línea de código',
]

const FAQ_ITEMS = [
  {
    q: '¿Qué necesito para enviar emails automáticos con el nombre de mi negocio? (Resend y dominio propio)',
    a: 'El envío usa Resend (capa gratuita de hasta 3.000 emails/mes). Para enviar confirmaciones y recordatorios a cualquier cliente final desde tu marca sin caer en spam, Resend exige verificar un dominio propio (registros DNS SPF/DKIM). Si aún no tienes dominio web, registrar un .es o .com cuesta aprox. 8–12 €/año. Si eliges el plan Llave en Mano (99 €), configuramos esos registros DNS contigo para dejarlo verificado.',
  },
  {
    q: '¿De verdad no hay cuotas mensuales por usar Krono / Donaire Citas?',
    a: 'No nos pagas ninguna cuota recurrente: el software es un pago único y se despliega en tus propias cuentas. La base de datos (Supabase, hasta 500 MB) y el email (Resend, hasta 3.000 correos al mes) tienen capas gratuitas. El alojamiento debes elegirlo en un plan que permita uso comercial según las condiciones del proveedor (el plan Hobby de Vercel no lo permite), así que puede tener coste. A esto se suma tu dominio propio (~10 €/año) si deseas enviar emails con tu marca.',
  },
  {
    q: '¿En qué se diferencia exactamente el plan de 14,99 € del de 99 € Llave en Mano?',
    a: 'El software es idéntico. En 14,99 € descargas el repositorio y sigues el vídeo paso a paso para conectarlo tú mismo en Supabase, Vercel y Resend. En 99 € Llave en Mano lo configuramos todo por ti en menos de 24 h: base de datos, seguridad RLS, variables de entorno, verificación DNS en Resend y carga de tus servicios y horarios para que solo copies el link en Instagram.',
  },
  {
    q: '¿Dos personas pueden reservar la misma hora a la vez si pulsan en el mismo segundo?',
    a: 'No. Además de consultar disponibilidad en tiempo real, PostgreSQL aplica una restricción de exclusión GiST atómica sobre rangos horarios para citas activas. Si dos clientes intentan confirmar un horario solapado en el mismo milisegundo, el servidor confirma uno y avisa al segundo para elegir otra hora.',
  },
  {
    q: '¿Puedo probarlo todo antes de pagar? ¿Hay devoluciones?',
    a: 'La Demo Interactiva (/demo y /demo/admin) es libre, gratuita e ilimitada precisamente para que pruebes el flujo de reserva, los 3 temas visuales y el panel del dueño con calma antes de comprar. Al tratarse de un producto digital con entrega inmediata de licencia y código tras el pago, no existe derecho de desistimiento una vez completada la compra (art. 103.m TRLGDCU).',
  },
] as const

export function LandingPage() {
  const salesContact = getSalesContactLink('Llave en Mano')

  return (
    <LandingCheckoutProvider>
      <div className="min-h-dvh bg-zinc-950 pb-24 font-sans text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950 md:pb-0">
        {/* Navegación */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link
              href="/"
              className="flex min-h-12 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-xl pr-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 font-mono text-sm font-bold text-emerald-400">
                KD
              </span>
              <span className="hidden text-sm font-semibold tracking-tight text-white sm:block">
                Krono / Donaire Citas
              </span>
            </Link>

            <nav
              aria-label="Navegación principal"
              className="hidden items-center gap-1 text-sm text-zinc-400 md:flex"
            >
              <a
                href="#panel-dueno"
                className="flex min-h-12 items-center rounded-lg px-3 hover:text-white transition-colors"
              >
                Panel dueño
              </a>
              <a
                href="#comparativa"
                className="flex min-h-12 items-center rounded-lg px-3 hover:text-white transition-colors"
              >
                Comparativa
              </a>
              <a
                href="#precios"
                className="flex min-h-12 items-center rounded-lg px-3 hover:text-white transition-colors"
              >
                Precios
              </a>
              <a
                href="#faq"
                className="flex min-h-12 items-center rounded-lg px-3 hover:text-white transition-colors"
              >
                Preguntas
              </a>
              <Link
                href="/demo"
                className="flex min-h-12 items-center rounded-lg px-3 hover:text-white transition-colors"
              >
                Demo en vivo
              </Link>
            </nav>

            <CheckoutTriggerButton
              planId="15"
              className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs sm:text-sm font-semibold text-zinc-950 shadow-[0_0_20px_rgb(var(--glow-rgb)/0.25)] transition-all hover:bg-emerald-400 active:scale-[0.98]"
            >
              Obtener · 14,99 €
            </CheckoutTriggerButton>
          </div>
        </header>

        <main>
          {/* HERO MULTI-NICHO */}
          <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-18 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-emerald-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Pago único · Sin cuotas del software
                </span>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-zinc-900/60 px-3 py-1.5 font-mono text-xs text-zinc-300">
                  Hecho para el enlace de tu bio en Instagram
                </span>
              </div>

              <h1 className="text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Convierte visitas de Instagram en citas confirmadas.{' '}
                <span className="text-zinc-400">
                  Sin pagar alquileres mensuales, por{' '}
                  <span className="text-emerald-400 font-mono">14,99 €</span> una sola vez.
                </span>
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
                Sistema propio de reservas para negocios por cita previa con 3 diseños de
                lujo intercambiables, panel privado anti no-show y avisos en un toque para
                recuperar clientes inactivos.
              </p>

              {/* Chips de nichos objetivo */}
              <div
                aria-label="Sectores compatibles"
                className="flex flex-wrap items-center gap-2"
              >
                {TARGET_NICHES.map((niche) => (
                  <span
                    key={niche}
                    className="rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-1.5 font-mono text-xs text-zinc-200"
                  >
                    {niche}
                  </span>
                ))}
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <Link
                  href="/demo"
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-900/70 px-6 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.98]"
                >
                  <PlayCircle className="h-4 w-4 text-emerald-400" />
                  Probar Demo Interactiva
                </Link>
                <a
                  href="#precios"
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_rgb(var(--glow-rgb)/0.3)] transition-all hover:bg-emerald-400 active:scale-[0.98]"
                >
                  <span>Elegir plan · desde 14,99 €</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-zinc-400">
                <span>✓ Licencia vitalicia</span>
                <span>✓ Plan Autoinstalable desde 14,99 €</span>
                <span>✓ Sin permanencia</span>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <HeroThemePreview />
            </div>
          </section>

          {/* BENEFICIOS */}
          <section
            aria-labelledby="beneficios-heading"
            className="mx-auto max-w-6xl px-4 pb-16 sm:px-6"
          >
            <h2 id="beneficios-heading" className="sr-only">
              Ventajas principales del sistema de citas
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-5 shadow-sm backdrop-blur-md"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-950 text-emerald-400">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-semibold tracking-tight text-white">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-400">{f.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* PANEL DEL DUEÑO INTERACTIVO */}
          <section
            id="panel-dueno"
            className="scroll-mt-20 border-t border-white/10 py-16 sm:py-24"
          >
            <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6">
              <div className="space-y-3 text-center">
                <p className="font-mono text-xs uppercase tracking-wider text-emerald-400">
                  Mucho más que un calendario bonito
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  El panel que llena tus horas muertas y frena los plantones
                </h2>
                <p className="mx-auto max-w-2xl text-sm text-zinc-400 sm:text-base">
                  La mayoría de herramientas solo cogen citas. Krono vigila tu tasa de
                  regreso a 30 días, protege tus huecos frente a dobles reservas y te deja
                  reactivar clientes con un clic.
                </p>
              </div>

              <OwnerPanelShowcase />
            </div>
          </section>

          {/* EJEMPLOS DE CÁLCULO */}
          <section
            id="casos"
            className="scroll-mt-20 border-t border-white/10 py-16 sm:py-24"
          >
            <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6">
              <div className="space-y-3 text-center">
                <p className="font-mono text-xs uppercase tracking-wider text-emerald-400">
                  Estimaciones orientativas
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Ejemplos de cálculo para un negocio de agenda
                </h2>
                <p className="mx-auto max-w-2xl text-sm text-zinc-400 sm:text-base">
                  Son supuestos, no resultados garantizados. Haz las cuentas con tu propio
                  ticket medio y prueba las funciones en las demos abiertas.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                {EXAMPLE_CASES.map((item) => (
                  <article
                    key={item.headline}
                    className="flex flex-col justify-between rounded-3xl border border-white/10 bg-zinc-900/60 p-6 shadow-sm backdrop-blur-md space-y-5"
                  >
                    <div className="space-y-3">
                      <span className="inline-block rounded-full border border-white/10 bg-zinc-950 px-3 py-1 font-mono text-[11px] text-zinc-300">
                        {item.niche}
                      </span>
                      <p className="font-mono text-3xl font-bold tracking-tight text-emerald-400 tabular-nums">
                        {item.metric}
                      </p>
                      <h3 className="text-lg font-semibold tracking-tight text-white">
                        {item.headline}
                      </h3>
                      <p className="text-sm leading-relaxed text-zinc-400">
                        {item.detail}
                      </p>
                    </div>

                    <Link
                      href={item.verifyHref}
                      className="inline-flex min-h-12 items-center justify-between rounded-xl border border-white/10 bg-zinc-950/60 px-4 text-xs font-medium text-white transition-all hover:border-emerald-500/40 hover:bg-zinc-800 active:scale-[0.98]"
                    >
                      <span>{item.verifyLabel}</span>
                      <ArrowRight className="h-4 w-4 text-emerald-400 shrink-0" />
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* COMPARATIVA */}
          <section
            id="comparativa"
            className="scroll-mt-20 border-t border-white/10 py-16 sm:py-24"
          >
            <div className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6">
              <div className="space-y-3 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  500 € en 5 años o 14,99 € para siempre
                </h2>
                <p className="mx-auto max-w-xl text-sm text-zinc-400 sm:text-base">
                  Lo que pagas por alquilar un programa de citas frente a tener tu propio
                  sistema instalado en tu infraestructura.
                </p>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/60 shadow-md backdrop-blur-md">
                <div className="grid grid-cols-[1fr_1fr] md:grid-cols-[0.8fr_1fr_1fr]">
                  <div className="hidden border-b border-white/10 p-4 md:block" />
                  <div className="border-b border-white/10 p-4">
                    <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                      Programas tradicionales
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-300">
                      100 €/año = 500 € en 5 años + interfaz genérica
                    </p>
                  </div>
                  <div className="border-b border-l border-white/10 bg-emerald-500/5 p-4">
                    <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                      Krono / Donaire Citas
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      14,99 € pago único + 3 temas de lujo + código fuente
                    </p>
                  </div>

                  {COMPARISON.map((r) => (
                    <React.Fragment key={r.row}>
                      <div className="col-span-2 border-b border-white/5 px-4 pt-3 text-xs font-mono text-zinc-400 md:col-span-1 md:flex md:items-center md:p-4 md:text-sm md:text-zinc-300">
                        {r.row}
                      </div>
                      <div className="flex items-start gap-2 border-b border-white/5 p-4 text-sm text-zinc-400">
                        <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                        <span>{r.old}</span>
                      </div>
                      <div className="flex items-start gap-2 border-b border-l border-white/5 bg-emerald-500/5 p-4 text-sm text-white">
                        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{r.ours}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 bg-zinc-950/50 p-5 sm:flex-row">
                  <p className="text-sm text-zinc-300">
                    Ahorro estimado en 5 años:{' '}
                    <span className="font-mono text-lg font-bold text-emerald-400 tabular-nums">
                      485,01 €
                    </span>
                    <span className="mt-1 block text-xs text-zinc-400">
                      Orientativo: sin contar alojamiento, dominio ni otros servicios.
                    </span>
                  </p>
                  <CheckoutTriggerButton
                    planId="15"
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-zinc-950 transition-all hover:bg-emerald-400 active:scale-[0.98] sm:w-auto"
                  >
                    Quiero el mío por 14,99 €
                  </CheckoutTriggerButton>
                </div>
              </div>
            </div>
          </section>

          {/* PRECIOS CON DIFERENCIACIÓN CLARA */}
          <section
            id="precios"
            className="scroll-mt-20 border-t border-white/10 py-16 sm:py-24"
          >
            <div className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6">
              <div className="space-y-3 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Un único pago. Elige si lo montas tú o te lo entregamos funcionando.
                </h2>
                <p className="text-sm text-zinc-400 sm:text-base">
                  El código es exactamente el mismo en ambos planes. En el de 99 € pagas por
                  ahorrarte la parte técnica, el DNS de emails y la puesta a punto inicial.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Plan 14,99 € */}
                <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-zinc-900/60 p-6 shadow-md backdrop-blur-md sm:p-8">
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                        Para perfiles técnicos o con soporte IT
                      </span>
                      <h3 className="text-xl font-semibold tracking-tight text-white">
                        Código Autoinstalable
                      </h3>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-5xl font-bold text-white tabular-nums">
                        14,99 €
                      </span>
                      <span className="font-mono text-xs text-zinc-400">Pago único</span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Descarga inmediata de repositorio, esquema PostgreSQL blindado y
                      licencia vitalicia de uso para desplegarlo tú en tus propias cuentas.
                    </p>

                    <ul className="space-y-3 text-sm text-zinc-300">
                      {PLAN_1_FEATURES.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <CheckoutTriggerButton
                    planId="15"
                    className="mt-8 flex min-h-12 w-full items-center justify-center rounded-xl border border-white/15 bg-zinc-800 px-4 text-sm font-semibold text-white transition-all hover:bg-zinc-700 active:scale-[0.98]"
                  >
                    Obtener Autoinstalable · 14,99 €
                  </CheckoutTriggerButton>
                </div>

                {/* Plan 99 € Llave en Mano */}
                <div className="relative flex flex-col justify-between rounded-3xl border border-emerald-500/55 bg-zinc-900/80 p-6 shadow-xl backdrop-blur-md sm:p-8">
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-zinc-950">
                    <Zap className="h-3.5 w-3.5" />
                    Recomendado para dueños sin tiempo técnico
                  </span>

                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <span className="font-mono text-xs uppercase tracking-wider text-emerald-400">
                        Listo en &lt; 24 h · cero configuraciones
                      </span>
                      <h3 className="text-xl font-semibold tracking-tight text-white">
                        Llave en Mano
                      </h3>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-5xl font-bold text-white tabular-nums">
                        99 €
                      </span>
                      <span className="font-mono text-xs text-zinc-400">
                        Pago único · Setup completo
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Por 84 € adicionales nos encargamos de todo el despliegue en tus
                      cuentas, DNS del dominio para emails y carga de tu catálogo. Como
                      referencia, 99 € equivalen a entre 2 y 4 citas de 25–45 €.
                    </p>

                    <ul className="space-y-3 text-sm text-zinc-200">
                      {PLAN_2_FEATURES.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <CheckoutTriggerButton
                      planId="99"
                      className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_rgb(var(--glow-rgb)/0.3)] transition-all hover:bg-emerald-400 active:scale-[0.98]"
                    >
                      <span>Quiero la Llave en Mano · 99 €</span>
                      <ArrowRight className="h-4 w-4" />
                    </CheckoutTriggerButton>
                    {salesContact && (
                      <a
                        href={salesContact.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-center text-xs text-zinc-300 transition-colors hover:text-white hover:border-white/20 active:scale-[0.98]"
                      >
                        ¿Dudas técnicas antes de contratar Llave en Mano? Escríbenos por {salesContact.label}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-zinc-400">
                Antes de pagar podrás revisar los{' '}
                <Link
                  href="/legal#licencia"
                  className="underline underline-offset-4 hover:text-white"
                >
                  Términos de Licencia
                </Link>
                . Al ser contenido digital de entrega inmediata no existe derecho de
                desistimiento (art. 103.m TRLGDCU), por eso{' '}
                <Link
                  href="/demo"
                  className="underline underline-offset-4 hover:text-emerald-400"
                >
                  la Demo Interactiva
                </Link>{' '}
                es 100% abierta y gratuita.
              </p>
            </div>
          </section>

          {/* PREGUNTAS FRECUENTES HONESTAS */}
          <section
            id="faq"
            className="scroll-mt-20 border-t border-white/10 py-16 sm:py-24"
          >
            <div className="mx-auto max-w-3xl space-y-8 px-4 sm:px-6">
              <div className="space-y-3 text-center">
                <p className="font-mono text-xs uppercase tracking-wider text-emerald-400">
                  Transparencia técnica y legal
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Preguntas frecuentes sin adornos
                </h2>
              </div>

              <div className="space-y-3">
                {FAQ_ITEMS.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md transition-colors open:border-white/20"
                  >
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5 text-sm sm:text-base font-medium text-white select-none [&::-webkit-details-marker]:hidden">
                      <span>{item.q}</span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-white/10 px-4 py-4 sm:px-5 text-sm leading-relaxed text-zinc-300">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-zinc-400 sm:flex-row sm:px-6">
            <p>© 2026 Krono / Donaire Citas · Pago único, para siempre.</p>
            <nav
              aria-label="Enlaces legales y demo"
              className="flex flex-wrap items-center justify-center gap-1"
            >
              <Link
                href="/legal#licencia"
                className="flex min-h-12 items-center px-3 hover:text-white transition-colors"
              >
                Licencia
              </Link>
              <Link
                href="/legal#aviso-legal"
                className="flex min-h-12 items-center px-3 hover:text-white transition-colors"
              >
                Aviso Legal
              </Link>
              <Link
                href="/legal#privacidad"
                className="flex min-h-12 items-center px-3 hover:text-white transition-colors"
              >
                Privacidad
              </Link>
              <Link
                href="/demo"
                className="flex min-h-12 items-center px-3 hover:text-white transition-colors"
              >
                Demo cliente
              </Link>
              <Link
                href="/demo/admin"
                className="flex min-h-12 items-center px-3 hover:text-white transition-colors"
              >
                Demo panel
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </LandingCheckoutProvider>
  )
}
