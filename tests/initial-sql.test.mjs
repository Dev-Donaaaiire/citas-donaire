import assert from 'node:assert/strict'
import { test } from 'node:test'

const { INITIAL_SUPABASE_SQL_SCRIPT: sql } = await import('@/lib/initial-sql')

test('crea cada tabla antes de alterarla', () => {
  const altered = [...sql.matchAll(/ALTER TABLE public\.(\w+)/g)]
  assert.ok(altered.length > 0)
  for (const match of altered) {
    const created = sql.indexOf(`CREATE TABLE IF NOT EXISTS public.${match[1]} (`)
    assert.ok(created !== -1 && created < match.index, match[1])
  }
})

test('no declara políticas abiertas a public o authenticated', () => {
  assert.doesNotMatch(sql, /CREATE POLICY[^;]*TO (public|authenticated)\b/)
})
