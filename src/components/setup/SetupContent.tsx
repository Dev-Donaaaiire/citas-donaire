'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Database,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  ArrowRight,
  LogOut,
  Globe,
  MapPin,
  Phone,
} from 'lucide-react'
import { INITIAL_SUPABASE_SQL_SCRIPT } from '@/lib/initial-sql'
import type { InitialSetupPayload } from '@/lib/data/admin-setup'
import { THEMES, type ThemeId } from '@/lib/themes'
import { normalizeWorkingDays } from '@/lib/timezone'
import { FormFieldConfigurator } from '@/components/setup/FormFieldConfigurator'
import {
  normalizeFormFields,
  type FormCustomizationSettings,
} from '@/lib/form-field-rules'

interface EditableService {
  id?: string
  nombre: string
  duracion_minutos: number
  precio: number
}

const DEFAULT_SERVICES: EditableService[] = [
  { nombre: 'Sesión / Servicio Principal', duracion_minutos: 30, precio: 25 },
  { nombre: 'Servicio Completo Premium', duracion_minutos: 60, precio: 45 },
]

const WEEKDAYS = [
  { num: 1, label: 'L' },
  { num: 2, label: 'M' },
  { num: 3, label: 'X' },
  { num: 4, label: 'J' },
  { num: 5, label: 'V' },
  { num: 6, label: 'S' },
  { num: 0, label: 'D' },
]

const TIMEZONES = [
  'Europe/Madrid',
  'Atlantic/Canary',
  'Europe/London',
  'Europe/Paris',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Argentina/Buenos_Aires',
  'America/Santiago',
  'America/New_York',
  'UTC',
]

