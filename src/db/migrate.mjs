// Aplica la base de datos automáticamente al desplegar.
//  - Primera vez (instalación nueva o hecha a mano): ejecuta el script completo
//    e idempotente de src/lib/initial-sql.ts y anota las migraciones que cubre.
//  - Después: solo las migraciones nuevas de supabase/migrations/.
// Todo va en una transacción: si algo falla, la base queda como estaba y el
// despliegue se detiene (sigue publicada la versión anterior).
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import pg from 'pg'

/** Última migración ya incluida en initial-sql.ts. No la muevas sin actualizar el script. */
export const BASELINE = '20261127000000_tighten_rls_policies.sql'

const root = new URL('../../', import.meta.url)

export function resolveDatabaseUrl(env = process.env) {
  return (
    env.POSTGRES_URL_NON_POOLING?.trim() ||
    env.SUPABASE_DB_URL?.trim() ||
    env.DATABASE_URL?.trim() ||
    env.POSTGRES_URL?.trim() ||
    null
  )
}

export function skipReason(env = process.env) {
  if (env.SKIP_DB_MIGRATIONS === 'true') return 'SKIP_DB_MIGRATIONS=true'
  // Las previsualizaciones de Vercel no deben modificar la base de producción
  if (env.VERCEL_ENV && env.VERCEL_ENV !== 'production') {
    return `entorno ${env.VERCEL_ENV}`
  }
  if (!resolveDatabaseUrl(env)) {
    return 'sin conexión Postgres (POSTGRES_URL_NON_POOLING o SUPABASE_DB_URL)'
  }
  return null
}

export function sslConfig(raw, env = process.env) {
  const url = new URL(raw)
  const local = ['localhost', '127.0.0.1'].includes(url.hostname)
  if (local || url.searchParams.get('sslmode') === 'disable') return false
  // Con la CA de Supabase (Database Settings -> SSL) se valida el certificado
  const ca = env.SUPABASE_DB_CA?.trim()
  if (ca) return { ca }
  // Supabase firma con una CA propia que Node no conoce: solo para sus dominios
  // se cifra sin validar la cadena. Cualquier otro servidor se valida siempre.
  const isSupabase = /\.supabase\.(co|com)$/.test(url.hostname)
  return { rejectUnauthorized: !isSupabase }
}

function connectionConfig(raw) {
  const url = new URL(raw)
  const ssl = sslConfig(raw)
  // sslmode en la URL anularía la configuración anterior
  url.searchParams.delete('sslmode')
  return {
    connectionString: url.toString(),
    ssl,
    connectionTimeoutMillis: 20_000,
  }
}

export async function migrate(databaseUrl, log = console.log) {
  const dir = new URL('supabase/migrations/', root)
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
  const { INITIAL_SUPABASE_SQL_SCRIPT } = await import(
    pathToFileURL(fileURLToPath(new URL('src/lib/initial-sql.ts', root))).href
  )

  const client = new pg.Client(connectionConfig(databaseUrl))
  await client.connect()
  const applied = []
  try {
    await client.query('BEGIN')
    // Evita que dos despliegues simultáneos apliquen lo mismo
    await client.query('SELECT pg_advisory_xact_lock(727274)')
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.krono_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`)
    await client.query('ALTER TABLE public.krono_migrations ENABLE ROW LEVEL SECURITY')

    const done = new Set(
      (await client.query('SELECT name FROM public.krono_migrations')).rows.map(
        (row) => row.name
      )
    )
    const record = async (name) => {
      await client.query(
        'INSERT INTO public.krono_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING',
        [name]
      )
      done.add(name)
    }

    if (done.size === 0) {
      log('[migrate] Preparando la base de datos (script completo)...')
      await client.query(INITIAL_SUPABASE_SQL_SCRIPT)
      for (const name of files.filter((file) => file <= BASELINE)) await record(name)
      applied.push('initial-sql')
    }

    for (const name of files) {
      if (done.has(name)) continue
      log(`[migrate] Aplicando ${name}`)
      await client.query(readFileSync(new URL(name, dir), 'utf8'))
      await record(name)
      applied.push(name)
    }

    await client.query("NOTIFY pgrst, 'reload schema'")
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    await client.end()
  }
  log(applied.length ? '[migrate] Base de datos actualizada.' : '[migrate] Sin cambios.')
  return applied
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const reason = skipReason()
  if (reason) {
    console.log(`[migrate] Omitido: ${reason}.`)
  } else {
    try {
      await migrate(resolveDatabaseUrl())
    } catch (err) {
      // Nunca se imprime la cadena de conexión
      console.error('[migrate] Error aplicando la base de datos:', err.message)
      process.exit(1)
    }
  }
}
