import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import Pagination, { usePagination } from '../../components/Pagination'
import './DataForms.css'

const PARTNERS = ['Timber World', 'Steel Hub', 'Fabric Co.', 'Godrej Interio Ltd.', 'Ratan Mehra', 'Priya Kapoor', 'Ananya Sharma']
const ACCOUNTS = [
  { code: '1001', name: 'HDFC Bank – Current Account', journal: 'Bank' },
  { code: '1002', name: 'Petty Cash',                  journal: 'Cash' },
]

const STATUS_STYLE = { Draft: 'df-badge--draft', Posted: 'df-badge--confirmed' }
const fmtINR = (n) => `₹${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const INITIAL_PAYMENTS = [
  { id: 'PAY-001', paymentType: 'Send',    partner: 'Timber World', amount: 73160, account: 'HDFC Bank – Current Account', accountCode: '1001', journal: 'Bank', memo: 'Payment for PO-001', status: 'Posted' },
  { id: 'PAY-002', paymentType: 'Send',    partner: 'Steel Hub',    amount: 45430, account: 'Petty Cash',                  accountCode: '1002', journal: 'Cash', memo: 'Payment for PO-002', status: 'Draft'  },
]

const EMPTY_PAYMENT = { paymentType: 'Send', partner: '', amount: '', account: '', accountCode: '', journal: '', memo: '' }

let payCounter = INITIAL_PAYMENTS.length + 1
function nextPayId() { return `PAY-${String(payCounter++).padStart(3,'0')}` }

export default function PaymentsPage() {
  const location = useLocation()
  const [payments,  setPayments]  = useState(INITIAL_PAYMENTS)
  const [search,    setSearch]    = useState('')
  const [statusFlt, setStatusFlt] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editPay,   setEditPay]   = useState(null)

  // Pre-fill from Vendor Bill navigation
  useEffect(() => {
    if (location.state?.fromBill) {
      const b = location.state.fromBill
      setEditPay({ paymentType: 'Send', partner: b.vendor||'', amount: b.total||'', account: '', accountCode: '', journal: '', memo: `Payment for ${b.billId}` })
      setModalOpen(true)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    return (!search || p.id.toLowerCase().includes(q) || p.partner.toLowerCase().includes(q)) &&
           (statusFlt === 'All' || p.status === statusFlt)
  })

  const { page, setPage, paged, total: totalFiltered } = usePagination(filtered, 10)

  const openNew  = ()  => { setEditPay(null); setModalOpen(true) }
  const openEdit = (p) => { setEditPay(p);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false); setEditPay(null) }

  const handleSave = (data, newStatus) => {
    if (editPay) {
      setPayments(prev => prev.map(p => p.id === editPay.id ? { ...p, ...data, status: newStatus || p.status } : p))
    } else {
      setPayments(prev => [...prev, { id: nextPayId(), status: newStatus || 'Draft', ...data }])
    }
    close()
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this payment?')) setPayments(prev => prev.filter(p => p.id !== id))
  }

  return (
    <DashboardLayout>
      <div className="df-page">
        <div className="df-breadcrumb">Data Input Forms <span>›</span> Payments</div>
        <div className="df-header">
          <div><h1 className="df-title">Payments</h1><p className="df-subtitle">{payments.length} payments</p></div>
          <button className="df-add-btn" onClick={openNew}><PlusIcon /> New</button>
        </div>
        <div className="df-toolbar">
          <div className="df-search-wrap"><SearchIcon /><input className="df-search" type="search" placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <select className="df-filter" value={statusFlt} onChange={e => setStatusFlt(e.target.value)}>
            {['All','Draft','Posted'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="df-card">
          <table className="df-table">
            <thead><tr><th>Payment No.</th><th>Partner</th><th>Type</th><th className="align-right">Amount</th><th>Account</th><th>Journal</th><th className="align-center">Status</th><th>Actions</th></tr></thead>
            <tbody>
              {paged.map(p => (
                <tr key={p.id} className="df-tr">
                  <td><button className="df-link-btn" onClick={() => openEdit(p)}>{p.id}</button></td>
                  <td className="df-vendor">{p.partner}</td>
                  <td><span className={`df-badge ${p.paymentType==='Send'?'df-badge--draft':'df-badge--confirmed'}`}>{p.paymentType}</span></td>
                  <td className="align-right df-total">{fmtINR(p.amount)}</td>
                  <td className="df-date">{p.account}</td>
                  <td>{p.journal}</td>
                  <td className="align-center"><span className={`df-badge ${STATUS_STYLE[p.status]||''}`}>{p.status}</span></td>
                  <td><div className="df-actions"><button className="df-edit-btn" onClick={() => openEdit(p)}>Edit</button><button className="df-del-btn" onClick={() => handleDelete(p.id)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination total={totalFiltered} page={page} pageSize={10} onChange={setPage} />
        </div>
      </div>
      <PaymentModal isOpen={modalOpen} onClose={close} onSave={handleSave} editPayment={editPay} />
    </DashboardLayout>
  )
}

/* ── Payment Form Modal ── */
function PaymentModal({ isOpen, onClose, onSave, editPayment }) {
  const [fields,  setFields]  = useState(EMPTY_PAYMENT)
  const [errors,  setErrors]  = useState({})
  const [partnerDrop, setPartnerDrop] = useState(false)
  const [acctDrop,    setAcctDrop]    = useState(false)
  const firstRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setFields(editPayment ? { paymentType: editPayment.paymentType||'Send', partner: editPayment.partner||'',
        amount: editPayment.amount||'', account: editPayment.account||'', accountCode: editPayment.accountCode||'',
        journal: editPayment.journal||'', memo: editPayment.memo||'' } : EMPTY_PAYMENT)
      setErrors({})
    }
  }, [isOpen, editPayment])

  useEffect(() => { if (isOpen) setTimeout(() => firstRef.current?.focus(), 60) }, [isOpen])
  const hk = useCallback(e => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => { if (isOpen) document.addEventListener('keydown', hk); return () => document.removeEventListener('keydown', hk) }, [isOpen, hk])
  useEffect(() => {
    const h = () => { setPartnerDrop(false); setAcctDrop(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  if (!isOpen) return null

  const change = (name, value) => { setFields(p => ({ ...p, [name]: value })); setErrors(p => ({ ...p, [name]: undefined })) }

  const selectAccount = (acct) => {
    change('account', acct.name); change('accountCode', acct.code); change('journal', acct.journal)
    setAcctDrop(false)
  }

  const validate = () => {
    const e = {}
    if (!fields.partner) e.partner = 'Partner is required'
    if (!fields.amount || isNaN(Number(fields.amount)) || Number(fields.amount) <= 0) e.amount = 'Enter a valid amount'
    if (!fields.account) e.account = 'Account is required'
    return e
  }

  const handlePost = () => {
    const v = validate(); if (Object.keys(v).length) { setErrors(v); return }
    onSave(fields, 'Posted')
  }

  const payId = editPayment?.id || `PAY-${String(payCounter).padStart(3,'0')}`

  const partnerOpts = PARTNERS.filter(p => !fields.partner || p.toLowerCase().includes(fields.partner.toLowerCase()))
  const acctOpts    = ACCOUNTS.filter(a => !fields.account  || a.name.toLowerCase().includes(fields.account.toLowerCase()))

  return (
    <div className="dfm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dfm-panel">
        {/* Topbar: Post | Cancel | Back */}
        <div className="dfm-topbar">
          <div className="dfm-topbar-left">
            <button type="button" className="dfm-btn dfm-btn--new" onClick={handlePost}>Post</button>
          </div>
          <div className="dfm-topbar-right">
            <button type="button" className="dfm-btn dfm-btn--cancel" onClick={() => { setFields(EMPTY_PAYMENT); setErrors({}) }}>Cancel</button>
            <button type="button" className="dfm-btn dfm-btn--back" onClick={onClose}>Back</button>
            <button type="button" className="dfm-close" onClick={onClose}><XIcon /></button>
          </div>
        </div>

        <h2 className="dfm-title">{editPayment ? `Edit ${editPayment.id}` : 'New Payment'}</h2>
        <div className="dfm-body">

          {/* Payment No (read-only) */}
          <div className="dfm-field">
            <label className="dfm-lbl">Payment No.</label>
            <div className="dfm-input-wrap"><span className="dfm-readonly">{payId}</span></div>
          </div>

          {/* Payment Type toggle */}
          <div className="dfm-field">
            <label className="dfm-lbl">Payment Type</label>
            <div className="dfm-input-wrap">
              <div className="dfm-type-toggle">
                {['Receive','Send'].map(t => (
                  <button key={t} type="button"
                    className={`dfm-type-btn${fields.paymentType===t?' dfm-type-btn--active':''}`}
                    onClick={() => change('paymentType', t)} aria-pressed={fields.paymentType===t}>
                    {t}
                  </button>
                ))}
              </div>
              <span className="dfm-hint">{fields.paymentType==='Send'?'Paying a vendor / outgoing payment':'Receiving from customer / incoming payment'}</span>
            </div>
          </div>

          {/* Partner */}
          <div className="dfm-field">
            <label className="dfm-lbl">Partner</label>
            <div className="dfm-input-wrap dfm-dropdown-wrap">
              <input ref={firstRef} type="text" className={`dfm-input${errors.partner?' dfm-input--err':''}`}
                placeholder="Select partner..." value={fields.partner}
                onChange={e => { change('partner', e.target.value); setPartnerDrop(true) }}
                onFocus={() => setPartnerDrop(true)} autoComplete="off" />
              {partnerDrop && partnerOpts.length > 0 && (
                <div className="dfm-dropdown">
                  {partnerOpts.map(p => <button key={p} type="button" className="dfm-drop-opt" onMouseDown={() => { change('partner', p); setPartnerDrop(false) }}>{p}</button>)}
                </div>
              )}
              {errors.partner && <span className="dfm-err">{errors.partner}</span>}
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
                  onChange={e => change('amount', e.target.value)} />
              </div>
              {errors.amount && <span className="dfm-err">{errors.amount}</span>}
            </div>
          </div>

          {/* Account */}
          <div className="dfm-field">
            <label className="dfm-lbl">Account</label>
            <div className="dfm-input-wrap dfm-dropdown-wrap">
              <input type="text" className={`dfm-input${errors.account?' dfm-input--err':''}`}
                placeholder="Search bank/cash account..." value={fields.account}
                onChange={e => { change('account', e.target.value); setAcctDrop(true) }}
                onFocus={() => setAcctDrop(true)} autoComplete="off" />
              {acctDrop && acctOpts.length > 0 && (
                <div className="dfm-dropdown">
                  {acctOpts.map(a => (
                    <button key={a.code} type="button" className="dfm-drop-opt" onMouseDown={() => selectAccount(a)}>
                      <span className="dfm-opt-code">{a.code}</span> {a.name}
                    </button>
                  ))}
                </div>
              )}
              {errors.account && <span className="dfm-err">{errors.account}</span>}
            </div>
          </div>

          {/* Journal (auto-filled) */}
          <div className="dfm-field">
            <label className="dfm-lbl">Journal</label>
            <div className="dfm-input-wrap">
              {fields.journal
                ? <span className="dfm-readonly dfm-readonly--filled">{fields.journal}</span>
                : <span className="dfm-hint">Auto-filled from Account selection</span>
              }
            </div>
          </div>

          {/* Memo */}
          <div className="dfm-field">
            <label className="dfm-lbl">Memo / Notes</label>
            <div className="dfm-input-wrap">
              <textarea className="dfm-textarea" placeholder="Payment notes or reference..."
                value={fields.memo} onChange={e => change('memo', e.target.value)} rows={3} />
            </div>
          </div>

          {/* Summary */}
          {fields.amount > 0 && fields.partner && (
            <div className="dfm-payment-summary">
              <div className="dfm-ps-row">
                <span>{fields.paymentType === 'Send' ? 'Paying to' : 'Receiving from'}:</span>
                <strong>{fields.partner}</strong>
              </div>
              <div className="dfm-ps-row">
                <span>Amount:</span>
                <strong className="dfm-ps-amount">{fmtINR(fields.amount)}</strong>
              </div>
              {fields.journal && <div className="dfm-ps-row"><span>Via:</span><strong>{fields.journal}</strong></div>}
            </div>
          )}
        </div>

        <div className="dfm-footer">
          <button type="button" className="dfm-save-btn" onClick={() => { const v=validate(); if(Object.keys(v).length){setErrors(v);return} onSave(fields, editPayment?.status||'Draft') }}>
            {editPayment ? 'Update Payment' : 'Save as Draft'}
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
