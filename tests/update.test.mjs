import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { update } from '../scripts/update.mjs'

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' })
function write(root, path, content) {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), content)
}
function repo(root, files) {
  mkdirSync(root, { recursive: true })
  git(root, 'init', '-q', '-b', 'main')
  git(root, 'config', 'user.email', 'test@example.com')
  git(root, 'config', 'user.name', 'test')
  git(root, 'config', 'core.autocrlf', 'false')
  commit(root, files)
}
function commit(root, files) {
  for (const [path, content] of Object.entries(files)) write(root, path, content)
  git(root, 'add', '-A')
  git(root, 'commit', '-q', '-m', 'x')
}
const pkg = (version) => JSON.stringify({ version })

test('actualiza solo a versiones publicadas y respeta lo del cliente', () => {
  const dir = mkdtempSync(join(tmpdir(), 'krono-'))
  try {
    const upstream = join(dir, 'upstream')
    const client = join(dir, 'client')
    repo(upstream, { 'package.json': pkg('1.0.0'), 'src/a.txt': 'v1', 'src/viejo.txt': 'x' })
    repo(client, {
      'package.json': pkg('1.0.0'),
      'src/a.txt': 'v1',
      'src/viejo.txt': 'x',
      'public/logo-propio.txt': 'mío',
      '.github/workflows/w.yml': 'mío',
    })

    rmSync(join(upstream, 'src/viejo.txt'))
    commit(upstream, { 'package.json': pkg('1.2.0'), 'src/a.txt': 'v1.2' })
    git(upstream, 'tag', 'v1.2.0')
    commit(upstream, { 'package.json': pkg('2.0.0'), 'src/a.txt': 'sin publicar' })

    const run = () => update({ cwd: client, upstream, log: () => {} })
    assert.equal(run(), 'v1.2.0')
    assert.equal(readFileSync(join(client, 'src/a.txt'), 'utf8'), 'v1.2')
    assert.equal(existsSync(join(client, 'src/viejo.txt')), false)
    assert.equal(existsSync(join(client, 'public/logo-propio.txt')), true)
    assert.equal(readFileSync(join(client, '.github/workflows/w.yml'), 'utf8'), 'mío')
    assert.equal(git(client, 'status', '--porcelain'), '')
    assert.equal(run(), null)

    // Una versión retirada no se instala
    commit(upstream, { 'package.json': pkg('1.3.0') })
    git(upstream, 'tag', 'v1.3.0')
    commit(upstream, { 'withdrawn-versions.json': '["v1.3.0"]' })
    assert.equal(run(), null)
    commit(upstream, { 'withdrawn-versions.json': 'no es json' })
    assert.throws(run)
    commit(upstream, { 'withdrawn-versions.json': '[]' })
    assert.equal(run(), 'v1.3.0')

    write(client, 'src/a.txt', 'cambio local sin guardar')
    assert.throws(run, /sin guardar/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
