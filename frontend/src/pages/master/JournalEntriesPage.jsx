import React, { useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import JournalEntryModal from './JournalEntryModal'
import './JournalEntriesPage.css'

/* ── Mock data ── */
const INITIAL_ENTRIES = [
  {
    id: 'JE-001',
    number: 'Bill/2026/0001',
    date: 'Sep 1, 2026',
    partner: 'Mr. Rahul',
    journal: 'Purchase',
    total: 30000,
    status: 'Posted',
    accountingDate: '2026-09-01',
    journalId: 'JNL-002',
    lines: [
      { account: 'Cost of Goods Sold',           accountCode: '4001', partner: 'Mr. Rahul', debit: 30000, credit: 0 },
      { account: 'Accounts Payable (Creditors)', accountCode: '2001', partner: '',          debit: 0,     credit: 30000 },
    ]
  },
  {
    id: 'JE-002',
    number: 'Inv/2026/001',
    date: 'Sep 2, 2026',
    partner: 'Mr. Raj',
    journal: 'Sales',
    total: 10500,
    status: 'Draft',
    accountingDate: '2026-09-02',
    journalId: 'JNL-001',
    lines: [
      { account: 'Accounts Receivable (Debtors)', accountCode: '1003', partner: 'Mr. Raj', debit: 10500, credit: 0 },
      { account: 'Furniture Sales Income',        accountCode: '3001', partner: '',         debit: 0,     credit: 10500 },
    ]
  },
]

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

let entryCounter = INITIAL_ENTRIES.length + 1
function nextId() { return `JE-${String(entryCounter++).padStart(3, '0')}` }

export default function JournalEntriesPage() {
  const [entries,     setEntries]     = useState(INITIAL_ENTRIES)
  const [search,      setSearch]      = useState('')
  const [statusFilter,setStatusFilter]= useState('All')
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editEntry,   setEditEntry]   = useState(null)

  const filtered = entries.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      e.number.toLowerCase().includes(q) ||
      e.partner.toLowerCase().includes(q) ||
      e.journal.toLowerCase().includes(q) ||
      e.date.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || e.status === statusFilter
    return matchSearch && matchStatus
  })

  const openNew  = ()  => { setEditEntry(null); setModalOpen(true) }
  const openEdit = (e) => { setEditEntry(e);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false); setEditEntry(null) }

  const handleSave = (data) => {
    const totalDebit = data.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
    if (editEntry) {
      setEntries(prev => prev.map(e =>
        e.id === editEntry.id ? { ...e, ...data, total: totalDebit } : e
      ))
    } else {
      const id = nextId()
      const num = `JE/2026/${String(entryCounter - 1).padStart(3, '0')}`
      setEntries(prev => [...prev, { id, number: num, total: totalDebit, status: 'Draft', ...data }])
    }
    close()
  }

  const handlePost = (id) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'Posted' } : e))
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this journal entry?'))
      setEntries(prev => prev.filter(e => e.id !== id))
  }

  return (
    <DashboardLayout>
      <div className="je-page">
        <div className="je-breadcrumb">Master Data <span>›</span> Journal Entries</div>

        {/* Header */}
        <div className="je-header">
          <div>
            <h1 className="je-title">Journal Entries</h1>
            <p className="je-subtitle">{entries.length} entries recorded</p>
          </div>
          <div className="je-header-right">
            <div className="je-search-wrap">
              <SearchIcon />
              <input className="je-search" type="search" placeholder="Search entries..."
                value={search} onChange={e => setSearch(e.target.value)} aria-label="Search" />
            </div>
            <select className="je-filter" value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
              {['All','Draft','Posted'].map(s => <option key={s}>{s}</option>)}
            </select>
            <button className="je-new-btn" onClick={openNew}>
              <PlusIcon /> New Entry
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="je-card">
          {filtered.length === 0
            ? <div className="je-empty">No journal entries found.</div>
            : (
              <table className="je-table" aria-label="Journal entries">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Number</th>
                    <th>Partner</th>
                    <th>Journal</th>
                    <th className="align-right">Total</th>
                    <th className="align-center">Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(entry => (
                    <tr key={entry.id} className="je-tr">
                      <td className="je-date">{entry.date}</td>
                      <td>
                        <button className="je-number-link" onClick={() => openEdit(entry)}>
                          {entry.number}
                        </button>
                      </td>
                      <td>{entry.partner}</td>
                      <td>
                        <span className={`je-journal-badge je-journal--${entry.journal.toLowerCase()}`}>
                          {entry.journal}
                        </span>
                      </td>
                      <td className="align-right je-total">{fmt(entry.total)}</td>
                      <td className="align-center">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td>
                        <div className="je-actions">
                          {entry.status === 'Draft' && (
                            <button className="je-post-btn" onClick={() => handlePost(entry.id)}>Post</button>
                          )}
                          <button className="je-edit-btn" onClick={() => openEdit(entry)}>Edit</button>
                          <button className="je-del-btn"  onClick={() => handleDelete(entry.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
          <div className="je-footer">
            <span className="je-count">Showing {filtered.length} of {entries.length}</span>
            <div className="je-totals-row">
              <span>Total Posted: {fmt(entries.filter(e=>e.status==='Posted').reduce((s,e)=>s+e.total,0))}</span>
            </div>
          </div>
        </div>
      </div>

      <JournalEntryModal
        isOpen={modalOpen} onClose={close}
        onSave={handleSave} editEntry={editEntry}
      />
    </DashboardLayout>
  )
}

function StatusBadge({ status }) {
  return <span className={`je-status-badge je-status--${status.toLowerCase()}`}>{status}</span>
}

function SearchIcon() {
  return <svg className="je-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
