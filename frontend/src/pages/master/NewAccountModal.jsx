import React, { useState, useEffect, useRef, useCallback } from 'react'
import './NewAccountModal.css'

/*
  Type hierarchy from wireframe:
  Balance Sheet → Asset, Liability, Bank, Capital, Cash
  Profit and Loss → Income, Expenses, Other Expenses
*/
const TYPE_GROUPS = [
  {
    heading: 'Balance Sheet',
    types: ['Asset', 'Liability', 'Bank', 'Capital', 'Cash'],
  },
  {
    heading: 'Profit and Loss',
    types: ['Income', 'Expenses', 'Other Expenses'],
  },
]

/* Map type → group */
const TYPE_TO_GROUP = {
  Asset:           'ASSET',
  Bank:            'ASSET',
  Cash:            'ASSET',
  Liability:       'LIABILITY',
  Capital:         'CAPITAL',
  Income:          'INCOME',
  Expenses:        'EXPENSE',
  'Other Expenses':'EXPENSE',
}

const EMPTY = { name: '', type: 'Asset', group: 'ASSET' }

function validate(f) {
  const e = {}
  if (!f.name.trim()) e.name = 'Account name is required.'
  if (!f.type)        e.type = 'Please select a type.'
  return e
}

export default function NewAccountModal({ isOpen, onClose, onSave, editAccount }) {
  const [fields,    setFields]    = useState(EMPTY)
  const [errors,    setErrors]    = useState({})
  const [confirmed, setConfirmed] = useState(false)
  const [archived,  setArchived]  = useState(false)
  const firstRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      if (editAccount) {
        setFields({ name: editAccount.name, type: editAccount.type, group: editAccount.group })
      } else {
        setFields(EMPTY)
      }
      setErrors({})
      setConfirmed(false)
      setArchived(false)
    }
  }, [isOpen, editAccount])

  useEffect(() => {
    if (isOpen) setTimeout(() => firstRef.current?.focus(), 60)
  }, [isOpen])

  const handleKey = useCallback((e) => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, handleKey])

  if (!isOpen) return null

  const changeName = (e) => {
    setFields(p => ({ ...p, name: e.target.value }))
    if (errors.name) setErrors(p => ({ ...p, name: undefined }))
    setConfirmed(false)
  }

  const selectType = (type) => {
    const group = TYPE_TO_GROUP[type] || 'ASSET'
    setFields(p => ({ ...p, type, group }))
    if (errors.type) setErrors(p => ({ ...p, type: undefined }))
    setConfirmed(false)
  }

  const handleConfirm = () => {
    const v = validate(fields)
    if (Object.keys(v).length) { setErrors(v); return }
    setConfirmed(true)
  }

  const handleSave = (e) => {
    e.preventDefault()
    const v = validate(fields)
    if (Object.keys(v).length) { setErrors(v); return }
    onSave({ name: fields.name, type: fields.type, group: fields.group })
  }

  return (
    <div className="nam-overlay" role="dialog" aria-modal="true" aria-labelledby="nam-title"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="nam-panel">

        {/* ─── Top action bar (New / Confirm / Archived  ···  Home / Back) ─── */}
        <div className="nam-topbar">
          <div className="nam-topbar-left">
            <button type="button" className="nam-btn nam-btn--new"
              onClick={() => { setFields(EMPTY); setErrors({}); setConfirmed(false); setArchived(false) }}>
              New
            </button>
            <button type="button"
              className={`nam-btn nam-btn--confirm${confirmed ? ' nam-btn--confirmed' : ''}`}
              onClick={handleConfirm}>
              {confirmed ? '✓ Confirmed' : 'Confirm'}
            </button>
            <button type="button"
              className={`nam-btn nam-btn--archived${archived ? ' nam-btn--archived-active' : ''}`}
              onClick={() => setArchived(v => !v)}>
              Archived
            </button>
          </div>
          <div className="nam-topbar-right">
            <button type="button" className="nam-btn nam-btn--back" onClick={onClose}>Back</button>
            <button type="button" className="nam-close" onClick={onClose} aria-label="Close"><XIcon /></button>
          </div>
        </div>

        {/* ─── Title ─── */}
        <h2 className="nam-title" id="nam-title">
          {editAccount ? 'Edit Account' : 'New Account'}
        </h2>

        <form onSubmit={handleSave} noValidate>
          <div className="nam-body">

            {/* Account Name */}
            <div className="nam-field">
              <label className="nam-lbl" htmlFor="nam-name">
                Account Name <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <div className="nam-input-wrap">
                <input ref={firstRef} id="nam-name" type="text"
                  className={`nam-input${errors.name ? ' nam-input--err' : ''}`}
                  placeholder="e.g. HDFC Bank – Savings"
                  value={fields.name} onChange={changeName} autoComplete="off" />
                {errors.name && <span className="nam-err">{errors.name}</span>}
              </div>
            </div>

            {/* Type — hierarchical selector */}
            <div className="nam-field nam-field--type">
              <label className="nam-lbl nam-lbl--top">
                Type <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <div className="nam-type-panel">
                {errors.type && <span className="nam-err" style={{marginBottom:8,display:'block'}}>{errors.type}</span>}
                {TYPE_GROUPS.map(g => (
                  <div key={g.heading} className="nam-type-group">
                    <div className="nam-type-heading">{g.heading}</div>
                    <div className="nam-type-options">
                      {g.types.map(t => (
                        <button key={t} type="button"
                          className={`nam-type-opt${fields.type === t ? ' nam-type-opt--active' : ''}`}
                          onClick={() => selectType(t)}
                          aria-pressed={fields.type === t}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Selected summary */}
                {fields.type && (
                  <div className="nam-type-selected">
                    Selected: <strong>{fields.type}</strong>
                    <span className="nam-type-group-tag"> → {fields.group}</span>
                  </div>
                )}
              </div>
            </div>

          </div>{/* end body */}

          {/* Footer */}
          <div className="nam-footer">
            <button type="submit" className="nam-save-btn">
              {editAccount ? 'Update Account' : 'Save Account'}
            </button>
            <button type="button" className="nam-cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function XIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
