'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { INITIAL_SUPABASE_SQL_SCRIPT } from '@/lib/initial-sql'
import { THEMES, type ThemeId } from '@/lib/themes'
import { triggerResetDemoData } from '@/lib/booking-service'
import type { LicenseVerificationResult } from '@/lib/license'
import type { BusinessSettings } from '@/types/booking'

interface ServiceDraft {
  id?: string
  nombre: string
  descripcion: string
  duracion_minutos: number
  precio: number
}

interface DiagnosticsState {
  checked: boolean
  dbConnected: boolean
  schemaReady: boolean
  isEmptyDb: boolean
  servicesCount: number
  settingsId: string | null
  dbError: string | null
  license: LicenseVerificationResult | null
}

const SECTOR_PRESETS: Record<
  'barberia' | 'clinica' | 'creator',
  {
    label: string
    defaultName: string
    theme: ThemeId
    services: ServiceDraft[]
  }
> = {
  barberia: {
    label: 'Barbería VIP',
    defaultName: 'Donaire Barber & Grooming Club',
    theme: 'dark_luxury',
    services: [
      {
        nombre: 'Corte Signature & Styling VIP',
        descripcion:
          'Corte personalizado con tijera y navaja japonesa, lavado orgánico y styling.',
        duracion_minutos: 45,
        precio: 35,
      },
      {
        nombre: 'Ritual Barba & Toalla Caliente',
        descripcion:
          'Perfilado con navaja clásica, aromaterapia caliente y aceites esenciales.',
        duracion_minutos: 30,
        precio: 25,
      },
      {
        nombre: 'Pack Completo (Corte + Barba)',
        descripcion: 'Experiencia integral cabello, barba y mascarilla purificante.',
        duracion_minutos: 75,
        precio: 55,
      },
    ],
  },
  clinica: {
    label: 'Clínica & Estética',
    defaultName: 'Krono Salud & Estética Avanzada',
    theme: 'clean_minimal',
    services: [
      {
        nombre: 'Sesión de Fisioterapia Personalizada',
        descripcion:
          'Valoración biomecánica y terapia manual focalizada.',
        duracion_minutos: 50,
        precio: 50,
      },
      {
        nombre: 'Limpieza Facial Médica Glow',
        descripcion:
          'Higiene profunda con ultrasonido, hidratación y protección dérmica.',
        duracion_minutos: 60,
        precio: 65,
      },
    ],
  },
  creator: {
    label: 'Coach & Creador',
    defaultName: 'Studio Krono · Mentorías 1:1',
    theme: 'neon_creator',
    services: [
      {
        nombre: 'Auditoría Express & Estrategia 1:1',
        descripcion:
          'Videollamada privada enfocada en crecimiento, contenido y conversión.',
        duracion_minutos: 45,
        precio: 75,
      },
      {
        nombre: 'Mentoría Intensiva de Lanzamiento',
        descripcion:
          'Plan de acción paso a paso y revisión completa de tu embudo.',
        duracion_minutos: 90,
        precio: 140,
      },
    ],
  },
}

function getSupabaseSqlEditorUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const match = rawUrl.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i)
  if (match?.[1]) {
    return `https://supabase.com/dashboard/project/${match[1]}/sql/new`
  }
  return 'https://supabase.com/dashboard'
}

