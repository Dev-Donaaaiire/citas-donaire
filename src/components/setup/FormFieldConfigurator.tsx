'use client'

import React from 'react'
import {
  User,
  Mail,
  Phone,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import {
  FORM_FIELD_RULES,
  type FormCustomizationSettings,
  type FieldRuleDefinition,
} from '@/lib/form-field-rules'

interface FormFieldConfiguratorProps {
  value: FormCustomizationSettings
  onChange: (next: FormCustomizationSettings) => void
}

const FIELD_ICONS = {
  User,
  Mail,
  Phone,
  FileText,
}

export function FormFieldConfigurator({
  value,
  onChange,
}: FormFieldConfiguratorProps) {
  const handleToggleActive = (fieldId: keyof FormCustomizationSettings) => {
    const current = value[fieldId] || { activo: true, requerido: true }
    const nextActive = !current.activo
    onChange({
      ...value,
      [fieldId]: {
        ...current,
        activo: nextActive,
        // Si se desactiva, deja de ser requerido
        requerido: nextActive ? current.requerido : false,
      },
    })
  }

  const handleToggleRequired = (fieldId: keyof FormCustomizationSettings) => {
    const current = value[fieldId] || { activo: true, requerido: true }
    const nextRequired = !current.requerido
    onChange({
      ...value,
      [fieldId]: {
        ...current,
        // Si se hace obligatorio, debe estar activo
        activo: nextRequired ? true : current.activo,
        requerido: nextRequired,
      },
    })
  }

  return (
    <div className="space-y-4 pt-2">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Personalización de Campos del Formulario de Reserva
          </h3>
        </div>
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
          Decide qué datos pides a tus clientes al reservar (nombre, correo, teléfono y notas). Cada vez que cambias un campo, el sistema te muestra las funciones automáticas que se habilitan o se pierden.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {FORM_FIELD_RULES.map((rule) => {
          const fieldState = value[rule.id] || { activo: true, requerido: true }
          const Icon = FIELD_ICONS[rule.iconName]
          const isRequired = fieldState.activo && fieldState.requerido
          const isOptional = fieldState.activo && !fieldState.requerido
          const isDisabled = !fieldState.activo

          return (
            <div
              key={rule.id}
              className={`p-4 rounded-xl border transition-all ${
                isDisabled
                  ? 'bg-zinc-950/40 border-white/5 opacity-75'
                  : isRequired
                    ? 'bg-zinc-950/80 border-emerald-500/25'
                    : 'bg-zinc-950/80 border-amber-500/25'
              }`}
            >
              {/* Cabecera del campo */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isDisabled
                        ? 'bg-zinc-900 text-zinc-500'
                        : isRequired
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200 truncate">
                    {rule.label}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                    isDisabled
                      ? 'bg-zinc-900 text-zinc-500 border-white/5'
                      : isRequired
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}
                >
                  {isDisabled ? 'Oculto' : isRequired ? 'Obligatorio' : 'Opcional'}
                </span>
              </div>

              {/* Controles de alternancia táctiles >= 48px */}
              <div className="py-3 flex flex-wrap items-center gap-2">
                {rule.canDeactivate ? (
                  <button
                    type="button"
                    onClick={() => handleToggleActive(rule.id)}
                    className={`min-h-10 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 ${
                      fieldState.activo
                        ? 'bg-zinc-900 border-white/10 text-zinc-200 hover:text-white'
                        : 'bg-zinc-950 border-white/10 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {fieldState.activo ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Visible en la web</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Ocultar campo</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[11px] text-zinc-500 italic py-1">
                    Campo siempre visible
                  </span>
                )}

                {fieldState.activo && rule.canBeOptional && (
                  <button
                    type="button"
                    onClick={() => handleToggleRequired(rule.id)}
                    className={`min-h-10 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 ${
                      fieldState.requerido
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-zinc-900 border-amber-500/30 text-amber-300'
                    }`}
                  >
                    {fieldState.requerido ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Es Obligatorio</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Es Opcional</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Especificación de funciones ganadas o perdidas */}
              <div className="pt-2 text-[11px] leading-relaxed">
                {isDisabled ? (
                  <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-white/5 space-y-1">
                    <p className="font-semibold text-zinc-400 flex items-center gap-1 text-[10px] uppercase tracking-wider">
                      <EyeOff className="w-3 h-3" />
                      Funciones desactivadas:
                    </p>
                    <ul className="space-y-0.5 text-zinc-500 list-disc list-inside">
                      {rule.lostFunctionsWhenDisabled.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : isOptional ? (
                  <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 space-y-1.5">
                    <p className="font-semibold text-amber-300 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      Funciones que se pierden al hacerlo opcional:
                    </p>
                    <ul className="space-y-1 text-amber-200/80">
                      {rule.lostFunctionsWhenOptional.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-400 shrink-0">✕</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-emerald-950/15 border border-emerald-500/20 space-y-1">
                    <p className="font-semibold text-emerald-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Funciones activas al 100%:
                    </p>
                    <p className="text-emerald-200/80">{rule.activeSummary}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
