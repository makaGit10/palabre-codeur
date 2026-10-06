import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { ToastContext, type ShowToast } from './toastContext'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; icon: IconName } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback<ShowToast>((message, icon = 'check') => {
    setToast({ message, icon })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 3800)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-[calc(88px+env(safe-area-inset-bottom,0px))] left-1/2 z-50 flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-bg shadow-xl transition md:bottom-8 ${
          toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        {toast && (
          <>
            <span className="text-gold-bg">
              <Icon name={toast.icon} />
            </span>
            {toast.message}
          </>
        )}
      </div>
    </ToastContext.Provider>
  )
}
