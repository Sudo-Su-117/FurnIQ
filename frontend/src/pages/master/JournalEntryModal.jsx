import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './JournalEntryModal.css'
import { api, extractList } from '../../services/api'

const EMPTY_LINE = { accountId: '', account: '', accountCode: '', partner: '', debit: '', credit: '' }
const todayStr = () => new Date().toISOString().slice(0, 10)
const fmt = (n) => {
  const num = Number(n)
  if (!num) return ''
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

/* ── FixedDropdown: renders into document.body via portal so it is NEVER
   clipped by overflow:hidden / overflow:auto ancestors (including the modal panel) ── */
function FixedDropdown({ anchorRef, open, children }) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  useEffect(() => {
    if (open && anchorRef?.current) {
      const r = anchorRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 300) })
    }
  }, [open, anchorRef])
  if (!open) return null
  return createPortal(
    <div className="jem-line-dropdown"
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 99999 }}>
      {children}
    </div>,
    document.body
  )
}

/* ── LineRow: isolated component with its own input refs for portal positioning ── */
function LineRow({
  idx, line, acctSearch, contactSearch,
  acctOpts, contactOpts, acctOpen, contactOpen,
  error, canRemove,
  onAcctChange, onAcctFocus, onAcctBlur, onAcctSelect,
  onContactChange, onContactFocus, onContactBlur, onContactSelect,
  onDebitChange, onCreditChange, onRemove,
}) {
  const acctInputRef    = useRef(null)
  const contactInputRef = useRef(null)

  return (
    <tr className="jem-line-row">
      {/* Account */}
      <td className="jem-line-td">
        <div className="jem-line-acct-wrap">
          <input ref={acctInputRef} type="text"
            className={`jem-line-input${error ? ' jem-input--err' : ''}`}
            placeholder="Search account..."
            value={acctSearch}
            onChange={e => onAcctChange(e.target.value)}
            onFocus={onAcctFocus}
            onBlur={onAcctBlur}
            autoComplete="off"
          />
          {line.accountCode && <span className="jem-acct-code-tag">{line.accountCode}</span>}
        </div>
        <FixedDropdown anchorRef={acctInputRef} open={acctOpen && acctOpts.length > 0}>
          {acctOpts.map(a => (
            <button key={a.id} type="button" className="jem-line-opt"
              onMouseDown={e => { e.preventDefault(); onAcctSelect(a) }}>
              <span className="jem-opt-code">{a.code}</span>
              <span className="jem-opt-name">{a.name}</span>
              <span className="jem-opt-type">{a.type}</span>
            </button>
          ))}
        </FixedDropdown>
        {error && <span className="jem-line-err">{error}</span>}
      </td>

      {/* Partner */}
      <td className="jem-line-td">
        <input ref={contactInputRef} type="text"
          className="jem-line-input"
          placeholder="Partner..."
          value={contactSearch}
          onChange={e => onContactChange(e.target.value)}
          onFocus={onContactFocus}
          onBlur={onContactBlur}
          autoComplete="off"
        />
        <FixedDropdown anchorRef={contactInputRef} open={contactOpen && contactOpts.length > 0}>
          {contactOpts.map(c => (
            <button key={c.id} type="button" className="jem-line-opt"
              onMouseDown={e => { e.preventDefault(); onContactSelect(c) }}>
              <span className="jem-opt-name">{c.name}</span>
              <span className="jem-opt-type" style={{ fontSize: '10px' }}>{c.type}</span>
            </button>
          ))}
        </FixedDropdown>
      </td>

      {/* Debit */}
      <td className="jem-line-td">
        <input type="number" min="0" step="0.01"
          className="jem-line-input jem-line-input--num"
          placeholder="0.00" value={line.debit}
          onChange={e => onDebitChange(e.target.value)}
        />
      </td>

      {/* Credit */}
      <td className="jem-line-td">
        <input type="number" min="0" step="0.01"
          className="jem-line-input jem-line-input--num"
          placeholder="0.00" value={line.credit}
          onChange={e => onCreditChange(e.target.value)}
        />
      </td>

      {/* Remove */}
      <td className="jem-line-td jem-line-td--remove">
        {canRemove && (
          <button type="button" className="jem-remove-btn" onClick={onRemove} aria-label="Remove line">
            <TrashIcon />
          </button>
        )}
      </td>
    </tr>
  )
}

