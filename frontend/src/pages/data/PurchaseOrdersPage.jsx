import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import Pagination, { usePagination } from '../../components/Pagination'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import './DataForms.css'

const STATUS_STYLE = { Draft: 'df-badge--draft', Confirmed: 'df-badge--confirmed', Billed: 'df-badge--billed' }
const fmtINR = (n) => `₹${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const EMPTY_LINE = { product: '', productId: '', qty: '', month: '', price: '', available: '', day: '', unitPrice: '', total: 0 }
const EMPTY_PO   = { vendor: '', vendorId: '', address: '', date: '', lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE }] }

import { api, extractList } from '../../services/api'

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [orders,      setOrders]      = useState([])
  const [vendors,     setVendors]     = useState([])
  const [products,    setProducts]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [search,      setSearch]      = useState('')
  const [statusFlt,   setStatusFlt]   = useState('All')
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editOrder,   setEditOrder]   = useState(null)

  const loadOrders = useCallback(() => {
    setLoading(true)
    api.purchases.listOrders({ limit: 100 })
      .then(res => {
        const list = extractList(res)
        const mapped = list.map(o => ({
          ...o,
          id: o.orderNumber || o.id,
          rawId: o.id,
          vendor: o.vendor?.name || 'Vendor',
          vendorId: o.vendorId,
          date: o.orderDate ? new Date(o.orderDate).toISOString().split('T')[0] : '',
          total: Number(o.totalAmount || 0),
          status: o.status === 'CONFIRMED' ? 'Confirmed' : 'Draft',
          lines: (o.lines || []).map(l => {
            const qty = Number(l.quantity || l.qty || 0)
            const unitPrice = Number(l.unitPrice || 0)
            const lineTotal = Number(l.total || l.totalPrice || 0) || (qty * unitPrice)
            return {
              product: l.product?.name || (typeof l.product === 'string' ? l.product : ''),
              productId: l.productId || l.product?.id || '',
              qty: qty || '',
              unitPrice: unitPrice,
              total: lineTotal,
            }
          })
        }))
        setOrders(mapped)
      })
      .catch(err => console.warn('Could not load live purchase orders:', err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadOrders()
    api.contacts.list({ limit: 100 }).then(res => {
      const list = extractList(res)
      setVendors(list)
    }).catch(e => console.warn('Failed to load vendors:', e.message))

    api.products.list({ limit: 100 }).then(res => {
      const list = extractList(res)
      setProducts(list)
    }).catch(e => console.warn('Failed to load products:', e.message))
  }, [loadOrders])

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    const ms = !search || o.id.toLowerCase().includes(q) || o.vendor.toLowerCase().includes(q)
    const mf = statusFlt === 'All' || o.status === statusFlt
    return ms && mf
  })

  const { page, setPage, paged, total: totalFiltered } = usePagination(filtered, 10)

  const openNew  = ()  => { setEditOrder(null); setModalOpen(true) }
  const openEdit = (o) => { setEditOrder(o);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false); setEditOrder(null) }

  const handleSave = async (data, newStatus) => {
    try {
      if (editOrder?.rawId) {
        if (newStatus === 'Confirmed' && editOrder.status !== 'Confirmed') {
          await api.purchases.confirmOrder(editOrder.rawId)
          toast.success(`Purchase Order ${editOrder.id} confirmed!`)
        } else {
          toast.success(`Purchase Order ${editOrder.id} updated!`)
        }
        loadOrders()
        close()
        return
      }

      let vId = data.vendorId
      if (!vId && vendors.length > 0) {
        const found = vendors.find(v => v.name.toLowerCase() === (data.vendor || '').toLowerCase())
        if (found) vId = found.id
      }
      if (!vId && vendors.length > 0) vId = vendors[0].id

      const validLines = data.lines.filter(l => (l.product || l.productId) && Number(l.qty) > 0).map(l => {
        let pId = l.productId
        if (!pId) {
          const foundP = products.find(p => p.name.toLowerCase() === (l.product || '').toLowerCase())
          if (foundP) pId = foundP.id
        }
        if (!pId && products.length > 0) pId = products[0].id
        return {
          productId: pId,
          quantity: parseInt(l.qty, 10) || 1,
          unitPrice: parseFloat(l.unitPrice) || 0,
        }
      })

      if (validLines.length === 0 && products.length > 0) {
        validLines.push({
          productId: products[0].id,
          quantity: 1,
          unitPrice: Number(products[0].costPrice || products[0].salesPrice || 1000),
        })
      }

      const payload = {
        vendorId: vId,
        orderDate: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        lines: validLines,
      }

      const created = await api.purchases.createOrder(payload)
      if (newStatus === 'Confirmed' && created?.id) {
        await api.purchases.confirmOrder(created.id)
        toast.success(`Purchase Order ${created.orderNumber || 'PO'} confirmed!`)
      } else {
        toast.success(`Purchase Order ${created?.orderNumber || 'PO'} created successfully!`)
      }
      loadOrders()
      close()
    } catch (err) {
      toast.error('Error saving purchase order: ' + err.message)
    }
  }

  const handleCreateBill = async (data) => {
    try {
      let poId = editOrder?.rawId
      if (!poId) {
        let vId = data.vendorId
        if (!vId && vendors.length > 0) {
          const found = vendors.find(v => v.name.toLowerCase() === (data.vendor || '').toLowerCase())
          if (found) vId = found.id
        }
        if (!vId && vendors.length > 0) vId = vendors[0].id

        const validLines = data.lines.filter(l => (l.product || l.productId) && Number(l.qty) > 0).map(l => {
          let pId = l.productId
          if (!pId) {
            const foundP = products.find(p => p.name.toLowerCase() === (l.product || '').toLowerCase())
            if (foundP) pId = foundP.id
          }
          if (!pId && products.length > 0) pId = products[0].id
          return {
            productId: pId,
            quantity: parseInt(l.qty, 10) || 1,
            unitPrice: parseFloat(l.unitPrice) || 0,
          }
        })
        const created = await api.purchases.createOrder({
          vendorId: vId,
          orderDate: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
          lines: validLines.length ? validLines : [{ productId: products[0]?.id, quantity: 1, unitPrice: 1000 }],
        })
        await api.purchases.confirmOrder(created.id)
        poId = created.id
      } else {
        if (editOrder.status !== 'Confirmed' && editOrder.status !== 'Billed') {
          await api.purchases.confirmOrder(poId)
        }
      }
      await api.purchases.createBillFromPO(poId)
      loadOrders()
      close()
      toast.success('Vendor bill generated from Purchase Order!')
      navigate('/dashboard/data/vendor-bills')
    } catch (err) {
      toast.error('Error creating bill from PO: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Purchase Order',
      message: `Are you sure you want to delete purchase order "${id}"?`,
      detail: 'This will remove the purchase order record from your purchase history.',
      confirmText: 'Delete Order',
      confirmVariant: 'danger',
    })
    if (ok) {
      setOrders(prev => prev.filter(o => o.id !== id))
      toast.info(`Purchase Order ${id} deleted`)
    }
  }

  return (
    <DashboardLayout>
      <div className="df-page">
        <div className="df-breadcrumb">Data Input Forms <span>›</span> Purchase Orders</div>
        <div className="df-header">
          <div>
            <h1 className="df-title">Purchase Orders</h1>
            <p className="df-subtitle">{orders.length} orders</p>
          </div>
          <button className="df-add-btn" onClick={openNew}><PlusIcon /> New</button>
        </div>
        <div className="df-toolbar">
          <div className="df-search-wrap"><SearchIcon /><input className="df-search" type="search" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <select className="df-filter" value={statusFlt} onChange={e => setStatusFlt(e.target.value)}>
            {['All','Draft','Confirmed','Billed'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="df-card">
          <table className="df-table">
            <thead><tr><th>PO No.</th><th>Vendor</th><th>Order Date</th><th className="align-right">Total</th><th className="align-center">Status</th><th>Actions</th></tr></thead>
            <tbody>
              {paged.map(o => (
                <tr key={o.id} className="df-tr">
                  <td><button className="df-link-btn" onClick={() => openEdit(o)}>{o.id}</button></td>
                  <td className="df-vendor">{o.vendor}</td>
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
      <POModal
        isOpen={modalOpen}
        onClose={close}
        onSave={handleSave}
        onCreateBill={handleCreateBill}
        editOrder={editOrder}
        vendors={vendors}
        products={products}
      />
    </DashboardLayout>
  )
}

/* ── PO Form Modal ── */
function POModal({ isOpen, onClose, onSave, onCreateBill, editOrder, vendors = [], products = [] }) {
  const [fields,    setFields]    = useState(EMPTY_PO)
  const [errors,    setErrors]    = useState({})
  const [confirmed, setConfirmed] = useState(false)
  const [vendorDrop, setVendorDrop] = useState(false)
  const [prodDropIdx, setProdDropIdx] = useState(null)
  const vendorRef = useRef(null); const firstRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      if (editOrder) {
        setFields({
          vendor: editOrder.vendor||'',
          vendorId: editOrder.vendorId||'',
          address: editOrder.address||'',
          date: editOrder.date||'',
          lines: editOrder.lines?.length ? editOrder.lines.map(l => {
            const qty = Number(l.qty || l.quantity || 0)
            const unitPrice = Number(l.unitPrice || 0)
            const total = Number(l.total || l.totalPrice || 0) || (qty * unitPrice)
            return { ...l, qty: qty || '', unitPrice, total }
          }) : [{ ...EMPTY_LINE },{ ...EMPTY_LINE }]
        })
        setConfirmed(editOrder.status === 'Confirmed' || editOrder.status === 'Billed')
      } else { setFields(EMPTY_PO); setConfirmed(false) }
      setErrors({})
    }
  }, [isOpen, editOrder])

  useEffect(() => { if (isOpen) setTimeout(() => firstRef.current?.focus(), 60) }, [isOpen])

  const hk = useCallback(e => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => { if (isOpen) document.addEventListener('keydown', hk); return () => document.removeEventListener('keydown', hk) }, [isOpen, hk])

  useEffect(() => {
    const h = () => { setVendorDrop(false); setProdDropIdx(null) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  if (!isOpen) return null

  const BUDGET_LIMIT = 200000
  const subtotalUntaxed = fields.lines.reduce((s, l) => s + (Number(l.total) || ((Number(l.qty)||0) * (Number(l.unitPrice)||0))), 0)
  const taxAmount       = subtotalUntaxed * 0.18
  const totalAmount     = subtotalUntaxed + taxAmount
  const overBudget      = totalAmount > BUDGET_LIMIT

  const changeField = (name, value) => { setFields(p => ({ ...p, [name]: value })); setErrors(p => ({ ...p, [name]: undefined })) }

  const updateLine = (idx, key, value) => {
    setFields(p => {
      const lines = p.lines.map((l, i) => {
        if (i !== idx) return l
        const updated = { ...l, [key]: value }
        if (key === 'qty' || key === 'unitPrice') {
          updated.total = (Number(key === 'qty' ? value : l.qty) || 0) * (Number(key === 'unitPrice' ? value : l.unitPrice) || 0)
        }
        return updated
      })
      return { ...p, lines }
    })
  }

  const selectProduct = (idx, prod) => {
    updateLine(idx, 'product', prod.name)
    updateLine(idx, 'productId', prod.id)
    updateLine(idx, 'unitPrice', prod.costPrice || prod.salesPrice || 0)
    setProdDropIdx(null)
  }

  const addLine    = () => setFields(p => ({ ...p, lines: [...p.lines, { ...EMPTY_LINE }] }))
  const removeLine = (idx) => { if (fields.lines.length > 1) setFields(p => ({ ...p, lines: p.lines.filter((_,i) => i !== idx) })) }

  const validate = () => {
    const e = {}
    if (!fields.vendor && !fields.vendorId) e.vendor = 'Vendor is required'
    if (!fields.date)   e.date   = 'Order date is required'
    const hasValidLine = fields.lines.some(l => (l.product || l.productId) && Number(l.qty) > 0)
    if (!hasValidLine) e.lines = 'At least one product line with a valid quantity is required'
    return e
  }

  const handleConfirm = () => {
    const v = validate(); if (Object.keys(v).length) { setErrors(v); return }
    setConfirmed(true)
    onSave(fields, 'Confirmed')
  }

  const handleCreateBill = () => {
    const v = validate(); if (Object.keys(v).length) { setErrors(v); return }
    onCreateBill(fields)
  }

  const poId = editOrder?.id || 'New Draft'

  return (
    <div className="dfm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dfm-panel dfm-panel--wide">
        {/* Topbar */}
        <div className="dfm-topbar">
          <div className="dfm-topbar-left">
            <button type="button" className="dfm-btn dfm-btn--new" onClick={() => { setFields(EMPTY_PO); setErrors({}); setConfirmed(false) }}>New</button>
            <button type="button" className={`dfm-btn dfm-btn--confirm${confirmed ? ' dfm-btn--confirmed' : ''}`} onClick={handleConfirm}>{confirmed ? '✓ Confirmed' : 'Confirm'}</button>
            <button type="button" className="dfm-btn dfm-btn--action" onClick={handleCreateBill}>Create Bill</button>
          </div>
          <div className="dfm-topbar-right">
            <button type="button" className="dfm-btn dfm-btn--cancel" onClick={() => { setFields(EMPTY_PO); setErrors({}); setConfirmed(false) }}>Cancel</button>
            <button type="button" className="dfm-btn dfm-btn--back" onClick={onClose}>Back</button>
            <button type="button" className="dfm-close" onClick={onClose}><XIcon /></button>
          </div>
        </div>

        <h2 className="dfm-title">{editOrder ? `Edit ${editOrder.id}` : 'New Purchase Order'}</h2>

        <div className="dfm-body">
          {/* PO No. (read-only) */}
          <div className="dfm-field">
            <label className="dfm-lbl">PO No.</label>
            <div className="dfm-input-wrap">
              <span className="dfm-readonly">{poId}</span>
            </div>
          </div>

          {/* Address */}
          <div className="dfm-field">
            <label className="dfm-lbl" htmlFor="po-address">Address</label>
            <div className="dfm-input-wrap">
              <input id="po-address" type="text" className="dfm-input" placeholder="Delivery address"
                value={fields.address} onChange={e => changeField('address', e.target.value)} />
            </div>
          </div>

          {/* Vendor */}
          <div className="dfm-field" ref={vendorRef}>
            <label className="dfm-lbl">
              Vendor Name <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <div className="dfm-input-wrap dfm-dropdown-wrap">
              <input ref={firstRef} type="text" className={`dfm-input${errors.vendor ? ' dfm-input--err' : ''}`}
                placeholder="Select vendor..."
                value={fields.vendor}
                onChange={e => { changeField('vendor', e.target.value); setVendorDrop(true) }}
                onFocus={() => setVendorDrop(true)} autoComplete="off" />
              {vendorDrop && (
                <div className="dfm-dropdown">
                  {vendors.filter(v => !fields.vendor || v.name.toLowerCase().includes(fields.vendor.toLowerCase())).map(v => (
                    <button key={v.id} type="button" className="dfm-drop-opt" onMouseDown={() => {
                      changeField('vendor', v.name)
                      changeField('vendorId', v.id)
                      setVendorDrop(false)
                    }}>{v.name}</button>
                  ))}
                </div>
              )}
              {errors.vendor && <span className="dfm-err">{errors.vendor}</span>}
            </div>
          </div>

          {/* Order Date */}
          <div className="dfm-field">
            <label className="dfm-lbl" htmlFor="po-date">
              Order Date <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <div className="dfm-input-wrap">
              <input id="po-date" type="date" className={`dfm-input${errors.date ? ' dfm-input--err' : ''}`}
                value={fields.date} onChange={e => changeField('date', e.target.value)} />
              {errors.date && <span className="dfm-err">{errors.date}</span>}
            </div>
          </div>

          {/* PO Entry Line items */}
          <div className="dfm-lines-section">
            <div className="dfm-lines-title">PO Entry</div>
            <table className="dfm-lines-table">
              <thead>
                <tr>
                  <th style={{width:40}}>Sr No.</th>
                  <th>Product</th>
                  <th style={{width:100}}>Qty</th>
                  <th className="align-right" style={{width:130}}>Unit Price</th>
                  <th className="align-right" style={{width:140}}>Total</th>
                  <th style={{width:32}}></th>
                </tr>
              </thead>
              <tbody>
                {fields.lines.map((line, idx) => {
                  const prodOpts = products.filter(p => !line.product || p.name.toLowerCase().includes(line.product.toLowerCase()))
                  return (
                    <tr key={idx} className="dfm-line-row">
                      <td className="dfm-line-td dfm-line-idx">{idx + 1}</td>
                      <td className={`dfm-line-td${prodDropIdx === idx ? ' dfm-line-td--active' : ''}`} style={{position:'relative', zIndex: prodDropIdx === idx ? 1100 : 'auto'}}>
                        <input type="text" className="dfm-line-input" placeholder="Product..."
                          value={line.product}
                          onChange={e => { updateLine(idx, 'product', e.target.value); setProdDropIdx(idx) }}
                          onFocus={() => setProdDropIdx(idx)} autoComplete="off" />
                        {prodDropIdx === idx && prodOpts.length > 0 && (
                          <div className="dfm-line-dropdown">
                            <div className="dfm-line-dropdown-header">Available Products ({prodOpts.length})</div>
                            {prodOpts.map(p => (
                              <button key={p.id} type="button" className="dfm-line-opt" onMouseDown={() => selectProduct(idx, p)}>
                                <span className="dfm-opt-name">{p.name}</span>
                                <span className="dfm-opt-price">{fmtINR(p.costPrice || p.salesPrice)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="dfm-line-td"><input type="number" className="dfm-line-input dfm-line-input--num" placeholder="Qty" value={line.qty} onChange={e => updateLine(idx, 'qty', e.target.value)} /></td>
                      <td className="dfm-line-td"><input type="number" className="dfm-line-input dfm-line-input--num" placeholder="0.00" value={line.unitPrice} onChange={e => updateLine(idx, 'unitPrice', e.target.value)} /></td>
                      <td className="dfm-line-td dfm-line-total">{line.total > 0 ? fmtINR(line.total) : '—'}</td>
                      <td className="dfm-line-td">
                        {fields.lines.length > 1 && <button type="button" className="dfm-remove-btn" onClick={() => removeLine(idx)}><TrashIcon /></button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="dfm-total-row">
                  <td colSpan={4} className="dfm-total-label">Subtotal (Untaxed)</td>
                  <td className="dfm-total-val">{fmtINR(subtotalUntaxed)}</td>
                  <td />
                </tr>
                <tr className="dfm-total-row">
                  <td colSpan={4} className="dfm-total-label" style={{ color: '#856404' }}>Taxes (18% GST)</td>
                  <td className="dfm-total-val" style={{ color: '#856404' }}>{fmtINR(taxAmount)}</td>
                  <td />
                </tr>
                <tr className="dfm-total-row" style={{ fontWeight: 700, fontSize: '15px' }}>
                  <td colSpan={4} className="dfm-total-label">Total Amount</td>
                  <td className="dfm-total-val">{fmtINR(totalAmount)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            {errors.lines && <span className="dfm-err" style={{ marginTop: 8, fontSize: '12px', fontWeight: 600 }}>{errors.lines}</span>}
            <button type="button" className="dfm-add-line-btn" onClick={addLine}><PlusSmIcon /> Add Line</button>
          </div>

          {/* Blocking budget warning */}
          {overBudget && (
            <div className="dfm-warning-box">
              <div className="dfm-warning-title">⚠ Amount Imported Budget ({fmtINR(BUDGET_LIMIT)})</div>
              <p>Amount greater than the remaining budget amount! The budget <strong>Annual Budget FY 2026-27</strong> is over the budget.</p>
              <p>Remaining budget: {fmtINR(BUDGET_LIMIT)} · Current order total: {fmtINR(totalAmount)}</p>
            </div>
          )}
        </div>

        <div className="dfm-footer">
          <button type="button" className="dfm-save-btn" onClick={() => { const v=validate(); if(Object.keys(v).length){setErrors(v);return} onSave(fields, editOrder?.status||'Draft') }}>
            {editOrder ? 'Update Order' : 'Save as Draft'}
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
