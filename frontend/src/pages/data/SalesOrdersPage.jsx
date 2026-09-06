import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import Pagination, { usePagination } from '../../components/Pagination'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import './DataForms.css'

const CUSTOMERS = ['Ratan Mehra', 'Priya Kapoor', 'Ananya Sharma', 'Mahindra Living', 'Godrej Interio Ltd.']
const PRODUCTS  = [
  { name: 'Oak Dining Table',   unitPrice: 48000 },
  { name: 'Rosewood Sofa Set',  unitPrice: 85000 },
  { name: 'Teak Coffee Table',  unitPrice: 22500 },
  { name: 'Wicker Armchair',    unitPrice: 14000 },
  { name: 'Sheesham Bookshelf', unitPrice: 18500 },
  { name: 'Custom Upholstery Service', unitPrice: 4500 },
]
const ANALYTICS = ['Furniture Manufacturing', 'Showroom Operations', 'Q3 Marketing Campaign', 'Warehouse Expansion']

const STATUS_STYLE = { Draft: 'df-badge--draft', Confirmed: 'df-badge--confirmed', Invoiced: 'df-badge--billed' }
const fmtINR = (n) => `₹${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const EMPTY_LINE = { product: '', budgetAnalytics: '', qty: '', unitPrice: '', total: 0 }
const EMPTY_SO   = { customer: '', date: '', lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE }] }

function getNextSoId(orderList = []) {
  const year = new Date().getFullYear()
  const prefix = `SO-${year}-`
  let maxSeq = 0
  for (const o of orderList) {
    const id = o.orderNumber || o.id || ''
    if (id.startsWith(prefix)) {
      const num = parseInt(id.replace(prefix, ''), 10)
      if (!isNaN(num) && num > maxSeq) maxSeq = num
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}

import { api, extractList } from '../../services/api'

export default function SalesOrdersPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [orders,    setOrders]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [customers, setCustomers] = useState([])
  const [products,  setProducts]  = useState([])
  const [analytics, setAnalytics] = useState([])
  const [search,    setSearch]    = useState('')
  const [statusFlt, setStatusFlt] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editOrder, setEditOrder] = useState(null)

  const loadOrders = useCallback(() => {
    setLoading(true)
    Promise.allSettled([
      api.sales.listOrders({ limit: 100 }),
      api.contacts.list({ limit: 100, type: 'CUSTOMER' }),
      api.products.list({ limit: 100 }),
      api.budgets.getAnalyticAccounts(),
    ]).then(([ordersRes, custRes, prodRes, analRes]) => {
      if (ordersRes.status === 'fulfilled') {
        const list = extractList(ordersRes.value)
        const mapped = list.map(o => ({
          ...o,
          id: o.orderNumber || o.id,
          rawId: o.id,
          customer: o.customer?.name || (typeof o.customer === 'string' ? o.customer : 'Customer'),
          date: o.orderDate ? new Date(o.orderDate).toISOString().split('T')[0] : '2026-09-01',
          total: Number(o.totalAmount || 0),
          status: o.status === 'CONFIRMED' ? 'Confirmed' : (o.status === 'PAID' ? 'Invoiced' : 'Draft'),
          lines: (o.lines || []).map(l => ({
            product: l.product?.name || (typeof l.product === 'string' ? l.product : ''),
            productId: l.productId || l.product?.id || '',
            budgetAnalytics: l.budgetAnalytics?.name || (typeof l.budgetAnalytics === 'string' ? l.budgetAnalytics : ''),
            qty: l.quantity || l.qty || '',
            unitPrice: Number(l.unitPrice || 0),
            total: Number(l.total || (Number(l.quantity || 0) * Number(l.unitPrice || 0)) || 0),
          }))
        }))
        setOrders(mapped)
      }
      if (custRes.status === 'fulfilled') {
        setCustomers(extractList(custRes.value))
      }
      if (prodRes.status === 'fulfilled') {
        setProducts(extractList(prodRes.value))
      }
      if (analRes.status === 'fulfilled') {
        setAnalytics(extractList(analRes.value))
      }
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    return (!search || o.id?.toLowerCase().includes(q) || o.customer?.toLowerCase().includes(q)) &&
           (statusFlt === 'All' || o.status === statusFlt)
  })

  const { page, setPage, paged, total: totalFiltered } = usePagination(filtered, 10)

  const openNew  = ()  => { setEditOrder(null); setModalOpen(true) }
  const openEdit = (o) => { setEditOrder(o);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false); setEditOrder(null) }

  const handleSave = async (data, newStatus) => {
    try {
      if (editOrder?.rawId) {
        if (newStatus === 'Confirmed' && editOrder.status !== 'Confirmed') {
          await api.sales.confirmOrder(editOrder.rawId)
          toast.success(`Sales Order ${editOrder.id} confirmed!`)
        } else {
          toast.success(`Sales Order ${editOrder.id} updated!`)
        }
        await loadOrders()
        close()
        return
      }

      const cust = customers.find(c => c.name === data.customer || c.id === data.customer)
      const customerId = cust?.id || customers[0]?.id
      let lines = (data.lines || [])
        .filter(l => (l.product || l.productId) && Number(l.qty) > 0)
        .map(l => {
          const prod = products.find(p => p.name === l.product || p.id === l.product)
          return {
            productId: prod?.id || products[0]?.id,
            quantity: Math.max(1, parseInt(l.qty, 10) || 1),
            unitPrice: Number(l.unitPrice || prod?.salesPrice || 0),
          }
        })

      if (lines.length === 0 && products.length > 0) {
        lines = [{
          productId: products[0].id,
          quantity: 1,
          unitPrice: Number(products[0].salesPrice || 1000),
        }]
      }

      const soRes = await api.sales.createOrder({
        customerId,
        orderDate: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        lines,
      })
      if (newStatus === 'Confirmed' && soRes?.id) {
        await api.sales.confirmOrder(soRes.id)
        toast.success(`Sales Order ${soRes.orderNumber || 'SO'} confirmed!`)
      } else {
        toast.success(`Sales Order ${soRes.orderNumber || 'SO'} created successfully!`)
      }
      await loadOrders()
      close()
    } catch (err) {
      toast.error(err.message || 'Failed to save Sales Order')
    }
  }

  const handleCreateInvoice = async (data) => {
    try {
      let soId = editOrder?.rawId
      if (!soId) {
        const cust = customers.find(c => c.name === data.customer || c.id === data.customer)
        const customerId = cust?.id || customers[0]?.id
        let lines = (data.lines || [])
          .filter(l => (l.product || l.productId) && Number(l.qty) > 0)
          .map(l => {
            const prod = products.find(p => p.name === l.product || p.id === l.product)
            return {
              productId: prod?.id || products[0]?.id,
              quantity: Math.max(1, parseInt(l.qty, 10) || 1),
              unitPrice: Number(l.unitPrice || prod?.salesPrice || 0),
            }
          })
        if (lines.length === 0 && products.length > 0) {
          lines = [{ productId: products[0].id, quantity: 1, unitPrice: Number(products[0].salesPrice || 1000) }]
        }
        const created = await api.sales.createOrder({
          customerId,
          orderDate: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
          lines,
        })
        await api.sales.confirmOrder(created.id)
        soId = created.id
      } else {
        if (editOrder.status !== 'Confirmed' && editOrder.status !== 'Invoiced') {
          await api.sales.confirmOrder(soId)
        }
      }
      await api.sales.createInvoiceFromSO(soId)
      await loadOrders()
      close()
      toast.success('Customer invoice created from Sales Order!')
      navigate('/dashboard/data/customer-invoices')
    } catch (err) {
      toast.error('Error creating invoice from SO: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Sales Order',
      message: `Are you sure you want to delete sales order "${id}"?`,
      detail: 'This action will remove the sales order record from the active ledger.',
      confirmText: 'Delete Order',
      confirmVariant: 'danger',
    })
    if (ok) {
      setOrders(prev => prev.filter(o => o.id !== id))
      toast.info(`Sales Order ${id} deleted`)
    }
  }

  return (
    <DashboardLayout>
      <div className="df-page">
        <div className="df-breadcrumb">Data Input Forms <span>›</span> Sales Orders</div>
        <div className="df-header">
          <div><h1 className="df-title">Sales Orders</h1><p className="df-subtitle">{orders.length} orders</p></div>
          <button className="df-add-btn" onClick={openNew}><PlusIcon /> New</button>
        </div>
        <div className="df-toolbar">
          <div className="df-search-wrap"><SearchIcon /><input className="df-search" type="search" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <select className="df-filter" value={statusFlt} onChange={e => setStatusFlt(e.target.value)}>
            {['All','Draft','Confirmed','Invoiced'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="df-card">
          <table className="df-table">
            <thead><tr><th>SO No.</th><th>Customer</th><th>SO Date</th><th className="align-right">Total</th><th className="align-center">Status</th><th>Actions</th></tr></thead>
            <tbody>
              {paged.map(o => (
                <tr key={o.id} className="df-tr">
                  <td><button className="df-link-btn" onClick={() => openEdit(o)}>{o.id}</button></td>
                  <td className="df-vendor">{o.customer}</td>
                  <td className="df-date">{o.date}</td>
                  <td className="align-right df-total">{fmtINR(o.total)}</td>
                  <td className="align-center"><span className={`df-badge ${STATUS_STYLE[o.status]||''}`}>{o.status}</span></td>
                  <td><div className="df-actions"><button className="df-edit-btn" onClick={() => openEdit(o)}>Edit</button><button className="df-del-btn" onClick={() => handleDelete(o.id)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination total={totalFiltered} page={page} pageSize={10} onChange={setPage} />
        </div>
      </div>
      <SOModal
        isOpen={modalOpen}
        onClose={close}
        onSave={handleSave}
        onCreateInvoice={handleCreateInvoice}
        editOrder={editOrder}
        nextSoId={getNextSoId(orders)}
        customers={customers}
        products={products}
        analytics={analytics}
      />
    </DashboardLayout>
  )
}

/* ── Sales Order Modal ── */
function SOModal({ isOpen, onClose, onSave, onCreateInvoice, editOrder, nextSoId, customers = [], products = [], analytics = [] }) {
  const [fields,      setFields]      = useState(EMPTY_SO)
  const [errors,      setErrors]      = useState({})
  const [confirmed,   setConfirmed]   = useState(false)
  const [custDrop,    setCustDrop]    = useState(false)
  const [prodDropIdx, setProdDropIdx] = useState(null)
  const [analDropIdx, setAnalDropIdx] = useState(null)
  const firstRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      if (editOrder) {
        setFields({
          customer: editOrder.customer?.name || (typeof editOrder.customer === 'string' ? editOrder.customer : ''),
          date: editOrder.date || '',
          lines: editOrder.lines?.length
            ? editOrder.lines.map(l => ({
                product: l.product?.name || (typeof l.product === 'string' ? l.product : ''),
                productId: l.productId || l.product?.id || '',
                budgetAnalytics: l.budgetAnalytics?.name || (typeof l.budgetAnalytics === 'string' ? l.budgetAnalytics : ''),
                qty: l.qty || l.quantity || '',
                unitPrice: Number(l.unitPrice || 0),
                total: Number(l.total || (Number(l.qty || l.quantity || 0) * Number(l.unitPrice || 0)) || 0),
              }))
            : [{ ...EMPTY_LINE }, { ...EMPTY_LINE }]
        })
        setConfirmed(editOrder.status === 'Confirmed' || editOrder.status === 'Invoiced')
      } else { setFields(EMPTY_SO); setConfirmed(false) }
      setErrors({})
    }
  }, [isOpen, editOrder])

  useEffect(() => { if (isOpen) setTimeout(() => firstRef.current?.focus(), 60) }, [isOpen])
  const hk = useCallback(e => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => { if (isOpen) document.addEventListener('keydown', hk); return () => document.removeEventListener('keydown', hk) }, [isOpen, hk])
  useEffect(() => {
    const h = () => { setCustDrop(false); setProdDropIdx(null); setAnalDropIdx(null) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  if (!isOpen) return null

  const subtotalUntaxed = fields.lines.reduce((s, l) => s + (Number(l.total) || ((Number(l.qty)||0)*(Number(l.unitPrice)||0))), 0)
  const taxAmount       = subtotalUntaxed * 0.18
  const totalAmount     = subtotalUntaxed + taxAmount

  const changeField = (name, value) => { setFields(p => ({ ...p, [name]: value })); setErrors(p => ({ ...p, [name]: undefined })) }

  const updateLine = (idx, key, value) => {
    setFields(p => ({
      ...p, lines: p.lines.map((l, i) => {
        if (i !== idx) return l
        const up = { ...l, [key]: value }
        if (key === 'qty' || key === 'unitPrice') up.total = (Number(key==='qty'?value:l.qty)||0) * (Number(key==='unitPrice'?value:l.unitPrice)||0)
        return up
      })
    }))
  }

  const selectProduct = (idx, prod) => { updateLine(idx,'product',prod.name); updateLine(idx,'unitPrice',prod.salesPrice || prod.unitPrice || 0); setProdDropIdx(null) }
  const addLine    = () => setFields(p => ({ ...p, lines: [...p.lines, { ...EMPTY_LINE }] }))
  const removeLine = (idx) => { if (fields.lines.length > 1) setFields(p => ({ ...p, lines: fields.lines.filter((_,i) => i !== idx) })) }

  const validate = () => {
    const e = {}
    if (!fields.customer) e.customer = 'Customer is required'
    if (!fields.date)     e.date     = 'SO date is required'
    const hasValidLine = fields.lines.some(l => (l.product || l.productId) && Number(l.qty) > 0)
    if (!hasValidLine) e.lines = 'At least one product line with a valid quantity is required'
    return e
  }

  const soId = editOrder?.id || nextSoId || 'SO-2026-001'

  const custMatches = customers.filter(c => {
    const name = c.name || c
    return !fields.customer || name.toLowerCase().includes(fields.customer.toLowerCase())
  })

  return (
    <div className="dfm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dfm-panel dfm-panel--wide">
        <div className="dfm-topbar">
          <div className="dfm-topbar-left">
            <button type="button" className="dfm-btn dfm-btn--new" onClick={() => { setFields(EMPTY_SO); setErrors({}); setConfirmed(false) }}>New</button>
            <button type="button" className={`dfm-btn dfm-btn--confirm${confirmed?' dfm-btn--confirmed':''}`}
              onClick={() => { const v = validate(); if (!Object.keys(v).length) { setConfirmed(true); onSave(fields,'Confirmed') } else setErrors(v) }}>Confirm</button>
            <button type="button" className="dfm-btn dfm-btn--create-inv"
              onClick={() => { const v = validate(); if (!Object.keys(v).length) onCreateInvoice(fields); else setErrors(v) }}>Create Invoice</button>
          </div>
          <button type="button" className="dfm-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="dfm-body">
          <div className="dfm-header-info">
            <div className="dfm-doc-id">{soId}</div>
            <span className={`df-badge ${confirmed?'df-badge--confirmed':'df-badge--draft'}`}>{confirmed?'Confirmed':'Draft'}</span>
          </div>

          <div className="dfm-field">
            <label className="dfm-lbl">
              Customer <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <div className="dfm-input-wrap" style={{position:'relative'}}>
              <input ref={firstRef} type="text" className={`dfm-input${errors.customer?' dfm-input--err':''}`}
                placeholder="Search customer..." value={fields.customer}
                onChange={e => { changeField('customer', e.target.value); setCustDrop(true) }}
                onClick={() => setCustDrop(true)} autoComplete="off" />
              {custDrop && custMatches.length > 0 && (
                <div className="dfm-dropdown">
                  {custMatches.map(c => {
                    const cName = c.name || c
                    return (
                      <button key={c.id || cName} type="button" className="dfm-drop-opt" onMouseDown={() => { changeField('customer', cName); setCustDrop(false) }}>{cName}</button>
                    )
                  })}
                </div>
              )}
              {errors.customer && <span className="dfm-err">{errors.customer}</span>}
              <span className="dfm-hint">From Contact Master — Many to one</span>
            </div>
          </div>

          <div className="dfm-field">
            <label className="dfm-lbl">
              SO Date <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <div className="dfm-input-wrap">
              <input type="date" className={`dfm-input${errors.date?' dfm-input--err':''}`}
                value={fields.date} onChange={e => changeField('date', e.target.value)} />
              {errors.date && <span className="dfm-err">{errors.date}</span>}
            </div>
          </div>

          <div className="dfm-lines-section">
            <div className="dfm-lines-title">SO Entry</div>
            <table className="dfm-lines-table">
              <thead>
                <tr>
                  <th style={{width:36}}>Sr No.</th>
                  <th>Product</th>
                  <th>Budget Analytics</th>
                  <th>Qty</th>
                  <th className="align-right">Unit Price</th>
                  <th className="align-right">Total</th>
                  <th style={{width:32}}></th>
                </tr>
              </thead>
              <tbody>
                {fields.lines.map((line, idx) => {
                  const prodVal = typeof line.product === 'object' ? (line.product?.name || '') : (line.product || '')
                  const analVal = typeof line.budgetAnalytics === 'object' ? (line.budgetAnalytics?.name || '') : (line.budgetAnalytics || '')
                  const prodOpts = products.filter(p => !prodVal || (p.name && p.name.toLowerCase().includes(prodVal.toLowerCase())))
                  const analOpts = analytics.filter(a => {
                    const aName = a.name || a || ''
                    return !analVal || (typeof aName === 'string' && aName.toLowerCase().includes(analVal.toLowerCase()))
                  })
                  return (
                    <tr key={idx} className="dfm-line-row">
                       <td className="dfm-line-td dfm-line-idx">{idx+1}</td>
                      <td className={`dfm-line-td${prodDropIdx===idx?' dfm-line-td--active':''}`} style={{position:'relative', zIndex: prodDropIdx===idx?1100:'auto'}}>
                        <input type="text" className="dfm-line-input" placeholder="Product..."
                          value={prodVal}
                          onChange={e => { updateLine(idx,'product',e.target.value); setProdDropIdx(idx) }}
                          onFocus={() => setProdDropIdx(idx)} autoComplete="off" />
                        {prodDropIdx===idx && prodOpts.length>0 && (
                          <div className="dfm-line-dropdown">
                            <div className="dfm-line-dropdown-header">Available Products ({prodOpts.length})</div>
                            {prodOpts.map(p => (
                              <button key={p.id || p.name} type="button" className="dfm-line-opt" onMouseDown={() => selectProduct(idx,p)}>
                                <span className="dfm-opt-name">{p.name}</span>
                                <span className="dfm-opt-price">{fmtINR(p.salesPrice || p.unitPrice)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={`dfm-line-td${analDropIdx===idx?' dfm-line-td--active':''}`} style={{position:'relative', zIndex: analDropIdx===idx?1100:'auto'}}>
                        <input type="text" className="dfm-line-input" placeholder="Analytics..."
                          value={analVal}
                          onChange={e => { updateLine(idx,'budgetAnalytics',e.target.value); setAnalDropIdx(idx) }}
                          onFocus={() => setAnalDropIdx(idx)} autoComplete="off" />
                        {analDropIdx===idx && analOpts.length>0 && (
                          <div className="dfm-line-dropdown">
                            <div className="dfm-line-dropdown-header">Analytic Accounts ({analOpts.length})</div>
                            {analOpts.map(a => {
                              const aName = a.name || a
                              return (
                                <button key={a.id || aName} type="button" className="dfm-line-opt" onMouseDown={() => { updateLine(idx,'budgetAnalytics',aName); setAnalDropIdx(null) }}>
                                  <span className="dfm-opt-name">{aName}</span>
                                  {a.type && <span className="dfm-opt-code">{a.type}</span>}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </td>
                      <td className="dfm-line-td"><input type="number" className="dfm-line-input dfm-line-input--num" placeholder="Qty" value={line.qty} onChange={e => updateLine(idx,'qty',e.target.value)} /></td>
                      <td className="dfm-line-td"><input type="number" className="dfm-line-input dfm-line-input--num" placeholder="0.00" value={line.unitPrice} onChange={e => updateLine(idx,'unitPrice',e.target.value)} /></td>
                      <td className="dfm-line-td dfm-line-total">{line.total>0?fmtINR(line.total):'—'}</td>
                      <td className="dfm-line-td">{fields.lines.length>1&&<button type="button" className="dfm-remove-btn" onClick={()=>removeLine(idx)}><TrashIcon /></button>}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="dfm-total-row">
                  <td colSpan={5} className="dfm-total-label">Subtotal (Untaxed)</td>
                  <td className="dfm-total-val">{fmtINR(subtotalUntaxed)}</td>
                  <td />
                </tr>
                <tr className="dfm-total-row">
                  <td colSpan={5} className="dfm-total-label" style={{ color: '#856404' }}>Taxes (18% GST)</td>
                  <td className="dfm-total-val" style={{ color: '#856404' }}>{fmtINR(taxAmount)}</td>
                  <td />
                </tr>
                <tr className="dfm-total-row" style={{ fontWeight: 700, fontSize: '15px' }}>
                  <td colSpan={5} className="dfm-total-label">Total Amount</td>
                  <td className="dfm-total-val">{fmtINR(totalAmount)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            {errors.lines && <span className="dfm-err" style={{ marginTop: 8, fontSize: '12px', fontWeight: 600 }}>{errors.lines}</span>}
            <button type="button" className="dfm-add-line-btn" onClick={addLine}><PlusSmIcon /> Add Line</button>
          </div>
        </div>

        <div className="dfm-footer">
          <button type="button" className="dfm-save-btn" onClick={() => { const v=validate(); if(Object.keys(v).length){setErrors(v);return}; onSave(fields, editOrder?.status||'Draft') }}>
            {editOrder?'Update Order':'Save as Draft'}
          </button>
          <button type="button" className="dfm-cancel-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function XIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function PlusIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function PlusSmIcon(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function SearchIcon(){ return <svg className="df-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function TrashIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg> }
