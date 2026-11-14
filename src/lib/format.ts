/**
 * Convierte un objeto Date a string YYYY-MM-DD local
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formatea un número como moneda en Euros
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formatea una fecha ISO a hora local HH:mm
 */
export function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return '--:--'
  }
}

/**
 * Formatea una fecha completa en español
 * Ejemplo: "Viernes, 14 de Noviembre de 2026"
 */
export function formatDateFull(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return 'Fecha no disponible'
  }
}

/**
 * Formatea una fecha corta en español
 * Ejemplo: "14 Nov"
 */
export function formatDateShort(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    return d.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '--'
  }
}

/**
 * Calcula cuántos días han transcurrido desde una fecha dada hasta hoy
 */
export function getDaysSince(dateInput: string | null | undefined): number {
  if (!dateInput) return 999
  try {
    const past = new Date(dateInput).getTime()
    const now = new Date().getTime()
    const diffMs = now - past
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  } catch {
    return 999
  }
}

/**
 * Devuelve un texto legible del tiempo transcurrido
 * Ejemplo: "Hace 34 días"
 */
export function formatRelativeDays(dateInput: string | null | undefined): string {
  if (!dateInput) return 'Sin visitas registradas'
  const days = getDaysSince(dateInput)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}
