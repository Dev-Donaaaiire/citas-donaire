import assert from 'node:assert/strict'
import { test } from 'node:test'

const auth = await import('@/lib/admin-session-token')

test('funciona sin ADMIN_SESSION_SECRET y caduca al cambiar la contraseña', async () => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  process.env.NODE_ENV = 'production'
  process.env.ADMIN_PASSWORD = 'una-clave-segura-1'

  assert.equal(auth.isAdminAuthConfigured(), false)

  process.env.SUPABASE_SECRET_KEY = 'sb_secret_de_pruebas'
  assert.equal(auth.isAdminAuthConfigured(), true)
  const token = await auth.createAdminSessionToken()
  assert.equal((await auth.verifyAdminSessionToken(token)).valid, true)

  process.env.ADMIN_PASSWORD = 'otra-clave-segura-2'
  assert.equal((await auth.verifyAdminSessionToken(token)).valid, false)
})
