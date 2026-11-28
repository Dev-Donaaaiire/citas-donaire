import assert from 'node:assert/strict'
import { test } from 'node:test'

const { toWhatsAppNumber, buildReminderMessage, buildWhatsAppUrl } = await import('@/lib/whatsapp')

test('normaliza teléfonos y descarta los dudosos', () => {
  for (const phone of ['600 123 456', '+34 600-123-456', '0034600123456', '34600123456']) {
    assert.equal(toWhatsAppNumber(phone), '34600123456', phone)
  }
  assert.equal(toWhatsAppNumber('+44 7911 123456'), '447911123456')
  for (const phone of ['', null, '12345', '123456789', 'sin teléfono']) {
    assert.equal(toWhatsAppNumber(phone), null, String(phone))
  }
})

test('redacta el recordatorio con la hora del negocio', () => {
  const message = buildReminderMessage({
    clientName: 'Ana García',
    serviceName: 'Corte',
    startIso: '2027-01-11T09:00:00Z',
    timezone: 'Europe/Madrid',
    businessName: 'Barbería X',
    manageUrl: 'https://x.example/cancelar?token=abc&a=1',
  })
  assert.match(message, /^Hola Ana, te recordamos tu cita de Corte el lunes.*11.*enero.* a las 10:00 en Barbería X\./)
  const url = new URL(buildWhatsAppUrl('34600123456', message))
  assert.equal(url.pathname, '/34600123456')
  assert.equal(url.searchParams.get('text'), message)
})
