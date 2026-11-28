import React from 'react'
import Link from 'next/link'
import {
  BellRing,
  CalendarPlus,
  ChevronDown,
  PlayCircle,
  ShieldCheck,
  Star,
  UserX,
} from 'lucide-react'
import { HeroThemePreview } from '@/components/landing/HeroThemePreview'
import { OwnerPanelShowcase } from '@/components/landing/OwnerPanelShowcase'
import { REPO_URL } from '@/lib/project'

const TARGET_NICHES = ['Barberías', 'Clínicas', 'Estética', 'Tatuadores', 'Coaches']

const FEATURES = [
  {
    icon: UserX,
    title: 'Reservas sin llamadas',
    text: 'Tus clientes reservan desde el enlace de tu bio, sin descargar apps ni crear contraseña.',
  },
  {
    icon: BellRing,
    title: 'Recupera a quien no vuelve',
    text: 'El panel señala a los clientes inactivos y te deja escribirles por WhatsApp o email en un toque.',
  },
  {
    icon: CalendarPlus,
    title: 'Directo al calendario',
    text: 'Cada confirmación incluye archivo .ics y botón de Google Calendar.',
  },
  {
    icon: ShieldCheck,
    title: 'Sin dobles reservas',
    text: 'PostgreSQL impide dos citas solapadas y el panel frena a quien acumula plantones.',
  },
]

const STEPS = [
  {
    title: 'Abre el repositorio',
    text: 'En GitHub, deja una estrella y pulsa «Deploy with Vercel» en el README.',
  },
  {
    title: 'Crea la base de datos',
    text: 'Aceptas Supabase y eliges la contraseña de tu panel. Las tablas se crean solas.',
  },
  {
    title: 'Configura en /setup',
    text: 'Nombre, horario, servicios y diseño. Después compartes tu enlace de reservas.',
  },
]

const FAQ_ITEMS = [
  {
    q: '¿De verdad es gratis?',
    a: 'Sí, el programa no cuesta nada. Se instala en tus propias cuentas, así que dependes de las condiciones de cada servicio: Supabase y Resend tienen capa gratuita, y el plan gratuito de Vercel (Hobby) no permite uso comercial, por lo que un negocio puede necesitar un plan de pago u otro alojamiento.',
  },
  {
    q: '¿Necesito un dominio para los correos?',
    a: 'Para enviar confirmaciones a tus clientes, Resend exige verificar un dominio propio. Sin él, las reservas funcionan pero esos correos no llegan.',
  },
  {
    q: '¿Dos personas pueden reservar la misma hora?',
    a: 'No. La base de datos rechaza rangos horarios solapados, aunque las dos pulsen a la vez.',
  },
  {
    q: '¿Hay soporte o garantía?',
    a: 'Es un proyecto personal que se ofrece tal cual, sin garantías ni soporte asegurado. Puedes avisar de un fallo abriendo una incidencia en GitHub.',
  },
]

const primaryButton =
  'flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-zinc-950 transition-all hover:bg-emerald-400 active:scale-[0.98]'
const secondaryButton =
  'flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-900/70 px-6 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.98]'
const navLink =
  'flex min-h-12 items-center rounded-lg px-3 transition-colors hover:text-white'
const sectionTitle = 'text-3xl font-bold tracking-tight text-white sm:text-4xl'

function StarButton({ className = '' }: { className?: string }) {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`${primaryButton} ${className}`}
    >
      <Star className="h-4 w-4" />
      Dale una estrella en GitHub
    </a>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-zinc-950 pb-24 font-sans text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-h-12 items-center gap-2.5 rounded-xl pr-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 font-mono text-sm font-bold text-emerald-400">
              KD
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">Krono</span>
          </Link>
          <nav
            aria-label="Navegación principal"
            className="flex items-center gap-1 text-sm text-zinc-400"
          >
            <a href="#instalacion" className={`${navLink} hidden md:flex`}>
              Instalación
            </a>
            <a href="#faq" className={`${navLink} hidden md:flex`}>
              Preguntas
            </a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={navLink}>
              Código
            </a>
            <Link href="/demo" className={navLink}>
              Demo
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-18 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-white/10 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-emerald-400">
              Gratis · Con el código a la vista
            </span>
            <h1 className="text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Reservas online para negocios con cita previa.{' '}
              <span className="text-zinc-400">Gratis.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              Página de reservas con 3 diseños, panel privado para el dueño y avisos para
              recuperar clientes. Lo instalas en tus propias cuentas.
            </p>
            <div aria-label="Sectores compatibles" className="flex flex-wrap gap-2">
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
              <StarButton />
              <Link href="/demo" className={secondaryButton}>
                <PlayCircle className="h-4 w-4 text-emerald-400" />
                Probar la demo
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <HeroThemePreview />
          </div>
        </section>

        <section aria-labelledby="funciones" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <h2 id="funciones" className="sr-only">
            Funciones principales
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-5 backdrop-blur-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-950 text-emerald-400">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="text-base font-semibold tracking-tight text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6">
            <div className="space-y-3 text-center">
              <h2 className={sectionTitle}>El panel del dueño</h2>
              <p className="mx-auto max-w-2xl text-sm text-zinc-400 sm:text-base">
                Agenda, clientes que no han vuelto y bloqueo de plantones. Los datos que ves
                aquí son de ejemplo.
              </p>
            </div>
            <OwnerPanelShowcase />
            <Link href="/demo/admin" className={`${secondaryButton} mx-auto w-full sm:w-fit`}>
              Abrir el panel de demo
            </Link>
          </div>
        </section>

        <section id="instalacion" className="scroll-mt-20 border-t border-white/10 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6">
            <h2 className={`${sectionTitle} text-center`}>Instalación en 3 pasos</h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-5"
                >
                  <span className="font-mono text-sm text-emerald-400">{index + 1}</span>
                  <h3 className="text-base font-semibold tracking-tight text-white">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-400">{step.text}</p>
                </li>
              ))}
            </ol>
            <StarButton className="mx-auto w-full sm:w-fit" />
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-t border-white/10 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl space-y-8 px-4 sm:px-6">
            <h2 className={`${sectionTitle} text-center`}>Preguntas frecuentes</h2>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-white/10 bg-zinc-900/60 open:border-white/20"
                >
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-medium text-white select-none sm:p-5 sm:text-base [&::-webkit-details-marker]:hidden">
                    <span>{item.q}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="border-t border-white/10 px-4 py-4 text-sm leading-relaxed text-zinc-300 sm:px-5">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-zinc-400 sm:flex-row sm:px-6">
          <p>Krono · Hecho por Álvaro, 15 años</p>
          <nav aria-label="Enlaces legales" className="flex flex-wrap justify-center gap-1">
            <Link href="/legal#licencia" className={navLink}>
              Condiciones de uso
            </Link>
            <Link href="/legal#privacidad" className={navLink}>
              Privacidad
            </Link>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={navLink}>
              GitHub
            </a>
          </nav>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/90 p-3 backdrop-blur-md md:hidden">
        <StarButton />
      </div>
    </div>
  )
}
