import React, { useState, useEffect } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import NewAccountModal from './NewAccountModal'
import Pagination, { usePagination } from '../../components/Pagination'
import './ChartOfAccountsPage.css'

import { api, extractList } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

const GROUP_ORDER = ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'CAPITAL']

const GROUP_LABELS = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  INCOME: 'Income & Revenue',
  EXPENSE: 'Operating Expenses',
  CAPITAL: 'Equity & Capital',
}

const GROUP_DESCRIPTIONS = {
  ASSET: 'Resources owned, cash, bank accounts, inventory, and receivables',
  LIABILITY: 'Obligations, accounts payable, GST payables, and borrowings',
  INCOME: 'Operating revenue from sales, installations, and turnkey projects',
  EXPENSE: 'Purchases, workshop rent, salaries, utilities, and logistics',
  CAPITAL: 'Shareholder equity, promoter funds, and retained reserves',
}

function nextCode(group, accounts = []) {
  const baseMap = { ASSET: 1000, LIABILITY: 2000, CAPITAL: 3000, INCOME: 4000, EXPENSE: 5000 }
  const base = baseMap[group] || 1000
  const groupCodes = accounts
    .filter(a => (a.group || a.type) === group)
    .map(a => parseInt(a.code, 10))
    .filter(n => !isNaN(n) && n >= base && n < base + 1000)
  const max = groupCodes.length ? Math.max(...groupCodes) : base
  return String(max + 1)
}

