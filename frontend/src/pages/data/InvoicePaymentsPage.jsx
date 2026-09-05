import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import './DataForms.css'

const PARTNERS  = ['Ratan Mehra','Priya Kapoor','Ananya Sharma','Mahindra Living','Godrej Interio Ltd.']
const PAY_TYPES = ['Receive', 'Send']
const PAY_VIA   = ['Bank', 'Cash']

const STATUS_STYLE = { Draft:'df-badge--draft', Confirmed:'df-badge--confirmed', Cancelled:'df-badge--overdue' }
const fmtINR = (n) => `₹${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const INITIAL_PAYMENTS = [
  { id: 'INVPAY-001', paymentType:'Receive', partner:'Ratan Mehra',  date:'2026-09-02', paymentVia:'Bank', amount:56640,  memo:'Payment for INV/2026/0001', status:'Confirmed' },
  { id: 'INVPAY-002', paymentType:'Receive', partner:'Priya Kapoor', date:'2026-09-10', paymentVia:'Bank', amount:126850, memo:'Payment for INV/2026/0002', status:'Draft'     },
]

const EMPTY_PAY = { paymentType:'Receive', partner:'', date:'', paymentVia:'Bank', amount:'', memo:'' }

let payCounter = INITIAL_PAYMENTS.length + 1
function nextPayId() { return `INVPAY-${String(payCounter++).padStart(3,'0')}` }

export default function InvoicePaymentsPage() {
  const location = useLocation()
  const [payments,  setPayments]  = useState(INITIAL_PAYMENTS)
  const [search,    setSearch]    = useState('')
  const [statusFlt, setStatusFlt] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editPay,   setEditPay]   = useState(null)

  useEffect(() => {
    if (location.state?.fromInvoice) {
      const inv = location.state.fromInvoice
      setEditPay({ paymentType:'Receive', partner: inv.customer||'', date: inv.invoiceDate||'', paymentVia:'Bank', amount: inv.total||'', memo:`Payment for ${inv.invoiceId}` })
      setModalOpen(true)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    return (!search || p.id.toLowerCase().includes(q) || p.partner.toLowerCase().includes(q)) &&
           (statusFlt === 'All' || p.status === statusFlt)
  })

  const openNew  = ()  => { setEditPay(null); setModalOpen(true) }
  const openEdit = (p) => { setEditPay(p);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false); setEditPay(null) }

  const handleSave = (data, newStatus) => {
    if (editPay) {
      setPayments(prev => prev.map(p => p.id === editPay.id ? { ...p, ...data, status: newStatus||p.status } : p))
    } else {
      setPayments(prev => [...prev, { id: nextPayId(), status: newStatus||'Draft', ...data }])
    }
    close()
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this payment?')) setPayments(prev => prev.filter(p => p.id !== id))
  }

  return (
    <DashboardLayout>
      <div className="df-page">
        <div className="df-breadcrumb">Data Input Forms <span>›</span> Invoice Payments</div>
        <div className="df-header">
          <div><h1 className="df-title">Invoice Payments</h1><p className="df-subtitle">{payments.length} payments</p></div>
          <button className="df-add-btn" onClick={openNew}><PlusIcon /> New</button>
        </div>
        <div className="df-toolbar">
          <div className="df-search-wrap"><SearchIcon /><input className="df-search" type="search" placeholder="Search payments..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <select className="df-filter" value={statusFlt} onChange={e=>setStatusFlt(e.target.value)}>
            {['All','Draft','Confirmed','Cancelled'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="df-card">
          <table className="df-table">
            <thead><tr><th>Payment No.</th><th>Partner</th><th>Type</th><th>Date</th><th>Via</th><th className="align-right">Amount</th><th className="align-center">Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(p=>(
                <tr key={p.id} className="df-tr">
                  <td><button className="df-link-btn" onClick={()=>openEdit(p)}>{p.id}</button></td>
                  <td className="df-vendor">{p.partner}</td>
                  <td><span className={`df-badge ${p.paymentType==='Receive'?'df-badge--confirmed':'df-badge--draft'}`}>{p.paymentType}</span></td>
                  <td className="df-date">{p.date}</td>
                  <td>{p.paymentVia}</td>
                  <td className="align-right df-total">{fmtINR(p.amount)}</td>
                  <td className="align-center"><span className={`df-badge ${STATUS_STYLE[p.status]||''}`}>{p.status}</span></td>
                  <td><div className="df-actions"><button className="df-edit-btn" onClick={()=>openEdit(p)}>Edit</button><button className="df-del-btn" onClick={()=>handleDelete(p.id)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="df-footer"><span className="df-count">Showing {filtered.length} of {payments.length}</span></div>
        </div>
      </div>
      <InvoicePaymentModal isOpen={modalOpen} onClose={close} onSave={handleSave} editPayment={editPay} />
    </DashboardLayout>
  )
}

/* ── Invoice Payment Modal ── */
function InvoicePaymentModal({ isOpen, onClose, onSave, editPayment }) {
  const [fields,      setFields]      = useState(EMPTY_PAY)
  const [errors,      setErrors]      = useState({})
  const [partnerDrop, setPartnerDrop] = useState(false)
  const firstRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setFields(editPayment ? { paymentType: editPayment.paymentType||'Receive', partner: editPayment.partner||'',
        date: editPayment.date||'', paymentVia: editPayment.paymentVia||'Bank',
        amount: editPayment.amount||'', memo: editPayment.memo||'' } : EMPTY_PAY)
      setErrors({})
    }
  }, [isOpen, editPayment])

  useEffect(() => { if (isOpen) setTimeout(() => firstRef.current?.focus(), 60) }, [isOpen])
  const hk = useCallback(e => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => { if (isOpen) document.addEventListener('keydown', hk); return () => document.removeEventListener('keydown', hk) }, [isOpen, hk])
  useEffect(() => {
    const h = () => setPartnerDrop(false)
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  if (!isOpen) return null

  const change = (name, value) => { setFields(p=>({...p,[name]:value})); setErrors(p=>({...p,[name]:undefined})) }

  const validate = () => {
    const e = {}
    if (!fields.partner) e.partner = 'Partner is required'
    if (!fields.date)    e.date    = 'Date is required'
    if (!fields.amount || isNaN(Number(fields.amount)) || Number(fields.amount) <= 0) e.amount = 'Enter a valid amount'
    return e
  }

  const handleConfirm = () => {
    const v = validate(); if (Object.keys(v).length) { setErrors(v); return }
    onSave(fields, 'Confirmed')
  }

  const handleCancel = () => {
    if (editPayment) { onSave({ ...fields }, 'Cancelled') } else { setFields(EMPTY_PAY); setErrors({}) }
  }

  const partnerOpts = PARTNERS.filter(p => !fields.partner || p.toLowerCase().includes(fields.partner.toLowerCase()))
  const payId = editPayment?.id || `INVPAY-${String(payCounter).padStart(3,'0')}`

  return (
    <div className="dfm-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="dfm-panel">
        {/* Topbar: Confirm | Cancel | Back (matching wireframe) */}
        <div className="dfm-topbar">
          <div className="dfm-topbar-left">
            <button type="button" className="dfm-btn dfm-btn--new" onClick={handleConfirm}>Confirm</button>
          </div>
          <div className="dfm-topbar-right">
            <button type="button" className="dfm-btn dfm-btn--cancel" onClick={handleCancel}>Cancel</button>
            <button type="button" className="dfm-btn dfm-btn--back" onClick={onClose}>Back</button>
            <button type="button" className="dfm-close" onClick={onClose}><XIcon /></button>
          </div>
        </div>

        <h2 className="dfm-title">{editPayment?`Edit ${editPayment.id}`:'New Invoice Payment'}</h2>

        <div className="dfm-body">
          {/* Payment No */}
          <div className="dfm-field">
            <label className="dfm-lbl">Payment No.</label>
            <div className="dfm-input-wrap"><span className="dfm-readonly">{payId}</span></div>
          </div>

          {/* Payment Type — pill toggle matching wireframe: Receive | Send | Both */}
          <div className="dfm-field">
            <label className="dfm-lbl">Payment Type</label>
            <div className="dfm-input-wrap">
              <div className="dfm-type-toggle">
                {PAY_TYPES.map(t=>(
                  <button key={t} type="button"
                    className={`dfm-type-btn${fields.paymentType===t?' dfm-type-btn--active':''}`}
                    onClick={()=>change('paymentType',t)} aria-pressed={fields.paymentType===t}>
                    {t}
                  </button>
                ))}
              </div>
              <span className="dfm-hint">
                {fields.paymentType==='Receive'&&'Receiving payment from customer'}
                {fields.paymentType==='Send'&&'Sending payment to vendor'}
                {fields.paymentType==='Both'&&'Both incoming and outgoing'}
              </span>
            </div>
          </div>

          {/* Partner */}
          <div className="dfm-field">
            <label className="dfm-lbl">Partner</label>
            <div className="dfm-input-wrap dfm-dropdown-wrap">
              <input ref={firstRef} type="text" className={`dfm-input${errors.partner?' dfm-input--err':''}`}
                placeholder="Select partner..."
                value={fields.partner}
                onChange={e=>{change('partner',e.target.value);setPartnerDrop(true)}}
                onFocus={()=>setPartnerDrop(true)} autoComplete="off" />
              {partnerDrop&&partnerOpts.length>0&&(
                <div className="dfm-dropdown">
                  {partnerOpts.map(p=><button key={p} type="button" className="dfm-drop-opt" onMouseDown={()=>{change('partner',p);setPartnerDrop(false)}}>{p}</button>)}
                </div>
              )}
              {errors.partner&&<span className="dfm-err">{errors.partner}</span>}
            </div>
          </div>

          {/* Date */}
          <div className="dfm-field">
            <label className="dfm-lbl">Date</label>
            <div className="dfm-input-wrap">
              <input type="date" className={`dfm-input${errors.date?' dfm-input--err':''}`}
                value={fields.date} onChange={e=>change('date',e.target.value)} />
              {errors.date&&<span className="dfm-err">{errors.date}</span>}
            </div>
          </div>

          {/* Payment Via — Bank / Cash */}
          <div className="dfm-field">
            <label className="dfm-lbl">Payment Via</label>
            <div className="dfm-input-wrap">
              <div className="dfm-type-toggle">
                {PAY_VIA.map(v=>(
                  <button key={v} type="button"
                    className={`dfm-type-btn${fields.paymentVia===v?' dfm-type-btn--active':''}`}
                    onClick={()=>change('paymentVia',v)}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="dfm-field">
            <label className="dfm-lbl">Amount</label>
            <div className="dfm-input-wrap">
              <div className="dfm-price-wrap">
                <span className="dfm-price-prefix">₹</span>
                <input type="number" min="0" step="0.01"
                  className={`dfm-input${errors.amount?' dfm-input--err':''}`}
                  placeholder="0.00" value={fields.amount}
                  onChange={e=>change('amount',e.target.value)} />
              </div>
              {errors.amount&&<span className="dfm-err">{errors.amount}</span>}
            </div>
          </div>

          {/* Memo */}
          <div className="dfm-field">
            <label className="dfm-lbl">Memo</label>
            <div className="dfm-input-wrap">
              <input type="text" className="dfm-input" placeholder="Alpha Numeric (Text)"
                value={fields.memo} onChange={e=>change('memo',e.target.value)} autoComplete="off" />
            </div>
          </div>

          {/* Summary box */}
          {fields.amount>0&&fields.partner&&(
            <div className="dfm-payment-summary">
              <div className="dfm-ps-row">
                <span>{fields.paymentType==='Receive'?'Receiving from':'Paying to'}:</span>
                <strong>{fields.partner}</strong>
              </div>
              <div className="dfm-ps-row">
                <span>Amount via {fields.paymentVia}:</span>
                <strong className="dfm-ps-amount">{fmtINR(fields.amount)}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="dfm-footer">
          <button type="button" className="dfm-save-btn" onClick={()=>{const v=validate();if(Object.keys(v).length){setErrors(v);return};onSave(fields,editPayment?.status||'Draft')}}>
            {editPayment?'Update Payment':'Save as Draft'}
          </button>
          <button type="button" className="dfm-cancel-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function XIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function PlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function SearchIcon(){ return <svg className="df-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
