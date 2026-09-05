import React, { useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import NewAccountModal from './NewAccountModal'
import './ChartOfAccountsPage.css'

/* ─── Pre-configured accounts ─── */
const INITIAL_ACCOUNTS = [
  /* ASSET */
  { code: '1001', name: 'HDFC Bank – Current Account', group: 'ASSET',     type: 'Bank',           status: 'Asset'    },
  { code: '1002', name: 'Petty Cash',                  group: 'ASSET',     type: 'Cash',           status: 'Asset'    },
  { code: '1003', name: 'Accounts Receivable (Debtors)',group: 'ASSET',     type: 'Asset',          status: 'Asset'    },
  { code: '1004', name: 'Inventory – Furniture',       group: 'ASSET',     type: 'Asset',          status: 'Asset'    },
  { code: '1005', name: 'Workshop Equipment',          group: 'ASSET',     type: 'Asset',          status: 'Asset'    },
  /* LIABILITY */
  { code: '2001', name: 'Accounts Payable (Creditors)',group: 'LIABILITY', type: 'Liability',      status: 'Liability'},
  { code: '2002', name: 'GST Payable',                 group: 'LIABILITY', type: 'Liability',      status: 'Liability'},
  { code: '2003', name: 'Short-term Loan – HDFC',      group: 'LIABILITY', type: 'Liability',      status: 'Liability'},
  /* INCOME */
  { code: '3001', name: 'Furniture Sales Income',      group: 'INCOME',    type: 'Income',         status: 'Income'   },
  { code: '3002', name: 'Service Revenue',             group: 'INCOME',    type: 'Income',         status: 'Income'   },
  /* EXPENSE */
  { code: '4001', name: 'Cost of Goods Sold',          group: 'EXPENSE',   type: 'Expenses',       status: 'Expense'  },
  { code: '4002', name: 'Workshop Rent',               group: 'EXPENSE',   type: 'Expenses',       status: 'Expense'  },
  { code: '4003', name: 'Salaries & Wages',            group: 'EXPENSE',   type: 'Expenses',       status: 'Expense'  },
  { code: '4004', name: 'Utilities & Power',           group: 'EXPENSE',   type: 'Other Expenses', status: 'Expense'  },
  { code: '4005', name: 'Marketing & Advertising',     group: 'EXPENSE',   type: 'Other Expenses', status: 'Expense'  },
  /* CAPITAL */
  { code: '5001', name: "Owner's Capital",             group: 'CAPITAL',   type: 'Capital',        status: 'Capital'  },
  { code: '5002', name: 'Retained Earnings',           group: 'CAPITAL',   type: 'Capital',        status: 'Capital'  },
]

const GROUP_ORDER = ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'CAPITAL']

/* Next code per group prefix */
const GROUP_PREFIX = { ASSET: '1', LIABILITY: '2', INCOME: '3', EXPENSE: '4', CAPITAL: '5' }
function nextCode(group, accounts) {
  const prefix = GROUP_PREFIX[group] || '9'
  const nums = accounts
    .filter(a => a.group === group)
    .map(a => parseInt(a.code, 10))
    .filter(n => !isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : parseInt(prefix + '001', 10)
  return String(next)
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts]     = useState(INITIAL_ACCOUNTS)
  const [search,   setSearch]       = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editAccount, setEditAccount] = useState(null)

  /* filter */
  const q = search.toLowerCase()
  const filtered = accounts.filter(a =>
    !search ||
    a.name.toLowerCase().includes(q) ||
    a.code.includes(q) ||
    a.type.toLowerCase().includes(q) ||
    a.group.toLowerCase().includes(q)
  )

  /* group filtered rows */
  const grouped = GROUP_ORDER.reduce((acc, g) => {
    const rows = filtered.filter(a => a.group === g)
    if (rows.length) acc[g] = rows
    return acc
  }, {})

  const openAdd  = ()  => { setEditAccount(null); setModalOpen(true) }
  const openEdit = (a) => { setEditAccount(a);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false);  setEditAccount(null) }

  const handleSave = (data) => {
    if (editAccount) {
      setAccounts(prev => prev.map(a => a.code === editAccount.code ? { ...a, ...data } : a))
    } else {
      const code = nextCode(data.group, accounts)
      setAccounts(prev => [...prev, { code, ...data }])
    }
    close()
  }

  const handleArchive = (code) => {
    if (window.confirm('Archive this account?'))
      setAccounts(prev => prev.filter(a => a.code !== code))
  }

  const totalCount = accounts.length

  return (
    <DashboardLayout>
      <div className="coa-page">
        {/* Breadcrumb */}
        <div className="coa-breadcrumb">Master Data <span>›</span> Chart of Accounts</div>

        {/* Header */}
        <div className="coa-header">
          <div>
            <h1 className="coa-title">Chart of Accounts</h1>
            <p className="coa-subtitle">{totalCount} accounts in {GROUP_ORDER.length} types</p>
          </div>
          <div className="coa-header-right">
            <div className="coa-search-wrap">
              <SearchIcon />
              <input className="coa-search" type="search" placeholder="Search accounts..."
                value={search} onChange={e => setSearch(e.target.value)} aria-label="Search accounts" />
            </div>
            <button className="coa-add-btn" onClick={openAdd}>
              <PlusIcon /> Add Account
            </button>
          </div>
        </div>

        {/* ── Grouped table ── */}
        <div className="coa-card">
          {Object.keys(grouped).length === 0
            ? <div className="coa-empty">No accounts found.</div>
            : Object.entries(grouped).map(([group, rows]) => (
              <div key={group} className={`coa-group coa-group--${group.toLowerCase()}`}>
                {/* Group header */}
                <div className="coa-group-header">
                  <span className="coa-group-label">{group}</span>
                  <span className="coa-group-count">{rows.length}</span>
                </div>

                {/* Rows */}
                {rows.map((acc, i) => (
                  <div key={acc.code}
                    className={`coa-row${i % 2 === 1 ? ' coa-row--alt' : ''}`}>
                    <div className="coa-row-left">
                      <span className="coa-code">{acc.code}</span>
                      <span className="coa-name">{acc.name}</span>
                    </div>
                    <div className="coa-row-right">
                      <span className={`coa-type-badge coa-type--${acc.type.toLowerCase().replace(/\s+/g,'-')}`}>
                        {acc.type}
                      </span>
                      <button className="coa-edit-btn" onClick={() => openEdit(acc)}>Edit</button>
                      <button className="coa-archive-btn" onClick={() => handleArchive(acc.code)}>Archive</button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          }
        </div>

        <div className="coa-footer-count">
          Showing {filtered.length} of {totalCount} accounts
        </div>
      </div>

      <NewAccountModal
        isOpen={modalOpen} onClose={close}
        onSave={handleSave} editAccount={editAccount}
      />
    </DashboardLayout>
  )
}

function SearchIcon() {
  return <svg className="coa-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
