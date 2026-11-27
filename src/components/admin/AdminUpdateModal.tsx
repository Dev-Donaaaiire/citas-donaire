'use client'

import React, { useId, useState } from 'react'
import {
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Zap,
  CheckCircle2,
  Terminal,
  AlertTriangle,
  FileCode,
  Play,
} from 'lucide-react'
import {
  CURRENT_SYSTEM_VERSION,
  UPSTREAM_GITHUB_REPO,
  type SystemVersionInfo,
} from '@/lib/version'
import { AccessibleModal } from '@/components/ui/AccessibleModal'

const KRONO_SYNC_YML_CONTENT = `name: Krono Auto-Sync & Update

on:
  workflow_dispatch:

permissions:
  contents: write

jobs:
  sync-upstream:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repositorio
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Sincronizar aplicación con Upstream Oficial
        run: |
          git config user.name "\${{ github.actor }}"
          git config user.email "\${{ github.actor_id }}+\${{ github.actor }}@users.noreply.github.com"
          git remote add upstream https://github.com/Dev-Donaaaiire/citas-donaire.git || git remote set-url upstream https://github.com/Dev-Donaaaiire/citas-donaire.git
          git fetch upstream main
          git checkout upstream/main -- src public package.json package-lock.json next.config.ts tsconfig.json README.md supabase/migrations
          git add -A
          if git diff --staged --quiet; then
            echo "Sin cambios nuevos: el repositorio ya está en la última versión."
          else
            git commit -m "chore(krono): sincronización con última versión de Krono"
            git push origin HEAD:main
            echo "¡Actualización enviada con éxito a main! Vercel desplegará los cambios."
          fi
`

const WORKFLOW_FILE_PATH = '.github/workflows/krono-sync.yml'

interface AdminUpdateModalProps {
  isOpen: boolean
  versionInfo: SystemVersionInfo | null
  onClose: () => void
}

