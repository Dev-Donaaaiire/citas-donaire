'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react'

interface AdminLoginFormProps {
  nextPath: string
  authConfigured: boolean
}

export function AdminLoginForm({
  nextPath,
  authConfigured,
}: AdminLoginFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password.trim() || !authConfigured) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, next: nextPath }),
      })

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        redirectTo?: string
        error?: string
      }

      if (!response.ok || !data.ok) {
        setErrorMessage(data.error || 'No se pudo iniciar sesión.')
        setIsSubmitting(false)
        return
      }

      router.replace(data.redirectTo || nextPath || '/admin')
      router.refresh()
    } catch {
      setErrorMessage('Error de red al verificar la sesión.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-6">
      <header className="max-w-md w-full mx-auto pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 min-h-12 px-3 -ml-3 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al inicio</span>
        </Link>
      </header>

      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="rounded-2xl bg-zinc-900/70 backdrop-blur-md border border-white/10 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
              Acceso de Propietario
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Inicia sesión para gestionar agenda, clientes y configuración del
              negocio.
            </p>
          </div>

          {!authConfigured ? (
            <div
              role="alert"
              className="p-4 rounded-xl bg-amber-950/35 border border-amber-500/30 text-amber-200 space-y-2.5 text-xs leading-relaxed"
            >
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Autenticación pendiente de configurar</span>
              </div>
              <p>
                Por seguridad, el panel administrativo permanece bloqueado hasta
                que definas{' '}
                <code className="px-1.5 py-0.5 rounded bg-zinc-900 font-mono text-amber-100">
                  ADMIN_PASSWORD
                </code>{' '}
                (mínimo 10 caracteres) y
                conectes Supabase en las variables de entorno del proyecto, y
                vuelvas a desplegar.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Contraseña de administrador
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Introduce tu clave maestra"
                    className="w-full min-h-12 pl-10 pr-14 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                    className="absolute right-0 top-1/2 -translate-y-1/2 min-w-12 min-h-12 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors active:scale-[0.98]"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 font-medium"
                >
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !password.trim()}
                className="w-full min-h-12 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-semibold hover:bg-emerald-400 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando sesión...</span>
                  </>
                ) : (
                  <span>Entrar al Panel</span>
                )}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 text-xs text-zinc-400">
            <span>¿Solo quieres probar la herramienta?</span>
            <Link
              href="/demo/admin"
              className="min-h-12 px-3 inline-flex items-center rounded-lg border border-white/10 bg-zinc-950 text-zinc-200 hover:bg-zinc-800 transition-colors font-medium shrink-0"
            >
              Ver Demo Sandbox
            </Link>
          </div>
        </div>
      </main>

      <footer className="max-w-md w-full mx-auto text-center text-xs font-mono text-zinc-500 pb-2">
        Sesión protegida con cookie HttpOnly firmada (HMAC-SHA256)
      </footer>
    </div>
  )
}
