import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import DataTable from '../../components/DataTable'
import '../sales/SalesPage.css'

const ORDERS = [
  { id: 'PO-001', vendorId: 'VEND-001', vendor: 'Timber World',      date: '1 Sept 2026', subtotal: 62000,  tax: 11160, total: 73160,  status: 'Confirmed' },
  { id: 'PO-002', vendorId: 'VEND-002', vendor: 'Steel Hub',         date: '2 Sept 2026', subtotal: 38500,  tax: 6930,  total: 45430,  status: 'Confirmed' },
  { id: 'PO-003', vendorId: 'VEND-003', vendor: 'Fabric Co.',        date: '3 Sept 2026', subtotal: 91000,  tax: 16380, total: 107380, status: 'Draft'     },
]

const BILLS = [
  { id: 'BILL-001', vendorId: 'VEND-001', vendor: 'Timber World',    date: '2 Sept 2026', subtotal: 62000,  tax: 11160, total: 73160,  status: 'Confirmed' },
  { id: 'BILL-002', vendorId: 'VEND-002', vendor: 'Steel Hub',       date: '3 Sept 2026', subtotal: 38500,  tax: 6930,  total: 45430,  status: 'Confirmed' },
  { id: 'BILL-003', vendorId: 'VEND-003', vendor: 'Fabric Co.',      date: '4 Sept 2026', subtotal: 91000,  tax: 16380, total: 107380, status: 'Draft'     },
]

const PAYMENTS = [
  { id: 'PPAY-001', vendorId: 'VEND-001', vendor: 'Timber World',   date: '3 Sept 2026', subtotal: 73160,  tax: 0, total: 73160,  status: 'Confirmed' },
  { id: 'PPAY-002', vendorId: 'VEND-002', vendor: 'Steel Hub',      date: '4 Sept 2026', subtotal: 45430,  tax: 0, total: 45430,  status: 'Confirmed' },
  { id: 'PPAY-003', vendorId: 'VEND-003', vendor: 'Fabric Co.',     date: '5 Sept 2026', subtotal: 107380, tax: 0, total: 107380, status: 'Draft'     },
]

const TABS = [
  { key: 'orders',   label: 'Purchase Orders', data: ORDERS,   orderLabel: 'ORDER NO.' },
  { key: 'bills',    label: 'Purchase Bills',  data: BILLS,    orderLabel: 'BILL NO.'  },
  { key: 'payments', label: 'Payment',         data: PAYMENTS, orderLabel: 'PAYMENT NO.' },
]

const fmt = (n) => n === 0 ? '—' : `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function PurchasePage() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const activeIdx = TABS.findIndex(t => t.key === tab)
  const currentTab = activeIdx >= 0 ? activeIdx : 0
  const { data, orderLabel } = TABS[currentTab]
  const [search, setSearch] = useState('')

  const filtered = data.filter(row =>
    Object.values(row).some(v =>
      String(v).toLowerCase().includes(search.toLowerCase())
    )
  )

  const handleTabClick = (idx) => {
    navigate(`/dashboard/purchase/${TABS[idx].key}`)
    setSearch('')
  }

  const columns = [
    { key: 'id',       label: orderLabel,   width: '120px' },
    { key: 'vendorId', label: 'VENDOR ID',  width: '110px' },
    { key: 'vendor',   label: 'VENDOR',     bold: true },
    { key: 'date',     label: 'DATE',       width: '120px' },
    { key: 'subtotal', label: 'SUBTOTAL',   align: 'right', render: fmt },
    { key: 'tax',      label: 'TAX AMOUNT', align: 'right', render: fmt },
    { key: 'total',    label: 'TOTAL',      align: 'right', render: fmt, bold: true },
    { key: 'status',   label: 'STATUS',     align: 'center', render: (v) => <StatusBadge status={v} /> },
  ]

  return (
    <DashboardLayout>
      <div className="sp-page">
        <div className="sp-breadcrumb">Purchase</div>
        <div className="sp-header">
          <h1 className="sp-title">Purchase</h1>
          <p className="sp-subtitle">Orders, bills, and payments</p>
        </div>

        <div className="sp-tabs">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              className={`sp-tab${currentTab === i ? ' sp-tab--active' : ''}`}
              onClick={() => handleTabClick(i)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="sp-card">
          <div className="sp-search-wrap">
            <SearchIcon />
            <input
              className="sp-search"
              type="search"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search records"
            />
          </div>
          <DataTable columns={columns} rows={filtered} />
          <div className="sp-footer">
            <span className="sp-count">Showing 1–{filtered.length} of {data.length}</span>
            <div className="sp-pagination">
              <button className="sp-page-btn sp-page-btn--active" aria-current="page">1</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function StatusBadge({ status }) {
  const cls = status === 'Confirmed' ? 'badge-confirmed' : 'badge-draft'
  return <span className={`status-badge ${cls}`}>{status}</span>
}
function SearchIcon() {
  return <svg className="sp-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