export function AdminUpdateModal({
  isOpen,
  versionInfo,
  onClose,
}: AdminUpdateModalProps) {
  const titleId = useId()
  const [copiedCmd, setCopiedCmd] = useState(false)
  const [copiedYml, setCopiedYml] = useState(false)
  const [copiedPath, setCopiedPath] = useState(false)
  const [showCodePreview, setShowCodePreview] = useState(false)

  const activeInfo: SystemVersionInfo = versionInfo || {
    currentVersion: CURRENT_SYSTEM_VERSION,
    latestVersion: CURRENT_SYSTEM_VERSION,
    updateAvailable: false,
    changelog: [
      '⚙️ Personalización del formulario de reserva: elige qué campos son obligatorios, opcionales u ocultos.',
      '💡 Análisis de impacto en tiempo real: especificación clara de qué funciones se pierden o ganan con cada campo.',
      '🛡️ Reservas flexibles con compatibilidad universal en base de datos para clientes sin email o teléfono.',
      '📊 Tabla de retención y agenda adaptadas con indicadores de estado para clientes sin datos de contacto.',
    ],
    upstreamRepo: UPSTREAM_GITHUB_REPO,
    userRepo: UPSTREAM_GITHUB_REPO,
    oneClickSyncUrl: `https://github.com/${UPSTREAM_GITHUB_REPO}`,
    createWorkflowUrl: `https://github.com/${UPSTREAM_GITHUB_REPO}/new/main?filename=.github/workflows/krono-sync.yml`,
    lastChecked: new Date().toISOString(),
  }

  const isUpToDate = !activeInfo.updateAvailable
  const syncUrl =
    activeInfo.oneClickSyncUrl || `https://github.com/${UPSTREAM_GITHUB_REPO}`
  const createWorkflowUrl =
    activeInfo.createWorkflowUrl ||
    `https://github.com/${activeInfo.userRepo || UPSTREAM_GITHUB_REPO}/new/main?filename=.github/workflows/krono-sync.yml`

  const terminalCmd =
    'git remote add upstream https://github.com/Dev-Donaaaiire/citas-donaire.git\ngit pull upstream main --allow-unrelated-histories\ngit push origin main'

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(terminalCmd)
    setCopiedCmd(true)
    setTimeout(() => setCopiedCmd(false), 2500)
  }

  const handleCopyYml = () => {
    navigator.clipboard.writeText(KRONO_SYNC_YML_CONTENT)
    setCopiedYml(true)
    setTimeout(() => setCopiedYml(false), 2500)
  }

  const handleCopyPath = () => {
    navigator.clipboard.writeText(WORKFLOW_FILE_PATH)
    setCopiedPath(true)
    setTimeout(() => setCopiedPath(false), 2500)
  }

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      panelClassName="max-w-xl w-full rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden my-4"
    >
      <div className="flex flex-col max-h-[90dvh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-zinc-900/60 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isUpToDate
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              {isUpToDate ? <CheckCircle2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h2
                id={titleId}
                className="text-base font-semibold text-white tracking-tight"
              >
                {isUpToDate
                  ? 'Sistema actualizado a la última versión'
                  : `Nueva versión disponible: v${activeInfo.latestVersion}`}
              </h2>
              <p className="text-xs text-zinc-400">
                Versión instalada: <span className="font-mono text-zinc-300">v{activeInfo.currentVersion}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors active:scale-[0.98]"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Novedades / Changelog */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Novedades de esta versión
            </h3>
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-white/10 space-y-2 text-xs text-zinc-300">
              {activeInfo.changelog && activeInfo.changelog.length > 0 ? (
                activeInfo.changelog.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 font-bold">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))
              ) : (
                <p className="text-zinc-400">Mejoras de rendimiento, estabilidad y diseño.</p>
              )}
            </div>
          </div>

          {/* Tarjeta de solución: Si no tienes krono-sync.yml por clon de Vercel */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-amber-200">
                  ¿No te aparece la opción de actualizar en GitHub?
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-medium">
                Vercel Deploy
              </span>
            </div>

            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Al desplegar la plantilla con el botón «Deploy with Vercel», GitHub omite los archivos dentro de <code className="px-1 py-0.5 rounded bg-zinc-800 font-mono text-zinc-300">.github/workflows/</code> por permisos de seguridad OAuth. Para habilitar las actualizaciones en 1 clic para siempre en tu repositorio, solo debes crear este archivo una única vez:
            </p>

            {/* Ruta exacta del archivo con botón de copiar */}
            <div className="p-2.5 rounded-lg bg-zinc-950/90 border border-amber-500/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[10px] text-zinc-400 shrink-0 font-medium">Ruta del archivo:</span>
                <code className="text-[11px] font-mono text-amber-200 truncate select-all">
                  {WORKFLOW_FILE_PATH}
                </code>
              </div>
              <button
                type="button"
                onClick={handleCopyPath}
                className="shrink-0 inline-flex items-center gap-1 text-[10px] text-zinc-300 hover:text-white px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-white/10 active:scale-95 transition-all"
                title="Copiar ruta exacta"
              >
                {copiedPath ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300">Copiada</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar ruta</span>
                  </>
                )}
              </button>
            </div>

            {/* Pasos guiados 1 - 2 - 3 */}
            <div className="space-y-2 text-xs">
              {/* Paso 1: Copiar código */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-white/5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                  1
                </span>
                <div className="space-y-1.5 w-full">
                  <p className="font-medium text-zinc-200 text-xs">
                    Copia el código YAML de actualización
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyYml}
                    className="w-full min-h-10 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors active:scale-95 border border-white/10"
                  >
                    {copiedYml ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300 font-semibold">¡Código copiado al portapapeles!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-amber-400" />
                        <span>Copiar código completo de krono-sync.yml</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Paso 2: Crear archivo en GitHub */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-white/5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                  2
                </span>
                <div className="space-y-1.5 w-full">
                  <p className="font-medium text-zinc-200 text-xs">
                    Abre tu GitHub (ruta precargada automáticamente)
                  </p>
                  <a
                    href={createWorkflowUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-10 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-95 shadow-sm"
                  >
                    <span>Crear archivo en GitHub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Paso 3: Pegar y guardar */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-white/5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                  3
                </span>
                <div className="space-y-1">
                  <p className="font-medium text-zinc-200 text-xs">
                    Pega el código y pulsa «Commit changes»
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Pega en el editor de GitHub el contenido copiado en el Paso 1 y haz clic en el botón verde superior <strong className="text-zinc-200">«Commit changes...»</strong> para guardarlo.
                  </p>
                </div>
              </div>
            </div>

            {/* Inspección / Vista previa del código YAML */}
            <div className="border border-white/10 rounded-lg overflow-hidden bg-zinc-950">
              <button
                type="button"
                onClick={() => setShowCodePreview(!showCodePreview)}
                className="w-full px-3 py-2 flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 transition-colors"
              >
                <span className="flex items-center gap-1.5 font-mono">
                  <FileCode className="w-3.5 h-3.5 text-amber-400" />
                  {showCodePreview ? 'Ocultar código YAML' : 'Ver código YAML de krono-sync.yml'}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {showCodePreview ? '▲ Plegar' : '▼ Desplegar'}
                </span>
              </button>
              {showCodePreview && (
                <div className="relative">
                  <pre className="p-3 font-mono text-[10px] text-zinc-300 leading-relaxed overflow-x-auto max-h-56 overflow-y-auto bg-zinc-950/90">
                    {KRONO_SYNC_YML_CONTENT}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyYml}
                    className="absolute top-2 right-2 px-2 py-1 rounded bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium border border-white/10 flex items-center gap-1 shadow"
                  >
                    {copiedYml ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <p className="text-[10px] text-zinc-400 leading-relaxed">
              💡 Una vez guardado, ya tendrás la pestaña <strong className="text-zinc-300">Actions</strong> habilitada para siempre en tu repositorio, y podrás aplicar todas las actualizaciones de Krono con el botón verde inferior en 1 clic.
            </p>

            {/* Aviso sobre permisos de GitHub Actions si falla con 403 */}
            <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-white/5 space-y-1">
              <p className="text-[11px] text-zinc-300 font-medium flex items-center gap-1.5">
                <span className="text-amber-400">⚠️</span> ¿Te sale el Workflow en rojo (❌)?
              </p>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Por seguridad, GitHub bloquea por defecto la escritura de Actions. En tu GitHub ve a:{' '}
                <strong className="text-zinc-200">Settings → Actions → General → Workflow permissions</strong> → selecciona{' '}
                <strong className="text-amber-300">«Read and write permissions»</strong> y pulsa Guardar.
              </p>
            </div>
          </div>

          {/* Cómo actualizar */}
          <div className="space-y-2.5 pt-2">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              Opciones para aplicar la actualización
            </h3>

            {/* Opción 1: Enlace directo en 1 clic con guía visual paso a paso */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Instrucciones de Actualización en 1 Clic
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-semibold">
                  Paso a Paso
                </span>
              </div>

              {/* Los 3 pasos explicados con total detalle */}
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-white/5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-medium text-zinc-200">
                      Pulsa el botón verde inferior
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Se abrirá la pantalla de actualización directa de tu repositorio en GitHub.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-white/5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-medium text-zinc-200">
                      Haz clic en «Run workflow»
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      A la derecha verás el botón <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">Run workflow ▾</code>. Haz clic y confirma pulsando el botón verde.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-white/5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-medium text-zinc-200">
                      ¡Listo! Vercel desplegará los cambios solo
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      GitHub sincronizará la aplicación en 5 segundos y Vercel se actualizará. Al recargar este panel verás la versión nueva activa.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón principal */}
              <a
                href={syncUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-12 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
              >
                <span>Abrir GitHub Actions y Actualizar</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <p className="text-[10px] text-zinc-500 text-center">
                🔒 Tus citas, clientes, horarios y servicios en Supabase están 100% seguros y nunca se modifican.
              </p>
            </div>

            {/* Opción 2: Script directo incluido */}
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/10 space-y-2">
              <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Play className="w-4 h-4 text-emerald-400" />
                Opción 2: Script directo incluido (en tu ordenador)
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                El proyecto incluye un script directo. En la carpeta de tu repositorio ejecuta:
              </p>
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-white/5 font-mono text-[11px] space-y-1">
                <div className="text-zinc-300">Windows: <code className="text-emerald-400">scripts\actualizar.bat</code> (o doble clic)</div>
                <div className="text-zinc-300">Mac / Linux: <code className="text-emerald-400">bash scripts/actualizar.sh</code></div>
              </div>
            </div>

            {/* Opción 3: Terminal manual */}
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-zinc-400" />
                  Opción 3: Comandos Git manuales en terminal
                </span>
                <button
                  type="button"
                  onClick={handleCopyCmd}
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded-lg bg-zinc-800 border border-white/5 active:scale-95 transition-all"
                >
                  {copiedCmd ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-zinc-950 border border-white/5 font-mono text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
                {terminalCmd}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-zinc-900/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-medium transition-colors active:scale-[0.98]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </AccessibleModal>
  )
}
