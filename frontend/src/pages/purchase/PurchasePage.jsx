import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import DataTable from '../../components/DataTable'
import Pagination, { usePagination } from '../../components/Pagination'
import { api, extractList } from '../../services/api'
import '../sales/SalesPage.css'

const fmt = (n) => n === 0 ? '—' : `₹${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function PurchasePage() {
  const { tab } = useParams()
  const navigate = useNavigate()

  const [orders,   setOrders]   = useState([])
  const [bills,    setBills]    = useState([])
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      api.purchases.listOrders({ limit: 100 }),
      api.purchases.listBills({ limit: 100 }),
      api.payments.list({ limit: 100 }),
    ]).then(([ordersRes, billsRes, payRes]) => {
      const vendorMap = new Map()
      let vCounter = 1
      const formatVendorId = (v) => {
        if (!v) return 'VEND-001'
        const key = v.id || v.name || String(v)
        if (typeof key === 'string' && key.startsWith('VEND-')) return key
        if (!vendorMap.has(key)) {
          vendorMap.set(key, `VEND-${String(vCounter++).padStart(3, '0')}`)
        }
        return vendorMap.get(key)
      }

      if (ordersRes.status === 'fulfilled') {
        const list = extractList(ordersRes.value)
        setOrders(list.map(o => ({
          id: o.orderNumber || o.id,
          vendorId: formatVendorId(o.vendor),
          vendor: o.vendor?.name || 'Vendor',
          date: o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
          subtotal: Number(o.totalAmount || 0),
          tax: 0,
          total: Number(o.totalAmount || 0),
          status: o.status === 'CONFIRMED' ? 'Confirmed' : 'Draft',
        })))
      }
      if (billsRes.status === 'fulfilled') {
        const list = extractList(billsRes.value)
        setBills(list.map(b => ({
          id: b.billNumber || b.id,
          vendorId: formatVendorId(b.vendor),
          vendor: b.vendor?.name || 'Vendor',
          date: b.billDate ? new Date(b.billDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
          subtotal: Number(b.totalAmount || 0),
          tax: 0,
          total: Number(b.totalAmount || 0),
          status: b.status === 'PAID' || b.status === 'CONFIRMED' ? 'Confirmed' : 'Draft',
        })))
      }
      if (payRes.status === 'fulfilled') {
        const list = extractList(payRes.value)
        const vendPays = list.filter(p => p.type === 'VENDOR_PAYMENT')
        setPayments(vendPays.map(p => ({
          id: p.paymentNumber || p.id,
          vendorId: formatVendorId(p.vendorBill?.vendor),
          vendor: p.vendorBill?.vendor?.name || 'Vendor',
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
    { key: 'orders',   label: 'Purchase Orders', data: orders,   orderLabel: 'ORDER NO.' },
    { key: 'bills',    label: 'Purchase Bills',  data: bills,    orderLabel: 'BILL NO.'  },
    { key: 'payments', label: 'Payment',         data: payments, orderLabel: 'PAYMENT NO.' },
  ]

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

  const currentTabName = TABS[currentTab].label

  return (
    <DashboardLayout>
      <div className="sp-page">
        {/* Breadcrumb */}
        <div className="sp-breadcrumb">Purchase</div>

        {/* Page title */}
        <div className="sp-header">
          <div>
            <h1 className="sp-title">Purchase</h1>
            <p className="sp-subtitle">Purchase orders, vendor bills, and vendor payments</p>
          </div>
          <button 
            className="sp-new-btn"
            onClick={() => {
              if (currentTab === 0) navigate('/dashboard/data/purchase-orders')
              else if (currentTab === 1) navigate('/dashboard/data/vendor-bills')
              else navigate('/dashboard/data/payments')
            }}
          >
            <PlusIcon /> New {currentTab === 0 ? 'Purchase Order' : currentTab === 1 ? 'Purchase Bill' : 'Payment'}
          </button>
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
          <DataTable columns={columns} rows={paged} />
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
  return <svg className="sp-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
