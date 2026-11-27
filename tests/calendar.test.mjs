import assert from 'node:assert/strict'
import { test } from 'node:test'

const { calculateAvailableSlots } = await import('@/lib/calendar')

const settings = {
  horario_apertura: '09:00',
  horario_cierre: '11:00',
  dias_laborables: [1, 2, 3, 4, 5],
  duracion_cita_minutos: 30,
  timezone: 'Europe/Madrid',
}
const now = new Date('2027-01-01T00:00:00Z')
const slots = (extra = {}) =>
  calculateAvailableSlots({
    date: '2027-01-11',
    serviceDurationMinutes: 30,
    settings,
    now,
    ...extra,
  })

test('ofrece huecos en la zona horaria del negocio', () => {
  assert.deepEqual(
    slots().map((s) => s.datetime),
    ['08:00', '08:30', '09:00', '09:30'].map((t) => `2027-01-11T${t}:00.000Z`)
  )
})

test('respeta el horario de verano', () => {
  assert.equal(slots({ date: '2027-07-12' })[0].datetime, '2027-07-12T07:00:00.000Z')
})

test('no ofrece huecos en días no laborables', () => {
  assert.deepEqual(slots({ date: '2027-01-10' }), [])
})

test('marca como ocupado el hueco que se solapa', () => {
  const result = slots({
    busyIntervals: [
      { inicio: '2027-01-11T08:30:00Z', fin: '2027-01-11T09:00:00Z', kind: 'appointment' },
    ],
  })
  assert.deepEqual(result.map((s) => s.isAvailable), [true, false, true, true])
})
