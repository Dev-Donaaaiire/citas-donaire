import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const { isUpdateOverdue } = await import('@/lib/version')
const read = (path) =>
  readFileSync(new URL('../' + path, import.meta.url), 'utf8').replaceAll('\r\n', '\n')

// Solo tiene sentido en el repositorio oficial: el workflow del cliente no se
// actualiza solo, y exigirlo igual bloquearía sus actualizaciones.
const repository = process.env.GITHUB_REPOSITORY
const clientRepo = Boolean(repository) && repository !== 'Dev-Donaaaiire/citas-donaire'

test('el panel muestra el mismo workflow que el repositorio', { skip: clientRepo }, () => {
  const modal = read('src/components/admin/AdminUpdateModal.tsx')
  const start = modal.indexOf('KRONO_SYNC_YML_CONTENT = `') + 'KRONO_SYNC_YML_CONTENT = `'.length
  const shown = modal.slice(start, modal.indexOf('`\n\nconst WORKFLOW_FILE_PATH', start))
  assert.equal(shown.replaceAll('\\${', '${'), read('.github/workflows/krono-sync.yml'))
})

test('avisa solo cuando la actualización lleva días sin aplicarse', () => {
  const now = Date.parse('2027-01-20')
  assert.equal(isUpdateOverdue('2027-01-18', now), false)
  assert.equal(isUpdateOverdue('2027-01-01', now), true)
  assert.equal(isUpdateOverdue(undefined, now), false)
})
