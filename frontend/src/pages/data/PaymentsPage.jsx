import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import Pagination, { usePagination } from '../../components/Pagination'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import './DataForms.css'

const PARTNERS = ['Timber World', 'Steel Hub', 'Fabric Co.', 'Godrej Interio Ltd.', 'Ratan Mehra', 'Priya Kapoor', 'Ananya Sharma']
const ACCOUNTS = [
  { code: '1001', name: 'HDFC Bank – Current Account', journal: 'Bank' },
  { code: '1002', name: 'Petty Cash',                  journal: 'Cash' },
]

const STATUS_STYLE = { Draft: 'df-badge--draft', Posted: 'df-badge--confirmed' }
const fmtINR = (n) => `₹${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const EMPTY_PAYMENT = { paymentType: 'Send', partner: '', partnerId: '', vendorBillId: '', amount: '', account: 'State Bank of India – Current A/c', accountCode: '1002', journal: 'Bank', memo: '' }

import { api, extractList } from '../../services/api'

export default function PaymentsPage() {
  const location = useLocation()
  const toast    = useToast()
  const confirm  = useConfirm()
  const [payments,  setPayments]  = useState([])
  const [partners,  setPartners]  = useState([])
  const [accounts,  setAccounts]  = useState([])
  const [bills,     setBills]     = useState([])
  const [loading,   setLoading]   = useState(false)
  const [search,    setSearch]    = useState('')
  const [statusFlt, setStatusFlt] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editPay,   setEditPay]   = useState(null)

  const loadPayments = useCallback(() => {
    setLoading(true)
    api.payments.list({ limit: 100 })
      .then(res => {
        const list = extractList(res)
        const vendorPayments = list.filter(p => p.type === 'VENDOR_PAYMENT' || !p.type)
        const mapped = vendorPayments.map(p => ({
          ...p,
          id: p.paymentNumber || p.id,
          rawId: p.id,
          paymentType: 'Send',
          partner: p.vendorBill?.vendor?.name || 'Vendor',
          amount: Number(p.amount || 0),
          account: p.paymentMethod === 'CASH' ? 'Petty Cash' : 'State Bank of India – Current A/c',
          accountCode: p.paymentMethod === 'CASH' ? '1001' : '1002',
          journal: p.paymentMethod === 'CASH' ? 'Cash' : 'Bank',
          status: 'Posted',
        }))
        setPayments(mapped)
      })
      .catch(err => console.warn('Could not load payments:', err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadPayments()
    api.contacts.list({ limit: 100 }).then(res => {
      setPartners(extractList(res))
    }).catch(e => console.warn('Failed to load contacts:', e.message))

    api.accounting.getAccounts().then(res => {
      setAccounts(extractList(res))
    }).catch(e => console.warn('Failed to load accounts:', e.message))

    api.purchases.listBills({ limit: 100 }).then(res => {
      setBills(extractList(res))
    }).catch(e => console.warn('Failed to load bills:', e.message))
  }, [loadPayments])

  // Pre-fill from Vendor Bill navigation
  useEffect(() => {
    if (location.state?.fromBill) {
      const b = location.state.fromBill
      setEditPay({
        paymentType: 'Send',
        partner: b.vendor||'',
        vendorBillId: b.vendorBillId || b.rawId || b.billId || '',
        amount: b.total||'',
        account: 'State Bank of India – Current A/c',
        accountCode: '1002',
        journal: 'Bank',
        memo: `Payment for ${b.id || b.billId || ''}`
      })
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

  const handleSave = async (data, newStatus) => {
    try {
      let bId = data.vendorBillId
      if (!bId && bills.length > 0) {
        const matching = bills.find(b => (b.vendor?.name || '').toLowerCase() === (data.partner || '').toLowerCase())
        if (matching) bId = matching.id
      }
      if (!bId && bills.length > 0) {
        bId = bills[0].id
      }

      if (!bId) {
        toast.warning('Please create or confirm a vendor bill first before recording payment.')
        return
      }

      const method = (data.journal || '').toLowerCase().includes('cash') ? 'CASH' : 'BANK'
      await api.payments.recordVendorPayment({
        vendorBillId: bId,
        paymentMethod: method,
        amount: parseFloat(data.amount) || 0,
        paymentDate: new Date().toISOString(),
        reference: data.memo || undefined,
      })

      loadPayments()
      toast.success(`Payment of ₹${data.amount} recorded successfully!`)
      close()
    } catch (err) {
      toast.error('Error recording payment: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Payment Record',
      message: `Delete payment record #${id}?`,
      detail: 'This will remove the recorded disbursement/receipt from the register.',
      confirmText: 'Delete Payment',
      confirmVariant: 'danger',
    })
    if (ok) {
      setPayments(prev => prev.filter(p => p.id !== id))
      toast.info(`Payment #${id} deleted`)
    }
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
      <PaymentModal
        isOpen={modalOpen}
        onClose={close}
        onSave={handleSave}
        editPayment={editPay}
        partners={partners}
        accounts={accounts}
      />
    </DashboardLayout>
  )
}