export function SetupContent({
  initialSetupData,
}: {
  initialSetupData: InitialSetupPayload
}) {
  const router = useRouter()

  const [setupData, setSetupData] =
    useState<InitialSetupPayload>(initialSetupData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)
  const copyTimerRef = useRef<number | null>(null)

  const initialSettings = initialSetupData.settings

  const [settingsId, setSettingsId] = useState<string | null>(
    initialSettings?.id ?? null
  )
  const [nombreNegocio, setNombreNegocio] = useState(
    initialSettings?.nombre_negocio || 'Mi Negocio'
  )
  const [emailNotificaciones, setEmailNotificaciones] = useState(
    initialSettings?.email_notificaciones || ''
  )
  const [direccion, setDireccion] = useState(initialSettings?.direccion || '')
  const [urlResenas, setUrlResenas] = useState(initialSettings?.url_resenas || '')
  const [telefonoContacto, setTelefonoContacto] = useState(
    initialSettings?.telefono_contacto || ''
  )
  const [timezone, setTimezone] = useState(
    initialSettings?.timezone || 'Europe/Madrid'
  )
  const [horarioApertura, setHorarioApertura] = useState(
    (initialSettings?.horario_apertura || '09:00').slice(0, 5)
  )
  const [horarioCierre, setHorarioCierre] = useState(
    (initialSettings?.horario_cierre || '20:00').slice(0, 5)
  )
  const [duracionCita, setDuracionCita] = useState<number>(
    initialSettings?.duracion_cita_minutos || 30
  )
  const [diasLaborables, setDiasLaborables] = useState<number[]>(
    normalizeWorkingDays(initialSettings?.dias_laborables)
  )
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(
    initialSettings?.tema_activo || 'dark_luxury'
  )
  const [modoDemo, setModoDemo] = useState<boolean>(
    initialSettings?.modo_demo !== undefined
      ? Boolean(initialSettings.modo_demo)
      : true
  )
  const [services, setServices] = useState<EditableService[]>(
    initialSetupData.services.length > 0
      ? initialSetupData.services.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          duracion_minutos: s.duracion_minutos,
          precio: Number(s.precio),
        }))
      : DEFAULT_SERVICES
  )

  const [camposFormulario, setCamposFormulario] =
    useState<FormCustomizationSettings>(
      normalizeFormFields(initialSettings?.campos_formulario)
    )

  const [isSaving, setIsSaving] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  const { diagnostics } = setupData

  const handleRefreshDiagnostics = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/admin/setup', { cache: 'no-store' })
      if (!res.ok) return
      const fresh = (await res.json()) as InitialSetupPayload
      setSetupData(fresh)
      if (fresh.settings) {
        setSettingsId(fresh.settings.id)
        setNombreNegocio(fresh.settings.nombre_negocio)
        setEmailNotificaciones(fresh.settings.email_notificaciones || '')
        setDireccion(fresh.settings.direccion || '')
        setTelefonoContacto(fresh.settings.telefono_contacto || '')
        setUrlResenas(fresh.settings.url_resenas || '')
        setTimezone(fresh.settings.timezone || 'Europe/Madrid')
        setHorarioApertura(
          (fresh.settings.horario_apertura || '09:00').slice(0, 5)
        )
        setHorarioCierre((fresh.settings.horario_cierre || '20:00').slice(0, 5))
        setDuracionCita(fresh.settings.duracion_cita_minutos || 30)
        setModoDemo(Boolean(fresh.settings.modo_demo))
        setDiasLaborables(normalizeWorkingDays(fresh.settings.dias_laborables))
        setSelectedTheme(fresh.settings.tema_activo || 'dark_luxury')
      }
      if (fresh.services.length > 0) {
        setServices(
          fresh.services.map((s) => ({
            id: s.id,
            nombre: s.nombre,
            duracion_minutos: s.duracion_minutos,
            precio: Number(s.precio),
          }))
        )
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(INITIAL_SUPABASE_SQL_SCRIPT)
      setCopiedSql(true)
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedSql(false)
      }, 2400)
    } catch {
      // Silencio seguro si portapapeles bloqueado
    }
  }

  const handleToggleDay = (dayNum: number) => {
    setDiasLaborables((prev) =>
      prev.includes(dayNum)
        ? prev.length > 1
          ? prev.filter((d) => d !== dayNum)
          : prev
        : [...prev, dayNum]
    )
  }

  const handleAddServiceRow = () => {
    setServices((prev) => [
      ...prev,
      { nombre: 'Nuevo servicio', duracion_minutos: 30, precio: 25 },
    ])
  }

  const handleUpdateServiceRow = (
    index: number,
    patch: Partial<EditableService>
  ) => {
    setServices((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    )
  }

  const handleRemoveServiceRow = (index: number) => {
    setServices((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSaveBusinessConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveFeedback(null)

    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingsId,
          nombreNegocio,
          emailNotificaciones,
          direccion,
          telefonoContacto,
          urlResenas,
          timezone,
          horarioApertura,
          horarioCierre,
          duracionCitaMinutos: duracionCita,
          diasLaborables,
          temaActivo: selectedTheme,
          modoDemo,
          camposFormulario,
          services,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean
        settingsId?: string
        services?: InitialSetupPayload['services']
        error?: string
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || 'No se pudo guardar la configuración en Supabase.'
        )
      }

      if (data.settingsId) setSettingsId(data.settingsId)
      if (Array.isArray(data.services)) {
        setServices(
          data.services.map((s) => ({
            id: s.id,
            nombre: s.nombre,
            duracion_minutos: s.duracion_minutos,
            precio: Number(s.precio),
          }))
        )
      }

      setSaveFeedback({
        type: 'success',
        message:
          '¡Listo! Negocio, horarios y catálogo guardados. Los servicios eliminados se han desactivado con seguridad.',
      })
    } catch (err) {
      setSaveFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo guardar la configuración en Supabase.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin/login')
    router.refresh()
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Cabecera Setup */}
      <header className="border-b border-white/10 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 min-h-16 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white">
                Asistente de Activación · Krono
              </h1>
              <p className="text-[11px] font-mono text-zinc-400">
                Diagnóstico, SQL seguro y alta de negocio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshDiagnostics}
              disabled={isRefreshing}
              className="min-h-12 px-3.5 rounded-xl border border-white/10 bg-zinc-900 text-xs font-medium text-zinc-200 hover:bg-zinc-800 flex items-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">Re-comprobar</span>
            </button>
            <Link
              href="/admin"
              className="min-h-12 px-4 rounded-xl bg-zinc-900 border border-white/10 text-xs font-semibold text-white hover:bg-zinc-800 flex items-center gap-1.5"
            >
              <span>Panel Admin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión de administrador"
              className="min-h-12 min-w-12 px-3 rounded-xl border border-white/10 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center justify-center"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Diagnóstico de Infraestructura y Seguridad */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Card 1: Variables Servidor */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                1. Entorno
              </span>
              {diagnostics.hasSupabaseUrl && diagnostics.hasServiceRole ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center justify-between text-zinc-300">
                <span>Supabase URL</span>
                <span
                  className={
                    diagnostics.hasSupabaseUrl
                      ? 'text-emerald-400 font-mono'
                      : 'text-amber-400 font-mono'
                  }
                >
                  {diagnostics.hasSupabaseUrl ? 'OK' : 'FALTA'}
                </span>
              </li>
              <li className="flex items-center justify-between text-zinc-300">
                <span>Service Role Key</span>
                <span
                  className={
                    diagnostics.hasServiceRole
                      ? 'text-emerald-400 font-mono'
                      : 'text-red-400 font-mono'
                  }
                >
                  {diagnostics.hasServiceRole ? 'OK' : 'FALTA'}
                </span>
              </li>
              <li className="flex items-center justify-between text-zinc-300">
                <span>Session HMAC Secret</span>
                <span
                  className={
                    diagnostics.hasAdminSecret
                      ? 'text-emerald-400 font-mono'
                      : 'text-amber-400 font-mono'
                  }
                >
                  {diagnostics.hasAdminSecret ? 'OK' : 'DERIVADO'}
                </span>
              </li>
              <li className="flex items-center justify-between text-zinc-300">
                <span>Resend Email API</span>
                <span
                  className={
                    diagnostics.hasResendKey
                      ? 'text-emerald-400 font-mono'
                      : 'text-zinc-400 font-mono'
                  }
                >
                  {diagnostics.hasResendKey ? 'ACTIVO' : 'SANDBOX'}
                </span>
              </li>
            </ul>
          </div>

          {/* Card 2: Esquema SQL */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                2. Base de Datos
              </span>
              {diagnostics.schemaReady ? (
                <Database className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <p className="text-sm font-semibold text-white">
              {diagnostics.schemaReady
                ? 'Tablas y RLS verificados'
                : 'Tablas pendientes de crear'}
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {diagnostics.schemaReady
                ? 'La estructura SQL endurecida y la exclusión GiST están listas.'
                : !diagnostics.hasServiceRole
                  ? 'Configura SUPABASE_SERVICE_ROLE_KEY primero para diagnosticar tablas.'
                  : diagnostics.dbErrorDetail
                    ? `Error: ${diagnostics.dbErrorDetail}`
                    : `Faltan tablas: ${diagnostics.missingTables.join(', ')}. Ejecuta el Paso 1.`}
            </p>
          </div>
        </section>

        {/* PASO 1: Script SQL Endurecido */}
        <section className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-zinc-800 text-zinc-300 border border-white/10 mb-2">
                Paso 1 · Base de Datos
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Script SQL Endurecido (RLS, GiST y RPCs)
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                La base de datos se prepara y actualiza sola en cada despliegue.
                Solo si no conectaste Supabase desde Vercel, copia este script y
                ejecútalo en{' '}
                <strong className="text-zinc-200">
                  Supabase Dashboard → SQL Editor
                </strong>
                .
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopySql}
              className="min-h-12 px-4 rounded-xl bg-zinc-950 border border-white/15 hover:border-emerald-500/40 text-xs font-semibold text-zinc-100 flex items-center justify-center gap-2 shrink-0 transition-all active:scale-[0.98]"
            >
              {copiedSql ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">SQL Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-zinc-400" />
                  <span>Copiar Script SQL</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-zinc-950 border border-white/10 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-56 leading-relaxed">
            <code>{INITIAL_SUPABASE_SQL_SCRIPT}</code>
          </pre>
        </section>

        {/* PASO 2: Formulario de Negocio, Ubicación, Horarios, Zona Horaria y Catálogo */}
        <form
          onSubmit={handleSaveBusinessConfig}
          className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10 space-y-6"
        >
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              Paso 2 · Tu Negocio
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Datos del Negocio, Ubicación, Horarios y Servicios
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Estos datos se muestran en tu página pública de reservas, emails
              automáticos y archivo .ics de calendario.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="setup-business-name"
                className="block text-xs font-medium text-zinc-300"
              >
                Nombre del negocio *
              </label>
              <input
                id="setup-business-name"
                type="text"
                required
                value={nombreNegocio}
                onChange={(e) => setNombreNegocio(e.target.value)}
                placeholder="Ej. Krono Studio & Barber"
                className="w-full min-h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="setup-notify-email"
                className="block text-xs font-medium text-zinc-300"
              >
                Email para avisos de nuevas reservas
              </label>
              <input
                id="setup-notify-email"
                type="email"
                value={emailNotificaciones}
                onChange={(e) => setEmailNotificaciones(e.target.value)}
                placeholder="reservas@tunegocio.com"
                className="w-full min-h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="setup-address"
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
              >
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>Dirección física (opcional)</span>
              </label>
              <input
                id="setup-address"
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej. Calle Gran Vía 24, Madrid"
                className="w-full min-h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="setup-phone"
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
              >
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                <span>Teléfono de contacto (opcional)</span>
              </label>
              <input
                id="setup-phone"
                type="tel"
                value={telefonoContacto}
                onChange={(e) => setTelefonoContacto(e.target.value)}
                placeholder="Ej. +34 600 000 000"
                className="w-full min-h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="setup-reviews" className="text-xs font-medium text-zinc-300">
                Enlace para dejar reseñas (opcional)
              </label>
              <input
                id="setup-reviews"
                type="url"
                value={urlResenas}
                onChange={(e) => setUrlResenas(e.target.value)}
                placeholder="https://g.page/r/.../review"
                className="w-full min-h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor="setup-timezone"
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
              >
                <Globe className="w-3.5 h-3.5 text-zinc-400" />
                <span>Zona horaria del negocio (IANA)</span>
              </label>
              <select
                id="setup-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full min-h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/60"
              >
                {TIMEZONES.map((tzOption) => (
                  <option key={tzOption} value={tzOption}>
                    {tzOption}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Horarios & Slot base */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="setup-open-time"
                className="block text-xs font-medium text-zinc-300"
              >
                Hora apertura
              </label>
              <input
                id="setup-open-time"
                type="time"
                required
                value={horarioApertura}
                onChange={(e) => setHorarioApertura(e.target.value)}
                className="w-full min-h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="setup-close-time"
                className="block text-xs font-medium text-zinc-300"
              >
                Hora cierre
              </label>
              <input
                id="setup-close-time"
                type="time"
                required
                value={horarioCierre}
                onChange={(e) => setHorarioCierre(e.target.value)}
                className="w-full min-h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="setup-slot-step"
                className="block text-xs font-medium text-zinc-300"
              >
                Intervalo entre huecos (min)
              </label>
              <input
                id="setup-slot-step"
                type="number"
                min={10}
                max={120}
                step={5}
                value={duracionCita}
                onChange={(e) => setDuracionCita(Number(e.target.value))}
                className="w-full min-h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/60"
              />
            </div>
          </div>

          {/* Días laborables */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-zinc-300">
              Días de apertura semanal
            </span>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const active = diasLaborables.includes(day.num)
                return (
                  <button
                    key={day.num}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleToggleDay(day.num)}
                    className={`min-h-12 min-w-12 rounded-xl border text-xs font-mono font-semibold transition-all active:scale-[0.98] ${
                      active
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                        : 'bg-zinc-950 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {day.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Toggle modo producción vs demo */}
          <label
            htmlFor="setup-modo-demo"
            className="flex items-center justify-between p-4 min-h-12 rounded-xl bg-zinc-950/70 border border-white/10 cursor-pointer gap-4"
          >
            <div>
              <span className="block text-xs font-semibold text-white">
                Modo Demo activo (desactívalo para operar en producción real)
              </span>
              <span className="block text-[11px] text-zinc-400 mt-0.5">
                En producción (<code className="font-mono">modo_demo = false</code>
                ), las reservas son reales y <code className="font-mono">/demo</code> queda aislado en sandbox.
              </span>
            </div>
            <input
              id="setup-modo-demo"
              type="checkbox"
              checked={modoDemo}
              onChange={(e) => setModoDemo(e.target.checked)}
              className="h-5 w-5 accent-emerald-500 rounded shrink-0"
            />
          </label>

          {/* Selector visual de Tema */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-zinc-300">
              Estética visual activa
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {THEMES.map((themeItem) => {
                const isSelected = selectedTheme === themeItem.id
                return (
                  <button
                    key={themeItem.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedTheme(themeItem.id)}
                    className={`min-h-12 p-3.5 rounded-xl border text-left transition-all active:scale-[0.98] flex items-center gap-3 ${
                      isSelected
                        ? 'bg-zinc-800/80 border-emerald-500/60 text-white'
                        : 'bg-zinc-950 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span
                      className="w-7 h-7 rounded-full shrink-0 ring-1 ring-white/20"
                      style={{
                        background: `linear-gradient(135deg, ${themeItem.swatch.bg} 50%, ${themeItem.swatch.accent} 50%)`,
                      }}
                    />
                    <div className="min-w-0">
                      <span className="block text-xs font-semibold text-white">
                        {themeItem.label}
                      </span>
                      <span className="block text-[11px] font-mono text-zinc-400 truncate">
                        {themeItem.tagline}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lista editable de servicios */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-300">
                Catálogo de servicios activos ({services.length})
              </span>
              <button
                type="button"
                onClick={handleAddServiceRow}
                className="min-h-12 px-4 rounded-xl border border-white/10 bg-zinc-950 text-xs font-medium text-emerald-400 hover:bg-zinc-800 transition-all active:scale-[0.98] flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir servicio</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {services.map((service, idx) => (
                <div
                  key={service.id || `draft-${idx}`}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                >
                  <div className="sm:col-span-5">
                    <label
                      htmlFor={`service-name-${idx}`}
                      className="sr-only"
                    >
                      Nombre del servicio {idx + 1}
                    </label>
                    <input
                      id={`service-name-${idx}`}
                      type="text"
                      value={service.nombre}
                      onChange={(e) =>
                        handleUpdateServiceRow(idx, { nombre: e.target.value })
                      }
                      placeholder="Nombre del servicio"
                      className="w-full min-h-12 px-3 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor={`service-duration-${idx}`}
                      className="sr-only"
                    >
                      Duración en minutos del servicio {idx + 1}
                    </label>
                    <div className="relative">
                      <input
                        id={`service-duration-${idx}`}
                        type="number"
                        min={5}
                        step={5}
                        value={service.duracion_minutos}
                        onChange={(e) =>
                          handleUpdateServiceRow(idx, {
                            duracion_minutos: Number(e.target.value),
                          })
                        }
                        className="w-full min-h-12 px-3 pr-10 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/60"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-400">
                        min
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor={`service-price-${idx}`}
                      className="sr-only"
                    >
                      Precio en euros del servicio {idx + 1}
                    </label>
                    <div className="relative">
                      <input
                        id={`service-price-${idx}`}
                        type="number"
                        min={0}
                        step="any"
                        value={service.precio}
                        onChange={(e) =>
                          handleUpdateServiceRow(idx, {
                            precio: Number(e.target.value),
                          })
                        }
                        className="w-full min-h-12 px-3 pr-8 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/60"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-zinc-400">
                        €
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveServiceRow(idx)}
                      disabled={services.length <= 1}
                      aria-label={`Eliminar servicio ${service.nombre || idx + 1}`}
                      className="min-h-12 min-w-12 rounded-xl border border-white/10 bg-zinc-900 text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configuración avanzada de campos del formulario de reserva */}
          <div className="border-t border-white/10 pt-4">
            <FormFieldConfigurator
              value={camposFormulario}
              onChange={setCamposFormulario}
            />
          </div>

          {saveFeedback && (
            <div
              role="status"
              className={`p-4 rounded-xl border text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                saveFeedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                  : 'ui-badge-danger'
              }`}
            >
              <span>{saveFeedback.message}</span>
              {saveFeedback.type === 'success' && (
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/reservar"
                    className="min-h-12 px-4 rounded-xl bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400 inline-flex items-center"
                  >
                    Abrir /reservar
                  </Link>
                  <Link
                    href="/admin"
                    className="min-h-12 px-4 rounded-xl bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800 inline-flex items-center"
                  >
                    Abrir /admin
                  </Link>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving || !diagnostics.schemaReady}
            className="w-full min-h-12 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-semibold hover:bg-emerald-400 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando configuración en Supabase...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar Configuración y Activar Mi Web</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  )
}
