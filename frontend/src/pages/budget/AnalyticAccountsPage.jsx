import React, { useState, useEffect, useRef, useCallback } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import './AnalyticAccountsPage.css'
import Pagination, { usePagination } from '../../components/Pagination'
import { api, extractList } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

/* ── Analytic types from wireframe ── */
const ANALYTIC_TYPES = ['Budget', 'Short Body', 'End Body', 'Committed', 'Achieved']

const TYPE_STYLE = {
  Budget:       'aa-type--budget',
  'Short Body': 'aa-type--short-body',
  'End Body':   'aa-type--end-body',
  Committed:    'aa-type--committed',
  Achieved:     'aa-type--achieved',
  EXPENSE:      'aa-type--committed',
  INCOME:       'aa-type--budget',
}

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`

let counter = 1
function nextId() { return `AA-${String(counter++).padStart(3,'0')}` }

/* ─── Modal ─── */
const EMPTY = { name: '', type: 'Budget', analyticAmount: '' }

function validate(f) {
  const e = {}
  if (!f.name.trim()) e.name = 'Account name is required.'
  if (!f.type)        e.type = 'Select a type.'
  if (f.analyticAmount === '' || isNaN(Number(f.analyticAmount)) || Number(f.analyticAmount) < 0)
    e.analyticAmount = 'Enter a valid amount.'
  return e
}

function AnalyticAccountModal({ isOpen, onClose, onSave, editAccount }) {
  const [fields,    setFields]    = useState(EMPTY)
  const [errors,    setErrors]    = useState({})
  const [confirmed, setConfirmed] = useState(false)
  const firstRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setFields(editAccount
        ? { name: editAccount.name, type: editAccount.type, analyticAmount: editAccount.analyticAmount }
        : EMPTY)
      setErrors({})
      setConfirmed(false)
    }
  }, [isOpen, editAccount])

  useEffect(() => { if (isOpen) setTimeout(() => firstRef.current?.focus(), 60) }, [isOpen])

  const handleKey = useCallback(e => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, handleKey])

  if (!isOpen) return null

  const change = (e) => {
    const { name, value } = e.target
    setFields(p => ({ ...p, [name]: value }))
    if (errors[name]) setErrors(p => ({ ...p, [name]: undefined }))
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
    onSave({ ...fields, analyticAmount: Number(fields.analyticAmount) })
  }

  return (
    <div className="aam-overlay" role="dialog" aria-modal="true"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="aam-panel">
        {/* Topbar */}
        <div className="aam-topbar">
          <div className="aam-topbar-left">
            <button type="button" className="aam-btn aam-btn--new"
              onClick={() => { setFields(EMPTY); setErrors({}); setConfirmed(false) }}>New</button>
            <button type="button"
              className={`aam-btn aam-btn--confirm${confirmed ? ' aam-btn--confirmed' : ''}`}
              onClick={handleConfirm}>
              {confirmed ? '✓ Confirmed' : 'Confirm'}
            </button>
          </div>
          <div className="aam-topbar-right">
            <button type="button" className="aam-btn aam-btn--back" onClick={onClose}>Back</button>
            <button type="button" className="aam-close" onClick={onClose} aria-label="Close"><XIcon /></button>
          </div>
        </div>

        <h2 className="aam-title">{editAccount ? 'Edit Analytic Account' : 'New Analytic Account'}</h2>

        <form onSubmit={handleSave} noValidate>
          <div className="aam-body">

            {/* Analytic Account Name */}
            <div className="aam-field">
              <label className="aam-lbl" htmlFor="aam-name">Account Name</label>
              <div className="aam-input-wrap">
                <input ref={firstRef} id="aam-name" name="name" type="text"
                  className={`aam-input${errors.name ? ' aam-input--err' : ''}`}
                  placeholder="e.g. Q4 Marketing Budget"
                  value={fields.name} onChange={change} autoComplete="off" />
                {errors.name && <span className="aam-err">{errors.name}</span>}
              </div>
            </div>

            {/* Type — pill toggle group */}
            <div className="aam-field aam-field--type">
              <label className="aam-lbl aam-lbl--top">Type</label>
              <div className="aam-type-panel">
                <p className="aam-type-hint">Select the analytic type for this account</p>
                <div className="aam-type-options">
                  {ANALYTIC_TYPES.map(t => (
                    <button key={t} type="button"
                      className={`aam-type-opt aam-type-opt--${t.toLowerCase().replace(/\s+/g,'-')}${fields.type === t ? ' aam-type-opt--active' : ''}`}
                      onClick={() => { setFields(p => ({...p, type: t})); setErrors(p => ({...p,type:undefined})); setConfirmed(false) }}
                      aria-pressed={fields.type === t}>
                      {t}
                    </button>
                  ))}
                </div>
                {errors.type && <span className="aam-err">{errors.type}</span>}
                <p className="aam-type-desc">
                  {fields.type === 'Budget'     && 'Fill the Budget list when the Analytic amount is used'}
                  {fields.type === 'Short Body' && 'Used for partial or interim budget allocations'}
                  {fields.type === 'End Body'   && 'Marks the closing or final budget position'}
                  {fields.type === 'Committed'  && 'Amounts committed but not yet spent'}
                  {fields.type === 'Achieved'   && 'Amounts actually achieved / spent'}
                </p>
              </div>
            </div>

            {/* Analytic Amount */}
            <div className="aam-field">
              <label className="aam-lbl" htmlFor="aam-amount">Analytic Amount</label>
              <div className="aam-input-wrap">
                <div className="aam-price-wrap">
                  <span className="aam-price-prefix">₹</span>
                  <input id="aam-amount" name="analyticAmount" type="number" min="0" step="1"
                    className={`aam-input aam-input--num${errors.analyticAmount ? ' aam-input--err' : ''}`}
                    placeholder="0"
                    value={fields.analyticAmount} onChange={change} />
                </div>
                {errors.analyticAmount && <span className="aam-err">{errors.analyticAmount}</span>}
              </div>
            </div>

          </div>

          <div className="aam-footer">
            <button type="submit" className="aam-save-btn">
              {editAccount ? 'Update Account' : 'Save Account'}
            </button>
            <button type="button" className="aam-cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const STORAGE_KEY_DATA = 'furniq_analytic_accounts_data'

/* ─── Page ─── */
export default function AnalyticAccountsPage() {
  const toast   = useToast()
  const confirm = useConfirm()
  const [accounts,   setAccounts]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editAccount,setEditAccount]= useState(null)

  const saveAccountsToStorage = (updatedList) => {
    setAccounts(updatedList)
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(updatedList))
    } catch (e) {
      console.warn('Could not save analytic accounts to localStorage:', e)
    }
  }

  const loadAccounts = useCallback(() => {
    setLoading(true)
    const cached = localStorage.getItem(STORAGE_KEY_DATA)
    let localData = []
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          localData = parsed
        }
      } catch (e) {}
    }

    api.budgets.getAnalyticAccounts()
      .then(res => {
        const list = extractList(res)
        const mapped = list.map(a => {
          const matchedLocal = localData.find(l => l.id === a.id || l.name === a.name)
          const amount = matchedLocal?.analyticAmount !== undefined
            ? matchedLocal.analyticAmount
            : (a.budgets?.[0]?.plannedAmount ? Number(a.budgets[0].plannedAmount) : 50000)
          const type = matchedLocal?.type || (a.type === 'INCOME' ? 'Budget' : 'Committed')

          return {
            ...a,
            id: a.id,
            name: matchedLocal?.name || a.name,
            type,
            analyticAmount: Number(amount) || 0,
          }
        })

        const localOnly = localData.filter(l => !mapped.some(m => m.id === l.id || m.name === l.name))
        const merged = [...mapped, ...localOnly]
        saveAccountsToStorage(merged)
      })
      .catch(err => {
        console.warn('Could not load live analytic accounts:', err.message)
        if (localData.length > 0) {
          setAccounts(localData)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !search || a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
    const matchType = typeFilter === 'All' || a.type === typeFilter
    return matchSearch && matchType
  })

  const totalAmount = accounts.reduce((s,a) => s + a.analyticAmount, 0)

  const { page, setPage, paged, total: totalFiltered } = usePagination(filtered, 10)

  const openAdd  = ()  => { setEditAccount(null); setModalOpen(true) }
  const openEdit = (a) => { setEditAccount(a);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false);  setEditAccount(null) }

  const handleSave = async (data) => {
    let nextList
    const newAmount = Number(data.analyticAmount) || 0
    if (editAccount) {
      nextList = accounts.map(a => a.id === editAccount.id ? { ...a, ...data, analyticAmount: newAmount } : a)
      toast.success(`Analytic account "${data.name}" updated successfully!`)
    } else {
      const nid = nextId()
      const newAcc = { id: nid, name: data.name.trim(), type: data.type || 'Budget', analyticAmount: newAmount }
      nextList = [...accounts, newAcc]
      toast.success(`Analytic account "${data.name}" created successfully!`)

      try {
        await api.budgets.createAnalyticAccount({
          name: data.name.trim(),
          type: (data.type === 'Budget' || data.type === 'Achieved') ? 'INCOME' : 'EXPENSE',
        })
      } catch (e) {
        console.warn('API create analytic account error:', e.message)
      }
    }
    saveAccountsToStorage(nextList)
    close()
  }

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'Delete Analytic Account',
      message: `Are you sure you want to delete analytic account "${name || id}"?`,
      detail: 'This will remove the analytic cost center from budget tracking.',
      confirmText: 'Delete Account',
      confirmVariant: 'danger',
    })
    if (ok) {
      const nextList = accounts.filter(a => a.id !== id)
      saveAccountsToStorage(nextList)
      toast.info(`Analytic account ${name || id} deleted`)
    }
  }

  /* Summary by type */
  const typeSummary = ANALYTIC_TYPES.map(t => ({
    type: t,
    count:  accounts.filter(a => a.type === t).length,
    amount: accounts.filter(a => a.type === t).reduce((s,a) => s + a.analyticAmount, 0),
  }))

  return (
    <DashboardLayout>
      <div className="aa-page">
        <div className="aa-breadcrumb">Budget <span>›</span> Analytic Accounts</div>

        <div className="aa-header">
          <div>
            <h1 className="aa-title">Analytic Accounts</h1>
            <p className="aa-subtitle">{accounts.length} accounts · Total: {fmt(totalAmount)}</p>
          </div>
          <div className="aa-header-right">
            <div className="aa-search-wrap">
              <SearchIcon />
              <input className="aa-search" type="search" placeholder="Search accounts..."
                value={search} onChange={e => setSearch(e.target.value)} aria-label="Search" />
            </div>
            <select className="aa-filter" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="All">All Types</option>
              {ANALYTIC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className="aa-add-btn" onClick={openAdd}><PlusIcon /> New Account</button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="aa-summary">
          {typeSummary.map(s => (
            <div key={s.type} className={`aa-sum-card aa-sum-card--${s.type.toLowerCase().replace(/\s+/g,'-')}`}>
              <span className="aa-sum-label">{s.type}</span>
              <span className="aa-sum-count">{s.count} accounts</span>
              <span className="aa-sum-amount">{fmt(s.amount)}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="aa-card">
          {filtered.length === 0
            ? <div className="aa-empty">No analytic accounts found.</div>
            : (
              <table className="aa-table">
                <thead>
                  <tr>
                    <th>Account Name</th>
                    <th>Type</th>
                    <th className="align-right">Analytic Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((a,i) => (
                    <tr key={a.id} className={`aa-tr${i%2===1?' aa-tr--alt':''}`}>
                      <td className="aa-name-text">{a.name}</td>
                      <td><span className={`aa-type-badge ${TYPE_STYLE[a.type]||''}`}>{a.type}</span></td>
                      <td className="align-right aa-amount">{fmt(a.analyticAmount)}</td>
                      <td>
                        <div className="aa-actions">
                          <button className="aa-edit-btn" onClick={() => openEdit(a)}>Edit</button>
                          <button className="aa-del-btn"  onClick={() => handleDelete(a.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
          <Pagination total={totalFiltered} page={page} pageSize={10} onChange={setPage} />
        </div>
      </div>

      <AnalyticAccountModal isOpen={modalOpen} onClose={close}
        onSave={handleSave} editAccount={editAccount} />
    </DashboardLayout>
  )
}

function SearchIcon() { return <svg className="aa-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function PlusIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function XIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
