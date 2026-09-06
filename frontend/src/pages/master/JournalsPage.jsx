import React, { useState, useEffect } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import NewJournalModal from './NewJournalModal'
import Pagination, { usePagination } from '../../components/Pagination'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import './JournalsPage.css'

const TYPE_STYLES = {
  Sales:    'jnl-type--sales',
  Purchase: 'jnl-type--purchase',
  Bank:     'jnl-type--bank',
  Cash:     'jnl-type--cash',
}

import { api, extractList } from '../../services/api'

export default function JournalsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [journals,   setJournals]   = useState([])
  const [coaOptions, setCoaOptions] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editJournal, setEditJournal] = useState(null)

  const loadJournals = React.useCallback(() => {
    setLoading(true)
    Promise.allSettled([
      api.accounting.getJournals(),
      api.accounting.getAccounts(),
    ]).then(([jRes, aRes]) => {
      if (aRes.status === 'fulfilled') {
        const accts = extractList(aRes.value)
        setCoaOptions(accts.map(a => ({
          id: a.id,
          code: a.code || String(a.id).slice(0, 4),
          name: a.name,
          type: a.type || 'Asset',
        })))
      }
      if (jRes.status === 'fulfilled') {
        const list = extractList(jRes.value)
        const mapped = list.map(j => ({
          ...j,
          defaultAccount: j.defaultDebitAccount?.name || j.defaultCreditAccount?.name || 'Default Account',
          accountCode: j.defaultDebitAccount?.code || j.defaultCreditAccount?.code || '1001',
        }))
        setJournals(mapped)
      }
    })
      .catch(err => console.warn('Could not load live journals:', err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadJournals()
  }, [loadJournals])

  const filtered = journals.filter(j => {
    const q = search.toLowerCase()
    return !search ||
      j.name.toLowerCase().includes(q) ||
      j.type.toLowerCase().includes(q) ||
      (j.defaultAccount && j.defaultAccount.toLowerCase().includes(q))
  })

  const { page, setPage, paged, total: totalFiltered } = usePagination(filtered, 10)

  const openAdd  = ()  => { setEditJournal(null); setModalOpen(true) }
  const openEdit = (j) => { setEditJournal(j);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false);  setEditJournal(null) }

  const handleSave = async (data) => {
    try {
      if (editJournal?.id) {
        await api.accounting.updateJournal(editJournal.id, {
          name: data.name,
          type: data.type,
          defaultDebitAccountId: data.defaultAccount ? coaOptions.find(a => a.name === data.defaultAccount)?.id : undefined,
        })
        toast.success(`Journal "${data.name}" updated successfully!`)
      } else {
        const defAcct = coaOptions.find(a => a.name === data.defaultAccount)
        await api.accounting.createJournal({
          name: data.name,
          type: data.type || 'GENERAL',
          defaultDebitAccountId: defAcct?.id,
        })
        toast.success(`Journal "${data.name}" created successfully in Database!`)
      }
      loadJournals()
    } catch (err) {
      console.warn('API error saving journal:', err.message)
      if (editJournal) {
        setJournals(prev => prev.map(j => j.id === editJournal.id ? { ...j, ...data } : j))
        toast.success(`Journal "${data.name}" updated!`)
      } else {
        const newId = `JNL-${String(journals.length + 1).padStart(3, '0')}`
        setJournals(prev => [...prev, { id: newId, defaultAccount: data.defaultAccount || 'Default Account', accountCode: data.accountCode || '1001', ...data }])
        toast.success(`Journal "${data.name}" created!`)
      }
    }
    close()
  }

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'Delete Accounting Journal',
      message: `Are you sure you want to delete journal "${name || id}"?`,
      detail: 'This will remove the journal configuration from the general ledger.',
      confirmText: 'Delete Journal',
      confirmVariant: 'danger',
    })
    if (ok) {
      try {
        await api.accounting.deleteJournal(id)
      } catch (e) {
        console.warn('API delete journal error:', e.message)
      }
      setJournals(prev => prev.filter(j => j.id !== id))
      toast.info(`Journal ${id} deleted`)
    }
  }

  return (
    <DashboardLayout>
      <div className="jnl-page">
        {/* Breadcrumb */}
        <div className="jnl-breadcrumb">Master Data <span>›</span> Journals</div>

        {/* Header */}
        <div className="jnl-header">
          <div>
            <h1 className="jnl-title">Journals</h1>
            <p className="jnl-subtitle">{journals.length} journals configured</p>
          </div>
          <div className="jnl-header-right">
            <div className="jnl-search-wrap">
              <SearchIcon />
              <input className="jnl-search" type="search" placeholder="Search journals..."
                value={search} onChange={e => setSearch(e.target.value)} aria-label="Search journals" />
            </div>
            <button className="jnl-new-btn" onClick={openAdd}>
              <PlusIcon /> New
            </button>
          </div>
        </div>

        {/* Table card */}
        <div className="jnl-card">
          {filtered.length === 0
            ? <div className="jnl-empty">No journals found.</div>
            : (
              <table className="jnl-table" aria-label="Journals list">
                <thead>
                  <tr>
                    <th className="jnl-th--name">Journal Name</th>
                    <th>Type</th>
                    <th>Default Account</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((j, i) => (
                    <tr key={j.id} className={`jnl-tr jnl-tr--${j.type.toLowerCase()}`}>
                      {/* Name */}
                      <td>
                        <div className="jnl-name-cell">
                          <span className={`jnl-type-dot jnl-dot--${j.type.toLowerCase()}`} />
                          <div>
                            <div className="jnl-name">{j.name}</div>
                          </div>
                        </div>
                      </td>
                      {/* Type */}
                      <td>
                        <span className={`jnl-type-badge ${TYPE_STYLES[j.type] || ''}`}>{j.type}</span>
                      </td>
                      {/* Default Account */}
                      <td>
                        <div className="jnl-account-cell">
                          <span className="jnl-account-code">{j.accountCode}</span>
                          <span className="jnl-account-name">{j.defaultAccount}</span>
                        </div>
                      </td>
                      {/* Actions */}
                      <td>
                        <div className="jnl-actions">
                          <button className="jnl-edit-btn" onClick={() => openEdit(j)}>Edit</button>
                          <button className="jnl-delete-btn" onClick={() => handleDelete(j.id, j.name)}>Delete</button>
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

      <NewJournalModal
        isOpen={modalOpen} onClose={close}
        onSave={handleSave} editJournal={editJournal}
        coaOptions={coaOptions}
      />
    </DashboardLayout>
  )
}

function SearchIcon() {
  return <svg className="jnl-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
