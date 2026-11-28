import assert from 'node:assert/strict'
import { test } from 'node:test'

const { freeTimes, storyDateIso } = await import('@/lib/story')

const data = {
  settings: {
    horario_apertura: '09:00',
    horario_cierre: '11:00',
    dias_laborables: [1, 2, 3, 4, 5],
    duracion_cita_minutos: 30,
    timezone: 'Europe/Madrid',
  },
  services: [{ duracion_minutos: 60 }, { duracion_minutos: 30 }],
  busyIntervals: [
    { inicio: '2027-01-11T08:30:00Z', fin: '2027-01-11T09:00:00Z', kind: 'appointment' },
  ],
}

test('hoy y mañana se calculan en la zona del negocio', () => {
  const now = new Date('2027-01-11T23:30:00Z') // ya es día 12 en Madrid
  assert.equal(storyDateIso('today', 'Europe/Madrid', now), '2027-01-12')
  assert.equal(storyDateIso('tomorrow', 'Europe/Madrid', now), '2027-01-13')
})

test('lista solo las horas libres y futuras', () => {
  const morning = new Date('2027-01-11T05:00:00Z')
  assert.deepEqual(freeTimes(data, '2027-01-11', morning), ['09:00', '10:00', '10:30'])
  const later = new Date('2027-01-11T09:00:00Z') // 10:00 en Madrid
  assert.deepEqual(freeTimes(data, '2027-01-11', later), ['10:30'])
  assert.deepEqual(freeTimes({ ...data, services: [] }, '2027-01-11', morning), [])
})
