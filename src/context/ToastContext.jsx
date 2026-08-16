import { createContext, useCallback, useRef, useState } from 'react'

export const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    (message, { type = 'info', duration = 4500 } = {}) => {
      const id = ++idCounter
      setToasts((current) => [...current, { id, message, type }])
      if (duration > 0) {
        const timer = setTimeout(() => dismissToast(id), duration)
        timers.current.set(id, timer)
      }
      return id
    },
    [dismissToast]
  )

  const value = {
    toasts,
    showToast,
    dismissToast,
    success: (message, opts) => showToast(message, { ...opts, type: 'success' }),
    error: (message, opts) => showToast(message, { ...opts, type: 'error' }),
    info: (message, opts) => showToast(message, { ...opts, type: 'info' }),
  }

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
