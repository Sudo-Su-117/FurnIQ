import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import DataTable from '../../components/DataTable'
import Pagination, { usePagination } from '../../components/Pagination'
import './SalesPage.css'

/* ---- Mock data ---- */
const SALES_ORDERS = [
  { id: 'S00001', customerId: 'CUST-001', customer: 'Ratan Mehra',    date: '1 Sept 2026',  subtotal: 48000,   tax: 8640,   total: 56640,   status: 'Confirmed' },
  { id: 'S00002', customerId: 'CUST-003', customer: 'Priya Kapoor',   date: '3 Sept 2026',  subtotal: 107500,  tax: 19350,  total: 126850,  status: 'Confirmed' },
  { id: 'S00003', customerId: 'CUST-004', customer: 'Mahindra Living', date: '4 Sept 2026', subtotal: 202000,  tax: 25440,  total: 227440,  status: 'Draft'     },
]

const INVOICES = [
  { id: 'INV-001', customerId: 'CUST-001', customer: 'Ratan Mehra',    date: '1 Sept 2026',  subtotal: 48000,   tax: 8640,   total: 56640,   status: 'Confirmed' },
  { id: 'INV-002', customerId: 'CUST-003', customer: 'Priya Kapoor',   date: '3 Sept 2026',  subtotal: 107500,  tax: 19350,  total: 126850,  status: 'Confirmed' },
  { id: 'INV-003', customerId: 'CUST-004', customer: 'Mahindra Living', date: '5 Sept 2026', subtotal: 202000,  tax: 25440,  total: 227440,  status: 'Draft'     },
]

const PAYMENTS = [
  { id: 'PAY-001', customerId: 'CUST-001', customer: 'Ratan Mehra',    date: '2 Sept 2026',  subtotal: 56640,  tax: 0,  total: 56640,   status: 'Confirmed' },
  { id: 'PAY-002', customerId: 'CUST-003', customer: 'Priya Kapoor',   date: '4 Sept 2026',  subtotal: 126850, tax: 0,  total: 126850,  status: 'Confirmed' },
  { id: 'PAY-003', customerId: 'CUST-004', customer: 'Mahindra Living', date: '6 Sept 2026', subtotal: 227440, tax: 0,  total: 227440,  status: 'Draft'     },
]

const TABS = [
  { key: 'orders',   label: 'Sales Orders',      data: SALES_ORDERS, orderLabel: 'ORDER NO.' },
  { key: 'invoices', label: 'Customer Invoices',  data: INVOICES,     orderLabel: 'INVOICE NO.' },
  { key: 'payments', label: 'Invoice Payments',   data: PAYMENTS,     orderLabel: 'PAYMENT NO.' },
]

const fmt = (n) => n === 0 ? '—' : `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function SalesPage() {
  const { tab } = useParams()
  const navigate = useNavigate()

  // resolve active tab from URL param or default
  const activeIdx = TABS.findIndex(t => t.key === tab)
  const currentTab = activeIdx >= 0 ? activeIdx : 0
  const { data, orderLabel } = TABS[currentTab]

  const [search, setSearch] = useState('')

  const filtered = data.filter(row =>
    Object.values(row).some(v =>
      String(v).toLowerCase().includes(search.toLowerCase())
    )
  )

  const { page, setPage, paged, total } = usePagination(filtered, 10)

  const handleTabClick = (idx) => {
    navigate(`/dashboard/sales/${TABS[idx].key}`)
    setSearch('')
  }

  const columns = [
    { key: 'id',         label: orderLabel,   width: '120px' },
    { key: 'customerId', label: 'CUSTOMERID', width: '110px' },
    { key: 'customer',   label: 'CUSTOMER',   bold: true },
    { key: 'date',       label: 'DATE',       width: '120px' },
    { key: 'subtotal',   label: 'SUBTOTAL',   align: 'right', render: fmt },
    { key: 'tax',        label: 'TAX AMOUNT', align: 'right', render: fmt },
    { key: 'total',      label: 'TOTAL',      align: 'right', render: fmt, bold: true },
    { key: 'status',     label: 'STATUS',     align: 'center', render: (v) => <StatusBadge status={v} /> },
  ]

  return (
    <DashboardLayout>
      <div className="sp-page">
        {/* Breadcrumb */}
        <div className="sp-breadcrumb">Sales</div>

        {/* Page title */}
        <div className="sp-header">
          <h1 className="sp-title">Sales</h1>
          <p className="sp-subtitle">Orders, invoices, and payments</p>
        </div>

        {/* Tab navigation */}
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

        {/* Table card */}
        <div className="sp-card">
          {/* Search */}
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

          {/* Table */}
          <DataTable columns={columns} rows={paged} />

          {/* Footer */}
          <Pagination total={total} page={page} pageSize={10} onChange={setPage} />
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
  return (
    <svg className="sp-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
