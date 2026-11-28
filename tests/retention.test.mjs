import assert from 'node:assert/strict'
import { test } from 'node:test'

const { findDueClients } = await import('@/lib/retention')

const now = Date.parse('2027-06-30T12:00:00Z')
const ago = (days) => new Date(now - days * 86_400_000).toISOString()
const visits = (id, daysAgo, extra = {}) =>
  daysAgo.map((days) => ({
    client_id: id,
    fecha_hora_inicio: ago(days),
    client: { nombre: id, telefono: null, bloqueado_no_show: false, ...extra },
  }))

test('avisa según el ritmo de cada cliente', () => {
  const due = findDueClients(
    [
      ...visits('quincenal-tarde', [60, 46, 32, 19]),
      ...visits('quincenal-al-dia', [38, 24, 10]),
      ...visits('bimestral-al-dia', [160, 100, 40]),
      ...visits('nuevo-35-dias', [35]),
      ...visits('nuevo-20-dias', [20]),
      ...visits('con-cita-pendiente', [90, -3]),
      ...visits('bloqueado', [90], { bloqueado_no_show: true }),
      ...visits('perdido-hace-anos', [500]),
    ],
    now
  )
  assert.deepEqual(
    due.map((c) => [c.id, c.daysSince, c.usualDays]),
    [
      ['quincenal-tarde', 19, 14],
      ['nuevo-35-dias', 35, null],
    ]
  )
})
