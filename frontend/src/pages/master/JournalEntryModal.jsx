import React, { useState, useEffect, useRef, useCallback } from 'react'
import './JournalEntryModal.css'

/* ── Static reference data (shared with other pages) ── */
const COA_OPTIONS = [
  { code: '1001', name: 'HDFC Bank – Current Account',   type: 'Bank'     },
  { code: '1002', name: 'Petty Cash',                    type: 'Cash'     },
  { code: '1003', name: 'Accounts Receivable (Debtors)', type: 'Asset'    },
  { code: '1004', name: 'Inventory – Furniture',         type: 'Asset'    },
  { code: '1005', name: 'Workshop Equipment',            type: 'Asset'    },
  { code: '2001', name: 'Accounts Payable (Creditors)',  type: 'Liability'},
  { code: '2002', name: 'GST Payable',                   type: 'Liability'},
  { code: '2003', name: 'Short-term Loan – HDFC',        type: 'Liability'},
  { code: '3001', name: 'Furniture Sales Income',        type: 'Income'   },
  { code: '3002', name: 'Service Revenue',               type: 'Income'   },
  { code: '4001', name: 'Cost of Goods Sold',            type: 'Expenses' },
  { code: '4002', name: 'Workshop Rent',                 type: 'Expenses' },
  { code: '4003', name: 'Salaries & Wages',              type: 'Expenses' },
  { code: '4004', name: 'Utilities & Power',             type: 'Other Expenses'},
  { code: '4005', name: 'Marketing & Advertising',       type: 'Other Expenses'},
  { code: '5001', name: "Owner's Capital",               type: 'Capital'  },
  { code: '5002', name: 'Retained Earnings',             type: 'Capital'  },
]

const JOURNAL_OPTIONS = [
  { id: 'JNL-001', name: 'Sales',    type: 'Sales'    },
  { id: 'JNL-002', name: 'Purchase', type: 'Purchase' },
  { id: 'JNL-003', name: 'Bank',     type: 'Bank'     },
  { id: 'JNL-004', name: 'Cash',     type: 'Cash'     },
]

const CONTACT_OPTIONS = [
  'Ratan Mehra', 'Godrej Interio Ltd.', 'Ananya Sharma',
  'Ramesh Timber Works', 'Priya Kapoor', 'Mahindra Living',
]

const EMPTY_LINE = { account: '', accountCode: '', partner: '', debit: '', credit: '' }

const EMPTY_FORM = {
  accountingDate: new Date().toISOString().slice(0, 10),
  journalId: 'JNL-001',
  journal: 'Sales',
  partner: '',
  lines: [
    { ...EMPTY_LINE },
    { ...EMPTY_LINE },
  ],
}

