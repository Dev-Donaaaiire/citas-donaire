import assert from 'node:assert/strict'
import { test } from 'node:test'

const { sanitizeNextAdminPath } = await import('@/lib/admin-session-token')

test('conserva rutas internas', () => {
  assert.equal(sanitizeNextAdminPath('/setup?paso=2'), '/setup?paso=2')
})

test('rechaza redirecciones a otros dominios', () => {
  const attempts = [
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com',
    '/..//evil.com',
    null,
  ]
  for (const bad of attempts) {
    assert.equal(sanitizeNextAdminPath(bad), '/admin', String(bad))
  }
})
