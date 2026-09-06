import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import './Toast.css'

const ToastContext = createContext(null)

let globalToastHandler = null

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const removeToast = useCallback((id) => {
    setToasts(prev =>
      prev.map(t => t.id === id ? { ...t, closing: true } : t)
    )
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      if (timersRef.current.has(id)) {
        clearTimeout(timersRef.current.get(id))
        timersRef.current.delete(id)
      }
    }, 240)
  }, [])

  const addToast = useCallback(({ type = 'info', title, message, duration = 3800 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    
    // Default titles based on type
    const defaultTitles = {
      success: 'Operation Successful',
      error: 'Action Failed',
      warning: 'Attention',
      info: 'Notification',
    }

    const toastItem = {
      id,
      type,
      title: title || defaultTitles[type] || 'Notice',
      message,
      duration,
      closing: false,
    }

    setToasts(prev => [toastItem, ...prev.slice(0, 4)])

    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id)
      }, duration)
      timersRef.current.set(id, timer)
    }

    return id
  }, [removeToast])

  const toastMethods = {
    success: (message, title) => addToast({ type: 'success', message, title }),
    error:   (message, title) => addToast({ type: 'error', message, title }),
    warning: (message, title) => addToast({ type: 'warning', message, title }),
    info:    (message, title) => addToast({ type: 'info', message, title }),
    remove:  removeToast,
  }

  // Bind to global toast handler
  globalToastHandler = toastMethods

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      
      {/* Toast Render Container */}
      <div className="furniq-toast-container" aria-live="polite" aria-label="Notifications">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`furniq-toast furniq-toast--${t.type} ${t.closing ? 'closing' : ''}`}
            role="alert"
          >
            <div className="furniq-toast-icon-wrap">
              {t.type === 'success' && <SuccessIcon />}
              {t.type === 'error'   && <ErrorIcon />}
              {t.type === 'warning' && <WarningIcon />}
              {t.type === 'info'    && <InfoIcon />}
            </div>

            <div className="furniq-toast-body">
              <div className="furniq-toast-title">{t.title}</div>
              <div className="furniq-toast-msg">{t.message}</div>
            </div>

            <button
              className="furniq-toast-close"
              onClick={() => removeToast(t.id)}
              aria-label="Close notification"
            >
              <CloseIcon />
            </button>

            {t.duration > 0 && (
              <div
                className="furniq-toast-progress"
                style={{ animationDuration: `${t.duration}ms` }}
              />
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback if accessed outside Provider
    return toast
  }
  return ctx
}

// Standalone toast helper for use outside React tree
export const toast = {
  success: (message, title) => globalToastHandler?.success(message, title),
  error:   (message, title) => globalToastHandler?.error(message, title),
  warning: (message, title) => globalToastHandler?.warning(message, title),
  info:    (message, title) => globalToastHandler?.info(message, title),
  remove:  (id) => globalToastHandler?.remove(id),
}

/* ─── Luxury SVG Icons ─── */
function SuccessIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
