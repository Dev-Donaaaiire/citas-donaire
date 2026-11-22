export interface FormFieldSetting {
  [key: string]: boolean | undefined
  activo: boolean
  requerido: boolean
}

export interface FormCustomizationSettings {
  [key: string]: FormFieldSetting | undefined
  nombre: FormFieldSetting
  email: FormFieldSetting
  telefono: FormFieldSetting
  notas: FormFieldSetting
}

export const DEFAULT_FORM_FIELDS: FormCustomizationSettings = {
  nombre: { activo: true, requerido: true },
  email: { activo: true, requerido: true },
  telefono: { activo: true, requerido: true },
  notas: { activo: true, requerido: false },
}

export interface FieldRuleDefinition {
  id: keyof FormCustomizationSettings
  label: string
  iconName: 'User' | 'Mail' | 'Phone' | 'FileText'
  canDeactivate: boolean
  canBeOptional: boolean
  description: string
  activeSummary: string
  lostFunctionsWhenOptional: string[]
  lostFunctionsWhenDisabled: string[]
}

export const FORM_FIELD_RULES: FieldRuleDefinition[] = [
  {
    id: 'email',
    label: 'Correo Electrónico',
    iconName: 'Mail',
    canDeactivate: true,
    canBeOptional: true,
    description: 'Permite comunicarse con el cliente y activar el sistema de gestión autónoma de citas.',
    activeSummary: 'Envío de confirmación inmediata, enlace de cancelación/reprogramación en 1 clic y recordatorios 24h antes.',
    lostFunctionsWhenOptional: [
      'Sin confirmación digital inmediata: el cliente no recibe el email con la hora y fecha de la reserva.',
      'Sin cancelación ni reprogramación autónoma: el cliente no tendrá el enlace web para cambiar o anular su cita y tendrá que llamarte.',
      'Sin avisos automáticos si bloqueas su cita: si marcas un día como festivo o bloqueado, el sistema no podrá notificarle automáticamente para que elija otra fecha.',
      'Sin recordatorios automáticos por email: mayor probabilidad de que el cliente olvide asistir a la cita.',
    ],
    lostFunctionsWhenDisabled: [
      'Se oculta totalmente el campo en el formulario.',
      'Se desactivan por completo las notificaciones por correo dirigidas al cliente.',
      'Las citas solo podrán gestionarse o anularse de forma manual desde el panel de administración.',
    ],
  },
  {
    id: 'telefono',
    label: 'Teléfono Móvil (WhatsApp / Llamada)',
    iconName: 'Phone',
    canDeactivate: true,
    canBeOptional: true,
    description: 'Canal de contacto directo para avisos de última hora y botón de llamada rápida en agenda.',
    activeSummary: 'Contacto telefónico rápido y enlace de WhatsApp directo en tu agenda del panel de control.',
    lostFunctionsWhenOptional: [
      'Sin contacto telefónico directo si el cliente decide no rellenarlo.',
      'Imposibilidad de avisar por WhatsApp o llamada si ocurre un retraso o imprevisto urgente en el local.',
      'Sin canal secundario si el cliente introdujo mal su correo electrónico.',
    ],
    lostFunctionsWhenDisabled: [
      'Se oculta el campo de teléfono en el formulario de reserva.',
      'El negocio no dispondrá de número de teléfono para ninguna de las reservas entrantes.',
    ],
  },
  {
    id: 'nombre',
    label: 'Nombre y Apellidos',
    iconName: 'User',
    canDeactivate: false,
    canBeOptional: true,
    description: 'Identificación de la persona que asiste al servicio en tu calendario.',
    activeSummary: 'Identificación clara en agenda, ficha de cliente y métricas de visitas recurrentes.',
    lostFunctionsWhenOptional: [
      'Si el cliente no escribe su nombre, la cita aparecerá en tu agenda como "Cliente Anónimo".',
      'No se acumulará historial en la ficha de cliente ni métricas de retención fiables.',
    ],
    lostFunctionsWhenDisabled: [
      'El campo de nombre no puede desactivarse por completo para garantizar la trazabilidad mínima de la cita en tu calendario.',
    ],
  },
  {
    id: 'notas',
    label: 'Notas / Peticiones Especiales',
    iconName: 'FileText',
    canDeactivate: true,
    canBeOptional: true,
    description: 'Permite al cliente añadir especificaciones (alergias, preferencias, detalles del servicio).',
    activeSummary: 'Caja de comentarios abierta para peticiones previas a la cita.',
    lostFunctionsWhenOptional: [
      'El cliente puede dejarlo en blanco si no tiene peticiones especiales.',
    ],
    lostFunctionsWhenDisabled: [
      'Formulario más corto y directo: ideal si tus servicios son 100% estandarizados y buscas la máxima rapidez.',
    ],
  },
]

export function normalizeFormFields(
  raw: unknown
): FormCustomizationSettings {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_FORM_FIELDS
  }
  const obj = raw as Record<string, Partial<FormFieldSetting>>

  return {
    nombre: {
      activo: true, // nombre siempre activo para mantener la tarjeta en calendario
      requerido: obj.nombre?.requerido !== false,
    },
    email: {
      activo: obj.email?.activo !== false,
      requerido: obj.email?.requerido !== false && obj.email?.activo !== false,
    },
    telefono: {
      activo: obj.telefono?.activo !== false,
      requerido: obj.telefono?.requerido !== false && obj.telefono?.activo !== false,
    },
    notas: {
      activo: obj.notas?.activo !== false,
      requerido: Boolean(obj.notas?.requerido && obj.notas?.activo !== false),
    },
  }
}
