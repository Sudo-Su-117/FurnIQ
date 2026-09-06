import React, { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import JournalEntryModal from './JournalEntryModal'
import Pagination, { usePagination } from '../../components/Pagination'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import './JournalEntriesPage.css'

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

import { api, extractList } from '../../services/api'

export default function JournalEntriesPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [entries,      setEntries]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editEntry,    setEditEntry]    = useState(null)

  const loadEntries = useCallback(() => {
    setLoading(true)
    api.accounting.getJournalEntries({ limit: 100 })
      .then(res => {
        const list = extractList(res)
        const mapped = list.map(e => {
          // Determine partner: check line descriptions or fallback to reference / General
          const linePartners = (e.lines || [])
            .map(l => l.description)
            .filter(Boolean)
          const primaryPartner = linePartners[0] || e.reference || 'General'

          return {
            ...e,
            id:      e.id,
            number:  e.entryNumber || e.id,
            date:    e.date ? new Date(e.date).toISOString().split('T')[0] : '',
            partner: primaryPartner,
            reference: e.reference || '',
            journal: e.journal?.name || 'General Journal',
            journalId: e.journalId || e.journal?.id || '',
            total:   e.lines ? e.lines.reduce((s, l) => s + Number(l.debit || 0), 0) : 0,
            status:  'Posted',
            lines:   (e.lines || []).map(l => ({
              accountId:   l.accountId,
              account:     l.account?.name || '',
              accountCode: l.account?.code || '',
              partner:     l.description || '',
              debit:       l.debit || 0,
              credit:      l.credit || 0,
            })),
          }
        })
        setEntries(mapped)
      })
      .catch(err => console.warn('Could not load live journal entries:', err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadEntries() }, [loadEntries])

  const filtered = entries.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      String(e.number).toLowerCase().includes(q) ||
      String(e.partner).toLowerCase().includes(q) ||
      String(e.journal).toLowerCase().includes(q) ||
      String(e.date).toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || e.status === statusFilter
    return matchSearch && matchStatus
  })

  const { page, setPage, paged, total: totalFiltered } = usePagination(filtered, 10)

  const openNew  = ()  => { setEditEntry(null); setModalOpen(true) }
  const openEdit = (e) => { setEditEntry(e);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false); setEditEntry(null) }

  const handleSave = (data) => {
    loadEntries()
    toast.success(data?.status === 'Posted' ? 'Journal entry posted successfully!' : 'Journal entry draft saved successfully!')
    close()
  }

  const handleDelete = async (id, ref) => {
    const ok = await confirm({
      title: 'Delete Journal Entry',
      message: `Are you sure you want to delete journal entry "${ref || id}"?`,
      detail: 'This will reverse and remove the debit/credit lines associated with this entry.',
      confirmText: 'Delete Entry',
      confirmVariant: 'danger',
    })
    if (ok) {
      try {
        await api.accounting.deleteJournalEntry(id)
        toast.info(`Journal entry ${ref || id} deleted`)
        loadEntries()
      } catch (err) {
        toast.error(err.message || 'Failed to delete journal entry.')
      }
    }
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
          {loading
            ? <div className="je-empty">Loading journal entries…</div>
            : filtered.length === 0
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
                  {paged.map(entry => (
                    <tr key={entry.id} className="je-tr">
                      <td className="je-date">{entry.date}</td>
                      <td>
                        <button className="je-number-link" onClick={() => openEdit(entry)}>
                          {entry.number}
                        </button>
                      </td>
                      <td>{entry.partner}</td>
                      <td>
                        <span className={`je-journal-badge je-journal--${entry.journal.toLowerCase().replace(/\s+/g,'-')}`}>
                          {entry.journal}
                        </span>
                      </td>
                      <td className="align-right je-total">{fmt(entry.total)}</td>
                      <td className="align-center">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td>
                        <div className="je-actions">
                          <button className="je-edit-btn" onClick={() => openEdit(entry)}>Edit</button>
                          <button className="je-del-btn"  onClick={() => handleDelete(entry.id, entry.number || entry.reference)}>Delete</button>
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
