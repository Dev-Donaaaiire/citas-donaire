'use client'

import React, { useId, useState } from 'react'
import { X, Mail, Send, Loader2, Sparkles, AlertCircle, Calendar, Phone } from 'lucide-react'
import type { Client } from '@/types/booking'
import { AccessibleModal } from '@/components/ui/AccessibleModal'
import { sendRetentionReminder } from '@/lib/booking-service'
import { useFeedback } from '@/components/ui/FeedbackProvider'
import { formatRelativeDays } from '@/lib/format'

interface AdminSendEmailModalProps {
  isOpen: boolean
  client: Client | null
  businessName: string
  isDemo?: boolean
  onClose: () => void
  onSuccess: (client: Client, result: { simulated?: boolean; warning?: string }) => void
}

type TemplateType = 'reactivation' | 'availability' | 'custom'

export function AdminSendEmailModal({
  isOpen,
  client,
  businessName,
  isDemo = false,
  onClose,
  onSuccess,
}: AdminSendEmailModalProps) {
  const titleId = useId()
  const { notify } = useFeedback()

  const [activeTemplate, setActiveTemplate] = useState<TemplateType>('reactivation')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const firstName = client?.nombre?.trim().split(' ')[0] || 'Cliente'
  const cleanBusiness = businessName.trim() || 'Krono Studio'

  // Generador de plantillas dinámicas según el cliente seleccionado.
  // Se ajusta durante el render cuando cambia cliente, plantilla o negocio.
  const [draftSource, setDraftSource] = useState<{
    client: Client | null
    template: TemplateType
    business: string
  } | null>(null)

  const isDraftStale =
    draftSource?.client !== client ||
    draftSource.template !== activeTemplate ||
    draftSource.business !== cleanBusiness

  if (isDraftStale) {
    setDraftSource({ client, template: activeTemplate, business: cleanBusiness })
  }

  if (isDraftStale && client) {
    setErrorMessage(null)

    if (activeTemplate === 'reactivation') {
      setSubject(`¡Te echamos de menos en ${cleanBusiness}! Reserva tu próxima cita`)
      setMessage(
        `Hola ${firstName},\n\n` +
          `Desde ${cleanBusiness} queremos saludarte. Hace ya tiempo que no te vemos por nuestro centro y nos encantaría volver a atenderte.\n\n` +
          `¿Te apetece renovar tu estilo esta semana? Consulta nuestra disponibilidad en tiempo real y reserva tu hueco en menos de 1 minuto sin esperas.\n\n` +
          `¡Te esperamos pronto!`
      )
    } else if (activeTemplate === 'availability') {
      setSubject(`Huecos disponibles esta semana en ${cleanBusiness}`)
      setMessage(
        `Hola ${firstName},\n\n` +
          `Te escribimos para avisarte de que hemos abierto nuevos huecos en nuestra agenda de esta semana en ${cleanBusiness}.\n\n` +
          `Si necesitas pasar por aquí o quieres agendar tu próximo servicio, puedes elegir el día y hora que mejor te venga cómodamente desde el enlace inferior.`
      )
    } else {
      setSubject(`Aviso de ${cleanBusiness}`)
      setMessage(
        `Hola ${firstName},\n\n` +
          `Esperamos que estés teniendo una excelente semana. Nos ponemos en contacto contigo desde ${cleanBusiness} para...`
      )
    }
  }

  if (!client) return null

  const lastVisitText = formatRelativeDays(client.ultima_visita)

  const handleSelectTemplate = (template: TemplateType) => {
    setActiveTemplate(template)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) {
      setErrorMessage('Por favor, indica un asunto para el correo.')
      return
    }
    if (!message.trim()) {
      setErrorMessage('Por favor, escribe el contenido del correo.')
      return
    }

    setIsSending(true)
    setErrorMessage(null)

    try {
      const result = await sendRetentionReminder(client.id, isDemo, {
        subject: subject.trim(),
        message: message.trim(),
      })

      if (result.warning) {
        notify({
          type: 'info',
          title: 'Aviso sobre el envío',
          description: result.warning,
        })
      } else {
        notify({
          type: 'success',
          title: result.simulated
            ? 'Correo simulado (Modo Demo / Sandbox)'
            : 'Email enviado con éxito',
          description: `Destinatario: ${client.email}`,
        })
      }

      onSuccess(client, result)
      onClose()
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo enviar el correo electrónico.'
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      panelClassName="max-w-xl w-full rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden my-4"
    >
      <div className="flex flex-col max-h-[90dvh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-zinc-900/60 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2
                id={titleId}
                className="text-base font-semibold text-white tracking-tight"
              >
                Enviar correo a {client.nombre}
              </h2>
              <p className="text-xs text-zinc-400">
                Personaliza la plantilla y envía un email directo a su bandeja
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors active:scale-[0.98]"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <form onSubmit={handleSend} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tarjeta resumen del cliente */}
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-medium text-zinc-200">{client.nombre}</div>
              <div className="text-zinc-400 font-mono text-[11px]">{client.email}</div>
            </div>
            <div className="flex items-center gap-3 text-zinc-400">
              {client.telefono && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" />
                  {client.telefono}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {lastVisitText}
              </span>
            </div>
          </div>

          {/* Selector de plantilla rápida */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Seleccionar plantilla precargada
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectTemplate('reactivation')}
                className={`min-h-11 px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all active:scale-[0.98] ${
                  activeTemplate === 'reactivation'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-zinc-950 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <div className="font-semibold">Reactivación</div>
                <div className="text-[10px] opacity-75 truncate">Te echamos de menos</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTemplate('availability')}
                className={`min-h-11 px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all active:scale-[0.98] ${
                  activeTemplate === 'availability'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-zinc-950 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <div className="font-semibold">Disponibilidad</div>
                <div className="text-[10px] opacity-75 truncate">Huecos esta semana</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTemplate('custom')}
                className={`min-h-11 px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all active:scale-[0.98] ${
                  activeTemplate === 'custom'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-zinc-950 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <div className="font-semibold">Personalizada</div>
                <div className="text-[10px] opacity-75 truncate">Mensaje libre</div>
              </button>
            </div>
          </div>

          {/* Campo: Asunto */}
          <div className="space-y-1.5">
            <label htmlFor="email-subject-input" className="text-xs font-medium text-zinc-300">
              Asunto del correo
            </label>
            <input
              id="email-subject-input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del correo..."
              required
              className="w-full min-h-12 px-3.5 rounded-xl bg-zinc-950 border border-white/10 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-colors"
            />
          </div>

          {/* Campo: Mensaje */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="email-message-textarea" className="text-xs font-medium text-zinc-300">
                Mensaje (editable)
              </label>
              <span className="text-[11px] text-zinc-500">Puedes modificar cualquier texto</span>
            </div>
            <textarea
              id="email-message-textarea"
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje personalizado..."
              required
              className="w-full p-3.5 rounded-xl bg-zinc-950 border border-white/10 text-zinc-100 placeholder-zinc-500 text-sm leading-relaxed focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-colors resize-y"
            />
          </div>

          {/* Nota de botón de cita automática */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 text-[11px] text-zinc-400 flex items-center justify-between gap-2">
            <span>✨ Se incluirá automáticamente un botón verde de <strong>«Reservar cita online»</strong> al final del correo.</span>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="min-h-12 px-5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-medium transition-colors active:scale-[0.98] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="min-h-12 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Correo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AccessibleModal>
  )
}