const fmt = (n) => {
  const num = Number(n)
  if (!num) return ''
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

export default function JournalEntryModal({ isOpen, onClose, onSave, editEntry }) {
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [errors,    setErrors]    = useState({})
  const [posted,    setPosted]    = useState(false)

  /* Per-line account / contact dropdown state */
  const [acctDropIdx,    setAcctDropIdx]    = useState(null)
  const [contactDropIdx, setContactDropIdx] = useState(null)
  const [acctSearch,     setAcctSearch]     = useState([])
  const [contactSearch,  setContactSearch]  = useState([])

  /* Journal dropdown */
  const [jnlDropOpen, setJnlDropOpen] = useState(false)
  const jnlRef  = useRef(null)
  const firstRef = useRef(null)

  /* ── Initialise form ── */
  useEffect(() => {
    if (isOpen) {
      if (editEntry) {
        setForm({
          accountingDate: editEntry.accountingDate || new Date().toISOString().slice(0,10),
          journalId:      editEntry.journalId      || 'JNL-001',
          journal:        editEntry.journal        || 'Sales',
          partner:        editEntry.partner        || '',
          lines: editEntry.lines?.length
            ? editEntry.lines.map(l => ({ ...l }))
            : [{ ...EMPTY_LINE }, { ...EMPTY_LINE }],
        })
        setAcctSearch(editEntry.lines?.map(l => l.account || '') || ['',''])
        setContactSearch(editEntry.lines?.map(l => l.partner || '') || ['',''])
      } else {
        setForm(EMPTY_FORM)
        setAcctSearch(['',''])
        setContactSearch(['',''])
      }
      setErrors({})
      setPosted(false)
    }
  }, [isOpen, editEntry])

  useEffect(() => { if (isOpen) setTimeout(() => firstRef.current?.focus(), 60) }, [isOpen])

  const handleKey = useCallback(e => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, handleKey])

  /* Close dropdowns on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (jnlRef.current && !jnlRef.current.contains(e.target)) setJnlDropOpen(false)
      setAcctDropIdx(null)
      setContactDropIdx(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!isOpen) return null

  /* ── Computed totals ── */
  const totalDebit  = form.lines.reduce((s,l) => s + (Number(l.debit)  || 0), 0)
  const totalCredit = form.lines.reduce((s,l) => s + (Number(l.credit) || 0), 0)
  const balanced    = totalDebit > 0 && totalDebit === totalCredit

  /* ── Helpers ── */
  const updateLine = (idx, field, value) => {
    setForm(p => {
      const lines = p.lines.map((l,i) => i === idx ? { ...l, [field]: value } : l)
      return { ...p, lines }
    })
    if (errors[`line-${idx}-${field}`]) setErrors(p => ({ ...p, [`line-${idx}-${field}`]: undefined }))
    if (errors.balance) setErrors(p => ({ ...p, balance: undefined }))
  }

  const addLine = () => {
    setForm(p => ({ ...p, lines: [...p.lines, { ...EMPTY_LINE }] }))
    setAcctSearch(p => [...p, ''])
    setContactSearch(p => [...p, ''])
  }

  const removeLine = (idx) => {
    if (form.lines.length <= 2) return
    setForm(p => ({ ...p, lines: p.lines.filter((_,i) => i !== idx) }))
    setAcctSearch(p => p.filter((_,i) => i !== idx))
    setContactSearch(p => p.filter((_,i) => i !== idx))
  }

  const selectAccount = (idx, acct) => {
    updateLine(idx, 'account', acct.name)
    updateLine(idx, 'accountCode', acct.code)
    const s = [...acctSearch]; s[idx] = acct.name; setAcctSearch(s)
    setAcctDropIdx(null)
  }

  const selectContact = (idx, name) => {
    updateLine(idx, 'partner', name)
    const s = [...contactSearch]; s[idx] = name; setContactSearch(s)
    setContactDropIdx(null)
  }

  const selectJournal = (j) => {
    setForm(p => ({ ...p, journalId: j.id, journal: j.name }))
    setJnlDropOpen(false)
    if (errors.journal) setErrors(p => ({ ...p, journal: undefined }))
  }

  /* ── Validation ── */
  const validate = () => {
    const e = {}
    if (!form.accountingDate)  e.date    = 'Accounting date is required.'
    if (!form.journal)         e.journal = 'Select a journal.'
    form.lines.forEach((l, i) => {
      if (!l.account) e[`line-${i}-account`] = 'Required'
    })
    if (!balanced) e.balance = `Debit (${fmt(totalDebit)}) ≠ Credit (${fmt(totalCredit)}). Please balance the entry.`
    return e
  }

  const handlePost = () => {
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }
    setPosted(true)
    onSave({ ...form, status: 'Posted', date: new Date(form.accountingDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) })
  }

  const handleSaveDraft = (e) => {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }
    onSave({ ...form, status: 'Draft', date: new Date(form.accountingDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) })
  }

  const isEditing = Boolean(editEntry)

  return (
    <div className="jem-overlay" role="dialog" aria-modal="true" aria-labelledby="jem-title"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="jem-panel">

        {/* ── Topbar: Post · Cancel · Back ── */}
        <div className="jem-topbar">
          <div className="jem-topbar-left">
            <button type="button" className="jem-btn jem-btn--post" onClick={handlePost}>
              {posted ? '✓ Posted' : 'Post'}
            </button>
          </div>
          <div className="jem-topbar-right">
            <button type="button" className="jem-btn jem-btn--cancel" onClick={() => {
              setForm(EMPTY_FORM); setAcctSearch(['','']); setContactSearch(['',''])
              setErrors({}); setPosted(false)
            }}>Cancel</button>
            <button type="button" className="jem-btn jem-btn--back" onClick={onClose}>Back</button>
            <button type="button" className="jem-close" onClick={onClose} aria-label="Close"><XIcon /></button>
          </div>
        </div>

        <h2 className="jem-title" id="jem-title">
          {isEditing ? `Edit – ${editEntry.number}` : 'New Journal Entry'}
        </h2>

        <form onSubmit={handleSaveDraft} noValidate>
          {/* ── Header fields ── */}
          <div className="jem-header-fields">

            {/* Accounting Date */}
            <div className="jem-field">
              <label className="jem-lbl" htmlFor="jem-date">Accounting Date</label>
              <div className="jem-input-wrap">
                <input ref={firstRef} id="jem-date" type="date"
                  className={`jem-input${errors.date ? ' jem-input--err' : ''}`}
                  value={form.accountingDate}
                  onChange={e => { setForm(p=>({...p, accountingDate: e.target.value})); setErrors(p=>({...p,date:undefined})) }}
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
                    {JOURNAL_OPTIONS.map(j => (
                      <button key={j.id} type="button" className="jem-jnl-option"
                        onClick={() => selectJournal(j)}>
                        <span className={`jem-jnl-dot jem-jnl-dot--${j.type.toLowerCase()}`} />
                        {j.name}
                      </button>
                    ))}
                  </div>
                )}
                {errors.journal && <span className="jem-err">{errors.journal}</span>}
                <p className="jem-field-hint">From Journals (many-to-one)</p>
              </div>
            </div>
          </div>

          {/* ── Balance warning ── */}
          {errors.balance && (
            <div className="jem-balance-warn" role="alert">
              ⚠ {errors.balance}
            </div>
          )}
          {balanced && totalDebit > 0 && (
            <div className="jem-balance-ok" role="status">
              ✓ Balanced — {fmt(totalDebit)}
            </div>
          )}

          {/* ── Line items table ── */}
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
                {form.lines.map((line, idx) => {
                  const acctOpts = COA_OPTIONS.filter(a =>
                    !acctSearch[idx] ||
                    a.name.toLowerCase().includes(acctSearch[idx].toLowerCase()) ||
                    a.code.includes(acctSearch[idx])
                  )
                  const contactOpts = CONTACT_OPTIONS.filter(c =>
                    !contactSearch[idx] || c.toLowerCase().includes((contactSearch[idx]||'').toLowerCase())
                  )

                  return (
                    <tr key={idx} className="jem-line-row">
                      {/* Account */}
                      <td className="jem-line-td" style={{position:'relative'}}>
                        <div className="jem-line-acct-wrap">
                          <input type="text"
                            className={`jem-line-input${errors[`line-${idx}-account`] ? ' jem-input--err' : ''}`}
                            placeholder="Search account..."
                            value={acctSearch[idx] || ''}
                            onChange={e => {
                              const s = [...acctSearch]; s[idx] = e.target.value; setAcctSearch(s)
                              updateLine(idx, 'account', e.target.value)
                              setAcctDropIdx(idx)
                            }}
                            onFocus={() => setAcctDropIdx(idx)}
                            autoComplete="off"
                          />
                          {line.accountCode && (
                            <span className="jem-acct-code-tag">{line.accountCode}</span>
                          )}
                        </div>
                        {acctDropIdx === idx && acctOpts.length > 0 && (
                          <div className="jem-line-dropdown">
                            {acctOpts.map(a => (
                              <button key={a.code} type="button" className="jem-line-opt"
                                onMouseDown={() => selectAccount(idx, a)}>
                                <span className="jem-opt-code">{a.code}</span>
                                <span className="jem-opt-name">{a.name}</span>
                                <span className="jem-opt-type">{a.type}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {errors[`line-${idx}-account`] && (
                          <span className="jem-line-err">{errors[`line-${idx}-account`]}</span>
                        )}
                      </td>

                      {/* Partner */}
                      <td className="jem-line-td" style={{position:'relative'}}>
                        <input type="text"
                          className="jem-line-input"
                          placeholder="Partner..."
                          value={contactSearch[idx] || ''}
                          onChange={e => {
                            const s = [...contactSearch]; s[idx] = e.target.value; setContactSearch(s)
                            updateLine(idx, 'partner', e.target.value)
                            setContactDropIdx(idx)
                          }}
                          onFocus={() => setContactDropIdx(idx)}
                          autoComplete="off"
                        />
                        {contactDropIdx === idx && contactOpts.length > 0 && (
                          <div className="jem-line-dropdown">
                            {contactOpts.map(c => (
                              <button key={c} type="button" className="jem-line-opt"
                                onMouseDown={() => selectContact(idx, c)}>
                                <span className="jem-opt-name">{c}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Debit */}
                      <td className="jem-line-td">
                        <input type="number" min="0" step="0.01"
                          className="jem-line-input jem-line-input--num"
                          placeholder="0.00"
                          value={line.debit}
                          onChange={e => {
                            updateLine(idx, 'debit', e.target.value)
                            if (e.target.value) updateLine(idx, 'credit', '')
                          }}
                        />
                      </td>

                      {/* Credit */}
                      <td className="jem-line-td">
                        <input type="number" min="0" step="0.01"
                          className="jem-line-input jem-line-input--num"
                          placeholder="0.00"
                          value={line.credit}
                          onChange={e => {
                            updateLine(idx, 'credit', e.target.value)
                            if (e.target.value) updateLine(idx, 'debit', '')
                          }}
                        />
                      </td>

                      {/* Remove */}
                      <td className="jem-line-td jem-line-td--remove">
                        {form.lines.length > 2 && (
                          <button type="button" className="jem-remove-btn"
                            onClick={() => removeLine(idx)} aria-label="Remove line">
                            <TrashIcon />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Totals footer */}
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

            {/* Add line button */}
            <button type="button" className="jem-add-line-btn" onClick={addLine}>
              <PlusIcon /> Add Line
            </button>
          </div>

          {/* Field explanation note */}
          <div className="jem-field-note">
            <p><strong>Account</strong> — Selection from Chart of Accounts (many-to-one)</p>
            <p><strong>Partner</strong> — Selection from Contact master</p>
          </div>

          {/* Footer */}
          <div className="jem-footer">
            <button type="submit" className="jem-save-btn">Save as Draft</button>
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