/* ── Payment Form Modal ── */
function PaymentModal({ isOpen, onClose, onSave, editPayment, partners = [], accounts = [] }) {
  const [fields,  setFields]  = useState(EMPTY_PAYMENT)
  const [errors,  setErrors]  = useState({})
  const [partnerDrop, setPartnerDrop] = useState(false)
  const [acctDrop,    setAcctDrop]    = useState(false)
  const firstRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setFields(editPayment ? {
        paymentType: editPayment.paymentType||'Send',
        partner: editPayment.partner||'',
        partnerId: editPayment.partnerId||'',
        vendorBillId: editPayment.vendorBillId||'',
        amount: editPayment.amount||'',
        account: editPayment.account||'',
        accountCode: editPayment.accountCode||'',
        journal: editPayment.journal||'Bank',
        memo: editPayment.memo||''
      } : EMPTY_PAYMENT)
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
    change('account', acct.name); change('accountCode', acct.code); change('journal', acct.type?.toLowerCase().includes('cash') ? 'Cash' : 'Bank')
    setAcctDrop(false)
  }

  const validate = () => {
    const e = {}
    if (!fields.partner && !fields.partnerId) e.partner = 'Partner is required'
    if (!fields.amount || isNaN(Number(fields.amount)) || Number(fields.amount) <= 0) e.amount = 'Enter a valid amount'
    return e
  }

  const handlePost = () => {
    const v = validate(); if (Object.keys(v).length) { setErrors(v); return }
    onSave(fields, 'Posted')
  }

  const payId = editPayment?.id || 'New Draft'

  const partnerOpts = partners.filter(p => {
    const pName = typeof p === 'string' ? p : (p?.name || '')
    return !fields.partner || pName.toLowerCase().includes(fields.partner.toLowerCase())
  })
  const liquidityAccounts = accounts.filter(a => {
    const typeName = (a.type || a.accountType || '').toLowerCase()
    const name = (a.name || '').toLowerCase()
    return typeName.includes('bank') || typeName.includes('cash') || name.includes('bank') || name.includes('cash') || name.includes('hand')
  })
  const baseAccountList = liquidityAccounts.length > 0 ? liquidityAccounts : ACCOUNTS
  const acctOpts    = baseAccountList.filter(a => !fields.account || a.name.toLowerCase().includes(fields.account.toLowerCase()))

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

        <h2 className="dfm-title">
          {editPayment
            ? (editPayment.paymentNumber || (editPayment.id && editPayment.id !== 'Draft' ? `Edit ${editPayment.id}` : 'Record Vendor Payment'))
            : 'New Payment'}
        </h2>
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
            <label className="dfm-lbl">
              Partner <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <div className="dfm-input-wrap dfm-dropdown-wrap">
              <input ref={firstRef} type="text" className={`dfm-input${errors.partner?' dfm-input--err':''}`}
                placeholder="Select partner..." value={fields.partner}
                onChange={e => { change('partner', e.target.value); setPartnerDrop(true) }}
                onFocus={() => setPartnerDrop(true)} autoComplete="off" />
              {partnerDrop && partnerOpts.length > 0 && (
                <div className="dfm-dropdown">
                  {partnerOpts.map(p => {
                    const pName = typeof p === 'string' ? p : (p?.name || '')
                    const pId = typeof p === 'object' ? p?.id : ''
                    return (
                      <button key={pId || pName} type="button" className="dfm-drop-opt"
                        onMouseDown={() => {
                          change('partner', pName)
                          if (pId) change('partnerId', pId)
                          setPartnerDrop(false)
                        }}>
                        {pName}
                      </button>
                    )
                  })}
                </div>
              )}
              {errors.partner && <span className="dfm-err">{errors.partner}</span>}
            </div>
          </div>

          {/* Amount */}
          <div className="dfm-field">
            <label className="dfm-lbl">
              Amount <span style={{ color: 'var(--error)' }}>*</span>
            </label>
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
            <label className="dfm-lbl">
              Account <span style={{ color: 'var(--error)' }}>*</span>
            </label>
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
