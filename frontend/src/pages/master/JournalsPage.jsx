import React, { useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import NewJournalModal from './NewJournalModal'
import './JournalsPage.css'

/* Pre-configured journals */
const INITIAL_JOURNALS = [
  { id: 'JNL-001', name: 'Sales',    type: 'Sales',    defaultAccount: 'Furniture Sales Income',      accountCode: '3001' },
  { id: 'JNL-002', name: 'Purchase', type: 'Purchase', defaultAccount: 'Cost of Goods Sold',          accountCode: '4001' },
  { id: 'JNL-003', name: 'Bank',     type: 'Bank',     defaultAccount: 'HDFC Bank – Current Account', accountCode: '1001' },
  { id: 'JNL-004', name: 'Cash',     type: 'Cash',     defaultAccount: 'Petty Cash',                  accountCode: '1002' },
]

/* Chart of Accounts options for Default Account dropdown */
export const COA_OPTIONS = [
  { code: '1001', name: 'HDFC Bank – Current Account',  type: 'Bank'     },
  { code: '1002', name: 'Petty Cash',                   type: 'Cash'     },
  { code: '1003', name: 'Accounts Receivable (Debtors)',type: 'Asset'    },
  { code: '1004', name: 'Inventory – Furniture',        type: 'Asset'    },
  { code: '1005', name: 'Workshop Equipment',           type: 'Asset'    },
  { code: '2001', name: 'Accounts Payable (Creditors)', type: 'Liability'},
  { code: '2002', name: 'GST Payable',                  type: 'Liability'},
  { code: '2003', name: 'Short-term Loan – HDFC',       type: 'Liability'},
  { code: '3001', name: 'Furniture Sales Income',       type: 'Income'   },
  { code: '3002', name: 'Service Revenue',              type: 'Income'   },
  { code: '4001', name: 'Cost of Goods Sold',           type: 'Expenses' },
  { code: '4002', name: 'Workshop Rent',                type: 'Expenses' },
  { code: '4003', name: 'Salaries & Wages',             type: 'Expenses' },
  { code: '4004', name: 'Utilities & Power',            type: 'Other Expenses'},
  { code: '4005', name: 'Marketing & Advertising',      type: 'Other Expenses'},
  { code: '5001', name: "Owner's Capital",              type: 'Capital'  },
  { code: '5002', name: 'Retained Earnings',            type: 'Capital'  },
]

const TYPE_STYLES = {
  Sales:    'jnl-type--sales',
  Purchase: 'jnl-type--purchase',
  Bank:     'jnl-type--bank',
  Cash:     'jnl-type--cash',
}

function nextId(journals) {
  const nums = journals.map(j => parseInt(j.id.replace('JNL-', ''), 10)).filter(n => !isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `JNL-${String(next).padStart(3, '0')}`
}

export default function JournalsPage() {
  const [journals, setJournals]       = useState(INITIAL_JOURNALS)
  const [search, setSearch]           = useState('')
  const [modalOpen, setModalOpen]     = useState(false)
  const [editJournal, setEditJournal] = useState(null)

  const filtered = journals.filter(j => {
    const q = search.toLowerCase()
    return !search ||
      j.name.toLowerCase().includes(q) ||
      j.type.toLowerCase().includes(q) ||
      j.defaultAccount.toLowerCase().includes(q)
  })

  const openAdd  = ()  => { setEditJournal(null); setModalOpen(true) }
  const openEdit = (j) => { setEditJournal(j);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false);  setEditJournal(null) }

  const handleSave = (data) => {
    if (editJournal) {
      setJournals(prev => prev.map(j => j.id === editJournal.id ? { ...j, ...data } : j))
    } else {
      setJournals(prev => [...prev, { id: nextId(prev), ...data }])
    }
    close()
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this journal?'))
      setJournals(prev => prev.filter(j => j.id !== id))
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
                  {filtered.map((j, i) => (
                    <tr key={j.id} className={`jnl-tr jnl-tr--${j.type.toLowerCase()}`}>
                      {/* Name */}
                      <td>
                        <div className="jnl-name-cell">
                          <span className={`jnl-type-dot jnl-dot--${j.type.toLowerCase()}`} />
                          <div>
                            <div className="jnl-name">{j.name}</div>
                            <div className="jnl-id">{j.id}</div>
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
                          <button className="jnl-delete-btn" onClick={() => handleDelete(j.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }

          <div className="jnl-footer">
            <span className="jnl-count">Showing {filtered.length} of {journals.length}</span>
          </div>
        </div>
      </div>

      <NewJournalModal
        isOpen={modalOpen} onClose={close}
        onSave={handleSave} editJournal={editJournal}
        coaOptions={COA_OPTIONS}
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
