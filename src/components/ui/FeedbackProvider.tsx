'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { AccessibleModal } from '@/components/ui/AccessibleModal'

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  type: ToastTone
  title: string
  description?: string
}

interface ConfirmOptions {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'neutral'
}

interface FeedbackContextValue {
  notify: (toast: Omit<ToastItem, 'id'>) => void
  confirmAction: (options: ConfirmOptions) => Promise<boolean>
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function FeedbackProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [pendingConfirm, setPendingConfirm] = useState<
    (ConfirmOptions & { resolve: (accepted: boolean) => void }) | null
  >(null)
  const timersRef = useRef<Map<string, number>>(new Map())
  const confirmTitleId = useId()

  useEffect(() => {
    const activeTimers = timersRef.current
    return () => {
      activeTimers.forEach((timerId) => window.clearTimeout(timerId))
      activeTimers.clear()
    }
  }, [])

  const dismissToast = useCallback((id: string) => {
    const existing = timersRef.current.get(id)
    if (existing) {
      window.clearTimeout(existing)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }])
      const timerId = window.setTimeout(() => {
        dismissToast(id)
      }, 4500)
      timersRef.current.set(id, timerId)
    },
    [dismissToast]
  )

  const confirmAction = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPendingConfirm({ ...options, resolve })
    })
  }, [])

  const handleConfirmClose = useCallback(
    (accepted: boolean) => {
      setPendingConfirm((current) => {
        if (current) {
          current.resolve(accepted)
        }
        return null
      })
    },
    []
  )

  return (
    <FeedbackContext.Provider value={{ notify, confirmAction }}>
      {children}

      {/* Región accesible de notificaciones toast */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
      >
        {toasts.map((toast) => {
          const icon =
            toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-zinc-300 shrink-0" />
            )

          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto rounded-xl bg-zinc-900/95 border border-white/15 backdrop-blur-md shadow-xl p-3.5 flex items-start gap-3 text-left"
            >
              <div className="pt-0.5">{icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-100">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Cerrar notificación"
                className="min-w-12 min-h-12 -mr-2 -mt-2 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors active:scale-[0.98] shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Modal de confirmación accesible (sustituye window.confirm) */}
      <AccessibleModal
        isOpen={Boolean(pendingConfirm)}
        onClose={() => handleConfirmClose(false)}
        labelledBy={confirmTitleId}
        panelClassName="max-w-md rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden"
      >
        {pendingConfirm && (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <h2
                  id={confirmTitleId}
                  className="text-base font-semibold tracking-tight text-white"
                >
                  {pendingConfirm.title}
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {pendingConfirm.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                aria-label="Cerrar diálogo de confirmación"
                className="min-w-12 min-h-12 -mr-2 -mt-2 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="min-h-12 px-4 rounded-xl border border-white/10 bg-zinc-950 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-all active:scale-[0.98]"
              >
                {pendingConfirm.cancelLabel || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`min-h-12 px-5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
                  pendingConfirm.tone === 'danger'
                    ? 'ui-btn-danger'
                    : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                }`}
              >
                {pendingConfirm.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </AccessibleModal>
    </FeedbackContext.Provider>
  )
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext)
  if (!ctx) {
    throw new Error('useFeedback debe utilizarse dentro de FeedbackProvider')
  }
  return ctx
}
