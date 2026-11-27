import { Resend } from 'resend'
import {
  generateBookingCalendarAssets,
  type BookingCalendarInput,
} from '@/lib/ics'
import { sanitizeTimeZone } from '@/lib/timezone'

const DEFAULT_FROM =
  process.env.RESEND_FROM_EMAIL || 'Krono Citas <citas@citas.donaire.dev>'

export const DEFAULT_REPO_URL =
  process.env.NEXT_PUBLIC_REPO_URL?.trim() ||
  'https://github.com/Dev-Donaaaiire/citas-donaire'

export const DEFAULT_TUTORIAL_VIDEO_URL =
  process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_URL?.trim() || null

export function buildVercelOneClickDeployUrl(repoUrl?: string): string {
  let targetRepo = (repoUrl || DEFAULT_REPO_URL).trim().replace(/\/$/, '')
  if (!targetRepo.includes('/tree/')) {
    targetRepo = `${targetRepo}/tree/main`
  }
  const params = new URLSearchParams({
    'repository-url': targetRepo,
    env: 'ADMIN_PASSWORD,LICENSE_KEY',
    envDescription:
      'Elige una contraseña para tu panel (mínimo 10 caracteres) y pega la clave de licencia recibida por email.',
    stores: JSON.stringify([
      {
        type: 'integration',
        integrationSlug: 'supabase',
        productSlug: 'supabase',
        protocol: 'storage',
      },
    ]),
    'project-name': 'agenda-citas',
    'repository-name': 'agenda-citas',
  })
  return `https://vercel.com/new/clone?${params.toString()}`
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey || !apiKey.startsWith('re_') || apiKey === 're_tu_api_key_aqui') {
    return null
  }
  return new Resend(apiKey)
}

function isResendSandboxOrDomainError(message: string): boolean {
  return /only send testing emails|verify a domain|domain is not verified|testing emails to your own/i.test(
    message
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatPriceEur(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDateSpanish(iso: string, timeZone?: string | null): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: sanitizeTimeZone(timeZone),
    })
  } catch {
    return iso
  }
}

function formatTimeSpanish(iso: string, timeZone?: string | null): string {
  try {
    return new Date(iso).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: sanitizeTimeZone(timeZone),
    })
  } catch {
    return '--:--'
  }
}

