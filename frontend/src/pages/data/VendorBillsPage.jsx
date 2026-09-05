import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import './DataForms.css'

const VENDORS  = ['Timber World', 'Steel Hub', 'Fabric Co.', 'Godrej Interio Ltd.', 'Ramesh Timber Works']
const PRODUCTS = ['Oak Dining Table', 'Rosewood Sofa Set', 'Teak Coffee Table', 'Wicker Armchair', 'Sheesham Bookshelf']
const COA_ACCOUNTS = [
  { code: '4001', name: 'Cost of Goods Sold' },
  { code: '4002', name: 'Workshop Rent' },
  { code: '4003', name: 'Salaries & Wages' },
  { code: '4004', name: 'Utilities & Power' },
  { code: '4005', name: 'Marketing & Advertising' },
  { code: '2001', name: 'Accounts Payable (Creditors)' },
]

const STATUS_STYLE = { Draft: 'df-badge--draft', Confirmed: 'df-badge--confirmed', Paid: 'df-badge--billed' }
const fmtINR = (n) => `₹${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const INITIAL_BILLS = [
  { id: 'BILL/2026/0001', vendorRef: 'VB-REF-001', vendor: 'Timber World', billRef: '', date: '2026-09-02', lines: [], total: 73160, status: 'Confirmed' },
  { id: 'BILL/2026/0002', vendorRef: 'VB-REF-002', vendor: 'Steel Hub',    billRef: '', date: '2026-09-03', lines: [], total: 45430, status: 'Draft'     },
]

const EMPTY_LINE = { product: '', account: '', accountCode: '', description: '', qty: '', unitPrice: '', total: 0 }
const EMPTY_BILL = { vendorRef: '', vendor: '', billRef: '', billBody: '', date: '', lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE }] }

let billCounter = INITIAL_BILLS.length + 1
function nextBillId() { return `BILL/2026/${String(billCounter++).padStart(4, '0')}` }

export default function VendorBillsPage() {
  const location = useLocation()
  const navigate  = useNavigate()
  const [bills,     setBills]     = useState(INITIAL_BILLS)
  const [search,    setSearch]    = useState('')
  const [statusFlt, setStatusFlt] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editBill,  setEditBill]  = useState(null)

  // Pre-fill from Purchase Order navigation
  useEffect(() => {
    if (location.state?.fromPO) {
      const po = location.state.fromPO
      setEditBill({ vendor: po.vendor || '', date: po.date || '', lines: po.lines || [], vendorRef: '', billRef: '', billBody: `From PO: ${po.poId}` })
      setModalOpen(true)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const filtered = bills.filter(b => {
    const q = search.toLowerCase()
    return (!search || b.id.toLowerCase().includes(q) || b.vendor.toLowerCase().includes(q)) &&
           (statusFlt === 'All' || b.status === statusFlt)
  })

  const openNew  = ()  => { setEditBill(null); setModalOpen(true) }
  const openEdit = (b) => { setEditBill(b);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false); setEditBill(null) }

  const handleSave = (data, newStatus) => {
    const total = data.lines.reduce((s, l) => s + (Number(l.total)||0), 0)
    if (editBill) {
      setBills(prev => prev.map(b => b.id === editBill.id ? { ...b, ...data, total, status: newStatus || b.status } : b))
    } else {
      setBills(prev => [...prev, { id: nextBillId(), total, status: newStatus || 'Draft', ...data }])
    }
    close()
  }

  const handlePay = (data) => {
    const total = data.lines.reduce((s, l) => s + (Number(l.total)||0), 0)
    const id = editBill?.id || nextBillId()
    setBills(prev => {
      const exists = prev.find(b => b.id === id)
      if (exists) return prev.map(b => b.id === id ? { ...b, ...data, total, status: 'Paid' } : b)
      return [...prev, { id, total, status: 'Paid', ...data }]
    })
    close()
    navigate('/dashboard/data/payments', { state: { fromBill: { ...data, billId: id, total, vendor: data.vendor } } })
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this vendor bill?')) setBills(prev => prev.filter(b => b.id !== id))
  }

  return (
    <DashboardLayout>
      <div className="df-page">
        <div className="df-breadcrumb">Data Input Forms <span>›</span> Vendor Bills</div>
        <div className="df-header">
          <div><h1 className="df-title">Vendor Bills</h1><p className="df-subtitle">{bills.length} bills</p></div>
          <button className="df-add-btn" onClick={openNew}><PlusIcon /> New</button>
        </div>
        <div className="df-toolbar">
          <div className="df-search-wrap"><SearchIcon /><input className="df-search" type="search" placeholder="Search bills..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <select className="df-filter" value={statusFlt} onChange={e => setStatusFlt(e.target.value)}>
            {['All','Draft','Confirmed','Paid'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="df-card">
          <table className="df-table">
            <thead><tr><th>Bill Ref</th><th>Vendor Bill Ref</th><th>Vendor</th><th>Bill Date</th><th className="align-right">Total</th><th className="align-center">Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="df-tr">
                  <td><button className="df-link-btn" onClick={() => openEdit(b)}>{b.id}</button></td>
                  <td className="df-date">{b.vendorRef}</td>
                  <td className="df-vendor">{b.vendor}</td>
                  <td className="df-date">{b.date}</td>
                  <td className="align-right df-total">{fmtINR(b.total)}</td>
                  <td className="align-center"><span className={`df-badge ${STATUS_STYLE[b.status]||''}`}>{b.status}</span></td>
                  <td><div className="df-actions"><button className="df-edit-btn" onClick={() => openEdit(b)}>Edit</button><button className="df-del-btn" onClick={() => handleDelete(b.id)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="df-footer"><span className="df-count">Showing {filtered.length} of {bills.length}</span></div>
        </div>
      </div>
      <VendorBillModal isOpen={modalOpen} onClose={close} onSave={handleSave} onPay={handlePay} editBill={editBill} />
    </DashboardLayout>
  )
}

/* ── Vendor Bill Form Modal ── */
function VendorBillModal({ isOpen, onClose, onSave, onPay, editBill }) {
  const [fields,      setFields]      = useState(EMPTY_BILL)
  const [errors,      setErrors]      = useState({})
  const [confirmed,   setConfirmed]   = useState(false)
  const [vendorDrop,  setVendorDrop]  = useState(false)
  const [prodDropIdx, setProdDropIdx] = useState(null)
  const [acctDropIdx, setAcctDropIdx] = useState(null)
  const firstRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      if (editBill) {
        setFields({ vendorRef: editBill.vendorRef||'', vendor: editBill.vendor||'', billRef: editBill.billRef||'',
          billBody: editBill.billBody||'', date: editBill.date||'',
          lines: editBill.lines?.length ? editBill.lines.map(l=>({...l})) : [{ ...EMPTY_LINE },{ ...EMPTY_LINE }] })
        setConfirmed(editBill.status === 'Confirmed' || editBill.status === 'Paid')
      } else { setFields(EMPTY_BILL); setConfirmed(false) }
      setErrors({})
    }
  }, [isOpen, editBill])

  useEffect(() => { if (isOpen) setTimeout(() => firstRef.current?.focus(), 60) }, [isOpen])
  const hk = useCallback(e => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => { if (isOpen) document.addEventListener('keydown', hk); return () => document.removeEventListener('keydown', hk) }, [isOpen, hk])
  useEffect(() => {
    const h = () => { setVendorDrop(false); setProdDropIdx(null); setAcctDropIdx(null) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  if (!isOpen) return null

  const totalAmount = fields.lines.reduce((s, l) => s + (Number(l.total)||0), 0)

  const changeField = (name, value) => { setFields(p => ({ ...p, [name]: value })); setErrors(p => ({ ...p, [name]: undefined })) }

  const updateLine = (idx, key, value) => {
    setFields(p => {
      const lines = p.lines.map((l, i) => {
        if (i !== idx) return l
        const updated = { ...l, [key]: value }
        if (key === 'qty' || key === 'unitPrice') {
          updated.total = (Number(key==='qty'?value:l.qty)||0) * (Number(key==='unitPrice'?value:l.unitPrice)||0)
        }
        return updated
      })
      return { ...p, lines }
    })
  }

  const selectAccount = (idx, acct) => {
    updateLine(idx, 'account', acct.name); updateLine(idx, 'accountCode', acct.code)
    setAcctDropIdx(null)
  }

  const addLine    = () => setFields(p => ({ ...p, lines: [...p.lines, { ...EMPTY_LINE }] }))
  const removeLine = (idx) => { if (fields.lines.length > 1) setFields(p => ({ ...p, lines: p.lines.filter((_,i) => i !== idx) })) }

  const validate = () => {
    const e = {}
    if (!fields.vendor) e.vendor = 'Vendor is required'
    if (!fields.date)   e.date   = 'Bill date is required'
    return e
  }

  const handleConfirm = () => {
    const v = validate(); if (Object.keys(v).length) { setErrors(v); return }
    setConfirmed(true); onSave(fields, 'Confirmed')
  }

  const handlePay = () => {
    if (!confirmed) { alert('Please confirm the bill before payment.'); return }
    onPay(fields)
  }

  const billId = editBill?.id || `BILL/2026/${String(billCounter).padStart(4,'0')}`

  return (
    <div className="dfm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dfm-panel dfm-panel--wide">
        <div className="dfm-topbar">
          <div className="dfm-topbar-left">
            <button type="button" className="dfm-btn dfm-btn--new" onClick={() => { setFields(EMPTY_BILL); setErrors({}); setConfirmed(false) }}>New</button>
            <button type="button" className={`dfm-btn dfm-btn--confirm${confirmed?' dfm-btn--confirmed':''}`} onClick={handleConfirm}>{confirmed?'✓ Confirmed':'Confirm'}</button>
            <button type="button" className="dfm-btn dfm-btn--action" onClick={handlePay}>Pay</button>
          </div>
          <div className="dfm-topbar-right">
            <button type="button" className="dfm-btn dfm-btn--cancel" onClick={() => { setFields(EMPTY_BILL); setErrors({}); setConfirmed(false) }}>Cancel</button>
            <button type="button" className="dfm-btn dfm-btn--back" onClick={onClose}>Back</button>
            <button type="button" className="dfm-close" onClick={onClose}><XIcon /></button>
          </div>
        </div>

        <h2 className="dfm-title">{editBill ? `Edit ${editBill.id}` : 'New Vendor Bill'}</h2>

        {/* Two-column header */}
        <div className="dfm-body">
          <div className="dfm-two-col">
            <div className="dfm-col">
              <div className="dfm-field">
                <label className="dfm-lbl">Vendor Bill Ref</label>
                <div className="dfm-input-wrap">
                  <input ref={firstRef} type="text" className="dfm-input" placeholder="Vendor's reference number"
                    value={fields.vendorRef} onChange={e => changeField('vendorRef', e.target.value)} autoComplete="off" />
                </div>
              </div>
              <div className="dfm-field">
                <label className="dfm-lbl">Vendor Name</label>
                <div className="dfm-input-wrap dfm-dropdown-wrap">
                  <input type="text" className={`dfm-input${errors.vendor?' dfm-input--err':''}`}
                    placeholder="Select vendor..." value={fields.vendor}
                    onChange={e => { changeField('vendor', e.target.value); setVendorDrop(true) }}
                    onFocus={() => setVendorDrop(true)} autoComplete="off" />
                  {vendorDrop && (
                    <div className="dfm-dropdown">
                      {VENDORS.filter(v => v.toLowerCase().includes(fields.vendor.toLowerCase())).map(v => (
                        <button key={v} type="button" className="dfm-drop-opt" onMouseDown={() => { changeField('vendor', v); setVendorDrop(false) }}>{v}</button>
                      ))}
                    </div>
                  )}
                  {errors.vendor && <span className="dfm-err">{errors.vendor}</span>}
                </div>
              </div>
              <div className="dfm-field">
                <label className="dfm-lbl">Bill Date</label>
                <div className="dfm-input-wrap">
                  <input type="date" className={`dfm-input${errors.date?' dfm-input--err':''}`}
                    value={fields.date} onChange={e => changeField('date', e.target.value)} />
                  {errors.date && <span className="dfm-err">{errors.date}</span>}
                </div>
              </div>
            </div>
            <div className="dfm-col">
              <div className="dfm-field">
                <label className="dfm-lbl">Bill No.</label>
                <div className="dfm-input-wrap"><span className="dfm-readonly">{billId}</span></div>
              </div>
              <div className="dfm-field">
                <label className="dfm-lbl">Bill Reference</label>
                <div className="dfm-input-wrap">
                  <input type="text" className="dfm-input" placeholder="Internal reference"
                    value={fields.billRef} onChange={e => changeField('billRef', e.target.value)} autoComplete="off" />
                </div>
              </div>
              <div className="dfm-field">
                <label className="dfm-lbl">Bill Body</label>
                <div className="dfm-input-wrap">
                  <input type="text" className="dfm-input" placeholder="Description / notes"
                    value={fields.billBody} onChange={e => changeField('billBody', e.target.value)} autoComplete="off" />
                </div>
              </div>
            </div>
          </div>

          {/* Bill Body line items */}
          <div className="dfm-lines-section">
            <div className="dfm-lines-title">Bill Body</div>
            <table className="dfm-lines-table">
              <thead>
                <tr>
                  <th style={{width:36}}>Sr</th>
                  <th>Product</th>
                  <th>Account of Amount</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th className="align-right">Unit Price</th>
                  <th className="align-right">Total</th>
                  <th style={{width:32}}></th>
                </tr>
              </thead>
              <tbody>
                {fields.lines.map((line, idx) => {
                  const prodOpts = PRODUCTS.filter(p => !line.product || p.toLowerCase().includes(line.product.toLowerCase()))
                  const acctOpts = COA_ACCOUNTS.filter(a => !line.account || a.name.toLowerCase().includes(line.account.toLowerCase()))
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
                            {prodOpts.map(p => <button key={p} type="button" className="dfm-line-opt" onMouseDown={() => { updateLine(idx,'product',p); setProdDropIdx(null) }}>{p}</button>)}
                          </div>
                        )}
                      </td>
                      {/* Account */}
                      <td className="dfm-line-td" style={{position:'relative'}}>
                        <input type="text" className="dfm-line-input" placeholder="Account..."
                          value={line.account}
                          onChange={e => { updateLine(idx,'account',e.target.value); setAcctDropIdx(idx) }}
                          onFocus={() => setAcctDropIdx(idx)} autoComplete="off" />
                        {acctDropIdx===idx && acctOpts.length>0 && (
                          <div className="dfm-line-dropdown">
                            {acctOpts.map(a => (
                              <button key={a.code} type="button" className="dfm-line-opt" onMouseDown={() => selectAccount(idx, a)}>
                                <span className="dfm-opt-code">{a.code}</span><span>{a.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="dfm-line-td"><input type="text" className="dfm-line-input" placeholder="Description" value={line.description} onChange={e => updateLine(idx,'description',e.target.value)} /></td>
                      <td className="dfm-line-td"><input type="number" className="dfm-line-input dfm-line-input--num" placeholder="Qty" value={line.qty} onChange={e => updateLine(idx,'qty',e.target.value)} /></td>
                      <td className="dfm-line-td"><input type="number" className="dfm-line-input dfm-line-input--num" placeholder="0.00" value={line.unitPrice} onChange={e => updateLine(idx,'unitPrice',e.target.value)} /></td>
                      <td className="dfm-line-td dfm-line-total">{line.total>0?fmtINR(line.total):'—'}</td>
                      <td className="dfm-line-td">{fields.lines.length>1&&<button type="button" className="dfm-remove-btn" onClick={() => removeLine(idx)}><TrashIcon /></button>}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="dfm-total-row">
                  <td colSpan={6} className="dfm-total-label">Total</td>
                  <td className="dfm-total-val">{fmtINR(totalAmount)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            <button type="button" className="dfm-add-line-btn" onClick={addLine}><PlusSmIcon /> Add Line</button>
          </div>

          {/* Blocking warning */}
          {totalAmount > 0 && !confirmed && (
            <div className="dfm-warning-box dfm-warning-box--info">
              <div className="dfm-warning-title">⚠ Amount Imported Budget</div>
              <p>The running total <strong>{fmtINR(totalAmount)}</strong> could cause issues in the Journal — debit and credit must match. The debit and credit amounts need to be defined.</p>
            </div>
          )}

          {/* Notes */}
          <div className="dfm-notes-box">
            <p>As soon as the status of the payment is confirmed, payment associated to inserted field could have creation in the Form of Writing sectors; that could have all account type transactions needs to be defined.</p>
            <p>If the debit and credit don't match throw an error in the Journal Entry.</p>
          </div>
        </div>

        <div className="dfm-footer">
          <button type="button" className="dfm-save-btn" onClick={() => { const v=validate(); if(Object.keys(v).length){setErrors(v);return} onSave(fields, editBill?.status||'Draft') }}>
            {editBill ? 'Update Bill' : 'Save as Draft'}
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
