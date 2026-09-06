import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import DataTable from '../../components/DataTable'
import Pagination, { usePagination } from '../../components/Pagination'
import { api, extractList } from '../../services/api'
import './SalesPage.css'

const fmt = (n) => n === 0 ? '—' : `₹${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function SalesPage() {
  const { tab } = useParams()
  const navigate = useNavigate()

  const [orders,   setOrders]   = useState([])
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      api.sales.listOrders({ limit: 100 }),
      api.sales.listInvoices({ limit: 100 }),
      api.payments.list({ limit: 100 }),
    ]).then(([ordersRes, invRes, payRes]) => {
      const customerMap = new Map()
      let cCounter = 1
      const formatCustomerId = (c) => {
        if (!c) return 'CUST-001'
        const key = c.id || c.name || String(c)
        if (typeof key === 'string' && key.startsWith('CUST-')) return key
        if (!customerMap.has(key)) {
          customerMap.set(key, `CUST-${String(cCounter++).padStart(3, '0')}`)
        }
        return customerMap.get(key)
      }

      if (ordersRes.status === 'fulfilled') {
        const list = extractList(ordersRes.value)
        setOrders(list.map(o => ({
          id: o.orderNumber || o.id,
          customerId: formatCustomerId(o.customer),
          customer: o.customer?.name || 'Customer',
          date: o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
          subtotal: Number(o.totalAmount || 0),
          tax: 0,
          total: Number(o.totalAmount || 0),
          status: o.status === 'CONFIRMED' ? 'Confirmed' : 'Draft',
        })))
      }
      if (invRes.status === 'fulfilled') {
        const list = extractList(invRes.value)
        setInvoices(list.map(inv => ({
          id: inv.invoiceNumber || inv.id,
          customerId: formatCustomerId(inv.customer),
          customer: inv.customer?.name || 'Customer',
          date: inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
          subtotal: Number(inv.totalAmount || 0),
          tax: 0,
          total: Number(inv.totalAmount || 0),
          status: inv.status === 'PAID' || inv.status === 'CONFIRMED' ? 'Confirmed' : 'Draft',
        })))
      }
      if (payRes.status === 'fulfilled') {
        const list = extractList(payRes.value)
        const custPays = list.filter(p => p.type === 'CUSTOMER_PAYMENT' || !p.type)
        setPayments(custPays.map(p => ({
          id: p.paymentNumber || p.id,
          customerId: formatCustomerId(p.customerInvoice?.customer),
          customer: p.customerInvoice?.customer?.name || 'Customer',
          date: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
          subtotal: Number(p.amount || 0),
          tax: 0,
          total: Number(p.amount || 0),
          status: 'Confirmed',
        })))
      }
    }).finally(() => setLoading(false))
  }, [])

  const TABS = [
    { key: 'orders',   label: 'Sales Orders',      data: orders,   orderLabel: 'ORDER NO.' },
    { key: 'invoices', label: 'Customer Invoices',  data: invoices, orderLabel: 'INVOICE NO.' },
    { key: 'payments', label: 'Invoice Payments',   data: payments, orderLabel: 'PAYMENT NO.' },
  ]

  // resolve active tab from URL param or default
  const activeIdx = TABS.findIndex(t => t.key === tab)
  const currentTab = activeIdx >= 0 ? activeIdx : 0
  const { data, orderLabel } = TABS[currentTab]

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
          <div>
            <h1 className="sp-title">Sales</h1>
            <p className="sp-subtitle">Orders, invoices, and payments</p>
          </div>
          <button
            className="sp-new-btn"
            onClick={() => {
              if (currentTab === 0) navigate('/dashboard/data/sales-orders')
              else if (currentTab === 1) navigate('/dashboard/data/customer-invoices')
              else navigate('/dashboard/data/invoice-payments')
            }}
          >
            + New {TABS[currentTab]?.label?.slice(0, -1) || 'Record'}
          </button>
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
