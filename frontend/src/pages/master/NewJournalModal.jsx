import React, { useState, useEffect, useRef, useCallback } from 'react'
import './NewJournalModal.css'

const JOURNAL_TYPES = ['Sales', 'Purchase', 'Bank', 'Cash']

/* Auto-suggest default account based on journal type */
const TYPE_DEFAULT_ACCOUNT = {
  Sales:    '3001',
  Purchase: '4001',
  Bank:     '1001',
  Cash:     '1002',
}

const EMPTY = { name: '', type: 'Sales', defaultAccount: '', accountCode: '' }

function validate(f) {
  const e = {}
  if (!f.name.trim())           e.name    = 'Journal name is required.'
  if (!f.type)                  e.type    = 'Select a journal type.'
  if (!f.defaultAccount.trim()) e.account = 'Select a default account.'
  return e
}

export default function NewJournalModal({ isOpen, onClose, onSave, editJournal, coaOptions = [] }) {
  const [fields,    setFields]    = useState(EMPTY)
  const [errors,    setErrors]    = useState({})
  const [confirmed, setConfirmed] = useState(false)

  /* Account search dropdown state */
  const [acctSearch,    setAcctSearch]    = useState('')
  const [acctDropOpen,  setAcctDropOpen]  = useState(false)
  const acctRef  = useRef(null)
  const firstRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      if (editJournal) {
        setFields({
          name:           editJournal.name           || '',
          type:           editJournal.type           || 'Sales',
          defaultAccount: editJournal.defaultAccount || '',
          accountCode:    editJournal.accountCode    || '',
        })
        setAcctSearch(editJournal.defaultAccount || '')
      } else {
        setFields(EMPTY)
        setAcctSearch('')
      }
      setErrors({})
      setConfirmed(false)
    }
  }, [isOpen, editJournal])

  useEffect(() => {
    if (isOpen) setTimeout(() => firstRef.current?.focus(), 60)
  }, [isOpen])

  const handleKey = useCallback((e) => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, handleKey])

  /* Close account dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (acctRef.current && !acctRef.current.contains(e.target)) setAcctDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!isOpen) return null

  /* When type changes, auto-suggest the matching default account */
  const handleTypeChange = (type) => {
    const suggestedCode = TYPE_DEFAULT_ACCOUNT[type]
    const suggestedAcct = coaOptions.find(a => a.code === suggestedCode)
    setFields(p => ({
      ...p,
      type,
      defaultAccount: suggestedAcct ? suggestedAcct.name : '',
      accountCode:    suggestedAcct ? suggestedAcct.code : '',
    }))
    setAcctSearch(suggestedAcct ? suggestedAcct.name : '')
    if (errors.type)    setErrors(p => ({ ...p, type: undefined }))
    if (errors.account) setErrors(p => ({ ...p, account: undefined }))
    setConfirmed(false)
  }

  const handleNameChange = (e) => {
    setFields(p => ({ ...p, name: e.target.value }))
    if (errors.name) setErrors(p => ({ ...p, name: undefined }))
    setConfirmed(false)
  }

  /* Account search filtering */
  const acctFiltered = coaOptions.filter(a =>
    !acctSearch || a.name.toLowerCase().includes(acctSearch.toLowerCase()) || a.code.includes(acctSearch)
  )

  const selectAccount = (acct) => {
    setFields(p => ({ ...p, defaultAccount: acct.name, accountCode: acct.code }))
    setAcctSearch(acct.name)
    setAcctDropOpen(false)
    if (errors.account) setErrors(p => ({ ...p, account: undefined }))
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
    onSave({
      name:           fields.name.trim(),
      type:           fields.type,
      defaultAccount: fields.defaultAccount,
      accountCode:    fields.accountCode,
    })
  }

  return (
    <div className="njm-overlay" role="dialog" aria-modal="true" aria-labelledby="njm-title"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="njm-panel">

        {/* Top bar: New · Back */}
        <div className="njm-topbar">
          <div className="njm-topbar-left">
            <button type="button" className="njm-btn njm-btn--new"
              onClick={() => { setFields(EMPTY); setAcctSearch(''); setErrors({}); setConfirmed(false) }}>
              New
            </button>
            <button type="button"
              className={`njm-btn njm-btn--confirm${confirmed ? ' njm-btn--confirmed' : ''}`}
              onClick={handleConfirm}>
              {confirmed ? '✓ Confirmed' : 'Confirm'}
            </button>
          </div>
          <div className="njm-topbar-right">
            <button type="button" className="njm-btn njm-btn--back" onClick={onClose}>Back</button>
            <button type="button" className="njm-close" onClick={onClose} aria-label="Close"><XIcon /></button>
          </div>
        </div>

        {/* Title */}
        <h2 className="njm-title" id="njm-title">
          {editJournal ? 'Edit Journal' : 'New Journal'}
        </h2>

        <form onSubmit={handleSave} noValidate>
          <div className="njm-body">

            {/* Journal Name */}
            <div className="njm-field">
              <label className="njm-lbl" htmlFor="njm-name">Journal Name</label>
              <div className="njm-input-wrap">
                <input ref={firstRef} id="njm-name" type="text"
                  className={`njm-input${errors.name ? ' njm-input--err' : ''}`}
                  placeholder="Name"
                  value={fields.name} onChange={handleNameChange} autoComplete="off" />
                {errors.name && <span className="njm-err">{errors.name}</span>}
              </div>
            </div>

            {/* Journal Type */}
            <div className="njm-field">
              <label className="njm-lbl">Journal Type</label>
              <div className="njm-input-wrap">
                <div className="njm-type-group" role="group" aria-label="Journal type">
                  {JOURNAL_TYPES.map(t => (
                    <button key={t} type="button"
                      className={`njm-type-btn njm-type-btn--${t.toLowerCase()}${fields.type === t ? ' njm-type-btn--active' : ''}`}
                      onClick={() => handleTypeChange(t)}
                      aria-pressed={fields.type === t}>
                      {t}
                    </button>
                  ))}
                </div>
                {errors.type && <span className="njm-err">{errors.type}</span>}
              </div>
            </div>

            {/* Default Account — many-to-one from COA */}
            <div className="njm-field" ref={acctRef}>
              <label className="njm-lbl" htmlFor="njm-account">Default Account</label>
              <div className="njm-input-wrap njm-acct-wrap">
                <input id="njm-account" type="text"
                  className={`njm-input${errors.account ? ' njm-input--err' : ''}`}
                  placeholder="Search chart of accounts..."
                  value={acctSearch}
                  onChange={e => {
                    setAcctSearch(e.target.value)
                    setAcctDropOpen(true)
                    setFields(p => ({ ...p, defaultAccount: e.target.value, accountCode: '' }))
                    if (errors.account) setErrors(p => ({ ...p, account: undefined }))
                    setConfirmed(false)
                  }}
                  onFocus={() => setAcctDropOpen(true)}
                  autoComplete="off"
                />
                {/* Linked account badge */}
                {fields.accountCode && (
                  <span className="njm-acct-code">{fields.accountCode}</span>
                )}
                {/* Dropdown */}
                {acctDropOpen && acctFiltered.length > 0 && (
                  <div className="njm-acct-dropdown">
                    {acctFiltered.map(a => (
                      <button type="button" key={a.code} className="njm-acct-option"
                        onClick={() => selectAccount(a)}>
                        <span className="njm-acct-opt-code">{a.code}</span>
                        <span className="njm-acct-opt-name">{a.name}</span>
                        <span className="njm-acct-opt-type">{a.type}</span>
                      </button>
                    ))}
                  </div>
                )}
                {errors.account && <span className="njm-err">{errors.account}</span>}
                <p className="njm-field-hint">Linked from Chart of Accounts (many-to-one)</p>
              </div>
            </div>

          </div>{/* end body */}

          {/* Footer */}
          <div className="njm-footer">
            <button type="submit" className="njm-save-btn">
              {editJournal ? 'Update Journal' : 'Save Journal'}
            </button>
            <button type="button" className="njm-cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function XIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
