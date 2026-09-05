import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
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

const INITIAL_ORDERS = [
  { id: 'S00001', customer: 'Ratan Mehra',    date: '2026-09-01', lines: [], total: 56640,  status: 'Confirmed' },
  { id: 'S00002', customer: 'Priya Kapoor',   date: '2026-09-03', lines: [], total: 126850, status: 'Invoiced'  },
  { id: 'S00003', customer: 'Mahindra Living',date: '2026-09-04', lines: [], total: 227440, status: 'Draft'     },
]

const EMPTY_LINE = { product: '', budgetAnalytics: '', qty: '', unitPrice: '', total: 0 }
const EMPTY_SO   = { customer: '', date: '', lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE }] }

let soCounter = INITIAL_ORDERS.length + 1
function nextSoId() { return `S${String(soCounter++).padStart(5,'0')}` }

export default function SalesOrdersPage() {
  const navigate = useNavigate()
  const [orders,    setOrders]    = useState(INITIAL_ORDERS)
  const [search,    setSearch]    = useState('')
  const [statusFlt, setStatusFlt] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editOrder, setEditOrder] = useState(null)

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    return (!search || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q)) &&
           (statusFlt === 'All' || o.status === statusFlt)
  })

  const openNew  = ()  => { setEditOrder(null); setModalOpen(true) }
  const openEdit = (o) => { setEditOrder(o);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false); setEditOrder(null) }

  const handleSave = (data, newStatus) => {
    const total = data.lines.reduce((s, l) => s + (Number(l.total)||0), 0)
    if (editOrder) {
      setOrders(prev => prev.map(o => o.id === editOrder.id ? { ...o, ...data, total, status: newStatus||o.status } : o))
    } else {
      setOrders(prev => [...prev, { id: nextSoId(), total, status: newStatus||'Draft', ...data }])
    }
    close()
  }

  const handleCreateInvoice = (data) => {
    const total = data.lines.reduce((s, l) => s + (Number(l.total)||0), 0)
    const id = editOrder?.id || nextSoId()
    setOrders(prev => {
      const exists = prev.find(o => o.id === id)
      if (exists) return prev.map(o => o.id === id ? { ...o, ...data, total, status: 'Invoiced' } : o)
      return [...prev, { id, total, status: 'Invoiced', ...data }]
    })
    close()
    navigate('/dashboard/data/customer-invoices', { state: { fromSO: { ...data, soId: id, total } } })
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this sales order?')) setOrders(prev => prev.filter(o => o.id !== id))
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
              {filtered.map(o => (
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
          <div className="df-footer"><span className="df-count">Showing {filtered.length} of {orders.length}</span></div>
        </div>
      </div>
      <SOModal isOpen={modalOpen} onClose={close} onSave={handleSave} onCreateInvoice={handleCreateInvoice} editOrder={editOrder} />
    </DashboardLayout>
  )
}

/* ── Sales Order Modal ── */
function SOModal({ isOpen, onClose, onSave, onCreateInvoice, editOrder }) {
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
        setFields({ customer: editOrder.customer||'', date: editOrder.date||'',
          lines: editOrder.lines?.length ? editOrder.lines.map(l=>({...l})) : [{ ...EMPTY_LINE },{ ...EMPTY_LINE }] })
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

  const totalAmount = fields.lines.reduce((s, l) => s + (Number(l.total)||0), 0)

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

  const selectProduct = (idx, prod) => { updateLine(idx,'product',prod.name); updateLine(idx,'unitPrice',prod.unitPrice); setProdDropIdx(null) }
  const addLine    = () => setFields(p => ({ ...p, lines: [...p.lines, { ...EMPTY_LINE }] }))
  const removeLine = (idx) => { if (fields.lines.length > 1) setFields(p => ({ ...p, lines: p.lines.filter((_,i) => i !== idx) })) }

  const validate = () => {
    const e = {}
    if (!fields.customer) e.customer = 'Customer is required'
    if (!fields.date)     e.date     = 'SO date is required'
    return e
  }

  const soId = editOrder?.id || `S${String(soCounter).padStart(5,'0')}`

  return (
    <div className="dfm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dfm-panel dfm-panel--wide">
        <div className="dfm-topbar">
          <div className="dfm-topbar-left">
            <button type="button" className="dfm-btn dfm-btn--new" onClick={() => { setFields(EMPTY_SO); setErrors({}); setConfirmed(false) }}>New</button>
            <button type="button" className={`dfm-btn dfm-btn--confirm${confirmed?' dfm-btn--confirmed':''}`}
              onClick={() => { const v=validate(); if(Object.keys(v).length){setErrors(v);return}; setConfirmed(true); onSave(fields,'Confirmed') }}>
              {confirmed?'✓ Confirmed':'Confirm'}
            </button>
            <button type="button" className="dfm-btn dfm-btn--action" onClick={() => { const v=validate(); if(Object.keys(v).length){setErrors(v);return}; onCreateInvoice(fields) }}>Create Invoice</button>
          </div>
          <div className="dfm-topbar-right">
            <button type="button" className="dfm-btn dfm-btn--cancel" onClick={() => { setFields(EMPTY_SO); setErrors({}); setConfirmed(false) }}>Cancel</button>
            <button type="button" className="dfm-btn dfm-btn--back" onClick={onClose}>Back</button>
            <button type="button" className="dfm-close" onClick={onClose}><XIcon /></button>
          </div>
        </div>

        <h2 className="dfm-title">{editOrder ? `Edit ${editOrder.id}` : 'New Sales Order'}</h2>

        <div className="dfm-body">
          {/* SO No */}
          <div className="dfm-field">
            <label className="dfm-lbl">SO No.</label>
            <div className="dfm-input-wrap"><span className="dfm-readonly">{soId}</span></div>
          </div>

          {/* Customer Name */}
          <div className="dfm-field">
            <label className="dfm-lbl">Customer Name</label>
            <div className="dfm-input-wrap dfm-dropdown-wrap">
              <input ref={firstRef} type="text" className={`dfm-input${errors.customer?' dfm-input--err':''}`}
                placeholder="Select customer... (from Contact Master)"
                value={fields.customer}
                onChange={e => { changeField('customer', e.target.value); setCustDrop(true) }}
                onFocus={() => setCustDrop(true)} autoComplete="off" />
              {custDrop && (
                <div className="dfm-dropdown">
                  {CUSTOMERS.filter(c => c.toLowerCase().includes(fields.customer.toLowerCase())).map(c => (
                    <button key={c} type="button" className="dfm-drop-opt" onMouseDown={() => { changeField('customer',c); setCustDrop(false) }}>{c}</button>
                  ))}
                </div>
              )}
              {errors.customer && <span className="dfm-err">{errors.customer}</span>}
              <span className="dfm-hint">From Contact Master — Many to one</span>
            </div>
          </div>

          {/* SO Date */}
          <div className="dfm-field">
            <label className="dfm-lbl">SO Date</label>
            <div className="dfm-input-wrap">
              <input type="date" className={`dfm-input${errors.date?' dfm-input--err':''}`}
                value={fields.date} onChange={e => changeField('date', e.target.value)} />
              {errors.date && <span className="dfm-err">{errors.date}</span>}
            </div>
          </div>

          {/* Line items */}
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
                  const prodOpts = PRODUCTS.filter(p => !line.product || p.name.toLowerCase().includes(line.product.toLowerCase()))
                  const analOpts = ANALYTICS.filter(a => !line.budgetAnalytics || a.toLowerCase().includes(line.budgetAnalytics.toLowerCase()))
                  return (
                    <tr key={idx} className="dfm-line-row">
                      <td className="dfm-line-td dfm-line-idx">{idx+1}</td>
                      {/* Product */}
                      <td className="dfm-line-td" style={{position:'relative'}}>
                        <input type="text" className="dfm-line-input" placeholder="Product..."
                          value={line.product}
                          onChange={e => { updateLine(idx,'product',e.target.value); setProdDropIdx(idx) }}
                          onFocus={() => setProdDropIdx(idx)} autoComplete="off" />
                        {prodDropIdx===idx && prodOpts.length>0 && (
                          <div className="dfm-line-dropdown">
                            {prodOpts.map(p => (
                              <button key={p.name} type="button" className="dfm-line-opt" onMouseDown={() => selectProduct(idx,p)}>
                                <span>{p.name}</span><span className="dfm-opt-price">{fmtINR(p.unitPrice)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      {/* Budget Analytics */}
                      <td className="dfm-line-td" style={{position:'relative'}}>
                        <input type="text" className="dfm-line-input" placeholder="Analytics..."
                          value={line.budgetAnalytics}
                          onChange={e => { updateLine(idx,'budgetAnalytics',e.target.value); setAnalDropIdx(idx) }}
                          onFocus={() => setAnalDropIdx(idx)} autoComplete="off" />
                        {analDropIdx===idx && analOpts.length>0 && (
                          <div className="dfm-line-dropdown">
                            {analOpts.map(a => (
                              <button key={a} type="button" className="dfm-line-opt" onMouseDown={() => { updateLine(idx,'budgetAnalytics',a); setAnalDropIdx(null) }}>{a}</button>
                            ))}
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
                  <td colSpan={5} className="dfm-total-label">Total</td>
                  <td className="dfm-total-val">{fmtINR(totalAmount)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
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
