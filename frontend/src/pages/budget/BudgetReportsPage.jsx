import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import DashboardLayout from '../../layouts/DashboardLayout'
import './BudgetReportsPage.css'
import Pagination, { usePagination } from '../../components/Pagination'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

import { api, extractList } from '../../services/api'

const STATUS_STYLES = {
  Confirmed: 'br-status--confirmed',
  Draft:     'br-status--draft',
  Cancelled: 'br-status--cancelled',
}

const PIE_COLORS = ['#4FC3C3', '#E87070']

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`

function getAchievedPercentage(achieved, balance) {
  const ach = Math.max(0, Number(achieved) || 0)
  const bal = Math.max(0, Number(balance) || 0)
  if (bal === 0) return ach > 0 ? '100' : '0'
  
  const pct = (ach / bal) * 100
  if (pct > 0 && pct < 1) {
    return pct.toFixed(2)
  }
  return Math.min(100, Math.round(pct)).toString()
}

const EMPTY_FORM = {
  name: '', startDate: '', endDate: '', status: 'Draft',
  achieved: '', balance: '',
}

function validate(f) {
  const e = {}
  if (!f.name.trim())    e.name      = 'Budget name is required.'
  if (!f.startDate)      e.startDate = 'Start date is required.'
  if (!f.endDate)        e.endDate   = 'End date is required.'
  return e
}

/* ── New / Edit Report Modal ── */
function BudgetReportModal({ isOpen, onClose, onSave, editReport }) {
  const [fields,    setFields]    = useState(EMPTY_FORM)
  const [errors,    setErrors]    = useState({})
  const [confirmed, setConfirmed] = useState(false)
  const firstRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setFields(editReport ? {
        name:      editReport.name      || '',
        startDate: editReport.startDate || '',
        endDate:   editReport.endDate   || '',
        status:    editReport.status    || 'Draft',
        achieved:  editReport.achieved  || '',
        balance:   editReport.balance   || '',
      } : EMPTY_FORM)
      setErrors({})
      setConfirmed(false)
    }
  }, [isOpen, editReport])

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
    onSave({
      ...fields,
      achieved: Number(fields.achieved) || 0,
      balance:  Number(fields.balance)  || 0,
    })
  }

  return (
    <div className="brm-overlay" role="dialog" aria-modal="true"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="brm-panel">
        {/* Topbar */}
        <div className="brm-topbar">
          <div className="brm-topbar-left">
            <button type="button" className="brm-btn brm-btn--new"
              onClick={() => { setFields(EMPTY_FORM); setErrors({}); setConfirmed(false) }}>
              New
            </button>
            <button type="button"
              className={`brm-btn brm-btn--confirm${confirmed ? ' brm-btn--confirmed' : ''}`}
              onClick={handleConfirm}>
              {confirmed ? '✓ Confirmed' : 'Confirm'}
            </button>
          </div>
          <div className="brm-topbar-right">
            <button type="button" className="brm-btn brm-btn--back" onClick={onClose}>Back</button>
            <button type="button" className="brm-close" onClick={onClose} aria-label="Close"><XIcon /></button>
          </div>
        </div>

        <h2 className="brm-title">{editReport ? 'Edit Budget Report' : 'New Budget Report'}</h2>

        <form onSubmit={handleSave} noValidate>
          <div className="brm-body">

            {/* Budget Name */}
            <div className="brm-field">
              <label className="brm-lbl" htmlFor="brm-name">Budget</label>
              <div className="brm-input-wrap">
                <input ref={firstRef} id="brm-name" name="name" type="text"
                  className={`brm-input${errors.name ? ' brm-input--err' : ''}`}
                  placeholder="e.g. January 2026"
                  value={fields.name} onChange={change} autoComplete="off" />
                {errors.name && <span className="brm-err">{errors.name}</span>}
              </div>
            </div>

            {/* Start + End Date */}
            <div className="brm-field-row">
              <div className="brm-field brm-field--half">
                <label className="brm-lbl" htmlFor="brm-start">Start Date</label>
                <div className="brm-input-wrap">
                  <input id="brm-start" name="startDate" type="text"
                    className={`brm-input${errors.startDate ? ' brm-input--err' : ''}`}
                    placeholder="DD/MM/YYYY"
                    value={fields.startDate} onChange={change} />
                  {errors.startDate && <span className="brm-err">{errors.startDate}</span>}
                </div>
              </div>
              <div className="brm-field brm-field--half">
                <label className="brm-lbl" htmlFor="brm-end">End Date</label>
                <div className="brm-input-wrap">
                  <input id="brm-end" name="endDate" type="text"
                    className={`brm-input${errors.endDate ? ' brm-input--err' : ''}`}
                    placeholder="DD/MM/YYYY"
                    value={fields.endDate} onChange={change} />
                  {errors.endDate && <span className="brm-err">{errors.endDate}</span>}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="brm-field">
              <label className="brm-lbl" htmlFor="brm-status">Status</label>
              <div className="brm-input-wrap">
                <select id="brm-status" name="status" className="brm-input brm-select"
                  value={fields.status} onChange={change}>
                  <option>Draft</option>
                  <option>Confirmed</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>

            {/* Achieved + Balance */}
            <div className="brm-field-row">
              <div className="brm-field brm-field--half">
                <label className="brm-lbl" htmlFor="brm-achieved">Achieved (₹)</label>
                <div className="brm-input-wrap">
                  <input id="brm-achieved" name="achieved" type="number" min="0"
                    className="brm-input" placeholder="0"
                    value={fields.achieved} onChange={change} />
                </div>
              </div>
              <div className="brm-field brm-field--half">
                <label className="brm-lbl" htmlFor="brm-balance">Balance (₹)</label>
                <div className="brm-input-wrap">
                  <input id="brm-balance" name="balance" type="number" min="0"
                    className="brm-input" placeholder="0"
                    value={fields.balance} onChange={change} />
                </div>
              </div>
            </div>

          </div>

          <div className="brm-footer">
            <button type="submit" className="brm-save-btn">
              {editReport ? 'Update Report' : 'Save Report'}
            </button>
            <button type="button" className="brm-cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Pie Chart Modal ── */
function PieChartModal({ isOpen, onClose, report }) {
  const handleKey = useCallback(e => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, handleKey])

  if (!isOpen || !report) return null

  const achievedVal  = Math.max(0, Number(report.achieved) || 0)
  const balanceVal   = Math.max(0, Number(report.balance) || 0)
  const targetBudget = Math.max(achievedVal, balanceVal)
  const remainingVal = Math.max(0, targetBudget - achievedVal)
  const hasData      = targetBudget > 0
  const achPct       = getAchievedPercentage(report.achieved, report.balance)
  const balPct       = targetBudget > 0 ? ((remainingVal / targetBudget) * 100).toFixed(1) : '0.0'

  const pieData = hasData ? [
    { name: 'Achieved',  value: achievedVal },
    { name: 'Remaining', value: remainingVal },
  ] : [
    { name: 'No Data',   value: 1 }
  ]

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length && hasData) {
      return (
        <div className="pie-tooltip">
          <p className="pie-tooltip-label">{payload[0].name}</p>
          <p className="pie-tooltip-val">{fmt(payload[0].value)}</p>
          <p className="pie-tooltip-pct">{total > 0 ? ((payload[0].value/total)*100).toFixed(1) : 0}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="pcm-overlay" role="dialog" aria-modal="true"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pcm-panel">
        <div className="pcm-header">
          <div>
            <h2 className="pcm-title">{report.name}</h2>
            <p className="pcm-dates">{report.startDate} → {report.endDate}</p>
          </div>
          <button type="button" className="pcm-close" onClick={onClose} aria-label="Close"><XIcon /></button>
        </div>

        {/* Pie chart */}
        <div className="pcm-chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={achievedVal > 0 && balanceVal > 0 ? 3 : 0}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {hasData ? (
                  pieData.map((entry, idx) => (
                    <Cell key={`pcm-cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="none" />
                  ))
                ) : (
                  <Cell fill="#E5DEC9" stroke="none" />
                )}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={10}
                formatter={(value) => <span style={{ fontSize: 13, color: '#5C4A2A', fontWeight: 600 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats row */}
        <div className="pcm-stats">
          <div className="pcm-stat pcm-stat--achieved">
            <span className="pcm-stat-dot" style={{ background: PIE_COLORS[0] }} />
            <div>
              <div className="pcm-stat-label">Achieved</div>
              <div className="pcm-stat-val">{fmt(report.achieved)}</div>
              <div className="pcm-stat-pct">{achPct}% of total</div>
            </div>
          </div>
          <div className="pcm-stat-divider" />
          <div className="pcm-stat pcm-stat--balance">
            <span className="pcm-stat-dot" style={{ background: PIE_COLORS[1] }} />
            <div>
              <div className="pcm-stat-label">Balance</div>
              <div className="pcm-stat-val">{fmt(report.balance)}</div>
              <div className="pcm-stat-pct">{balPct}% of total</div>
            </div>
          </div>
          <div className="pcm-stat-divider" />
          <div className="pcm-stat">
            <div>
              <div className="pcm-stat-label">Total Budget</div>
              <div className="pcm-stat-val pcm-stat-val--total">{fmt(total)}</div>
              <div className="pcm-stat-pct">Combined</div>
            </div>
          </div>
        </div>

        <div className="pcm-footer">
          <button className="pcm-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
let reportCounter = 1
function nextId() { return `BR-${String(reportCounter++).padStart(3,'0')}` }

const STORAGE_KEY_DATA = 'furniq_budget_reports_data'
const STORAGE_KEY_VIEW = 'furniq_budget_reports_view'

export default function BudgetReportsPage() {
  const toast        = useToast()
  const confirm      = useConfirm()
  const [reports,    setReports]    = useState([])
  const [loading,    setLoading]    = useState(false)
  const [search,     setSearch]     = useState('')
  const [view,       setView]       = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VIEW)
    return (saved === 'grid' || saved === 'list') ? saved : 'list'
  })   // 'list' | 'grid'
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editReport, setEditReport] = useState(null)
  const [pieReport,  setPieReport]  = useState(null)

  const handleViewChange = (v) => {
    setView(v)
    localStorage.setItem(STORAGE_KEY_VIEW, v)
  }

  const saveReportsToStorage = (updatedList) => {
    setReports(updatedList)
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(updatedList))
    } catch (e) {
      console.warn('Could not save budget reports to localStorage:', e)
    }
  }

  const loadReports = useCallback(() => {
    setLoading(true)
    const cached = localStorage.getItem(STORAGE_KEY_DATA)
    let localList = []
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          localList = parsed.map(item => ({
            ...item,
            achieved: Math.abs(Number(item.achieved) || 0),
            balance: Math.abs(Number(item.balance) || 0),
          }))
        }
      } catch (e) {}
    }

    api.reports.budget()
      .then(res => {
        const rawBudgets = res?.budgets || res?.data?.budgets || []
        const apiMapped = rawBudgets.map((b, idx) => {
          const bId = b.budgetId?.slice(0, 8) || `BR-${String(idx + 1).padStart(3, '0')}`
          const bName = b.budgetName || 'Budget'
          const localMatch = localList.find(l => l.id === bId || l.name === bName)

          const rawAch = localMatch?.achieved !== undefined ? Number(localMatch.achieved) : Number(b.actualSpent || 0)
          const rawBal = localMatch?.balance !== undefined ? Number(localMatch.balance) : (b.plannedAmount ? Number(b.plannedAmount) - rawAch : Number(b.variance || 0))

          return {
            id: bId,
            name: localMatch?.name || bName,
            startDate: localMatch?.startDate || (b.period?.startDate ? new Date(b.period.startDate).toLocaleDateString('en-GB') : ''),
            endDate: localMatch?.endDate || (b.period?.endDate ? new Date(b.period.endDate).toLocaleDateString('en-GB') : ''),
            status: localMatch?.status || (b.isOverBudget ? 'Draft' : 'Confirmed'),
            achieved: Math.abs(rawAch),
            balance: Math.abs(rawBal),
          }
        })

        const localExtra = localList.filter(l => !apiMapped.some(m => m.id === l.id || m.name === l.name))
        const merged = [...apiMapped, ...localExtra]
        saveReportsToStorage(merged)
      })
      .catch(err => {
        console.warn('Could not load budget report:', err.message)
        if (localList.length > 0) {
          setReports(localList)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const filtered = reports.filter(r => {
    const q = search.toLowerCase()
    return !search ||
      r.name.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      r.startDate.includes(q) ||
      r.endDate.includes(q)
  })

  const { page, setPage, paged, total: totalFiltered } = usePagination(filtered, 10)

  const openNew  = ()  => { setEditReport(null); setModalOpen(true) }
  const openEdit = (r) => { setEditReport(r);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false); setEditReport(null) }

  const handleSave = (data) => {
    let nextList
    if (editReport) {
      nextList = reports.map(r => r.id === editReport.id ? { ...r, ...data } : r)
      toast.success(`Budget report "${data.name}" updated!`)
    } else {
      const nid = nextId()
      nextList = [...reports, { id: nid, ...data }]
      toast.success(`Budget report "${data.name}" created!`)
    }
    saveReportsToStorage(nextList)
    close()
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Budget Report',
      message: `Delete budget report #${id}?`,
      detail: 'This will remove the report snapshot from the system.',
      confirmText: 'Delete Report',
      confirmVariant: 'danger',
    })
    if (ok) {
      const nextList = reports.filter(r => r.id !== id)
      saveReportsToStorage(nextList)
      toast.info(`Budget report #${id} deleted`)
    }
  }

  return (
    <DashboardLayout>
      <div className="br-page">
        <div className="br-breadcrumb">Budget <span>›</span> Budget Reports</div>

        {/* Header */}
        <div className="br-header">
          <div>
            <h1 className="br-title">Budget Reports</h1>
            <p className="br-subtitle">{reports.length} reports</p>
          </div>
        </div>

        {/* List card */}
        <div className="br-card">
          {/* Toolbar: New + Search + View buttons */}
          <div className="br-toolbar">
            <div className="br-toolbar-left">
              <button className="br-new-btn" onClick={openNew}>
                <PlusIcon /> New
              </button>
              <div className="br-search-wrap">
                <SearchIcon />
                <input className="br-search" type="search" placeholder="Search..."
                  value={search} onChange={e => setSearch(e.target.value)} aria-label="Search reports" />
              </div>
            </div>
            <div className="br-toolbar-right">
              <div className="br-view-icons">
                <button className={`br-icon-btn${view === 'list' ? ' br-icon-btn--active' : ''}`} title="List view" onClick={() => handleViewChange('list')}><ListIcon /></button>
                <button className={`br-icon-btn${view === 'grid' ? ' br-icon-btn--active' : ''}`} title="Card / Grid view" onClick={() => handleViewChange('grid')}><GridIcon /></button>
              </div>
            </div>
          </div>

          {/* List or Grid view */}
          {filtered.length === 0
            ? <div className="br-empty">No budget reports found.</div>
            : view === 'list'
              ? (
                <table className="br-table" aria-label="Budget reports">
                  <thead>
                    <tr>
                      <th>Budget</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                      <th className="align-center">Pie Chart</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((r, i) => (
                      <tr key={r.id} className={`br-tr${i % 2 === 1 ? ' br-tr--alt' : ''}`}>
                        <td>
                          <button className="br-name-link" onClick={() => openEdit(r)}>{r.name}</button>
                        </td>
                        <td className="br-date">{r.startDate}</td>
                        <td className="br-date">{r.endDate}</td>
                        <td>
                          <span className={`br-status-badge ${STATUS_STYLES[r.status] || ''}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="align-center">
                          <button className="br-pie-btn" onClick={() => setPieReport(r)}
                            title={`View pie chart for ${r.name}`} aria-label={`Open pie chart for ${r.name}`}>
                            <PieIcon />
                          </button>
                        </td>
                        <td>
                          <div className="br-actions">
                            <button className="br-edit-btn" onClick={() => openEdit(r)}>Edit</button>
                            <button className="br-del-btn"  onClick={() => handleDelete(r.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
              : (
                /* Grid / Card view */
                <div className="br-grid">
                  {paged.map(r => {
                    const achievedVal  = Math.max(0, Number(r.achieved) || 0)
                    const balanceVal   = Math.max(0, Number(r.balance) || 0)
                    const targetBudget = Math.max(achievedVal, balanceVal)
                    const remainingVal = Math.max(0, targetBudget - achievedVal)
                    const achPct       = getAchievedPercentage(r.achieved, r.balance)
                    const hasData      = targetBudget > 0

                    const pieData = hasData ? [
                      { name: 'Achieved',  value: achievedVal },
                      { name: 'Remaining', value: remainingVal },
                    ] : [
                      { name: 'No Data',   value: 1 }
                    ]

                    return (
                      <div key={r.id} className="br-grid-card">
                        {/* Card header */}
                        <div className="br-gc-header">
                          <div>
                            <button className="br-name-link br-gc-name" onClick={() => openEdit(r)}>{r.name}</button>
                            <p className="br-gc-dates">{r.startDate} → {r.endDate}</p>
                          </div>
                          <span className={`br-status-badge ${STATUS_STYLES[r.status] || ''}`}>{r.status}</span>
                        </div>

                        {/* Mini donut */}
                        <div className="br-gc-chart">
                          <ResponsiveContainer width="100%" height={120}>
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%" cy="50%"
                                innerRadius={32} outerRadius={50}
                                paddingAngle={achievedVal > 0 && balanceVal > 0 ? 3 : 0}
                                dataKey="value"
                                startAngle={90} endAngle={-270}
                              >
                                {hasData ? (
                                  pieData.map((entry, idx) => (
                                    <Cell key={`gc-cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="none" />
                                  ))
                                ) : (
                                  <Cell fill="#E5DEC9" stroke="none" />
                                )}
                              </Pie>
                              <Tooltip
                                formatter={(v) => hasData ? fmt(v) : '₹0'}
                                contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #D4C4A0', background: '#FDFAF5' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="br-gc-pct">{achPct}%<span>achieved</span></div>
                        </div>

                        {/* Stats */}
                        <div className="br-gc-stats">
                          <div className="br-gc-stat">
                            <span className="br-gc-dot" style={{ background: PIE_COLORS[0] }} />
                            <div>
                              <div className="br-gc-stat-label">Achieved</div>
                              <div className="br-gc-stat-val">{fmt(r.achieved)}</div>
                            </div>
                          </div>
                          <div className="br-gc-stat">
                            <span className="br-gc-dot" style={{ background: PIE_COLORS[1] }} />
                            <div>
                              <div className="br-gc-stat-label">Balance</div>
                              <div className="br-gc-stat-val">{fmt(r.balance)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Footer actions */}
                        <div className="br-gc-footer">
                          <button className="br-pie-btn" onClick={() => setPieReport(r)} title="View full pie chart"><PieIcon /></button>
                          <div className="br-actions">
                            <button className="br-edit-btn" onClick={() => openEdit(r)}>Edit</button>
                            <button className="br-del-btn"  onClick={() => handleDelete(r.id)}>Delete</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
          }

          <Pagination total={totalFiltered} page={page} pageSize={10} onChange={setPage} />
        </div>
      </div>

      {/* New / Edit modal */}
      <BudgetReportModal
        isOpen={modalOpen} onClose={close}
        onSave={handleSave} editReport={editReport}
      />

      {/* Pie chart modal */}
      <PieChartModal
        isOpen={!!pieReport} onClose={() => setPieReport(null)}
        report={pieReport}
      />
    </DashboardLayout>
  )
}

/* ── Icons ── */
function XIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function PlusIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function SearchIcon(){ return <svg className="br-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function ListIcon()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> }
function GridIcon()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> }
function PieIcon()   {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" fill="none"/>
      <path d="M22 12A10 10 0 0 0 12 2v10z" fill="currentColor" opacity="0.3"/>
    </svg>
  )
}
