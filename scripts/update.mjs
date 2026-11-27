// Actualiza esta instalación a la última versión PUBLICADA (etiqueta vX.Y.Z).
// Uso: node scripts/update.mjs [--push]
// Nunca toca .github, .env* ni los archivos propios que añadas en public/.
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const UPSTREAM = 'https://github.com/Dev-Donaaaiire/citas-donaire.git'

/** Se copian exactas: lo que ya no exista en la versión nueva se borra. */
const MIRRORED = ['src', 'supabase', 'scripts', 'tests']
/** Se sobrescriben o añaden, sin borrar nada del cliente. */
const OVERLAID = [
  'public',
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'tsconfig.json',
  'eslint.config.mjs',
  'components.json',
  'README.md',
]

const parse = (tag) => tag.replace(/^v/, '').split('.').map(Number)
export function compareVersions(a, b) {
  const [x, y] = [parse(a), parse(b)]
  for (let i = 0; i < 3; i += 1) {
    if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1
  }
  return 0
}

export function update({ cwd = process.cwd(), upstream = UPSTREAM, push = false, log = console.log } = {}) {
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

  if (git('status', '--porcelain')) {
    throw new Error('Hay cambios sin guardar. Haz commit o descártalos antes de actualizar.')
  }

  const latest = git('ls-remote', '--tags', '--refs', upstream)
    .split('\n')
    .map((line) => line.split('refs/tags/')[1])
    .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag ?? ''))
    .sort(compareVersions)
    .at(-1)

  const current = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).version
  if (!latest) {
    log('No hay ninguna versión publicada todavía.')
    return null
  }
  if (compareVersions(latest, current) <= 0) {
    log(`Ya tienes la versión ${current}; la última publicada es ${latest}.`)
    return null
  }

  log(`Actualizando de ${current} a ${latest}...`)
  git('fetch', '--depth', '1', upstream, `refs/tags/${latest}`)
  const exists = (path) => {
    try {
      git('cat-file', '-e', `FETCH_HEAD:${path}`)
      return true
    } catch {
      return false
    }
  }

  for (const path of MIRRORED.filter(exists)) {
    git('rm', '-r', '-q', '--ignore-unmatch', '--', path)
    rmSync(join(cwd, path), { recursive: true, force: true })
    git('checkout', 'FETCH_HEAD', '--', path)
  }
  for (const path of OVERLAID.filter(exists)) {
    git('checkout', 'FETCH_HEAD', '--', path)
  }

  git('add', '-A', '--', ...[...MIRRORED, ...OVERLAID].filter(exists))
  if (!git('diff', '--staged', '--name-only')) return null
  git('commit', '-q', '-m', `chore(krono): actualización a ${latest}`)
  if (push) git('push', 'origin', 'HEAD')
  log(`Actualizado a ${latest}.`)
  return latest
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const version = update({
      upstream: process.env.KRONO_UPSTREAM || UPSTREAM,
      push: process.argv.includes('--push'),
    })
    // Aviso para los pasos siguientes del workflow
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `version=${version ?? ''}\n`)
    }
  } catch (err) {
    console.error('Error actualizando:', err.message)
    process.exit(1)
  }
}