function renderEmailShell({
  preheader,
  badge,
  title,
  subtitle,
  bodyHtml,
  footerNote,
}: {
  preheader: string
  badge: string
  title: string
  subtitle: string
  bodyHtml: string
  footerNote: string
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#f4f4f5;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#121214;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 28px 20px;border-bottom:1px solid #27272a;">
              <div style="display:inline-block;padding:4px 10px;border-radius:9999px;background-color:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);color:#34d399;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:14px;">
                ${escapeHtml(badge)}
              </div>
              <h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">
                ${escapeHtml(title)}
              </h1>
              <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#a1a1aa;">
                ${escapeHtml(subtitle)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;border-top:1px solid #27272a;background-color:#0c0c0e;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#71717a;text-align:center;">
                ${escapeHtml(footerNote)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildOwnerBookingEmailHtml(params: {
  businessName: string
  serviceName: string
  servicePrice: number
  durationMinutes: number
  clientName: string
  clientEmail: string
  clientPhone?: string | null
  notes?: string | null
  startIso: string
  endIso: string
  timezone?: string | null
  googleCalendarUrl: string
  adminUrl: string
}): string {
  const dateLabel = formatDateSpanish(params.startIso, params.timezone)
  const timeRange = `${formatTimeSpanish(params.startIso, params.timezone)} - ${formatTimeSpanish(params.endIso, params.timezone)}`
  const priceLabel = formatPriceEur(params.servicePrice)

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;border:1px solid #27272a;border-radius:12px;margin-bottom:20px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#d4af37;">
            Detalles de la reserva
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.6;">
            <tr>
              <td style="padding:4px 0;color:#a1a1aa;width:120px;">Servicio</td>
              <td style="padding:4px 0;color:#ffffff;font-weight:600;">${escapeHtml(params.serviceName)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#a1a1aa;">Día</td>
              <td style="padding:4px 0;color:#ffffff;text-transform:capitalize;">${escapeHtml(dateLabel)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#a1a1aa;">Horario</td>
              <td style="padding:4px 0;color:#34d399;font-weight:700;font-family:monospace;">${escapeHtml(timeRange)} (${params.durationMinutes} min)</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#a1a1aa;">Importe</td>
              <td style="padding:4px 0;color:#ffffff;font-weight:600;">${escapeHtml(priceLabel)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;border:1px solid #27272a;border-radius:12px;margin-bottom:20px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">
            Datos del cliente
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.6;">
            <tr>
              <td style="padding:4px 0;color:#a1a1aa;width:120px;">Nombre</td>
              <td style="padding:4px 0;color:#ffffff;font-weight:600;">${escapeHtml(params.clientName)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#a1a1aa;">Email</td>
              <td style="padding:4px 0;color:#e4e4e7;">${escapeHtml(params.clientEmail)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#a1a1aa;">Teléfono</td>
              <td style="padding:4px 0;color:#e4e4e7;">${escapeHtml(params.clientPhone || 'No facilitado')}</td>
            </tr>
            ${
              params.notes
                ? `<tr>
                    <td style="padding:4px 0;color:#a1a1aa;vertical-align:top;">Notas</td>
                    <td style="padding:4px 0;color:#f4f4f5;">${escapeHtml(params.notes)}</td>
                  </tr>`
                : ''
            }
          </table>
        </td>
      </tr>
    </table>

    <div style="padding:14px 16px;border-radius:10px;background-color:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.28);margin-bottom:22px;">
      <p style="margin:0;font-size:13px;line-height:1.5;color:#f6f0e1;">
        📎 <strong>Archivo .ics adjunto:</strong> Ábrelo desde tu móvil para agendar esta cita en Google Calendar o Apple Calendar con un solo toque.
      </p>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom:10px;">
          <a href="${escapeHtml(params.googleCalendarUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;padding:13px 20px;border-radius:10px;background-color:#10b981;color:#09090b;font-size:14px;font-weight:700;text-decoration:none;">
            Agendar en Google Calendar
          </a>
        </td>
      </tr>
      <tr>
        <td align="center">
          <a href="${escapeHtml(params.adminUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;padding:12px 20px;border-radius:10px;background-color:#18181b;border:1px solid #3f3f46;color:#f4f4f5;font-size:13px;font-weight:600;text-decoration:none;">
            Abrir Panel de Control
          </a>
        </td>
      </tr>
    </table>
  `

  return renderEmailShell({
    preheader: `Nueva reserva de ${params.clientName} para ${params.serviceName} el ${dateLabel}.`,
    badge: 'Nueva Reserva · Panel Dueño',
    title: '¡Nueva cita reservada!',
    subtitle: `${params.businessName} · Notificación automática de agenda`,
    bodyHtml,
    footerNote: `${params.businessName} · Sistema automático de gestión de citas`,
  })
}

export function buildClientBookingEmailHtml(params: {
  businessName: string
  businessAddress?: string | null
  businessPhone?: string | null
  timezone?: string | null
  serviceName: string
  servicePrice: number
  durationMinutes: number
  clientName: string
  startIso: string
  endIso: string
  googleCalendarUrl: string
  cancelUrl: string
}): string {
  const dateLabel = formatDateSpanish(params.startIso, params.timezone)
  const timeRange = `${formatTimeSpanish(params.startIso, params.timezone)} - ${formatTimeSpanish(params.endIso, params.timezone)}`
  const priceLabel = formatPriceEur(params.servicePrice)
  const cleanAddress = params.businessAddress?.trim()
  const cleanPhone = params.businessPhone?.trim()

  const bodyHtml = `
    <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#d4d4d8;">
      Hola <strong style="color:#ffffff;">${escapeHtml(params.clientName)}</strong>, tu reserva en <strong style="color:#ffffff;">${escapeHtml(params.businessName)}</strong> está confirmada. Aquí tienes tu resumen:
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;border:1px solid #27272a;border-radius:12px;margin-bottom:22px;">
      <tr>
        <td style="padding:18px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.6;">
            <tr>
              <td style="padding:4px 0;color:#a1a1aa;width:110px;">Servicio</td>
              <td style="padding:4px 0;color:#ffffff;font-weight:600;">${escapeHtml(params.serviceName)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#a1a1aa;">Día</td>
              <td style="padding:4px 0;color:#ffffff;text-transform:capitalize;">${escapeHtml(dateLabel)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#a1a1aa;">Hora</td>
              <td style="padding:4px 0;color:#34d399;font-weight:700;font-family:monospace;">${escapeHtml(timeRange)} (${params.durationMinutes} min)</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#a1a1aa;">Precio</td>
              <td style="padding:4px 0;color:#ffffff;font-weight:600;">${escapeHtml(priceLabel)} · En el establecimiento</td>
            </tr>
            ${
              cleanAddress
                ? `<tr>
              <td style="padding:4px 0;color:#a1a1aa;">Ubicación</td>
              <td style="padding:4px 0;color:#e4e4e7;">${escapeHtml(cleanAddress)}</td>
            </tr>`
                : ''
            }
            ${
              cleanPhone
                ? `<tr>
              <td style="padding:4px 0;color:#a1a1aa;">Contacto</td>
              <td style="padding:4px 0;color:#e4e4e7;">${escapeHtml(cleanPhone)}</td>
            </tr>`
                : ''
            }
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom:10px;">
          <a href="${escapeHtml(params.googleCalendarUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;padding:13px 20px;border-radius:10px;background-color:#10b981;color:#09090b;font-size:14px;font-weight:700;text-decoration:none;">
            📅 Añadir a mi calendario
          </a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:14px;">
          <a href="${escapeHtml(params.cancelUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;padding:12px 20px;border-radius:10px;background-color:#18181b;border:1px solid #3f3f46;color:#f4f4f5;font-size:13px;font-weight:600;text-decoration:none;">
            🔄 Cancelar / Cambiar cita
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;text-align:center;">
      También hemos adjuntado el archivo <strong>.ics</strong> para Apple Calendar y Outlook.<br/>
      Gestiona tu cita en 1 clic sin necesidad de llamar por teléfono.
    </p>
  `

  return renderEmailShell({
    preheader: `Cita confirmada: ${params.serviceName} el ${dateLabel} a las ${formatTimeSpanish(params.startIso, params.timezone)}.`,
    badge: 'Reserva Confirmada',
    title: '¡Tu cita está confirmada!',
    subtitle: `${params.businessName} · Te esperamos`,
    bodyHtml,
    footerNote: `Si no puedes asistir, por favor cancela o cambia tu cita desde el enlace superior.`,
  })
}

export function buildClientReminderEmailHtml(params: {
  clientName: string
  businessName: string
  lastVisitFormatted: string
  bookingUrl: string
  customSubject?: string | null
  customMessage?: string | null
}): string {
  const firstName = params.clientName.trim().split(' ')[0] || params.clientName
  const subjectTitle =
    params.customSubject?.trim() ||
    `¡Te echamos de menos en ${params.businessName}!`

  let bodyParagraphsHtml: string
  if (params.customMessage?.trim()) {
    const escaped = escapeHtml(params.customMessage.trim())
    bodyParagraphsHtml = escaped
      .split(/\n{2,}/)
      .map(
        (p) =>
          `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#d4d4d8;">${p.replace(/\n/g, '<br/>')}</p>`
      )
      .join('')
  } else {
    bodyParagraphsHtml = `
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#f4f4f5;">
        Hola <strong>${escapeHtml(firstName)}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#d4d4d8;">
        Desde <strong style="color:#ffffff;">${escapeHtml(params.businessName)}</strong> queremos saludarte. Hemos visto que tu última visita fue <strong>${escapeHtml(params.lastVisitFormatted)}</strong> y nos encantaría volver a verte pronto.
      </p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.65;color:#a1a1aa;">
        ¿Te apetece renovar tu estilo esta semana? Puedes ver nuestros huecos libres en tiempo real y reservar en 30 segundos, sin esperas ni llamadas telefónicas.
      </p>
    `
  }

  const bodyHtml = `
    ${bodyParagraphsHtml}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(params.bookingUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;padding:14px 22px;border-radius:10px;background-color:#10b981;color:#09090b;font-size:14px;font-weight:700;text-decoration:none;">
            ✂️ Reservar mi próxima cita
          </a>
        </td>
      </tr>
    </table>
  `

  return renderEmailShell({
    preheader: `${firstName}, te saludamos desde ${params.businessName}. Reserva tu cita en 30 segundos.`,
    badge: 'Aviso Preferente',
    title: subjectTitle,
    subtitle: `${params.businessName} · Contacto directo`,
    bodyHtml,
    footerNote: `Recibes este correo porque eres cliente de ${params.businessName}.`,
  })
}

/**
 * Envía dos correos en paralelo tras confirmar una cita:
 * 1) Al dueño con el .ics adjunto y resumen del cliente.
 * 2) Al cliente con botones de Añadir a calendario y Cancelar/Cambiar cita.
 */
export async function sendBookingConfirmationEmails(
  input: BookingCalendarInput & {
    ownerEmail?: string | null
    businessPhone?: string | null
    notes?: string | null
  }
) {
  const { icsContent, icsFilename, googleCalendarUrl, cancelUrl } =
    generateBookingCalendarAssets(input)

  const cleanBaseUrl = input.baseUrl.replace(/\/$/, '')
  const cleanOwnerEmail =
    input.ownerEmail && !input.ownerEmail.includes('donairecitas.pro')
      ? input.ownerEmail.trim()
      : null
  const ownerEmail =
    cleanOwnerEmail ||
    process.env.OWNER_NOTIFICATION_EMAIL?.trim() ||
    null

  const ownerHtml = buildOwnerBookingEmailHtml({
    businessName: input.businessName,
    serviceName: input.serviceName,
    servicePrice: input.servicePrice,
    durationMinutes: input.durationMinutes,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    clientPhone: input.clientPhone,
    notes: input.notes,
    startIso: input.startIso,
    endIso: input.endIso,
    timezone: input.businessTimezone,
    googleCalendarUrl,
    adminUrl: `${cleanBaseUrl}/admin`,
  })

  const clientHtml = buildClientBookingEmailHtml({
    businessName: input.businessName,
    businessAddress: input.businessAddress,
    businessPhone: input.businessPhone,
    timezone: input.businessTimezone,
    serviceName: input.serviceName,
    servicePrice: input.servicePrice,
    durationMinutes: input.durationMinutes,
    clientName: input.clientName,
    startIso: input.startIso,
    endIso: input.endIso,
    googleCalendarUrl,
    cancelUrl,
  })

  const resend = getResendClient()

  if (!resend) {
    return {
      success: true,
      simulated: true,
      googleCalendarUrl,
      cancelUrl,
      icsFilename,
    }
  }

  const icsAttachment = {
    filename: icsFilename,
    content: Buffer.from(icsContent, 'utf-8'),
    contentType: 'text/calendar; charset=utf-8; method=REQUEST',
  }

  const isValidClientEmail = Boolean(
    input.clientEmail &&
    input.clientEmail.trim().length > 3 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.clientEmail.trim()) &&
    !input.clientEmail.endsWith('@citas.local')
  )

  const emailJobs = []

  if (isValidClientEmail) {
    emailJobs.push(
      resend.emails.send({
        from: DEFAULT_FROM,
        to: input.clientEmail.trim(),
        subject: `Confirmación de tu cita · ${input.businessName}`,
        html: clientHtml,
        attachments: [icsAttachment],
      })
    )
  }

  if (ownerEmail) {
    emailJobs.push(
      resend.emails.send({
        from: DEFAULT_FROM,
        to: ownerEmail,
        subject: `¡Nueva cita reservada! · ${input.clientName} (${input.serviceName})`,
        html: ownerHtml,
        attachments: [icsAttachment],
      })
    )
  }

  if (emailJobs.length === 0) {
    return {
      success: false,
      simulated: false,
      reason: 'no_recipients',
      googleCalendarUrl,
      cancelUrl,
      icsFilename,
    }
  }

  const results = await Promise.allSettled(emailJobs)

  const errors = results
    .map((r) => {
      if (r.status === 'rejected') return String(r.reason)
      if (r.value.error) return r.value.error.message
      return null
    })
    .filter((e): e is string => Boolean(e))

  if (errors.length === results.length) {
    if (errors.every(isResendSandboxOrDomainError)) {
      const fallbackJobs = []
      if (isValidClientEmail) {
        fallbackJobs.push(
          resend.emails.send({
            from: 'Krono Citas <onboarding@resend.dev>',
            to: input.clientEmail.trim(),
            subject: `Confirmación de tu cita · ${input.businessName}`,
            html: clientHtml,
            attachments: [icsAttachment],
          })
        )
      }
      if (ownerEmail) {
        fallbackJobs.push(
          resend.emails.send({
            from: 'Krono Citas <onboarding@resend.dev>',
            to: ownerEmail,
            subject: `¡Nueva cita reservada! · ${input.clientName} (${input.serviceName})`,
            html: ownerHtml,
            attachments: [icsAttachment],
          })
        )
      }
      const fallbackResults = await Promise.allSettled(fallbackJobs)
      const hasAnySuccess = fallbackResults.some(
        (r) => r.status === 'fulfilled' && !r.value.error
      )
      if (hasAnySuccess) {
        return {
          success: true,
          simulated: false,
          googleCalendarUrl,
          cancelUrl,
          icsFilename,
        }
      }

      console.warn(
        'Resend en modo sandbox o dominio sin verificar; degradando notificación de reserva a modo simulado:',
        errors.join(' | ')
      )
      return {
        success: true,
        simulated: true,
        reason: 'resend_domain_unverified',
        googleCalendarUrl,
        cancelUrl,
        icsFilename,
        warnings: errors,
      }
    }
    throw new Error(`No se pudieron enviar los correos con Resend: ${errors.join(' | ')}`)
  }

  return {
    success: true,
    simulated: false,
    googleCalendarUrl,
    cancelUrl,
    icsFilename,
    warnings: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Envía un correo cordial de reactivación al cliente desde la pestaña Seguimiento.
 */
export async function sendClientReminderEmail(input: {
  clientName: string
  clientEmail: string
  businessName: string
  lastVisit?: string | null
  timezone?: string | null
  baseUrl: string
  customSubject?: string | null
  customMessage?: string | null
}) {
  const cleanBaseUrl = input.baseUrl.replace(/\/$/, '')
  const bookingUrl = `${cleanBaseUrl}/reservar`

  let lastVisitFormatted = 'hace más de 30 días'
  if (input.lastVisit) {
    const days = Math.max(
      0,
      Math.floor((Date.now() - new Date(input.lastVisit).getTime()) / 86_400_000)
    )
    if (days > 0) {
      lastVisitFormatted = `hace ${days} días (${formatDateSpanish(input.lastVisit, input.timezone)})`
    }
  }

  const html = buildClientReminderEmailHtml({
    clientName: input.clientName,
    businessName: input.businessName,
    lastVisitFormatted,
    bookingUrl,
    customSubject: input.customSubject,
    customMessage: input.customMessage,
  })

  const resend = getResendClient()

  if (!resend) {
    return {
      success: true,
      simulated: true,
      reason: 'missing_resend_api_key',
      warning:
        'RESEND_API_KEY no configurada. El correo ha sido simulado.',
      bookingUrl,
    }
  }

  const subject =
    input.customSubject?.trim() ||
    `¡Te echamos de menos en ${input.businessName}! Reserva tu próxima cita`

  const { data, error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: input.clientEmail,
    subject,
    html,
  })

  if (error) {
    if (isResendSandboxOrDomainError(error.message)) {
      console.warn(
        'Resend en modo sandbox o dominio sin verificar:',
        error.message
      )
      return {
        success: true,
        simulated: true,
        reason: 'resend_domain_unverified',
        warning: `Resend en sandbox (${DEFAULT_FROM}): ${error.message}`,
        bookingUrl,
      }
    }
    throw new Error(`Error al enviar el recordatorio con Resend: ${error.message}`)
  }

  return {
    success: true,
    simulated: false,
    emailId: data?.id,
    bookingUrl,
  }
}

export function buildLicenseDeliveryEmailHtml(params: {
  buyerEmail: string
  buyerName?: string | null
  licenseKey: string
  plan: 'autoinstalable_15' | 'llave_en_mano_99'
  amountFormatted: string
  tutorialVideoUrl?: string | null
  vercelDeployUrl: string
  setupGuideUrl: string
}): string {
  const firstName =
    params.buyerName?.trim().split(' ')[0] ||
    params.buyerEmail.split('@')[0] ||
    'Creador'
  const planTitle =
    params.plan === 'llave_en_mano_99'
      ? 'Plan Llave en Mano (99 € · Pago único)'
      : 'Plan Autoinstalable (14,99 € · Pago único)'

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#f4f4f5;">
      Hola <strong style="color:#ffffff;">${escapeHtml(firstName)}</strong>,
    </p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#d4d4d8;">
      Gracias por tu compra de <strong style="color:#ffffff;">Krono / Donaire Citas</strong> (${escapeHtml(planTitle)} · ${escapeHtml(params.amountFormatted)}). Tu licencia vitalicia ya está activada en nuestros servidores y lista para desplegar.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;border:1px solid #d4af37;border-radius:12px;margin-bottom:22px;">
      <tr>
        <td style="padding:20px;text-align:center;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#d4af37;">
            Tu Clave de Licencia Única (LICENSE_KEY)
          </p>
          <p style="margin:0 0 10px;font-size:21px;font-weight:800;letter-spacing:0.08em;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;color:#ffffff;">
            ${escapeHtml(params.licenseKey)}
          </p>
          <p style="margin:0;font-size:12px;color:#a1a1aa;">
            Guarda esta clave: la pegarás en la variable <code style="color:#34d399;">LICENSE_KEY</code> durante el despliegue en Vercel.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td align="center" style="padding-bottom:10px;">
          <a href="${escapeHtml(params.vercelDeployUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;padding:14px 20px;border-radius:10px;background-color:#10b981;color:#09090b;font-size:14px;font-weight:700;text-decoration:none;">
            🚀 Desplegar en Vercel en 1 Clic
          </a>
        </td>
      </tr>
      ${
        params.tutorialVideoUrl
          ? `<tr>
        <td align="center" style="padding-bottom:10px;">
          <a href="${escapeHtml(params.tutorialVideoUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;padding:13px 20px;border-radius:10px;background-color:#18181b;border:1px solid #3f3f46;color:#f4f4f5;font-size:13px;font-weight:600;text-decoration:none;">
            🎬 Ver Vídeo Tutorial de Instalación (5 min)
          </a>
        </td>
      </tr>`
          : ''
      }
      <tr>
        <td align="center">
          <a href="${escapeHtml(params.setupGuideUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;padding:11px 20px;border-radius:10px;background-color:transparent;border:1px solid #27272a;color:#a1a1aa;font-size:12px;font-weight:600;text-decoration:none;">
            ⚙️ Abrir Asistente /setup de Primera Instalación
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;border:1px solid #27272a;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#34d399;">
            Puesta en marcha en 3 pasos (5 minutos)
          </p>
          <ol style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#d4d4d8;">
            <li>Pulsa <strong>Desplegar en Vercel en 1 Clic</strong> arriba para clonar tu copia privada.</li>
            <li>Introduce tu URL/Anon Key de Supabase, tu API Key de Resend y tu licencia <code style="color:#ffffff;">${escapeHtml(params.licenseKey)}</code>.</li>
            <li>Al terminar el despliegue, entra en <code style="color:#34d399;">/setup</code> para copiar el SQL inicial y poner el nombre de tu negocio.</li>
          </ol>
        </td>
      </tr>
    </table>
  `

  return renderEmailShell({
    preheader: `Tu licencia ${params.licenseKey} y despliegue en 1 clic de Krono / Donaire Citas están listos.`,
    badge: 'Compra Confirmada · Entrega Inmediata',
    title: 'Tu sistema de citas ya es tuyo',
    subtitle: params.tutorialVideoUrl
      ? 'Clave de licencia, vídeo tutorial de 5 min y despliegue automático'
      : 'Clave de licencia y despliegue automático en 1 clic',
    bodyHtml,
    footerNote: `Licencia emitida para ${params.buyerEmail} · Krono / Donaire Citas`,
  })
}

/**
 * Envía al instante el email de entrega tras completarse el pago en PayPal.
 */
export async function sendLicenseDeliveryEmail(input: {
  buyerEmail: string
  buyerName?: string | null
  licenseKey: string
  plan: 'autoinstalable_15' | 'llave_en_mano_99'
  amountCents?: number | null
  baseUrl?: string
  subjectPrefix?: string
}) {
  const cleanBaseUrl = (
    input.baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')

  const defaultAmount = input.plan === 'llave_en_mano_99' ? 99 : 14.99
  const amountEur =
    typeof input.amountCents === 'number' && input.amountCents > 0
      ? input.amountCents / 100
      : defaultAmount

  const vercelDeployUrl = buildVercelOneClickDeployUrl()
  const tutorialVideoUrl = DEFAULT_TUTORIAL_VIDEO_URL
  const setupGuideUrl = `${cleanBaseUrl}/setup`

  const html = buildLicenseDeliveryEmailHtml({
    buyerEmail: input.buyerEmail,
    buyerName: input.buyerName,
    licenseKey: input.licenseKey,
    plan: input.plan,
    amountFormatted: formatPriceEur(amountEur),
    tutorialVideoUrl,
    vercelDeployUrl,
    setupGuideUrl,
  })

  const resend = getResendClient()

  if (!resend) {
    return {
      success: true,
      simulated: true,
      to: input.buyerEmail,
      licenseKey: input.licenseKey,
      vercelDeployUrl,
      tutorialVideoUrl,
      setupGuideUrl,
    }
  }

  const subject = `${input.subjectPrefix || ''}🔑 Tu Licencia Krono (${input.licenseKey}) + Despliegue en 1 Clic`

  let { data, error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: input.buyerEmail,
    subject,
    html,
  })

  if (error && isResendSandboxOrDomainError(error.message)) {
    const fallbackSend = await resend.emails.send({
      from: 'Krono Citas <onboarding@resend.dev>',
      to: input.buyerEmail,
      subject,
      html,
    })
    if (!fallbackSend.error) {
      data = fallbackSend.data
      error = null
    }
  }

  if (error) {
    if (isResendSandboxOrDomainError(error.message)) {
      console.warn(
        'Resend en modo sandbox o dominio sin verificar; degradando entrega de licencia a modo simulado:',
        error.message
      )
      return {
        success: true,
        simulated: true,
        reason: 'resend_domain_unverified',
        to: input.buyerEmail,
        licenseKey: input.licenseKey,
        vercelDeployUrl,
        tutorialVideoUrl,
        setupGuideUrl,
      }
    }
    throw new Error(
      `No se pudo enviar el correo de licencia con Resend: ${error.message}`
    )
  }

  return {
    success: true,
    simulated: false,
    emailId: data?.id ?? null,
    to: input.buyerEmail,
    licenseKey: input.licenseKey,
    vercelDeployUrl,
    tutorialVideoUrl,
    setupGuideUrl,
  }
}

export interface AppointmentRescheduleNoticeInput {
  clientName: string
  clientEmail: string
  businessName: string
  businessAddress?: string | null
  businessPhone?: string | null
  timezone?: string | null
  serviceName: string
  startIso: string
  endIso: string
  rescheduleUrl: string
  cancelUrl: string
  motivo?: string | null
  ownerEmail?: string | null
}

export function buildAppointmentRescheduleNoticeEmailHtml(params: {
  clientName: string
  businessName: string
  businessAddress?: string | null
  businessPhone?: string | null
  timezone?: string | null
  serviceName: string
  startIso: string
  endIso: string
  rescheduleUrl: string
  cancelUrl: string
  motivo?: string | null
}): string {
  const dateLabel = formatDateSpanish(params.startIso, params.timezone)
  const timeRange = `${formatTimeSpanish(params.startIso, params.timezone)} - ${formatTimeSpanish(params.endIso, params.timezone)}`
  const cleanPhone = params.businessPhone?.trim()

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#f4f4f5;">
      Hola <strong style="color:#ffffff;">${escapeHtml(params.clientName)}</strong>,
    </p>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:#d4d4d8;">
      Te informamos de que debido a una indisponibilidad o ajuste en la agenda${
        params.motivo ? ` (<em>${escapeHtml(params.motivo)}</em>)` : ''
      }, no podremos atender tu cita prevista en <strong style="color:#ffffff;">${escapeHtml(
        params.businessName
      )}</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;border:1px solid #27272a;border-radius:12px;margin-bottom:22px;">
      <tr>
        <td style="padding:16px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.6;">
            <tr>
              <td style="padding:4px 0;color:#a1a1aa;width:120px;">Servicio</td>
              <td style="padding:4px 0;color:#ffffff;font-weight:600;">${escapeHtml(params.serviceName)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#a1a1aa;">Fecha afectada</td>
              <td style="padding:4px 0;color:#ffffff;text-transform:capitalize;">${escapeHtml(dateLabel)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#a1a1aa;">Horario original</td>
              <td style="padding:4px 0;color:#f59e0b;font-weight:700;font-family:monospace;">${escapeHtml(timeRange)}</td>
            </tr>
            ${
              cleanPhone
                ? `<tr>
              <td style="padding:4px 0;color:#a1a1aa;">Contacto</td>
              <td style="padding:4px 0;color:#e4e4e7;">${escapeHtml(cleanPhone)}</td>
            </tr>`
                : ''
            }
          </table>
        </td>
      </tr>
    </table>

    <div style="padding:14px 16px;border-radius:10px;background-color:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.28);margin-bottom:22px;">
      <p style="margin:0;font-size:13px;line-height:1.5;color:#e6fcf5;">
        ⚡ <strong>Reprograma en 1 solo clic:</strong> Tus datos ya están guardados. Pulsa en el botón verde inferior para elegir el nuevo día y hora que mejor te venga sin coste alguno.
      </p>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom:10px;">
          <a href="${escapeHtml(params.rescheduleUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;padding:14px 22px;border-radius:10px;background-color:#10b981;color:#09090b;font-size:14px;font-weight:700;text-decoration:none;">
            🔄 Elegir nueva fecha y hora
          </a>
        </td>
      </tr>
      <tr>
        <td align="center">
          <a href="${escapeHtml(params.cancelUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;padding:12px 20px;border-radius:10px;background-color:#18181b;border:1px solid #3f3f46;color:#f4f4f5;font-size:13px;font-weight:600;text-decoration:none;">
            Anular cita definitivamente
          </a>
        </td>
      </tr>
    </table>
  `

  return renderEmailShell({
    preheader: `Aviso importante: necesitamos reprogramar tu cita de ${params.serviceName} del ${dateLabel}. Elige tu nuevo horario en 1 clic.`,
    badge: 'Aviso de Agenda · Reprogramar',
    title: 'Aviso de reprogramación',
    subtitle: `${params.businessName} · Cambio en la disponibilidad de agenda`,
    bodyHtml,
    footerNote: `Disculpa las molestias ocasionadas. Si tienes cualquier consulta, contacta con ${params.businessName}.`,
  })
}

/**
 * Notifica a un cliente cuando el dueño bloquea el tramo horario de su cita confirmada.
 */
export async function sendAppointmentRescheduleNoticeEmail(
  input: AppointmentRescheduleNoticeInput
) {
  const dateLabel = formatDateSpanish(input.startIso, input.timezone)
  const clientHtml = buildAppointmentRescheduleNoticeEmailHtml(input)

  const resend = getResendClient()
  if (!resend) {
    return {
      success: true,
      simulated: true,
      reason: 'missing_resend_api_key',
    }
  }

  const emailJobs = [
    resend.emails.send({
      from: DEFAULT_FROM,
      to: input.clientEmail,
      subject: `Aviso importante: Necesitamos reprogramar tu cita · ${input.businessName}`,
      html: clientHtml,
    }),
  ]

  const cleanOwnerEmail =
    input.ownerEmail && !input.ownerEmail.includes('donairecitas.pro')
      ? input.ownerEmail.trim()
      : null
  const ownerEmail =
    cleanOwnerEmail ||
    process.env.OWNER_NOTIFICATION_EMAIL?.trim() ||
    null

  if (ownerEmail) {
    const ownerNoticeHtml = renderEmailShell({
      preheader: `Se ha notificado a ${input.clientName} para reprogramar su cita del ${dateLabel}.`,
      badge: 'Panel Dueño · Cita Afectada',
      title: 'Cliente notificado para reprogramar',
      subtitle: `${input.businessName} · Bloqueo de agenda`,
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#d4d4d8;">
          Has bloqueado un tramo horario que coincidía con la cita confirmada de <strong style="color:#ffffff;">${escapeHtml(
            input.clientName
          )}</strong> (<a href="mailto:${escapeHtml(
        input.clientEmail
      )}" style="color:#34d399;">${escapeHtml(input.clientEmail)}</a>).
        </p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#d4d4d8;">
          <strong>Servicio:</strong> ${escapeHtml(input.serviceName)}<br/>
          <strong>Fecha original:</strong> ${escapeHtml(dateLabel)}
        </p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#a1a1aa;">
          Se le ha enviado un correo automático con su enlace exclusivo de reprogramación para que pueda seleccionar otra fecha disponible sin causarle fricción.
        </p>
      `,
      footerNote: `${input.businessName} · Notificación automática de agenda`,
    })

    emailJobs.push(
      resend.emails.send({
        from: DEFAULT_FROM,
        to: ownerEmail,
        subject: `[Aviso] Notificado cambio de cita a ${input.clientName} por bloqueo de agenda`,
        html: ownerNoticeHtml,
      })
    )
  }

  const results = await Promise.allSettled(emailJobs)
  const errors = results
    .map((r) => {
      if (r.status === 'rejected') return String(r.reason)
      if (r.value.error) return r.value.error.message
      return null
    })
    .filter((e): e is string => Boolean(e))

  if (errors.length === results.length && errors.every(isResendSandboxOrDomainError)) {
    const fallbackJobs = [
      resend.emails.send({
        from: 'Krono Citas <onboarding@resend.dev>',
        to: input.clientEmail,
        subject: `Aviso importante: Necesitamos reprogramar tu cita · ${input.businessName}`,
        html: clientHtml,
      }),
    ]
    if (ownerEmail) {
      fallbackJobs.push(
        resend.emails.send({
          from: 'Krono Citas <onboarding@resend.dev>',
          to: ownerEmail,
          subject: `[Aviso] Notificado cambio de cita a ${input.clientName} por bloqueo de agenda`,
          html: clientHtml,
        })
      )
    }
    const fallbackResults = await Promise.allSettled(fallbackJobs)
    const anySuccess = fallbackResults.some((r) => r.status === 'fulfilled' && !r.value.error)
    return { success: anySuccess, simulated: false }
  }

  const anySuccess = results.some((r) => r.status === 'fulfilled' && !r.value.error)
  return { success: anySuccess, simulated: false }
}
