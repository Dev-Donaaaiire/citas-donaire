export const CURRENT_SYSTEM_VERSION = '1.2.1'
export const UPSTREAM_GITHUB_REPO = 'Dev-Donaaaiire/citas-donaire'
export const DEFAULT_VERSION_API_URL =
  process.env.VERSION_API_URL ||
  'https://citas-donaire.vercel.app/api/system/version'

export interface SystemVersionInfo {
  currentVersion: string
  latestVersion: string
  updateAvailable: boolean
  releaseDate?: string
  commitHash?: string
  changelog: string[]
  upstreamRepo: string
  oneClickSyncUrl?: string
  lastChecked: string
}

export function compareSemver(v1: string, v2: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0)

  const [maj1 = 0, min1 = 0, pat1 = 0] = parse(v1)
  const [maj2 = 0, min2 = 0, pat2 = 0] = parse(v2)

  if (maj1 !== maj2) return maj1 > maj2 ? 1 : -1
  if (min1 !== min2) return min1 > min2 ? 1 : -1
  if (pat1 !== pat2) return pat1 > pat2 ? 1 : -1
  return 0
}

let cachedVersionInfo: { timestamp: number; data: SystemVersionInfo } | null = null
const CACHE_TTL_MS = 60 * 1000 // 1 minuto para comprobación ágil

export async function checkSystemUpdate(options?: {
  forceFresh?: boolean
  repoUrl?: string | null
}): Promise<SystemVersionInfo> {
  const now = Date.now()
  if (!options?.forceFresh && cachedVersionInfo && now - cachedVersionInfo.timestamp < CACHE_TTL_MS) {
    return cachedVersionInfo.data
  }

  const currentVersion = CURRENT_SYSTEM_VERSION
  const checkedAt = new Date().toISOString()

  // Determinar la URL del repositorio del usuario (Vercel expone VERCEL_GIT_REPO_OWNER y VERCEL_GIT_REPO_SLUG automáticamente)
  const vercelOwner = process.env.VERCEL_GIT_REPO_OWNER?.trim()
  const vercelSlug = process.env.VERCEL_GIT_REPO_SLUG?.trim()
  const detectedRepo =
    vercelOwner && vercelSlug ? `${vercelOwner}/${vercelSlug}` : ''

  const userRepo = (
    options?.repoUrl ||
    detectedRepo ||
    process.env.NEXT_PUBLIC_REPO_URL ||
    ''
  )
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\/$/, '')

  let oneClickSyncUrl = `https://github.com/${UPSTREAM_GITHUB_REPO}`
  if (userRepo && !userRepo.includes('Dev-Donaaaiire')) {
    // Enlace directo al workflow de actualización en GitHub Actions
    oneClickSyncUrl = `https://github.com/${userRepo}/actions/workflows/krono-sync.yml`
  }

  try {
    const isMaster =
      process.env.NEXT_PUBLIC_APP_URL?.includes('citas-donaire') ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('bsxnxzhbvwtsgwkvwqoc')

    // Si estamos en el servidor maestro, nos consideramos la última versión
    if (isMaster) {
      const data: SystemVersionInfo = {
        currentVersion,
        latestVersion: currentVersion,
        updateAvailable: false,
        commitHash: 'head',
        changelog: [
          'Servidor maestro central Krono / Donaire Citas.',
          'Repositorio fuente sincronizado.',
        ],
        upstreamRepo: UPSTREAM_GITHUB_REPO,
        oneClickSyncUrl,
        lastChecked: checkedAt,
      }
      cachedVersionInfo = { timestamp: now, data }
      return data
    }

    const response = await fetch(DEFAULT_VERSION_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })

    if (response.ok) {
      const remote = (await response.json()) as {
        version: string
        commitHash?: string
        releaseDate?: string
        changelog?: string[]
      }

      const latestVersion = remote.version || currentVersion
      const updateAvailable = compareSemver(latestVersion, currentVersion) > 0

      const data: SystemVersionInfo = {
        currentVersion,
        latestVersion,
        updateAvailable,
        commitHash: remote.commitHash,
        releaseDate: remote.releaseDate,
        changelog: remote.changelog || [],
        upstreamRepo: UPSTREAM_GITHUB_REPO,
        oneClickSyncUrl,
        lastChecked: checkedAt,
      }

      cachedVersionInfo = { timestamp: now, data }
      return data
    }
  } catch {
    // Si no se puede contactar con el servidor central, degradar con gracia
  }

  const fallback: SystemVersionInfo = {
    currentVersion,
    latestVersion: currentVersion,
    updateAvailable: false,
    changelog: ['No se pudo consultar el servidor de versiones.'],
    upstreamRepo: UPSTREAM_GITHUB_REPO,
    oneClickSyncUrl,
    lastChecked: checkedAt,
  }
  return fallback
}