export default function ChartOfAccountsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [accounts, setAccounts]       = useState([])
  const [loading,  setLoading]        = useState(true)
  const [search,   setSearch]         = useState('')
  const [selectedTab, setSelectedTab] = useState('ALL')
  const [modalOpen, setModalOpen]     = useState(false)
  const [editAccount, setEditAccount] = useState(null)

  const loadAccounts = React.useCallback(() => {
    setLoading(true)
    api.accounting.getAccounts()
      .then(res => {
        const list = extractList(res)
        const mapped = list.map(a => ({
          ...a,
          group: a.group || a.type || 'ASSET',
          code: a.code || String(a.id),
        }))
        setAccounts(mapped)
      })
      .catch(err => console.warn('Could not load live COA:', err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  /* filter by search query */
  const q = search.toLowerCase()
  const filtered = accounts.filter(a =>
    !search ||
    a.name.toLowerCase().includes(q) ||
    a.code.includes(q) ||
    (a.type && a.type.toLowerCase().includes(q)) ||
    (a.group && a.group.toLowerCase().includes(q))
  )

  /* Group counts */
  const counts = GROUP_ORDER.reduce((acc, g) => {
    acc[g] = accounts.filter(a => (a.group || a.type) === g).length
    return acc
  }, {})

  /* Group rows for rendering */
  const activeGroups = selectedTab === 'ALL'
    ? GROUP_ORDER
    : GROUP_ORDER.filter(g => g === selectedTab)

  const grouped = activeGroups.reduce((acc, g) => {
    const rows = filtered.filter(a => (a.group || a.type) === g)
    if (rows.length > 0 || !search) acc[g] = rows
    return acc
  }, {})

  const { page, setPage } = usePagination(filtered, 25)

  const openAdd  = ()  => { setEditAccount(null); setModalOpen(true) }
  const openEdit = (a) => { setEditAccount(a);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false);  setEditAccount(null) }

  const handleSave = async (data) => {
    try {
      if (editAccount?.id) {
        await api.accounting.updateAccount(editAccount.id, {
          name: data.name,
          code: data.code || editAccount.code,
          type: data.group || data.type,
        })
        toast.success(`Account ${editAccount.code} - ${data.name} updated successfully!`)
      } else {
        const code = nextCode(data.group, accounts)
        await api.accounting.createAccount({
          name: data.name,
          code,
          type: data.group || data.type,
        })
        toast.success(`Account ${code} - ${data.name} created successfully in Database!`)
      }
      loadAccounts()
    } catch (err) {
      console.warn('API error saving account:', err.message)
      if (editAccount) {
        setAccounts(prev => prev.map(a => a.code === editAccount.code ? { ...a, ...data } : a))
        toast.success(`Account ${editAccount.code} - ${data.name} updated!`)
      } else {
        const code = nextCode(data.group, accounts)
        setAccounts(prev => [...prev, { code, ...data }])
        toast.success(`Account ${code} - ${data.name} created!`)
      }
    }
    close()
  }

  const handleArchive = async (code, name) => {
    const acc = accounts.find(a => a.code === code)
    const ok = await confirm({
      title: 'Archive General Ledger Account',
      message: `Archive account ${code}${name ? ` - ${name}` : ''}?`,
      detail: 'This account will be archived from new postings. Historical journal entries will remain unchanged.',
      confirmText: 'Archive Account',
      confirmVariant: 'warning',
    })
    if (ok) {
      if (acc?.id) {
        try {
          await api.accounting.deleteAccount(acc.id)
        } catch (e) {
          console.warn('API delete account error:', e.message)
        }
      }
      setAccounts(prev => prev.filter(a => a.code !== code))
      toast.info(`Account ${code} archived`)
    }
  }

  return (
    <DashboardLayout>
      <div className="coa-page">
        {/* Breadcrumb */}
        <div className="coa-breadcrumb">Master Data <span>›</span> Chart of Accounts</div>

        {/* Header */}
        <div className="coa-header">
          <div>
            <h1 className="coa-title">Chart of Accounts</h1>
            <p className="coa-subtitle">{accounts.length} general ledger accounts organized across standard financial statements</p>
          </div>
          <div className="coa-header-right">
            <div className="coa-search-wrap">
              <SearchIcon />
              <input
                className="coa-search"
                type="search"
                placeholder="Search accounts or code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search accounts"
              />
            </div>
            <button className="coa-add-btn" onClick={openAdd}>
              <PlusIcon /> Add Account
            </button>
          </div>
        </div>

        {/* Filter Tabs / KPI Bar */}
        <div className="coa-tabs-bar">
          <button
            className={`coa-tab ${selectedTab === 'ALL' ? 'coa-tab--active' : ''}`}
            onClick={() => setSelectedTab('ALL')}
          >
            All Accounts <span className="coa-tab-count">{accounts.length}</span>
          </button>
          {GROUP_ORDER.map(g => (
            <button
              key={g}
              className={`coa-tab coa-tab--${g.toLowerCase()} ${selectedTab === g ? 'coa-tab--active' : ''}`}
              onClick={() => setSelectedTab(g)}
            >
              {GROUP_LABELS[g] || g} <span className="coa-tab-count">{counts[g] || 0}</span>
            </button>
          ))}
        </div>

        {/* Account Groups List (Clean separated cards with breathing room) */}
        <div className="coa-content-area">
          {loading ? (
            <div className="coa-empty">Loading Chart of Accounts...</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="coa-empty">No accounts match your search query.</div>
          ) : (
            Object.entries(grouped).map(([group, rows]) => (
              <div key={group} className={`coa-group-card coa-group-card--${group.toLowerCase()}`}>
                {/* Group Card Header */}
                <div className="coa-group-header">
                  <div className="coa-group-header-left">
                    <span className="coa-group-tag">{group}</span>
                    <h2 className="coa-group-heading">{GROUP_LABELS[group] || group}</h2>
                    <span className="coa-group-count-pill">{rows.length} {rows.length === 1 ? 'account' : 'accounts'}</span>
                  </div>
                  <span className="coa-group-desc">{GROUP_DESCRIPTIONS[group]}</span>
                </div>

                {/* Structured Table */}
                <div className="coa-table-wrap">
                  <table className="coa-table">
                    <thead>
                      <tr>
                        <th style={{ width: '12%' }}>Code</th>
                        <th style={{ width: '46%' }}>Account Name</th>
                        <th style={{ width: '18%' }}>Category</th>
                        <th style={{ width: '12%' }}>Status</th>
                        <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="coa-no-match">No {group.toLowerCase()} accounts found</td>
                        </tr>
                      ) : (
                        rows.map((acc, i) => (
                          <tr key={acc.code} className={`coa-tr ${i % 2 === 1 ? 'coa-tr--alt' : ''}`}>
                            <td className="coa-td-code">
                              <span className="coa-code-badge">{acc.code}</span>
                            </td>
                            <td className="coa-td-name">
                              <span className="coa-name-text">{acc.name}</span>
                            </td>
                            <td className="coa-td-type">
                              <span className={`coa-type-badge coa-type--${(acc.type || group).toLowerCase().replace(/\s+/g, '-')}`}>
                                {acc.type || group}
                              </span>
                            </td>
                            <td className="coa-td-status">
                              <span className="coa-status-pill">
                                <span className="coa-status-dot" /> Active
                              </span>
                            </td>
                            <td className="coa-td-actions">
                              <button className="coa-edit-btn" onClick={() => openEdit(acc)}>Edit</button>
                              <button className="coa-archive-btn" onClick={() => handleArchive(acc.code, acc.name)}>Archive</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="coa-footer-count">
          Showing {filtered.length} of {accounts.length} total accounts
        </div>
      </div>

      <NewAccountModal
        isOpen={modalOpen}
        onClose={close}
        onSave={handleSave}
        editAccount={editAccount}
      />
    </DashboardLayout>
  )
}

function SearchIcon() {
  return (
    <svg className="coa-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
