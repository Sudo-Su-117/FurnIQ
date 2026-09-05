import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import Pagination, { usePagination } from '../../components/Pagination'
import './DataForms.css'

const CUSTOMERS = ['Ratan Mehra', 'Priya Kapoor', 'Ananya Sharma', 'Mahindra Living', 'Godrej Interio Ltd.']
const PRODUCTS  = ['Oak Dining Table','Rosewood Sofa Set','Teak Coffee Table','Wicker Armchair','Sheesham Bookshelf','Custom Upholstery']
const COA_ACCOUNTS = [
  { code: '3001', name: 'Furniture Sales Income' },
  { code: '3002', name: 'Service Revenue' },
  { code: '1003', name: 'Accounts Receivable (Debtors)' },
]
const ANALYTICS = ['Furniture Manufacturing','Showroom Operations','Q3 Marketing Campaign']

const STATUS_OPTS   = ['Draft','Posted','Paid','Overdue']
const STATUS_STYLE  = { Draft:'df-badge--draft', Posted:'df-badge--confirmed', Paid:'df-badge--billed', Overdue:'df-badge--overdue' }
const fmtINR = (n) => `₹${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const INITIAL_INV = [
  { id: 'INV/2026/0001', invoiceRef: 'INV-REF-001', customer: 'Ratan Mehra',    serviceDate: '2026-09-01', invoiceDate: '2026-09-01', dueDate: '2026-09-15', lines: [], total: 56640,  postViaCash: 0, postViaBank: 56640, amountDue: 0,     status: 'Paid'   },
  { id: 'INV/2026/0002', invoiceRef: 'INV-REF-002', customer: 'Priya Kapoor',   serviceDate: '2026-09-03', invoiceDate: '2026-09-03', dueDate: '2026-09-17', lines: [], total: 126850, postViaCash: 0, postViaBank: 0,     amountDue: 126850,status: 'Posted' },
]

const EMPTY_LINE = { product: '', account: '', accountCode: '', budgetAnalytics: '', qty: '', unitPrice: '', total: 0 }
const EMPTY_INV  = { customer: '', invoiceRef: '', serviceDate: '', invoiceDate: '', dueDate: '', status: 'Draft', lines: [{ ...EMPTY_LINE },{ ...EMPTY_LINE }] }

let invCounter = INITIAL_INV.length + 1
function nextInvId() { return `INV/2026/${String(invCounter++).padStart(4,'0')}` }

export default function CustomerInvoicesPage() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const [invoices,  setInvoices]  = useState(INITIAL_INV)
  const [search,    setSearch]    = useState('')
  const [statusFlt, setStatusFlt] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editInv,   setEditInv]   = useState(null)

  useEffect(() => {
    if (location.state?.fromSO) {
      const so = location.state.fromSO
      setEditInv({ customer: so.customer||'', serviceDate: so.date||'', invoiceDate: so.date||'',
        dueDate: '', invoiceRef: `From SO: ${so.soId}`, status: 'Draft',
        lines: so.lines?.length ? so.lines.map(l=>({ product: l.product||'', account:'', accountCode:'',
          budgetAnalytics: l.budgetAnalytics||'', qty: l.qty||'', unitPrice: l.unitPrice||'', total: l.total||0 })) : [{ ...EMPTY_LINE },{ ...EMPTY_LINE }] })
      setModalOpen(true)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    return (!search || inv.id.toLowerCase().includes(q) || inv.customer.toLowerCase().includes(q)) &&
           (statusFlt === 'All' || inv.status === statusFlt)
  })

  const { page, setPage, paged, total: totalFiltered } = usePagination(filtered, 10)

  const openNew  = ()    => { setEditInv(null); setModalOpen(true) }
  const openEdit = (inv) => { setEditInv(inv);  setModalOpen(true) }
  const close    = ()    => { setModalOpen(false); setEditInv(null) }

  const handleSave = (data, newStatus) => {
    const total = data.lines.reduce((s,l)=>s+(Number(l.total)||0),0)
    if (editInv) {
      setInvoices(prev => prev.map(inv => inv.id === editInv.id ? { ...inv, ...data, total, status: newStatus||inv.status } : inv))
    } else {
      setInvoices(prev => [...prev, { id: nextInvId(), total, postViaCash:0, postViaBank:0, amountDue:total, status: newStatus||'Draft', ...data }])
    }
    close()
  }

  const handlePay = (data) => {
    const total = data.lines.reduce((s,l)=>s+(Number(l.total)||0),0)
    const id = editInv?.id || nextInvId()
    setInvoices(prev => {
      const exists = prev.find(inv => inv.id === id)
      const updated = { ...data, total, status:'Paid', postViaBank: total, postViaCash:0, amountDue:0 }
      if (exists) return prev.map(inv => inv.id === id ? { ...inv, ...updated } : inv)
      return [...prev, { id, ...updated }]
    })
    close()
    navigate('/dashboard/data/invoice-payments', { state: { fromInvoice: { ...data, invoiceId: id, total, customer: data.customer } } })
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this invoice?')) setInvoices(prev => prev.filter(inv => inv.id !== id))
  }

  return (
    <DashboardLayout>
      <div className="df-page">
        <div className="df-breadcrumb">Data Input Forms <span>›</span> Customer Invoices</div>
        <div className="df-header">
          <div><h1 className="df-title">Customer Invoices</h1><p className="df-subtitle">{invoices.length} invoices</p></div>
          <button className="df-add-btn" onClick={openNew}><PlusIcon /> New</button>
        </div>
        <div className="df-toolbar">
          <div className="df-search-wrap"><SearchIcon /><input className="df-search" type="search" placeholder="Search invoices..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <select className="df-filter" value={statusFlt} onChange={e=>setStatusFlt(e.target.value)}>
            {['All','Draft','Posted','Paid','Overdue'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="df-card">
          <table className="df-table">
            <thead><tr><th>Invoice No.</th><th>Customer</th><th>Invoice Date</th><th>Due Date</th><th className="align-right">Total</th><th className="align-right">Amount Due</th><th className="align-center">Status</th><th>Actions</th></tr></thead>
            <tbody>
              {paged.map(inv=>(
                <tr key={inv.id} className="df-tr">
                  <td><button className="df-link-btn" onClick={()=>openEdit(inv)}>{inv.id}</button></td>
                  <td className="df-vendor">{inv.customer}</td>
                  <td className="df-date">{inv.invoiceDate}</td>
                  <td className="df-date">{inv.dueDate}</td>
                  <td className="align-right df-total">{fmtINR(inv.total)}</td>
                  <td className="align-right">{fmtINR(inv.amountDue)}</td>
                  <td className="align-center"><span className={`df-badge ${STATUS_STYLE[inv.status]||''}`}>{inv.status}</span></td>
                  <td><div className="df-actions"><button className="df-edit-btn" onClick={()=>openEdit(inv)}>Edit</button><button className="df-del-btn" onClick={()=>handleDelete(inv.id)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination total={totalFiltered} page={page} pageSize={10} onChange={setPage} />
        </div>
      </div>
      <InvoiceModal isOpen={modalOpen} onClose={close} onSave={handleSave} onPay={handlePay} editInvoice={editInv} />
    </DashboardLayout>
  )
}

/* ── Customer Invoice Modal ── */
function InvoiceModal({ isOpen, onClose, onSave, onPay, editInvoice }) {
  const [fields,      setFields]      = useState(EMPTY_INV)
  const [errors,      setErrors]      = useState({})
  const [confirmed,   setConfirmed]   = useState(false)
  const [custDrop,    setCustDrop]    = useState(false)
  const [prodDropIdx, setProdDropIdx] = useState(null)
  const [acctDropIdx, setAcctDropIdx] = useState(null)
  const [analDropIdx, setAnalDropIdx] = useState(null)
  const firstRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      if (editInvoice) {
        setFields({ customer: editInvoice.customer||'', invoiceRef: editInvoice.invoiceRef||'',
          serviceDate: editInvoice.serviceDate||'', invoiceDate: editInvoice.invoiceDate||'',
          dueDate: editInvoice.dueDate||'', status: editInvoice.status||'Draft',
          lines: editInvoice.lines?.length ? editInvoice.lines.map(l=>({...l})) : [{ ...EMPTY_LINE },{ ...EMPTY_LINE }] })
        setConfirmed(editInvoice.status==='Posted'||editInvoice.status==='Paid')
      } else { setFields(EMPTY_INV); setConfirmed(false) }
      setErrors({})
    }
  }, [isOpen, editInvoice])

  useEffect(() => { if (isOpen) setTimeout(() => firstRef.current?.focus(), 60) }, [isOpen])
  const hk = useCallback(e => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => { if (isOpen) document.addEventListener('keydown', hk); return () => document.removeEventListener('keydown', hk) }, [isOpen, hk])
  useEffect(() => {
    const h = () => { setCustDrop(false); setProdDropIdx(null); setAcctDropIdx(null); setAnalDropIdx(null) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  if (!isOpen) return null

  const totalAmount   = fields.lines.reduce((s,l)=>s+(Number(l.total)||0),0)
  const postViaCash   = 0
  const postViaBank   = confirmed ? totalAmount : 0
  const amountDue     = confirmed ? 0 : totalAmount

  const changeField = (name, value) => { setFields(p=>({...p,[name]:value})); setErrors(p=>({...p,[name]:undefined})) }
  const updateLine  = (idx, key, value) => {
    setFields(p=>({...p, lines: p.lines.map((l,i)=>{
      if(i!==idx) return l
      const up={...l,[key]:value}
      if(key==='qty'||key==='unitPrice') up.total=(Number(key==='qty'?value:l.qty)||0)*(Number(key==='unitPrice'?value:l.unitPrice)||0)
      return up
    })}))
  }
  const selectAcct = (idx,a) => { updateLine(idx,'account',a.name); updateLine(idx,'accountCode',a.code); setAcctDropIdx(null) }
  const addLine    = () => setFields(p=>({...p,lines:[...p.lines,{...EMPTY_LINE}]}))
  const removeLine = (idx) => { if(fields.lines.length>1) setFields(p=>({...p,lines:p.lines.filter((_,i)=>i!==idx)})) }

  const validate = () => {
    const e={}
    if(!fields.customer)    e.customer='Customer is required'
    if(!fields.invoiceDate) e.invoiceDate='Invoice date is required'
    return e
  }

  const invId = editInvoice?.id || `INV/2026/${String(invCounter).padStart(4,'0')}`

  return (
    <div className="dfm-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="dfm-panel dfm-panel--wide">
        <div className="dfm-topbar">
          <div className="dfm-topbar-left">
            <button type="button" className="dfm-btn dfm-btn--new" onClick={()=>{setFields(EMPTY_INV);setErrors({});setConfirmed(false)}}>New</button>
            <button type="button" className={`dfm-btn dfm-btn--confirm${confirmed?' dfm-btn--confirmed':''}`}
              onClick={()=>{const v=validate();if(Object.keys(v).length){setErrors(v);return};setConfirmed(true);onSave(fields,'Posted')}}>
              {confirmed?'✓ Confirmed':'Confirm'}
            </button>
            <button type="button" className="dfm-btn dfm-btn--action" onClick={()=>{if(!confirmed){alert('Please confirm the invoice first.');return};onPay(fields)}}>Pay</button>
            {/* AR and Budget toggle buttons */}
            <button type="button" className="dfm-btn dfm-btn--toggle">AR</button>
            <button type="button" className="dfm-btn dfm-btn--toggle">Budget</button>
          </div>
          <div className="dfm-topbar-right">
            <button type="button" className="dfm-btn dfm-btn--cancel" onClick={()=>{setFields(EMPTY_INV);setErrors({});setConfirmed(false)}}>Cancel</button>
            <button type="button" className="dfm-btn dfm-btn--back" onClick={onClose}>Back</button>
            <button type="button" className="dfm-close" onClick={onClose}><XIcon /></button>
          </div>
        </div>

        <h2 className="dfm-title">{editInvoice?`Edit ${editInvoice.id}`:'New Customer Invoice'}</h2>

        <div className="dfm-body">
          {/* Two-column header */}
          <div className="dfm-two-col">
            <div className="dfm-col">
              <div className="dfm-field">
                <label className="dfm-lbl">Customer Service No.</label>
                <div className="dfm-input-wrap"><span className="dfm-readonly">{invId}</span></div>
              </div>
              <div className="dfm-field">
                <label className="dfm-lbl">Customer Name</label>
                <div className="dfm-input-wrap dfm-dropdown-wrap">
                  <input ref={firstRef} type="text" className={`dfm-input${errors.customer?' dfm-input--err':''}`}
                    placeholder="Select customer..."
                    value={fields.customer}
                    onChange={e=>{changeField('customer',e.target.value);setCustDrop(true)}}
                    onFocus={()=>setCustDrop(true)} autoComplete="off" />
                  {custDrop&&(
                    <div className="dfm-dropdown">
                      {CUSTOMERS.filter(c=>c.toLowerCase().includes(fields.customer.toLowerCase())).map(c=>(
                        <button key={c} type="button" className="dfm-drop-opt" onMouseDown={()=>{changeField('customer',c);setCustDrop(false)}}>{c}</button>
                      ))}
                    </div>
                  )}
                  {errors.customer&&<span className="dfm-err">{errors.customer}</span>}
                </div>
              </div>
              <div className="dfm-field">
                <label className="dfm-lbl">Service Date</label>
                <div className="dfm-input-wrap">
                  <input type="date" className="dfm-input" value={fields.serviceDate} onChange={e=>changeField('serviceDate',e.target.value)} />
                </div>
              </div>
              <div className="dfm-field">
                <label className="dfm-lbl">Status</label>
                <div className="dfm-input-wrap">
                  <select className="dfm-input" value={fields.status} onChange={e=>changeField('status',e.target.value)}>
                    {STATUS_OPTS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="dfm-col">
              <div className="dfm-field">
                <label className="dfm-lbl">Invoice Reference</label>
                <div className="dfm-input-wrap">
                  <input type="text" className="dfm-input" placeholder="Invoice reference (Text)"
                    value={fields.invoiceRef} onChange={e=>changeField('invoiceRef',e.target.value)} autoComplete="off" />
                </div>
              </div>
              <div className="dfm-field">
                <label className="dfm-lbl">Invoice Date</label>
                <div className="dfm-input-wrap">
                  <input type="date" className={`dfm-input${errors.invoiceDate?' dfm-input--err':''}`}
                    value={fields.invoiceDate} onChange={e=>changeField('invoiceDate',e.target.value)} />
                  {errors.invoiceDate&&<span className="dfm-err">{errors.invoiceDate}</span>}
                </div>
              </div>
              <div className="dfm-field">
                <label className="dfm-lbl">Due Date</label>
                <div className="dfm-input-wrap">
                  <input type="date" className="dfm-input" value={fields.dueDate} onChange={e=>changeField('dueDate',e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="dfm-lines-section">
            <div className="dfm-lines-title">Invoice Body</div>
            <table className="dfm-lines-table">
              <thead>
                <tr>
                  <th style={{width:36}}>Sr No.</th>
                  <th>Product</th>
                  <th>Account of Amount</th>
                  <th>Budget Analytics</th>
                  <th>Qty</th>
                  <th className="align-right">Unit Price</th>
                  <th className="align-right">Total</th>
                  <th style={{width:32}}></th>
                </tr>
              </thead>
              <tbody>
                {fields.lines.map((line,idx)=>{
                  const prodOpts=PRODUCTS.filter(p=>!line.product||p.toLowerCase().includes(line.product.toLowerCase()))
                  const acctOpts=COA_ACCOUNTS.filter(a=>!line.account||a.name.toLowerCase().includes(line.account.toLowerCase()))
                  const analOpts=ANALYTICS.filter(a=>!line.budgetAnalytics||a.toLowerCase().includes(line.budgetAnalytics.toLowerCase()))
                  return(
                    <tr key={idx} className="dfm-line-row">
                      <td className="dfm-line-td dfm-line-idx">{idx+1}</td>
                      <td className="dfm-line-td" style={{position:'relative'}}>
                        <input type="text" className="dfm-line-input" placeholder="Product..."
                          value={line.product}
                          onChange={e=>{updateLine(idx,'product',e.target.value);setProdDropIdx(idx)}}
                          onFocus={()=>setProdDropIdx(idx)} autoComplete="off" />
                        {prodDropIdx===idx&&prodOpts.length>0&&(
                          <div className="dfm-line-dropdown">
                            {prodOpts.map(p=><button key={p} type="button" className="dfm-line-opt" onMouseDown={()=>{updateLine(idx,'product',p);setProdDropIdx(null)}}>{p}</button>)}
                          </div>
                        )}
                      </td>
                      <td className="dfm-line-td" style={{position:'relative'}}>
                        <input type="text" className="dfm-line-input" placeholder="Account..."
                          value={line.account}
                          onChange={e=>{updateLine(idx,'account',e.target.value);setAcctDropIdx(idx)}}
                          onFocus={()=>setAcctDropIdx(idx)} autoComplete="off" />
                        {acctDropIdx===idx&&acctOpts.length>0&&(
                          <div className="dfm-line-dropdown">
                            {acctOpts.map(a=>(
                              <button key={a.code} type="button" className="dfm-line-opt" onMouseDown={()=>selectAcct(idx,a)}>
                                <span className="dfm-opt-code">{a.code}</span><span>{a.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="dfm-line-td" style={{position:'relative'}}>
                        <input type="text" className="dfm-line-input" placeholder="Analytics..."
                          value={line.budgetAnalytics}
                          onChange={e=>{updateLine(idx,'budgetAnalytics',e.target.value);setAnalDropIdx(idx)}}
                          onFocus={()=>setAnalDropIdx(idx)} autoComplete="off" />
                        {analDropIdx===idx&&analOpts.length>0&&(
                          <div className="dfm-line-dropdown">
                            {analOpts.map(a=><button key={a} type="button" className="dfm-line-opt" onMouseDown={()=>{updateLine(idx,'budgetAnalytics',a);setAnalDropIdx(null)}}>{a}</button>)}
                          </div>
                        )}
                      </td>
                      <td className="dfm-line-td"><input type="number" className="dfm-line-input dfm-line-input--num" placeholder="Qty" value={line.qty} onChange={e=>updateLine(idx,'qty',e.target.value)} /></td>
                      <td className="dfm-line-td"><input type="number" className="dfm-line-input dfm-line-input--num" placeholder="0.00" value={line.unitPrice} onChange={e=>updateLine(idx,'unitPrice',e.target.value)} /></td>
                      <td className="dfm-line-td dfm-line-total">{line.total>0?fmtINR(line.total):'—'}</td>
                      <td className="dfm-line-td">{fields.lines.length>1&&<button type="button" className="dfm-remove-btn" onClick={()=>removeLine(idx)}><TrashIcon /></button>}</td>
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

          {/* Post via Cash/Bank + Amount Due */}
          <div className="dfm-invoice-summary">
            <div className="dfm-inv-sum-row"><span>Post Via Cash</span><strong>{fmtINR(postViaCash)}</strong></div>
            <div className="dfm-inv-sum-row"><span>Post Via Bank</span><strong>{fmtINR(postViaBank)}</strong></div>
            <div className="dfm-inv-sum-row dfm-inv-sum-due"><span>Amount Due</span><strong className={amountDue>0?'dfm-due-outstanding':'dfm-due-clear'}>{fmtINR(amountDue)}</strong></div>
          </div>

          {/* Journal note */}
          <div className="dfm-notes-box">
            <p>As soon as the Customer Invoice is confirmed a Journal entry would be created that would become visible in the Journal Entry section.</p>
            <p>For Customer Invoice: always takes Account of Amount from the account field provided above.</p>
            <p>The Journal Entry should always be balanced. That is the debit and credit totals need to be equal.</p>
          </div>
        </div>

        <div className="dfm-footer">
          <button type="button" className="dfm-save-btn" onClick={()=>{const v=validate();if(Object.keys(v).length){setErrors(v);return};onSave(fields,editInvoice?.status||'Draft')}}>
            {editInvoice?'Update Invoice':'Save as Draft'}
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
