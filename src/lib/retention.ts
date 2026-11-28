const DAY = 86_400_000
const DEFAULT_DAYS = 30
const MIN_VISITS_FOR_RHYTHM = 3
const MAX_DAYS = 365

export interface VisitRow {
  client_id: string
  fecha_hora_inicio: string
  client?: {
    nombre: string
    telefono: string | null
    bloqueado_no_show: boolean
  } | null
}

export interface DueClient {
  id: string
  nombre: string
  telefono: string | null
  daysSince: number
  /** Cada cuántos días suele venir; null si aún no hay historial suficiente. */
  usualDays: number | null
}

/**
 * Clientes que ya deberían haber vuelto según su propio ritmo. Recibe sus citas
 * no anuladas (pasadas y futuras); quien ya tiene una cita pendiente no aparece.
 */
export function findDueClients(rows: VisitRow[], now = Date.now()): DueClient[] {
  const byClient = new Map<string, { times: number[]; client: VisitRow['client'] }>()
  for (const row of rows) {
    const entry = byClient.get(row.client_id) ?? { times: [], client: row.client }
    entry.times.push(Date.parse(row.fecha_hora_inicio))
    byClient.set(row.client_id, entry)
  }

  const due: DueClient[] = []
  for (const [id, { times, client }] of byClient) {
    if (!client || client.bloqueado_no_show) continue
    if (times.some((time) => time > now)) continue

    // Varias citas el mismo día cuentan como una visita
    const days = [...new Set(times.map((time) => Math.floor(time / DAY)))].sort((a, b) => a - b)
    const daysSince = Math.floor(now / DAY) - days[days.length - 1]
    if (daysSince > MAX_DAYS) continue

    let usualDays: number | null = null
    if (days.length >= MIN_VISITS_FOR_RHYTHM) {
      const gaps = days.slice(1).map((day, i) => day - days[i]).sort((a, b) => a - b)
      const middle = Math.floor(gaps.length / 2)
      usualDays = Math.round(
        gaps.length % 2 ? gaps[middle] : (gaps[middle - 1] + gaps[middle]) / 2
      )
    }
    // Margen del 25 % (mínimo 3 días) para no avisar antes de tiempo
    const threshold =
      usualDays === null ? DEFAULT_DAYS : Math.max(usualDays * 1.25, usualDays + 3)
    if (daysSince < threshold) continue

    due.push({ id, nombre: client.nombre, telefono: client.telefono, daysSince, usualDays })
  }
  return due.sort((a, b) => a.daysSince - b.daysSince).slice(0, 30)
}
