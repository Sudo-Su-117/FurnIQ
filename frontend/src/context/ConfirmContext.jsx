import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import './Confirm.css'

const ConfirmContext = createContext(null)

let globalConfirmHandler = null

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback(({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    detail = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'danger', // 'danger' | 'warning' | 'primary'
  }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setDialog({
        title,
        message,
        detail,
        confirmText,
        cancelText,
        confirmVariant,
      })
    })
  }, [])

  const handleConfirm = () => {
    if (resolveRef.current) {
      resolveRef.current(true)
      resolveRef.current = null
    }
    setDialog(null)
  }

  const handleCancel = () => {
    if (resolveRef.current) {
      resolveRef.current(false)
      resolveRef.current = null
    }
    setDialog(null)
  }

  // Register global confirm handler
  globalConfirmHandler = confirm

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {dialog && (
        <div
          className="furniq-confirm-overlay"
          onClick={handleCancel}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="furniq-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="furniq-confirm-header">
              <div className={`furniq-confirm-icon-wrap furniq-confirm-icon-wrap--${dialog.confirmVariant}`}>
                {dialog.confirmVariant === 'danger' ? (
                  <TrashIcon />
                ) : dialog.confirmVariant === 'warning' ? (
                  <AlertIcon />
                ) : (
                  <CheckIcon />
                )}
              </div>
              <div className="furniq-confirm-titles">
                <h3 className="furniq-confirm-title">{dialog.title}</h3>
                <p className="furniq-confirm-msg">{dialog.message}</p>
              </div>
            </div>

            {dialog.detail && (
              <div className="furniq-confirm-detail">{dialog.detail}</div>
            )}

            <div className="furniq-confirm-actions">
              <button
                type="button"
                className="furniq-confirm-btn furniq-confirm-btn--cancel"
                onClick={handleCancel}
              >
                {dialog.cancelText}
              </button>
              <button
                type="button"
                className={`furniq-confirm-btn furniq-confirm-btn--${dialog.confirmVariant}`}
                onClick={handleConfirm}
                autoFocus
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    return globalConfirm
  }
  return ctx
}

export function globalConfirm(options) {
  if (globalConfirmHandler) {
    return globalConfirmHandler(options)
  }
  return Promise.resolve(window.confirm(options.message || 'Confirm?'))
}

/* Icons */
function TrashIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
