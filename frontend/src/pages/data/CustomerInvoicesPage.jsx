import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import Pagination, { usePagination } from '../../components/Pagination'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import './DataForms.css'

const STATUS_OPTS   = ['Draft','Posted','Paid','Overdue']
const STATUS_STYLE  = { Draft:'df-badge--draft', Posted:'df-badge--confirmed', Paid:'df-badge--billed', Overdue:'df-badge--overdue' }
const fmtINR = (n) => `₹${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const EMPTY_LINE = { product: '', productId: '', account: '', accountCode: '', budgetAnalytics: '', qty: '', unitPrice: '', total: 0 }
const EMPTY_INV  = { customer: '', customerId: '', invoiceRef: '', serviceDate: '', invoiceDate: '', dueDate: '', status: 'Draft', lines: [{ ...EMPTY_LINE },{ ...EMPTY_LINE }] }

import { api, extractList } from '../../services/api'

export default function CustomerInvoicesPage() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const toast     = useToast()
  const confirm   = useConfirm()
  const [invoices,  setInvoices]  = useState([])
  const [customers, setCustomers] = useState([])
  const [products,  setProducts]  = useState([])
  const [accounts,  setAccounts]  = useState([])
  const [analytics, setAnalytics] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [search,    setSearch]    = useState('')
  const [statusFlt, setStatusFlt] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editInv,   setEditInv]   = useState(null)

  const loadInvoices = useCallback(() => {
    setLoading(true)
    api.sales.listInvoices({ limit: 100 })
      .then(res => {
        const list = extractList(res)
        const mapped = list.map(inv => ({
          ...inv,
          id: inv.invoiceNumber || inv.id,
          rawId: inv.id,
          customer: inv.customer?.name || 'Customer',
          customerId: inv.customerId,
          invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '',
          dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
          total: Number(inv.totalAmount || 0),
          amountDue: Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0),
          status: inv.status === 'PAID' ? 'Paid' : (inv.status === 'CONFIRMED' ? 'Posted' : 'Draft'),
          lines: (inv.lines || []).map(l => {
            const q = Number(l.quantity || l.qty || 0)
            const u = Number(l.unitPrice || 0)
            const calcTotal = q * u
            const t = Number(l.total || l.totalPrice || 0) || calcTotal
            return {
              product: l.product?.name || (typeof l.product === 'string' ? l.product : ''),
              productId: l.productId || l.product?.id || '',
              account: l.account || '',
              accountCode: l.accountCode || '',
              budgetAnalytics: l.budgetAnalytics || '',
              qty: q || '',
              unitPrice: u || '',
              total: t,
            }
          })
        }))
        setInvoices(mapped)
      })
      .catch(err => console.warn('Could not load live invoices:', err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadInvoices()
    api.contacts.list({ limit: 100 }).then(res => {
      const list = extractList(res)
      setCustomers(list)
    }).catch(e => console.warn('Failed to load contacts:', e.message))

    api.products.list({ limit: 100 }).then(res => {
      const list = extractList(res)
      setProducts(list)
    }).catch(e => console.warn('Failed to load products:', e.message))

    api.accounting.getAccounts().then(res => {
      const list = extractList(res)
      setAccounts(list)
    }).catch(e => console.warn('Failed to load accounts:', e.message))

    api.budgets.getAnalyticAccounts().then(res => {
      const list = extractList(res)
      setAnalytics(list)
    }).catch(e => console.warn('Failed to load analytics:', e.message))
  }, [loadInvoices])

  useEffect(() => {
    if (location.state?.fromSO) {
      const so = location.state.fromSO
      const mappedLines = so.lines?.length
        ? so.lines.map(l => {
            const q = Number(l.qty || l.quantity || 0)
            const u = Number(l.unitPrice || 0)
            const calcTotal = q * u
            const t = Number(l.total || l.totalPrice || 0) || calcTotal
            return {
              product: typeof l.product === 'string' ? l.product : (l.product?.name || ''),
              productId: l.productId || l.product?.id || '',
              account: '', accountCode: '',
              budgetAnalytics: l.budgetAnalytics || '',
              qty: q || '',
              unitPrice: u || '',
              total: t,
            }
          })
        : [{ ...EMPTY_LINE }, { ...EMPTY_LINE }]
      setEditInv({
        customer: so.customer||'',
        customerId: so.customerId||'',
        serviceDate: so.date||'',
        invoiceDate: so.date||'',
        dueDate: '',
        invoiceRef: `From SO: ${so.soId}`,
        status: 'Draft',
        lines: mappedLines,
      })
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

  const handleSave = async (data, newStatus) => {
    try {
      if (editInv?.rawId) {
        if (newStatus === 'Posted' && editInv.status !== 'Posted') {
          await api.sales.confirmInvoice(editInv.rawId)
          toast.success(`Customer Invoice ${editInv.id} posted!`)
        } else {
          toast.success(`Customer Invoice ${editInv.id} updated!`)
        }
        loadInvoices()
        close()
        return
      }

      let custId = data.customerId
      if (!custId && customers.length > 0) {
        const found = customers.find(c => c.name.toLowerCase() === (data.customer || '').toLowerCase())
        if (found) custId = found.id
      }
      if (!custId && customers.length > 0) {
        custId = customers[0].id
      }

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
          tax: 18,
        }
      })

      if (validLines.length === 0 && products.length > 0) {
        validLines.push({
          productId: products[0].id,
          quantity: 1,
          unitPrice: Number(products[0].salesPrice || 1000),
          tax: 18,
        })
      }

      const payload = {
        customerId: custId,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate).toISOString() : new Date().toISOString(),
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        lines: validLines,
      }

      const created = await api.sales.createInvoice(payload)
      if (newStatus === 'Posted' && created?.id) {
        await api.sales.confirmInvoice(created.id)
        toast.success(`Customer Invoice ${created.invoiceNumber || 'INV'} posted!`)
      } else {
        toast.success(`Invoice ${created?.invoiceNumber || 'INV'} created successfully!`)
      }
      loadInvoices()
      close()
    } catch (err) {
      toast.error('Error saving invoice: ' + err.message)
    }
  }

  const handlePay = async (data) => {
    try {
      let invId = editInv?.rawId
      if (!invId) {
        let cId = data.customerId
        if (!cId && customers.length > 0) {
          const found = customers.find(c => c.name.toLowerCase() === (data.customer || '').toLowerCase())
          if (found) cId = found.id
        }
        if (!cId && customers.length > 0) cId = customers[0].id

        const validLines = data.lines.filter(l => (l.product || l.productId) && Number(l.qty) > 0).map(l => ({
          productId: l.productId || products[0]?.id,
          quantity: parseInt(l.qty, 10) || 1,
          unitPrice: parseFloat(l.unitPrice) || 0,
        }))
        const created = await api.sales.createInvoice({
          customerId: cId,
          invoiceDate: data.invoiceDate ? new Date(data.invoiceDate).toISOString() : new Date().toISOString(),
          lines: validLines.length ? validLines : [{ productId: products[0]?.id, quantity: 1, unitPrice: 1000 }],
        })
        invId = created.id
      }
      if (editInv?.status !== 'Posted' && editInv?.status !== 'Paid') {
        try { await api.sales.confirmInvoice(invId) } catch (e) { /* ignore if already confirmed */ }
      }
      const subtotal = data.lines.reduce((s,l) => s + (Number(l.total) || ((Number(l.qty)||0)*(Number(l.unitPrice)||0))), 0)
      const total = Number((subtotal * 1.18).toFixed(2))
      close()
      loadInvoices()
      toast.info('Opening payment registration...')
      navigate('/dashboard/data/invoice-payments', { state: { fromInvoice: { ...data, customerInvoiceId: invId, rawId: invId, invoiceId: editInv?.id || 'INV', total, customer: data.customer } } })
    } catch (err) {
      toast.error('Error preparing payment: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Customer Invoice',
      message: `Are you sure you want to delete invoice "${id}"?`,
      detail: 'This will remove the invoice record from customer receivables.',
      confirmText: 'Delete Invoice',
      confirmVariant: 'danger',
    })
    if (ok) {
      setInvoices(prev => prev.filter(inv => inv.id !== id))
      toast.info(`Invoice ${id} deleted`)
    }
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
              {paged.map(inv => (
                <tr key={inv.id} className="df-tr">
                  <td><button className="df-link-btn" onClick={() => openEdit(inv)}>{inv.id}</button></td>
                  <td className="df-vendor">{inv.customer}</td>
                  <td className="df-date">{inv.invoiceDate}</td>
                  <td className="df-date">{inv.dueDate || '—'}</td>
                  <td className="align-right df-total">{fmtINR(inv.total)}</td>
                  <td className="align-right df-total">{fmtINR(inv.amountDue)}</td>
                  <td className="align-center"><span className={`df-badge ${STATUS_STYLE[inv.status]||''}`}>{inv.status}</span></td>
                  <td><div className="df-actions"><button className="df-edit-btn" onClick={() => openEdit(inv)}>Edit</button><button className="df-del-btn" onClick={() => handleDelete(inv.id)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination total={totalFiltered} page={page} pageSize={10} onChange={setPage} />
        </div>
      </div>
      <CustomerInvoiceModal
        isOpen={modalOpen}
        onClose={close}
        onSave={handleSave}
        onPay={handlePay}
        editInvoice={editInv}
        customers={customers}
        products={products}
        accounts={accounts}
        analytics={analytics}
      />
    </DashboardLayout>
  )
}

/* ── Customer Invoice Modal ── */
function CustomerInvoiceModal({ isOpen, onClose, onSave, onPay, editInvoice, customers = [], products = [], accounts = [], analytics = [] }) {
  const toast         = useToast()
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
        const mappedLines = editInvoice.lines?.length
          ? editInvoice.lines.map(l => {
              const q = Number(l.qty || l.quantity || 0)
              const u = Number(l.unitPrice || 0)
              const calcTotal = q * u
              const t = Number(l.total || l.totalPrice || 0) || calcTotal
              return {
                product: typeof l.product === 'string' ? l.product : (l.product?.name || ''),
                productId: l.productId || l.product?.id || '',
                account: l.account || '',
                accountCode: l.accountCode || '',
                budgetAnalytics: l.budgetAnalytics || '',
                qty: q || '',
                unitPrice: u || '',
                total: t,
              }
            })
          : [{ ...EMPTY_LINE }, { ...EMPTY_LINE }]
        setFields({
          customer: editInvoice.customer||'',
          customerId: editInvoice.customerId||'',
          invoiceRef: editInvoice.invoiceRef||'',
          serviceDate: editInvoice.serviceDate||'',
          invoiceDate: editInvoice.invoiceDate||'',
          dueDate: editInvoice.dueDate||'',
          status: editInvoice.status||'Draft',
          lines: mappedLines,
        })
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

  const subtotal = fields.lines.reduce((s, l) => {
    const q = Number(l.qty) || 0
    const u = Number(l.unitPrice) || 0
    const lineTot = Number(l.total) || (q * u)
    return s + lineTot
  }, 0)
  const taxRate = 0.18 // 18% GST Standard Tax
  const taxAmount = subtotal * taxRate
  const totalAmount = subtotal + taxAmount

  const postViaCash   = 0
  const postViaBank   = confirmed ? totalAmount : 0
  const amountDue     = confirmed ? 0 : totalAmount

  const changeField = (name, value) => { setFields(p=>({...p,[name]:value})); setErrors(p=>({...p,[name]:undefined})) }
  const updateLine  = (idx, key, value) => {
    setFields(p=>({...p, lines: p.lines.map((l,i)=>{
      if(i!==idx) return l
      const up={...l,[key]:value}
      if(key==='qty'||key==='unitPrice') {
        const q = Number(key === 'qty' ? value : l.qty) || 0
        const u = Number(key === 'unitPrice' ? value : l.unitPrice) || 0
        up.total = q * u
      }
      return up
    })}))
  }
  const selectAcct = (idx,a) => { updateLine(idx,'account',a.name); updateLine(idx,'accountCode',a.code); setAcctDropIdx(null) }
  const addLine    = () => setFields(p=>({...p,lines:[...p.lines,{...EMPTY_LINE}]}))
  const removeLine = (idx) => { if(fields.lines.length>1) setFields(p=>({...p,lines:p.lines.filter((_,i)=>i!==idx)})) }

  const validate = () => {
    const e = {}
    if (!fields.customer && !fields.customerId) e.customer = 'Customer name is required'
    if (!fields.invoiceDate) e.invoiceDate = 'Invoice date is required'
    const hasValidLine = fields.lines.some(l => (l.product || l.productId) && Number(l.qty) > 0)
    if (!hasValidLine) e.lines = 'At least one product line with a valid quantity is required'
    return e
  }

  const invId = editInvoice?.id || 'INV-NEW'

  return (
    <div className="dfm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dfm-panel dfm-panel--wide">
        <div className="dfm-topbar">
          <div className="dfm-topbar-left">
            <button type="button" className="dfm-btn dfm-btn--new" onClick={() => { setFields(EMPTY_INV); setErrors({}); setConfirmed(false) }}>New</button>
            <button type="button" className={`dfm-btn dfm-btn--confirm${confirmed?' dfm-btn--confirmed':''}`}
              onClick={() => { const v=validate(); if(!Object.keys(v).length){setConfirmed(true);onSave(fields,'Posted')}else setErrors(v) }}>{confirmed?'✓ Posted':'Confirm'}</button>
            <button type="button" className="dfm-btn dfm-btn--action" onClick={()=>{if(!confirmed){toast.warning('Please confirm the invoice first.');return};onPay(fields)}}>Pay</button>
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
          <div className="dfm-two-col">
            <div className="dfm-col">
              <div className="dfm-field">
                <label className="dfm-lbl">Customer Service No.</label>
                <div className="dfm-input-wrap"><span className="dfm-readonly">{invId}</span></div>
              </div>
              <div className="dfm-field">
                <label className="dfm-lbl">Customer Name <span style={{ color: 'var(--error)' }}>*</span></label>
                <div className="dfm-input-wrap dfm-dropdown-wrap">
                  <input ref={firstRef} type="text" className={`dfm-input${errors.customer?' dfm-input--err':''}`}
                    placeholder="Select customer..."
                    value={fields.customer || ''}
                    onChange={e=>{changeField('customer',e.target.value);setCustDrop(true)}}
                    onFocus={()=>setCustDrop(true)} autoComplete="off" />
                  {custDrop&&(
                    <div className="dfm-dropdown">
                      {customers.filter(c=>!fields.customer || c.name.toLowerCase().includes((fields.customer || '').toLowerCase())).map(c=>(
                        <button key={c.id} type="button" className="dfm-drop-opt" onMouseDown={()=>{
                          changeField('customer',c.name)
                          changeField('customerId',c.id)
                          setCustDrop(false)
                        }}>{c.name}</button>
                      ))}
                    </div>
                  )}
                  {errors.customer&&<span className="dfm-err">{errors.customer}</span>}
                </div>
              </div>
              <div className="dfm-field">
                <label className="dfm-lbl">Service Date</label>
                <div className="dfm-input-wrap">
                  <input type="date" className="dfm-input" value={fields.serviceDate || ''} onChange={e=>changeField('serviceDate',e.target.value)} />
                </div>
              </div>
              <div className="dfm-field">
                <label className="dfm-lbl">Status</label>
                <div className="dfm-input-wrap">
                  <select className="dfm-input" value={fields.status || 'Draft'} onChange={e=>changeField('status',e.target.value)}>
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
                    value={fields.invoiceRef || ''} onChange={e=>changeField('invoiceRef',e.target.value)} autoComplete="off" />
                </div>
              </div>
              <div className="dfm-field">
                <label className="dfm-lbl">Invoice Date <span style={{ color: 'var(--error)' }}>*</span></label>
                <div className="dfm-input-wrap">
                  <input type="date" className={`dfm-input${errors.invoiceDate?' dfm-input--err':''}`}
                    value={fields.invoiceDate || ''} onChange={e=>changeField('invoiceDate',e.target.value)} />
                  {errors.invoiceDate&&<span className="dfm-err">{errors.invoiceDate}</span>}
                </div>
              </div>
              <div className="dfm-field">
                <label className="dfm-lbl">Due Date</label>
                <div className="dfm-input-wrap">
                  <input type="date" className="dfm-input" value={fields.dueDate || ''} onChange={e=>changeField('dueDate',e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="dfm-lines-section">
            <div className="dfm-lines-title">Invoice Body</div>
            <table className="dfm-lines-table">
              <thead>
                <tr>
                  <th style={{width:36}}>Sr</th>
                  <th>Product</th>
                  <th>Account</th>
                  <th>Budget Analytics</th>
                  <th>Qty</th>
                  <th className="align-right">Unit Price</th>
                  <th className="align-right">Total</th>
                  <th style={{width:32}}></th>
                </tr>
              </thead>
              <tbody>
                {fields.lines.map((line, idx) => {
                  const prodOpts = products.filter(p => !line.product || p.name.toLowerCase().includes(line.product.toLowerCase()))
                  const acctOpts = accounts.filter(a => !line.account || a.name.toLowerCase().includes(line.account.toLowerCase()))
                  const analOpts = analytics.filter(a => !line.budgetAnalytics || (a.name && a.name.toLowerCase().includes(line.budgetAnalytics.toLowerCase())))
                  const lineTotal = Number(line.total) || ((Number(line.qty) || 0) * (Number(line.unitPrice) || 0))
                  return (
                    <tr key={idx} className="dfm-line-row">
                      <td className="dfm-line-td dfm-line-idx">{idx+1}</td>
                      <td className={`dfm-line-td${prodDropIdx===idx?' dfm-line-td--active':''}`} style={{position:'relative', zIndex: prodDropIdx===idx?1100:'auto'}}>
                        <input type="text" className="dfm-line-input" placeholder="Product..."
                          value={line.product || ''}
                          onChange={e => { updateLine(idx,'product',e.target.value); setProdDropIdx(idx) }}
                          onFocus={() => setProdDropIdx(idx)} autoComplete="off" />
                        {prodDropIdx===idx && prodOpts.length>0 && (
                          <div className="dfm-line-dropdown">
                            <div className="dfm-line-dropdown-header">Available Products ({prodOpts.length})</div>
                            {prodOpts.map(p => (
                              <button key={p.id} type="button" className="dfm-line-opt" onMouseDown={() => {
                                const price = p.salesPrice || p.unitPrice || 0
                                updateLine(idx, 'product', p.name)
                                updateLine(idx, 'productId', p.id)
                                updateLine(idx, 'unitPrice', price)
                                if (line.qty) {
                                  updateLine(idx, 'total', Number(line.qty) * Number(price))
                                }
                                setProdDropIdx(null)
                              }}>
                                <span className="dfm-opt-name">{p.name}</span>
                                <span className="dfm-opt-price">{fmtINR(p.salesPrice || p.unitPrice)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={`dfm-line-td${acctDropIdx===idx?' dfm-line-td--active':''}`} style={{position:'relative', zIndex: acctDropIdx===idx?1100:'auto'}}>
                        <input type="text" className="dfm-line-input" placeholder="Account..."
                          value={line.account || ''}
                          onChange={e => { updateLine(idx,'account',e.target.value); setAcctDropIdx(idx) }}
                          onFocus={() => setAcctDropIdx(idx)} autoComplete="off" />
                        {acctDropIdx===idx && acctOpts.length>0 && (
                          <div className="dfm-line-dropdown">
                            <div className="dfm-line-dropdown-header">Chart of Accounts ({acctOpts.length})</div>
                            {acctOpts.map(a => (
                              <button key={a.id||a.code} type="button" className="dfm-line-opt" onMouseDown={() => selectAcct(idx, a)}>
                                <span className="dfm-opt-code">{a.code}</span>
                                <span className="dfm-opt-name">{a.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={`dfm-line-td${analDropIdx===idx?' dfm-line-td--active':''}`} style={{position:'relative', zIndex: analDropIdx===idx?1100:'auto'}}>
                        <input type="text" className="dfm-line-input" placeholder="Analytics..."
                          value={line.budgetAnalytics || ''}
                          onChange={e => { updateLine(idx,'budgetAnalytics',e.target.value); setAnalDropIdx(idx) }}
                          onFocus={() => setAnalDropIdx(idx)} autoComplete="off" />
                        {analDropIdx===idx && analOpts.length>0 && (
                          <div className="dfm-line-dropdown">
                            <div className="dfm-line-dropdown-header">Analytic Accounts ({analOpts.length})</div>
                            {analOpts.map(a=>(
                              <button key={a.id} type="button" className="dfm-line-opt" onMouseDown={()=>{
                                updateLine(idx,'budgetAnalytics',a.name)
                                setAnalDropIdx(null)
                              }}>
                                <span className="dfm-opt-name">{a.name}</span>
                                {a.type && <span className="dfm-opt-code">{a.type}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="dfm-line-td"><input type="number" className="dfm-line-input dfm-line-input--num" placeholder="Qty" value={line.qty || ''} onChange={e=>updateLine(idx,'qty',e.target.value)} /></td>
                      <td className="dfm-line-td"><input type="number" className="dfm-line-input dfm-line-input--num" placeholder="0.00" value={line.unitPrice || ''} onChange={e=>updateLine(idx,'unitPrice',e.target.value)} /></td>
                      <td className="dfm-line-td dfm-line-total">{lineTotal > 0 ? fmtINR(lineTotal) : '—'}</td>
                      <td className="dfm-line-td">{fields.lines.length>1&&<button type="button" className="dfm-remove-btn" onClick={()=>removeLine(idx)}><TrashIcon /></button>}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="dfm-total-row">
                  <td colSpan={6} className="dfm-total-label">Subtotal (Untaxed)</td>
                  <td className="dfm-total-val">{fmtINR(subtotal)}</td>
                  <td />
                </tr>
                <tr className="dfm-total-row" style={{ background: 'rgba(240,235,224,0.3)' }}>
                  <td colSpan={6} className="dfm-total-label">Taxes (18% GST)</td>
                  <td className="dfm-total-val" style={{ color: 'var(--text-medium)' }}>{fmtINR(taxAmount)}</td>
                  <td />
                </tr>
                <tr className="dfm-total-row" style={{ fontWeight: 700 }}>
                  <td colSpan={6} className="dfm-total-label">Total Amount</td>
                  <td className="dfm-total-val" style={{ color: 'var(--primary-dark)', fontSize: '15px' }}>{fmtINR(totalAmount)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            {errors.lines && <span className="dfm-err" style={{ marginTop: 8, fontSize: '12px', fontWeight: 600 }}>{errors.lines}</span>}
            <button type="button" className="dfm-add-line-btn" onClick={addLine}><PlusSmIcon /> Add Line</button>
          </div>

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
