import React, { useState, useEffect, useRef, useCallback } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import './BudgetPlansPage.css'

import { api, extractList } from '../../services/api'

const BUDGET_STATUSES = ['Draft', 'Confirmed', 'Cancelled', 'Closed']

const STATUS_STYLE = {
  Draft:     'bp-status--draft',
  Confirmed: 'bp-status--confirmed',
  Cancelled: 'bp-status--cancelled',
  Closed:    'bp-status--closed',
  Done:      'bp-status--closed',
}

const EMPTY_LINE = { analyticId: '', analyticName: '', type: '', committedAmount: '', allowedAmount: '', allowedPct: '', amountToBudget: '' }

const EMPTY_PLAN = {
  name: '', startDate: '', endDate: '', status: 'Draft', responsible: '',
  lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE }],
}

const fmt   = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'
const fmtPct= (n) => n ? `${n}%` : '—'

function getNextPlanId(existingPlans = []) {
  const year = new Date().getFullYear()
  const prefix = `BP-${year}-`
  let maxSeq = 0
  for (const p of existingPlans) {
    const id = p.id || ''
    if (id.startsWith(prefix)) {
      const num = parseInt(id.replace(prefix, ''), 10)
      if (!isNaN(num) && num > maxSeq) maxSeq = num
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}

function validate(f) {
  const e = {}
  if (!f.name.trim()) e.name = 'Budget name is required.'
  if (!f.startDate) e.startDate = 'Start date is required.'
  if (!f.endDate) e.endDate = 'End date is required.'
  if (f.startDate && f.endDate && f.startDate >= f.endDate) e.endDate = 'End date must be after start date.'
  const hasValidLine = f.lines.some(l => l.analyticName || l.analyticId)
  if (!hasValidLine) e.lines = 'At least one budget line with an analytic account is required.'
  return e
}

/* ─── Budget Plan Modal ─── */
function BudgetPlanModal({ isOpen, onClose, onSave, editPlan, analyticOptions = [] }) {
  const [fields,    setFields]    = useState(EMPTY_PLAN)
  const [errors,    setErrors]    = useState({})
  const [confirmed, setConfirmed] = useState(false)
  const [analyticDropIdx, setAnalyticDropIdx] = useState(null)
  const [analyticSearch,  setAnalyticSearch]  = useState([])
  const firstRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      if (editPlan) {
        setFields({
          name:        editPlan.name        || '',
          startDate:   editPlan.startDate   || '',
          endDate:     editPlan.endDate     || '',
          status:      editPlan.status      || 'Draft',
          responsible: editPlan.responsible || '',
          lines: editPlan.lines?.map(l => ({ ...l })) || [{ ...EMPTY_LINE }, { ...EMPTY_LINE }],
        })
        setAnalyticSearch(editPlan.lines?.map(l => l.analyticName || '') || ['',''])
      } else {
        setFields(EMPTY_PLAN)
        setAnalyticSearch(['',''])
      }
      setErrors({})
      setConfirmed(false)
    }
  }, [isOpen, editPlan])

  useEffect(() => { if (isOpen) setTimeout(() => firstRef.current?.focus(), 60) }, [isOpen])

  const handleKey = useCallback(e => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, handleKey])

  useEffect(() => {
    const handler = () => setAnalyticDropIdx(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!isOpen) return null

  const change = (e) => {
    const { name, value } = e.target
    setFields(p => ({ ...p, [name]: value }))
    if (errors[name]) setErrors(p => ({ ...p, [name]: undefined }))
    setConfirmed(false)
  }

  const updateLine = (idx, field, value) => {
    setFields(p => ({ ...p, lines: p.lines.map((l,i) => i === idx ? { ...l, [field]: value } : l) }))
    setConfirmed(false)
  }

  const selectAnalytic = (idx, acct) => {
    updateLine(idx, 'analyticId',   acct.id)
    updateLine(idx, 'analyticName', acct.name)
    updateLine(idx, 'type',         acct.type)
    const s = [...analyticSearch]; s[idx] = acct.name; setAnalyticSearch(s)
    setAnalyticDropIdx(null)
  }

  const addLine    = () => { setFields(p => ({ ...p, lines: [...p.lines, { ...EMPTY_LINE }] })); setAnalyticSearch(p => [...p, '']) }
  const removeLine = (idx) => {
    if (fields.lines.length <= 1) return
    setFields(p => ({ ...p, lines: p.lines.filter((_,i) => i !== idx) }))
    setAnalyticSearch(p => p.filter((_,i) => i !== idx))
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
      ...fields,
      lines: fields.lines.filter(l => l.analyticName || l.analyticId).map(l => ({
        ...l,
        committedAmount: Number(l.committedAmount) || 0,
        allowedAmount:   Number(l.allowedAmount)   || 0,
        allowedPct:      Number(l.allowedPct)      || 0,
        amountToBudget:  Number(l.amountToBudget)  || 0,
      }))
    })
  }

  return (
    <div className="bpm-overlay" role="dialog" aria-modal="true"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bpm-panel">
        {/* Topbar */}
        <div className="bpm-topbar">
          <div className="bpm-topbar-left">
            <button type="button" className="bpm-btn bpm-btn--new"
              onClick={() => { setFields(EMPTY_PLAN); setAnalyticSearch(['','']); setErrors({}); setConfirmed(false) }}>New</button>
            <button type="button"
              className={`bpm-btn bpm-btn--confirm${confirmed ? ' bpm-btn--confirmed' : ''}`}
              onClick={handleConfirm}>
              {confirmed ? '✓ Confirmed' : 'Confirm'}
            </button>
          </div>
          <div className="bpm-topbar-right">
            <button type="button" className="bpm-btn bpm-btn--back" onClick={onClose}>Back</button>
            <button type="button" className="bpm-close" onClick={onClose} aria-label="Close"><XIcon /></button>
          </div>
        </div>

        <h2 className="bpm-title">{editPlan ? 'Edit Budget Plan' : 'New Budget Plan'}</h2>

        <form onSubmit={handleSave} noValidate>
          {/* ─ Header fields ─ */}
          <div className="bpm-header-fields">
            <div className="bpm-field">
              <label className="bpm-lbl" htmlFor="bpm-name">
                Budget Name <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <div className="bpm-input-wrap">
                <input ref={firstRef} id="bpm-name" name="name" type="text"
                  className={`bpm-input${errors.name ? ' bpm-input--err' : ''}`}
                  placeholder="e.g. Annual Budget FY 2026-27"
                  value={fields.name} onChange={change} autoComplete="off" />
                {errors.name && <span className="bpm-err">{errors.name}</span>}
              </div>
            </div>

            <div className="bpm-field-row">
              <div className="bpm-field bpm-field--half">
                <label className="bpm-lbl" htmlFor="bpm-start">
                  Start Date <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <div className="bpm-input-wrap">
                  <input id="bpm-start" name="startDate" type="date"
                    className={`bpm-input${errors.startDate ? ' bpm-input--err' : ''}`}
                    value={fields.startDate} onChange={change} />
                  {errors.startDate && <span className="bpm-err">{errors.startDate}</span>}
                </div>
              </div>
              <div className="bpm-field bpm-field--half">
                <label className="bpm-lbl" htmlFor="bpm-end">
                  End Date <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <div className="bpm-input-wrap">
                  <input id="bpm-end" name="endDate" type="date"
                    className={`bpm-input${errors.endDate ? ' bpm-input--err' : ''}`}
                    value={fields.endDate} onChange={change} />
                  {errors.endDate && <span className="bpm-err">{errors.endDate}</span>}
                </div>
              </div>
            </div>

            <div className="bpm-field-row">
              <div className="bpm-field bpm-field--half">
                <label className="bpm-lbl" htmlFor="bpm-status">Status</label>
                <div className="bpm-input-wrap">
                  <select id="bpm-status" name="status" className="bpm-input bpm-select"
                    value={fields.status} onChange={change}>
                    {BUDGET_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="bpm-field bpm-field--half">
                <label className="bpm-lbl" htmlFor="bpm-resp">Responsible</label>
                <div className="bpm-input-wrap">
                  <input id="bpm-resp" name="responsible" type="text"
                    className="bpm-input" placeholder="Person responsible"
                    value={fields.responsible} onChange={change} autoComplete="off" />
                </div>
              </div>
            </div>
          </div>

          {/* ─ Budget lines table ─ */}
          <div className="bpm-lines-wrap">
            <div className="bpm-lines-title">Budget Lines</div>
            <table className="bpm-lines-table">
              <thead>
                <tr>
                  <th>Analytics</th>
                  <th className="align-right">Committed Amt</th>
                  <th className="align-right">Allowed Amt</th>
                  <th className="align-right">Allowed %</th>
                  <th className="align-right">Amt to Budget</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {fields.lines.map((line, idx) => {
                  const opts = analyticOptions.filter(a =>
                    !analyticSearch[idx] || a.name.toLowerCase().includes((analyticSearch[idx]||'').toLowerCase())
                  )
                  return (
                    <tr key={idx} className="bpm-line-row">
                      {/* Analytics */}
                      <td className="bpm-line-td bpm-line-td--analytics" style={{position:'relative'}}>
                        <input type="text" className="bpm-line-input"
                          placeholder="Select analytic..."
                          value={analyticSearch[idx] || ''}
                          onChange={e => {
                            const s = [...analyticSearch]; s[idx] = e.target.value; setAnalyticSearch(s)
                            updateLine(idx, 'analyticName', e.target.value)
                            setAnalyticDropIdx(idx)
                          }}
                          onFocus={() => setAnalyticDropIdx(idx)}
                          onBlur={() => setTimeout(() => setAnalyticDropIdx(null), 250)}
                          autoComplete="off"
                        />
                        {analyticDropIdx === idx && opts.length > 0 && (
                          <div className="bpm-line-dropdown">
                            <div className="bpm-line-dropdown-header">Available Analytic Accounts</div>
                            {opts.map(a => (
                              <button key={a.id} type="button" className="bpm-line-opt"
                                onMouseDown={() => selectAnalytic(idx, a)}>
                                <span className="bpm-opt-name">{a.name}</span>
                                <span className="bpm-opt-type">{a.type}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      {/* Committed */}
                      <td className="bpm-line-td">
                        <input type="number" min="0" className="bpm-line-input bpm-line-input--num"
                          placeholder="0" value={line.committedAmount}
                          onChange={e => updateLine(idx, 'committedAmount', e.target.value)} />
                      </td>
                      {/* Allowed */}
                      <td className="bpm-line-td">
                        <input type="number" min="0" className="bpm-line-input bpm-line-input--num"
                          placeholder="0" value={line.allowedAmount}
                          onChange={e => updateLine(idx, 'allowedAmount', e.target.value)} />
                      </td>
                      {/* Allowed % */}
                      <td className="bpm-line-td">
                        <input type="number" min="0" max="100" className="bpm-line-input bpm-line-input--num"
                          placeholder="%" value={line.allowedPct}
                          onChange={e => updateLine(idx, 'allowedPct', e.target.value)} />
                      </td>
                      {/* Amt to Budget */}
                      <td className="bpm-line-td">
                        <input type="number" min="0" className="bpm-line-input bpm-line-input--num"
                          placeholder="0" value={line.amountToBudget}
                          onChange={e => updateLine(idx, 'amountToBudget', e.target.value)} />
                      </td>
                      {/* Remove */}
                      <td className="bpm-line-td bpm-line-td--remove">
                        {fields.lines.length > 1 && (
                          <button type="button" className="bpm-remove-btn"
                            onClick={() => removeLine(idx)}><TrashIcon /></button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bpm-totals-row">
                  <td className="bpm-totals-label">Totals</td>
                  <td className="bpm-total-val">{fmt(fields.lines.reduce((s,l)=>s+(Number(l.committedAmount)||0),0))}</td>
                  <td className="bpm-total-val">{fmt(fields.lines.reduce((s,l)=>s+(Number(l.allowedAmount)||0),0))}</td>
                  <td className="bpm-total-val">—</td>
                  <td className="bpm-total-val">{fmt(fields.lines.reduce((s,l)=>s+(Number(l.amountToBudget)||0),0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            {errors.lines && <span className="bpm-err" style={{ marginTop: 8, fontSize: '12px', fontWeight: 600 }}>{errors.lines}</span>}
            <button type="button" className="bpm-add-line-btn" onClick={addLine}>
              <PlusSmIcon /> Add Line
            </button>
          </div>

          <div className="bpm-footer">
            <button type="submit" className="bpm-save-btn">{editPlan ? 'Update Plan' : 'Save Plan'}</button>
            <button type="button" className="bpm-cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Budget Plans Page ─── */
export default function BudgetPlansPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [plans,           setPlans]           = useState([])
  const [analyticOptions, setAnalyticOptions] = useState([])
  const [loading,         setLoading]         = useState(false)
  const [search,          setSearch]          = useState('')
  const [statusFlt,       setStatusFlt]       = useState('All')
  const [modalOpen,       setModalOpen]       = useState(false)
  const [editPlan,        setEditPlan]        = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [budgetsRes, analyticsRes] = await Promise.allSettled([
        api.budgets.listBudgets({ limit: 100 }),
        api.budgets.getAnalyticAccounts(),
      ])

      if (analyticsRes.status === 'fulfilled') {
        setAnalyticOptions(extractList(analyticsRes.value))
      }

      if (budgetsRes.status === 'fulfilled') {
        const list = extractList(budgetsRes.value)
        const year = new Date().getFullYear()
        const mapped = list.map((b, idx) => ({
          id: `BP-${year}-${String(idx + 1).padStart(3, '0')}`,
          rawId: b.id,
          name: b.name,
          startDate: b.startDate ? b.startDate.substring(0, 10) : '',
          endDate: b.endDate ? b.endDate.substring(0, 10) : '',
          responsible: b.responsiblePerson || 'Admin',
          status: 'Confirmed',
          lines: [
            {
              analyticId: b.analyticAccountId,
              analyticName: b.analyticAccount?.name || 'General Operations',
              type: b.analyticAccount?.type || 'Expense',
              committedAmount: b.plannedAmount || 0,
              allowedAmount: b.plannedAmount || 0,
              allowedPct: 100,
              amountToBudget: b.plannedAmount || 0,
            }
          ]
        }))
        setPlans(mapped)
      }
    } catch (err) {
      console.error('Failed to load budget plans', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = plans.filter(p => {
    const q = search.toLowerCase()
    const ms = !search || p.name.toLowerCase().includes(q) || (p.responsible && p.responsible.toLowerCase().includes(q))
    const mf = statusFlt === 'All' || p.status === statusFlt
    return ms && mf
  })

  const openAdd  = ()  => { setEditPlan(null); setModalOpen(true) }
  const openEdit = (p) => { setEditPlan(p);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false); setEditPlan(null) }

  const handleSave = async (data) => {
    try {
      const validLines = data.lines.filter(l => l.analyticId || l.analyticName)
      if (validLines.length === 0 && analyticOptions.length > 0) {
        validLines.push({
          analyticId: analyticOptions[0].id,
          analyticName: analyticOptions[0].name,
          amountToBudget: 10000,
        })
      }

      for (const line of validLines) {
        const analyticId = line.analyticId || analyticOptions.find(a => a.name.toLowerCase() === line.analyticName.toLowerCase())?.id || analyticOptions[0]?.id
        if (analyticId) {
          await api.budgets.createBudget({
            name: validLines.length > 1 ? `${data.name} - ${line.analyticName}` : data.name,
            analyticAccountId: analyticId,
            startDate: new Date(data.startDate).toISOString(),
            endDate: new Date(data.endDate).toISOString(),
            responsiblePerson: data.responsible || 'Budget Manager',
            plannedAmount: Number(line.amountToBudget || line.allowedAmount || line.committedAmount || 0),
          })
        }
      }
      await loadData()
      toast.success(editPlan ? 'Budget plan updated successfully!' : `Budget plan "${data.name}" created successfully!`)
      close()
    } catch (err) {
      console.error('Failed to save budget plan', err)
      toast.error(err.message || 'Failed to save budget plan')
    }
  }

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'Delete Budget Plan',
      message: `Are you sure you want to delete budget plan "${name || id}"?`,
      detail: 'This will remove the planned expenditure allocations for this period.',
      confirmText: 'Delete Plan',
      confirmVariant: 'danger',
    })
    if (ok) {
      setPlans(prev => prev.filter(p => p.id !== id))
      toast.info(`Budget plan ${id} deleted`)
    }
  }

  /* Summary counts */
  const counts = BUDGET_STATUSES.reduce((acc,s) => ({ ...acc, [s]: plans.filter(p=>p.status===s).length }), {})

  return (
    <DashboardLayout>
      <div className="bp-page">
        <div className="bp-breadcrumb">Budget <span>›</span> Budget Plans</div>

        <div className="bp-header">
          <div>
            <h1 className="bp-title">Budget Plans</h1>
            <p className="bp-subtitle">{loading ? 'Loading...' : `${plans.length} plans configured`}</p>
          </div>
          <div className="bp-header-right">
            <div className="bp-search-wrap">
              <SearchIcon />
              <input className="bp-search" type="search" placeholder="Search plans..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="bp-filter" value={statusFlt} onChange={e => setStatusFlt(e.target.value)}>
              <option value="All">All Status</option>
              {BUDGET_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <button className="bp-add-btn" onClick={openAdd}><PlusIcon /> New Plan</button>
          </div>
        </div>

        {/* Status summary */}
        <div className="bp-summary">
          {BUDGET_STATUSES.map(s => (
            <div key={s} className={`bp-sum-card bp-sum-card--${s.toLowerCase()}`}>
              <span className="bp-sum-label">{s}</span>
              <span className="bp-sum-val">{counts[s]}</span>
            </div>
          ))}
        </div>

        {/* Plans list */}
        <div className="bp-list">
          {filtered.length === 0
            ? <div className="bp-empty">{loading ? 'Loading budget plans from backend...' : 'No budget plans found.'}</div>
            : filtered.map(plan => (
              <div key={plan.id} className="bp-plan-card">
                <div className="bp-plan-header">
                  <div className="bp-plan-info">
                    <span className="bp-plan-name">{plan.name}</span>
                    <span className="bp-plan-id">{plan.id}</span>
                  </div>
                  <div className="bp-plan-meta">
                    <span className="bp-plan-dates">
                      <CalIcon /> {plan.startDate} → {plan.endDate}
                    </span>
                    <span className="bp-plan-resp"><PersonIcon /> {plan.responsible}</span>
                    <span className={`bp-plan-status ${STATUS_STYLE[plan.status]||''}`}>{plan.status}</span>
                  </div>
                  <div className="bp-plan-actions">
                    <button className="bp-edit-btn" onClick={() => openEdit(plan)}>Edit</button>
                    <button className="bp-del-btn"  onClick={() => handleDelete(plan.id, plan.name)}>Delete</button>
                  </div>
                </div>

                {/* Budget lines mini table */}
                {plan.lines?.length > 0 && (
                  <div className="bp-lines-preview">
                    <table className="bp-preview-table">
                      <thead>
                        <tr>
                          <th>Analytics</th>
                          <th className="align-right">Committed</th>
                          <th className="align-right">Allowed</th>
                          <th className="align-right">Allowed %</th>
                          <th className="align-right">Amt to Budget</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.lines.map((l,i) => (
                          <tr key={i} className={`bp-preview-row${i%2===1?' bp-preview-row--alt':''}`}>
                            <td className="bp-preview-analytic">{l.analyticName}</td>
                            <td className="align-right bp-preview-num">{fmt(l.committedAmount)}</td>
                            <td className="align-right bp-preview-num">{fmt(l.allowedAmount)}</td>
                            <td className="align-right">{fmtPct(l.allowedPct)}</td>
                            <td className="align-right bp-preview-num bp-amt-budget">{fmt(l.amountToBudget)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          }
        </div>

        <div className="bp-footer-count">Showing {filtered.length} of {plans.length} plans</div>
      </div>

      <BudgetPlanModal
        isOpen={modalOpen}
        onClose={close}
        onSave={handleSave}
        editPlan={editPlan}
        analyticOptions={analyticOptions}
      />
    </DashboardLayout>
  )
}

function SearchIcon() { return <svg className="bp-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function PlusIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function PlusSmIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function XIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function TrashIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg> }
function CalIcon()    { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function PersonIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
