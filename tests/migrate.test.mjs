import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { BASELINE, migrate, skipReason, sslConfig } from '../src/db/migrate.mjs'

const migrations = new URL('../supabase/migrations/', import.meta.url)
const files = readdirSync(migrations).sort()

// Imita los roles y permisos por defecto de Supabase
const SUPABASE_STUB = `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_user::text $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;`

async function withDatabase(run) {
  const db = new PGlite({ extensions: { btree_gist, pgcrypto, uuid_ossp } })
  await db.exec(SUPABASE_STUB)
  const server = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0 })
  await server.start()
  const url = `postgresql://postgres:postgres@${server.getServerConn()}/postgres?sslmode=disable`
  try {
    await run(db, url)
  } finally {
    await server.stop()
    await db.close()
  }
}

const quiet = () => {}
const names = async (db) =>
  (await db.query('SELECT name FROM public.krono_migrations ORDER BY name')).rows.map((r) => r.name)
const policies = async (db) =>
  (await db.query("SELECT policyname FROM pg_policies WHERE schemaname='public'")).rows.map((r) => r.policyname)

test('instalación nueva y segunda ejecución sin cambios', async () => {
  await withDatabase(async (db, url) => {
    assert.deepEqual(await migrate(url, quiet), ['initial-sql'])
    assert.deepEqual(await names(db), files.filter((f) => f <= BASELINE))
    assert.deepEqual(await policies(db), ['services_select_anon'])
    await db.exec('SET ROLE anon')
    const visible = await db.query('SELECT * FROM public.krono_migrations')
    await db.exec('RESET ROLE')
    assert.equal(visible.rows.length, 0)
    assert.deepEqual(await migrate(url, quiet), [])
  })
})

test('adopta una instalación hecha a mano sin perder datos y cierra permisos', async () => {
  await withDatabase(async (db, url) => {
    for (const file of files.filter((f) => f < BASELINE)) {
      await db.exec(readFileSync(new URL(file, migrations), 'utf8'))
    }
    await db.exec("INSERT INTO public.clients (nombre, email, telefono) VALUES ('Real', 'real@example.com', '600000000')")
    const before = (await db.query('SELECT count(*)::int c FROM public.clients')).rows[0].c
    await migrate(url, quiet)
    const after = (await db.query('SELECT count(*)::int c FROM public.clients')).rows[0].c
    assert.equal(after, before)
    assert.deepEqual(await policies(db), ['services_select_anon'])
  })
})

test('no hace nada en previsualizaciones, si se desactiva o sin conexión', () => {
  const url = 'postgresql://x:y@db.example.com/postgres'
  assert.match(skipReason({ VERCEL_ENV: 'preview', SUPABASE_DB_URL: url }), /preview/)
  assert.match(skipReason({ SKIP_DB_MIGRATIONS: 'true', SUPABASE_DB_URL: url }), /SKIP/)
  assert.match(skipReason({}), /sin conexión/)
  assert.equal(skipReason({ VERCEL_ENV: 'production', SUPABASE_DB_URL: url }), null)
})

test('valida siempre el certificado del servidor', () => {
  for (const host of ['db.example.com', 'x.pooler.supabase.com']) {
    const url = `postgresql://a:b@${host}/p?sslmode=require`
    assert.deepEqual(sslConfig(url, {}, null), { rejectUnauthorized: true })
    const withCa = sslConfig(url, { SUPABASE_DB_CA: 'CA' }, null)
    assert.equal(withCa.rejectUnauthorized, true)
    assert.equal(withCa.ca.at(-1), 'CA')
  }
  assert.equal(sslConfig('postgresql://a:b@127.0.0.1/p', {}, null), false)
})