export function SetupContent() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>({
    checked: false,
    dbConnected: false,
    schemaReady: false,
    isEmptyDb: true,
    servicesCount: 0,
    settingsId: null,
    dbError: null,
    license: null,
  })
  const [isRefreshing, setIsRefreshing] = useState(true)
  const [showSql, setShowSql] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)
  const [testLicenseInput, setTestLicenseInput] = useState('')
  const [isTestingLicense, setIsTestingLicense] = useState(false)
  const [isSeedingDemo, setIsSeedingDemo] = useState(false)

  // Campos del formulario de negocio
  const [businessName, setBusinessName] = useState('Mi Estudio & Reservas')
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('dark_luxury')
  const [openTime, setOpenTime] = useState('09:00')
  const [closeTime, setCloseTime] = useState('20:00')
  const [notificationEmail, setNotificationEmail] = useState('')
  const [services, setServices] = useState<ServiceDraft[]>(
    SECTOR_PRESETS.barberia.services
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const sqlEditorUrl = useMemo(() => getSupabaseSqlEditorUrl(), [])

  const fetchDiagnostics = useCallback(async () => {
    const [settingsRes, servicesRes, licenseRes] = await Promise.all([
      supabase.from('business_settings').select('*').limit(1).maybeSingle(),
      supabase.from('services').select('*').order('precio', { ascending: true }),
      fetch('/api/license/verify')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])

    const schemaMissing =
      Boolean(settingsRes.error && settingsRes.error.code === '42P01') ||
      Boolean(servicesRes.error && servicesRes.error.code === '42P01') ||
      Boolean(
        settingsRes.error?.message?.toLowerCase().includes('does not exist')
      )

    const existingSettings = settingsRes.data as BusinessSettings | null
    const existingServices = (servicesRes.data || []) as ServiceDraft[]

    if (existingSettings) {
      setBusinessName(existingSettings.nombre_negocio)
      setSelectedTheme(existingSettings.tema_activo)
      setOpenTime(existingSettings.horario_apertura.slice(0, 5))
      setCloseTime(existingSettings.horario_cierre.slice(0, 5))
      setNotificationEmail(existingSettings.email_notificaciones || '')
    }

    if (existingServices.length > 0) {
      setServices(
        existingServices.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          descripcion: s.descripcion || '',
          duracion_minutos: Number(s.duracion_minutos),
          precio: Number(s.precio),
        }))
      )
    }

    const isEmpty = !existingSettings || existingServices.length === 0

    setDiagnostics({
      checked: true,
      dbConnected: !schemaMissing && !settingsRes.error,
      schemaReady: !schemaMissing,
      isEmptyDb: isEmpty,
      servicesCount: existingServices.length,
      settingsId: existingSettings?.id || null,
      dbError: settingsRes.error?.message || servicesRes.error?.message || null,
      license: (licenseRes as LicenseVerificationResult | null) || null,
    })

    if (schemaMissing || isEmpty) {
      setShowSql(schemaMissing)
    }
    setIsRefreshing(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDiagnostics()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchDiagnostics])

  const handleManualRecheck = async () => {
    setIsRefreshing(true)
    await fetchDiagnostics()
  }

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(INITIAL_SUPABASE_SQL_SCRIPT)
      setCopiedSql(true)
      setTimeout(() => setCopiedSql(false), 3000)
    } catch {
      setShowSql(true)
    }
  }

  const handleVerifyCustomKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testLicenseInput.trim()) return
    setIsTestingLicense(true)
    try {
      const res = await fetch('/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: testLicenseInput.trim() }),
      })
      const json = (await res.json()) as LicenseVerificationResult
      setDiagnostics((prev) => ({ ...prev, license: json }))
    } finally {
      setIsTestingLicense(false)
    }
  }

  const handleSeedDemo = async () => {
    setIsSeedingDemo(true)
    setSaveFeedback(null)
    try {
      await triggerResetDemoData()
      await fetchDiagnostics()
      setSaveFeedback({
        type: 'success',
        message: 'Datos de ejemplo restaurados correctamente.',
      })
    } catch (err: unknown) {
      setSaveFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los datos de ejemplo.',
      })
    } finally {
      setIsSeedingDemo(false)
    }
  }

  const applyPreset = (presetKey: 'barberia' | 'clinica' | 'creator') => {
    const preset = SECTOR_PRESETS[presetKey]
    setBusinessName(preset.defaultName)
    setSelectedTheme(preset.theme)
    setServices(preset.services.map((s) => ({ ...s })))
    setSaveFeedback(null)
  }

  const handleAddServiceRow = () => {
    setServices((prev) => [
      ...prev,
      {
        nombre: 'Nuevo Servicio',
        descripcion: 'Descripción breve del servicio',
        duracion_minutos: 30,
        precio: 25,
      },
    ])
  }

  const handleUpdateServiceRow = (
    index: number,
    patch: Partial<ServiceDraft>
  ) => {
    setServices((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    )
  }

  const handleRemoveServiceRow = (index: number) => {
    setServices((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessName.trim()) {
      setSaveFeedback({
        type: 'error',
        message: 'Introduce el nombre de tu negocio para continuar.',
      })
      return
    }
    const validServices = services.filter((s) => s.nombre.trim().length > 0)
    if (validServices.length === 0) {
      setSaveFeedback({
        type: 'error',
        message: 'Añade al menos un servicio activo para tus reservas.',
      })
      return
    }

    setIsSaving(true)
    setSaveFeedback(null)

    try {
      const normalizedOpen = openTime.length === 5 ? `${openTime}:00` : openTime
      const normalizedClose =
        closeTime.length === 5 ? `${closeTime}:00` : closeTime

      const settingsPayload = {
        nombre_negocio: businessName.trim(),
        tema_activo: selectedTheme,
        horario_apertura: normalizedOpen,
        horario_cierre: normalizedClose,
        email_notificaciones: notificationEmail.trim() || null,
        modo_demo: false,
      }

      let savedSettingsId = diagnostics.settingsId

      if (savedSettingsId) {
        const { error: updateErr } = await supabase
          .from('business_settings')
          .update(settingsPayload)
          .eq('id', savedSettingsId)
        if (updateErr) throw updateErr
      } else {
        const { data: insertedSettings, error: insertErr } = await supabase
          .from('business_settings')
          .insert({
            ...settingsPayload,
            dias_laborables: [
              'lunes',
              'martes',
              'miercoles',
              'jueves',
              'viernes',
              'sabado',
            ],
            duracion_cita_minutos: 45,
          })
          .select('id')
          .single()
        if (insertErr) throw insertErr
        savedSettingsId = insertedSettings.id
      }

      // Guardar o actualizar servicios iniciales sin romper citas existentes
      for (const svc of validServices) {
        if (svc.id) {
          const { error: svcErr } = await supabase
            .from('services')
            .update({
              nombre: svc.nombre.trim(),
              descripcion: svc.descripcion.trim() || null,
              duracion_minutos: Math.max(5, Number(svc.duracion_minutos) || 30),
              precio: Math.max(0, Number(svc.precio) || 0),
              activo: true,
            })
            .eq('id', svc.id)
          if (svcErr) throw svcErr
        } else {
          const { error: svcInsertErr } = await supabase.from('services').insert({
            nombre: svc.nombre.trim(),
            descripcion: svc.descripcion.trim() || null,
            duracion_minutos: Math.max(5, Number(svc.duracion_minutos) || 30),
            precio: Math.max(0, Number(svc.precio) || 0),
            activo: true,
          })
          if (svcInsertErr) throw svcInsertErr
        }
      }

      await fetchDiagnostics()

      setSaveFeedback({
        type: 'success',
        message:
          '¡Negocio configurado con éxito! Tu sistema de reservas y panel Admin ya están listos.',
      })
    } catch (err: unknown) {
      setSaveFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? `Error al guardar en Supabase: ${err.message}`
            : 'No se pudo guardar la configuración.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-zinc-950">
      {/* Header minimalista */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/85 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-emerald-400">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white">
                Asistente de Primera Instalación
              </h1>
              <p className="text-[11px] font-mono text-zinc-400">
                /setup · Despliegue en 1 clic · Krono / Donaire Citas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/reservar"
              className="px-3 py-2 rounded-xl border border-white/10 bg-zinc-900/70 text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-800 transition-all active:scale-[0.98]"
            >
              Ver Reservas
            </Link>
            <Link
              href="/admin"
              className="px-3.5 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-semibold hover:bg-emerald-400 transition-all active:scale-[0.98]"
            >
              Panel Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Intro */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-white/10 text-[11px] font-mono text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Puesta en marcha guiada</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Activa tu sistema de reservas en menos de 5 minutos
          </h2>
          <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Comprueba el estado de tu licencia comercial, inicializa las tablas en
            Supabase si tu base de datos está vacía y personaliza el nombre, estética
            y servicios de tu negocio.
          </p>
        </div>

        {/* Diagnóstico rápido (Base de datos + Licencia) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tarjeta Estado de Licencia */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-center">
                  {diagnostics.license?.valid ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Estado de Licencia
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    {diagnostics.license?.licenseKey || 'Sin LICENSE_KEY detectada'}
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                  diagnostics.license?.valid
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                {isRefreshing
                  ? 'Comprobando...'
                  : diagnostics.license?.valid
                    ? diagnostics.license.status === 'demo'
                      ? 'Demo Activa'
                      : 'Activa · Sin límites'
                    : 'Pendiente'}
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {diagnostics.license?.message ||
                'Verificando variable de entorno LICENSE_KEY en el servidor...'}
            </p>

            {/* Comprobador de clave manual */}
            <form onSubmit={handleVerifyCustomKey} className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={testLicenseInput}
                  onChange={(e) => setTestLicenseInput(e.target.value)}
                  placeholder="DONAIRE-XXXX-XXXX-2027"
                  className="w-full h-12 pl-9 pr-3 rounded-xl bg-zinc-950 border border-white/10 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
              <button
                type="submit"
                disabled={isTestingLicense || !testLicenseInput.trim()}
                className="h-12 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white border border-white/10 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isTestingLicense ? 'Validando...' : 'Verificar'}
              </button>
            </form>
          </motion.div>

          {/* Tarjeta Estado de Supabase */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-center">
                  <Database className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Base de Datos Supabase
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    {diagnostics.schemaReady
                      ? `Tablas listas · ${diagnostics.servicesCount} servicios`
                      : 'Esquema SQL pendiente de crear'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleManualRecheck}
                disabled={isRefreshing}
                className="h-9 px-3 rounded-xl border border-white/10 bg-zinc-950 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                <span>Comprobar</span>
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {!diagnostics.checked
                ? 'Conectando con tu instancia de Supabase...'
                : !diagnostics.schemaReady
                  ? 'Tu base de datos parece vacía o le faltan tablas. Copia y ejecuta el Script SQL Inicial en el Paso 1.'
                  : diagnostics.isEmptyDb
                    ? 'Las tablas existen pero aún no has configurado tu negocio ni servicios. Completa el Paso 2 abajo.'
                    : 'Conexión y tablas verificadas correctamente. Puedes ajustar tu marca y servicios cuando quieras.'}
            </p>

            {diagnostics.dbError && (
              <p className="text-[11px] font-mono text-amber-300 bg-amber-950/30 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                Detalle: {diagnostics.dbError}
              </p>
            )}
          </motion.div>
        </section>

        {/* PASO 1: Script SQL Inicial */}
        <section className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-white/10 text-[11px] font-mono text-zinc-300">
                  Paso 1
                </span>
                <h3 className="text-base sm:text-lg font-semibold tracking-tight text-white">
                  Script SQL Inicial de Supabase
                </h3>
                {diagnostics.schemaReady && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Tablas detectadas
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-zinc-400">
                Si acabas de crear un proyecto Supabase nuevo y está vacío, copia este
                script y ejecútalo en tu <strong>SQL Editor</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopySql}
                className="h-12 px-4 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition-all active:scale-[0.98] flex items-center gap-2"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>SQL Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Script SQL Inicial</span>
                  </>
                )}
              </button>

              <a
                href={sqlEditorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 px-4 rounded-xl border border-white/10 bg-zinc-950 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-all active:scale-[0.98] flex items-center gap-2"
              >
                <span>Abrir SQL Editor</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setShowSql((prev) => !prev)}
                className="h-12 px-3.5 rounded-xl border border-white/10 bg-zinc-950 text-xs font-mono text-zinc-400 hover:text-white transition-all flex items-center gap-1.5"
              >
                <span>{showSql ? 'Ocultar SQL' : 'Ver SQL'}</span>
                {showSql ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {showSql && (
            <div className="relative rounded-xl border border-white/10 bg-zinc-950 overflow-hidden">
              <pre className="p-4 text-[11px] leading-relaxed font-mono text-zinc-300 overflow-x-auto max-h-80">
                <code>{INITIAL_SUPABASE_SQL_SCRIPT}</code>
              </pre>
            </div>
          )}

          {diagnostics.schemaReady && diagnostics.isEmptyDb && (
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-zinc-400">
                ¿Prefieres empezar con citas y servicios de prueba precargados?
              </span>
              <button
                type="button"
                onClick={handleSeedDemo}
                disabled={isSeedingDemo}
                className="h-12 px-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSeedingDemo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Cargar Datos de Ejemplo</span>
              </button>
            </div>
          )}
        </section>

        {/* PASO 2: Configurador Gráfico del Negocio */}
        <form
          onSubmit={handleSaveSetup}
          className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-white/10 text-[11px] font-mono text-zinc-300">
                  Paso 2
                </span>
                <h3 className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span>Personaliza tu Negocio y Servicios</span>
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400">
                Define el nombre comercial, estética visual, horarios y servicios
                reservables.
              </p>
            </div>

            {/* Plantillas de sector en 1 clic */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-500">
                Plantillas:
              </span>
              {(
                Object.keys(SECTOR_PRESETS) as Array<keyof typeof SECTOR_PRESETS>
              ).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className="h-9 px-3 rounded-lg border border-white/10 bg-zinc-950 text-xs font-medium text-zinc-300 hover:text-white hover:border-emerald-500/40 transition-all active:scale-[0.98]"
                >
                  {SECTOR_PRESETS[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-300">
                Nombre del negocio
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej. Donaire Studio Madrid"
                className="w-full h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-300">
                Email de notificaciones del dueño (recibe archivos .ics)
              </label>
              <input
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="reservas@tunegocio.com"
                className="w-full h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-300">
                Hora de apertura
              </label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-300">
                Hora de cierre
              </label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/60"
              />
            </div>
          </div>

          {/* Selector visual de Tema */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-300">
              Estética visual activa
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {THEMES.map((themeItem) => {
                const isSelected = selectedTheme === themeItem.id
                return (
                  <button
                    key={themeItem.id}
                    type="button"
                    onClick={() => setSelectedTheme(themeItem.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all active:scale-[0.98] flex items-center gap-3 ${
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300">
                Servicios iniciales ({services.length})
              </label>
              <button
                type="button"
                onClick={handleAddServiceRow}
                className="h-9 px-3 rounded-lg border border-white/10 bg-zinc-950 text-xs font-medium text-emerald-400 hover:bg-zinc-800 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
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
                    <input
                      type="text"
                      value={service.nombre}
                      onChange={(e) =>
                        handleUpdateServiceRow(idx, { nombre: e.target.value })
                      }
                      placeholder="Nombre del servicio"
                      className="w-full h-11 px-3 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <div className="relative">
                      <input
                        type="number"
                        min={5}
                        step={5}
                        value={service.duracion_minutos}
                        onChange={(e) =>
                          handleUpdateServiceRow(idx, {
                            duracion_minutos: Number(e.target.value),
                          })
                        }
                        className="w-full h-11 px-3 pr-10 rounded-lg bg-zinc-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/60"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500">
                        min
                      </span>
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={service.precio}
                        onChange={(e) =>
                          handleUpdateServiceRow(idx, {
                            precio: Number(e.target.value),
                          })
                        }
                        className="w-full h-11 px-3 pr-8 rounded-lg bg-zinc-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/60"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-zinc-500">
                        €
                      </span>
                    </div>
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveServiceRow(idx)}
                      disabled={services.length <= 1}
                      aria-label="Eliminar servicio"
                      className="h-11 w-11 rounded-lg border border-white/10 bg-zinc-900 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition-all flex items-center justify-center disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {saveFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                saveFeedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
              }`}
            >
              <span>{saveFeedback.message}</span>
              {saveFeedback.type === 'success' && (
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/reservar"
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400"
                  >
                    Abrir /reservar
                  </Link>
                  <Link
                    href="/admin"
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800"
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
            className="w-full h-12 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-semibold hover:bg-emerald-400 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
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