/* ── Main Modal ── */
export default function JournalEntryModal({ isOpen, onClose, onSave, editEntry }) {
  const [form, setForm] = useState({
    accountingDate: todayStr(),
    journalId: '', journal: '', reference: '',
    lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE }],
  })
  const [errors,  setErrors]  = useState({})
  const [saving,  setSaving]  = useState(false)
  const [saveErr, setSaveErr] = useState('')

  const [accounts, setAccounts] = useState([])
  const [journals, setJournals] = useState([])
  const [contacts, setContacts] = useState([])

  const [acctSearch,    setAcctSearch]    = useState(['', ''])
  const [contactSearch, setContactSearch] = useState(['', ''])
  const [acctDropIdx,    setAcctDropIdx]    = useState(null)
  const [contactDropIdx, setContactDropIdx] = useState(null)
  const [jnlDropOpen, setJnlDropOpen] = useState(false)
  const jnlRef   = useRef(null)
  const firstRef = useRef(null)

  /* ── Load live master data once ── */
  useEffect(() => {
    api.accounting.getAccounts()
      .then(res => setAccounts(extractList(res) || [])).catch(() => {})
    api.accounting.getJournals()
      .then(res => setJournals(extractList(res) || [])).catch(() => {})
    api.contacts.list()
      .then(res => setContacts(extractList(res) || [])).catch(() => {})
  }, [])

  /* ── Initialise form on open ── */
  useEffect(() => {
    if (isOpen) {
      if (editEntry) {
        const lines = editEntry.lines?.length
          ? editEntry.lines.map(l => ({
              accountId:   l.accountId || l.account?.id || '',
              account:     l.account?.name || l.account || '',
              accountCode: l.account?.code || l.accountCode || '',
              partner:     l.partner || '',
              debit:       l.debit || '', credit: l.credit || '',
            }))
          : [{ ...EMPTY_LINE }, { ...EMPTY_LINE }]
        setForm({
          accountingDate: editEntry.accountingDate || todayStr(),
          journalId:      editEntry.journalId || editEntry.journal?.id || '',
          journal:        editEntry.journal?.name || editEntry.journal || '',
          reference:      editEntry.reference || '',
          lines,
        })
        setAcctSearch(lines.map(l => l.account || ''))
        setContactSearch(lines.map(l => l.partner || ''))
      } else {
        setForm({ accountingDate: todayStr(), journalId: '', journal: '', reference: '', lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE }] })
        setAcctSearch(['', ''])
        setContactSearch(['', ''])
      }
      setErrors({}); setSaveErr('')
    }
  }, [isOpen, editEntry])

  useEffect(() => { if (isOpen) setTimeout(() => firstRef.current?.focus(), 60) }, [isOpen])

  const handleKey = useCallback(e => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, handleKey])

  /* Close journal dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (jnlRef.current && !jnlRef.current.contains(e.target)) setJnlDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!isOpen) return null

  const totalDebit  = form.lines.reduce((s, l) => s + (Number(l.debit)  || 0), 0)
  const totalCredit = form.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const balanced    = totalDebit > 0 && totalDebit === totalCredit

  const updateLine = (idx, field, value) => {
    setForm(p => {
      const lines = p.lines.map((l, i) => i === idx ? { ...l, [field]: value } : l)
      return { ...p, lines }
    })
    if (errors[`line-${idx}-account`]) setErrors(p => ({ ...p, [`line-${idx}-account`]: undefined }))
    if (errors.balance) setErrors(p => ({ ...p, balance: undefined }))
  }

  const addLine = () => {
    setForm(p => ({ ...p, lines: [...p.lines, { ...EMPTY_LINE }] }))
    setAcctSearch(p => [...p, ''])
    setContactSearch(p => [...p, ''])
  }

  const removeLine = (idx) => {
    if (form.lines.length <= 2) return
    setForm(p => ({ ...p, lines: p.lines.filter((_, i) => i !== idx) }))
    setAcctSearch(p => p.filter((_, i) => i !== idx))
    setContactSearch(p => p.filter((_, i) => i !== idx))
  }

  const selectAccount = (idx, acct) => {
    setForm(p => {
      const lines = p.lines.map((l, i) => i === idx
        ? { ...l, accountId: acct.id, account: acct.name, accountCode: acct.code } : l)
      return { ...p, lines }
    })
    const s = [...acctSearch]; s[idx] = acct.name; setAcctSearch(s)
    setAcctDropIdx(null)
    if (errors[`line-${idx}-account`]) setErrors(p => ({ ...p, [`line-${idx}-account`]: undefined }))
  }

  const selectContact = (idx, contact) => {
    const s = [...contactSearch]; s[idx] = contact.name; setContactSearch(s)
    setForm(p => {
      const lines = p.lines.map((l, i) => i === idx ? { ...l, partner: contact.name } : l)
      return { ...p, lines }
    })
    setContactDropIdx(null)
  }

  const selectJournal = (j) => {
    setForm(p => ({ ...p, journalId: j.id, journal: j.name }))
    setJnlDropOpen(false)
    if (errors.journal) setErrors(p => ({ ...p, journal: undefined }))
  }

  const buildPayload = (status) => ({
    journalId:      form.journalId,
    accountingDate: form.accountingDate,
    reference:      form.reference || undefined,
    status,
    lines: form.lines
      .filter(l => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
      .map(l => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.partner || undefined })),
  })

  const validateDraft = () => {
    const e = {}
    if (!form.accountingDate) e.date    = 'Accounting date is required.'
    if (!form.journalId)      e.journal = 'Select a journal.'
    const hasAnyLine = form.lines.some(l => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
    if (!hasAnyLine) e.lines = 'Add at least one line with an account and an amount.'
    return e
  }

  const validatePost = () => {
    const e = validateDraft()
    if (!balanced) e.balance = `Debit (${fmt(totalDebit)}) ≠ Credit (${fmt(totalCredit)}). Balance the entry to post.`
    return e
  }

  const handleSaveDraft = async (e) => {
    e.preventDefault()
    const v = validateDraft()
    if (Object.keys(v).length) { setErrors(v); return }
    setSaving(true); setSaveErr('')
    try {
      const saved = await api.accounting.createJournalEntry(buildPayload('DRAFT'))
      onSave({ ...form, status: 'Draft', id: saved?.id, number: saved?.entryNumber })
    } catch (err) {
      setSaveErr(err.message || 'Failed to save draft. Please try again.')
    } finally { setSaving(false) }
  }

  const handlePost = async () => {
    const v = validatePost()
    if (Object.keys(v).length) { setErrors(v); return }
    setSaving(true); setSaveErr('')
    try {
      const saved = await api.accounting.createJournalEntry(buildPayload('POSTED'))
      onSave({ ...form, status: 'Posted', id: saved?.id, number: saved?.entryNumber })
    } catch (err) {
      setSaveErr(err.message || 'Failed to post entry. Please try again.')
    } finally { setSaving(false) }
  }

  const filteredAccounts = (idx) => {
    const q = (acctSearch[idx] || '').toLowerCase()
    if (!q) return accounts
    return accounts.filter(a => a.name?.toLowerCase().includes(q) || a.code?.includes(q))
  }

  const filteredContacts = (idx) => {
    const q = (contactSearch[idx] || '').toLowerCase()
    if (!q) return contacts
    return contacts.filter(c => c.name?.toLowerCase().includes(q))
  }

  const isEditing = Boolean(editEntry)

  const resetForm = () => {
    setForm({ accountingDate: todayStr(), journalId: '', journal: '', reference: '', lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE }] })
    setAcctSearch(['', '']); setContactSearch(['', '']); setErrors({}); setSaveErr('')
  }

  return (
    <div className="jem-overlay" role="dialog" aria-modal="true" aria-labelledby="jem-title"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="jem-panel">

        {/* Topbar */}
        <div className="jem-topbar">
          <div className="jem-topbar-left">
            <button type="button" className="jem-btn jem-btn--post" onClick={handlePost} disabled={saving}>
              {saving ? '…' : 'Post'}
            </button>
          </div>
          <div className="jem-topbar-right">
            <button type="button" className="jem-btn jem-btn--cancel" onClick={resetForm}>Cancel</button>
            <button type="button" className="jem-btn jem-btn--back" onClick={onClose}>Back</button>
            <button type="button" className="jem-close" onClick={onClose} aria-label="Close"><XIcon /></button>
          </div>
        </div>

        <h2 className="jem-title" id="jem-title">
          {isEditing ? `Edit – ${editEntry.number}` : 'New Journal Entry'}
        </h2>

        <form onSubmit={handleSaveDraft} noValidate>
          {/* Header fields */}
          <div className="jem-header-fields">
            {/* Date */}
            <div className="jem-field">
              <label className="jem-lbl" htmlFor="jem-date">Accounting Date</label>
              <div className="jem-input-wrap">
                <input ref={firstRef} id="jem-date" type="date"
                  className={`jem-input${errors.date ? ' jem-input--err' : ''}`}
                  value={form.accountingDate}
                  onChange={e => { setForm(p => ({ ...p, accountingDate: e.target.value })); setErrors(p => ({ ...p, date: undefined })) }}
                />
                {errors.date && <span className="jem-err">{errors.date}</span>}
              </div>
            </div>

            {/* Journal */}
            <div className="jem-field" ref={jnlRef}>
              <label className="jem-lbl">Journal</label>
              <div className="jem-input-wrap jem-jnl-wrap">
                <button type="button"
                  className={`jem-jnl-select${errors.journal ? ' jem-input--err' : ''}`}
                  onClick={() => setJnlDropOpen(v => !v)}>
                  {form.journal || 'Select journal...'}
                  <ChevronIcon />
                </button>
                {jnlDropOpen && (
                  <div className="jem-jnl-dropdown">
                    {journals.length === 0
                      ? <div className="jem-jnl-option" style={{ opacity: 0.5 }}>Loading journals…</div>
                      : journals.map(j => (
                        <button key={j.id} type="button" className="jem-jnl-option"
                          onMouseDown={() => selectJournal(j)}>
                          <span className={`jem-jnl-dot jem-jnl-dot--${j.type?.toLowerCase() || 'misc'}`} />
                          {j.name}
                        </button>
                      ))
                    }
                  </div>
                )}
                {errors.journal && <span className="jem-err">{errors.journal}</span>}
                <p className="jem-field-hint">From Journals (many-to-one)</p>
              </div>
            </div>

            {/* Reference */}
            <div className="jem-field">
              <label className="jem-lbl" htmlFor="jem-ref">Reference</label>
              <div className="jem-input-wrap">
                <input id="jem-ref" type="text" className="jem-input"
                  placeholder="e.g. INV-001, PO-003…"
                  value={form.reference}
                  onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Alerts */}
          {errors.balance && <div className="jem-balance-warn" role="alert">⚠ {errors.balance}</div>}
          {balanced && totalDebit > 0 && <div className="jem-balance-ok" role="status">✓ Balanced — {fmt(totalDebit)}</div>}
          {errors.lines && <div className="jem-balance-warn" role="alert">⚠ {errors.lines}</div>}
          {saveErr && <div className="jem-balance-warn" role="alert">⚠ {saveErr}</div>}

          {/* Line items table */}
          <div className="jem-lines-wrap">
            <table className="jem-lines-table" aria-label="Journal entry lines">
              <thead>
                <tr>
                  <th className="jem-col-account">Account</th>
                  <th className="jem-col-partner">Partner</th>
                  <th className="jem-col-amount">Debit</th>
                  <th className="jem-col-amount">Credit</th>
                  <th className="jem-col-remove"></th>
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, idx) => (
                  <LineRow
                    key={idx}
                    idx={idx}
                    line={line}
                    acctSearch={acctSearch[idx] || ''}
                    contactSearch={contactSearch[idx] || ''}
                    acctOpts={filteredAccounts(idx)}
                    contactOpts={filteredContacts(idx)}
                    acctOpen={acctDropIdx === idx}
                    contactOpen={contactDropIdx === idx}
                    error={errors[`line-${idx}-account`]}
                    canRemove={form.lines.length > 2}
                    onAcctChange={(val) => {
                      const s = [...acctSearch]; s[idx] = val; setAcctSearch(s)
                      updateLine(idx, 'accountId', ''); updateLine(idx, 'account', val)
                      setAcctDropIdx(idx)
                    }}
                    onAcctFocus={() => setAcctDropIdx(idx)}
                    onAcctBlur={() => setTimeout(() => setAcctDropIdx(null), 200)}
                    onAcctSelect={(a) => selectAccount(idx, a)}
                    onContactChange={(val) => {
                      const s = [...contactSearch]; s[idx] = val; setContactSearch(s)
                      updateLine(idx, 'partner', val); setContactDropIdx(idx)
                    }}
                    onContactFocus={() => setContactDropIdx(idx)}
                    onContactBlur={() => setTimeout(() => setContactDropIdx(null), 200)}
                    onContactSelect={(c) => selectContact(idx, c)}
                    onDebitChange={(val) => { updateLine(idx, 'debit', val); if (val) updateLine(idx, 'credit', '') }}
                    onCreditChange={(val) => { updateLine(idx, 'credit', val); if (val) updateLine(idx, 'debit', '') }}
                    onRemove={() => removeLine(idx)}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="jem-totals-row">
                  <td colSpan={2} className="jem-totals-label">Total</td>
                  <td className={`jem-total-val${!balanced && totalDebit > 0 ? ' jem-total--warn' : ''}`}>
                    {totalDebit > 0 ? fmt(totalDebit) : '—'}
                  </td>
                  <td className={`jem-total-val${!balanced && totalCredit > 0 ? ' jem-total--warn' : ''}`}>
                    {totalCredit > 0 ? fmt(totalCredit) : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>

            <button type="button" className="jem-add-line-btn" onClick={addLine}>
              <PlusIcon /> Add Line
            </button>
          </div>

          <div className="jem-field-note">
            <p><strong>Account</strong> — Selection from live Chart of Accounts</p>
            <p><strong>Partner</strong> — Selection from live Contact master</p>
            <p><strong>Draft</strong> — Saves immediately, no balance required. <strong>Post</strong> — Requires Debit = Credit.</p>
          </div>

          <div className="jem-footer">
            <button type="submit" className="jem-save-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save as Draft'}
            </button>
            <button type="button" className="jem-cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function XIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function ChevronIcon(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg> }
function PlusIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function TrashIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg> }
