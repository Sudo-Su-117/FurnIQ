import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import Pagination, { usePagination } from '../../components/Pagination'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import './DataForms.css'

const STATUS_STYLE = { Draft: 'df-badge--draft', Confirmed: 'df-badge--confirmed', Paid: 'df-badge--billed' }
const fmtINR = (n) => `₹${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const EMPTY_LINE = { product: '', productId: '', account: '', accountCode: '', description: '', qty: '', unitPrice: '', total: 0 }
const EMPTY_BILL = { vendorRef: '', vendor: '', vendorId: '', billRef: '', billBody: '', date: '', lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE }] }

import { api, extractList } from '../../services/api'

export default function VendorBillsPage() {
  const location = useLocation()
  const navigate  = useNavigate()
  const toast     = useToast()
  const confirm   = useConfirm()
  const [bills,     setBills]     = useState([])
  const [vendors,   setVendors]   = useState([])
  const [products,  setProducts]  = useState([])
  const [accounts,  setAccounts]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [search,    setSearch]    = useState('')
  const [statusFlt, setStatusFlt] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editBill,  setEditBill]  = useState(null)

  const loadBills = useCallback(() => {
    setLoading(true)
    api.purchases.listBills({ limit: 100 })
      .then(res => {
        const list = extractList(res)
        const mapped = list.map(b => ({
          ...b,
          id: b.billNumber || b.id,
          rawId: b.id,
          vendor: b.vendor?.name || 'Vendor',
          vendorId: b.vendorId,
          vendorRef: b.billNumber || 'REF',
          date: b.billDate ? new Date(b.billDate).toISOString().split('T')[0] : '',
          total: Number(b.totalAmount || 0),
          status: b.status === 'PAID' ? 'Paid' : (b.status === 'CONFIRMED' ? 'Confirmed' : 'Draft'),
          lines: (b.lines || []).map(l => {
            const q = Number(l.quantity || l.qty || 0)
            const u = Number(l.unitPrice || 0)
            const calcTotal = q * u
            const t = Number(l.total || l.totalPrice || 0) || calcTotal
            return {
              product: l.product?.name || (typeof l.product === 'string' ? l.product : ''),
              productId: l.productId || l.product?.id || '',
              account: l.account || '',
              accountCode: l.accountCode || '',
              description: l.description || '',
              qty: q || '',
              unitPrice: u || '',
              total: t,
            }
          })
        }))
        setBills(mapped)
      })
      .catch(err => console.warn('Could not load live vendor bills:', err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadBills()
    api.contacts.list({ limit: 100 }).then(res => {
      const list = extractList(res)
      setVendors(list)
    }).catch(e => console.warn('Failed to load vendors:', e.message))

    api.products.list({ limit: 100 }).then(res => {
      const list = extractList(res)
      setProducts(list)
    }).catch(e => console.warn('Failed to load products:', e.message))

    api.accounting.getAccounts().then(res => {
      const list = extractList(res)
      setAccounts(list)
    }).catch(e => console.warn('Failed to load accounts:', e.message))
  }, [loadBills])

  // Pre-fill from Purchase Order navigation
  useEffect(() => {
    if (location.state?.fromPO) {
      const po = location.state.fromPO
      const mappedLines = (po.lines || []).map(l => {
        const q = Number(l.qty || l.quantity || 0)
        const u = Number(l.unitPrice || l.price || 0)
        const calcTotal = q * u
        const t = Number(l.total || l.totalPrice || 0) || calcTotal
        return {
          product: typeof l.product === 'string' ? l.product : (l.product?.name || ''),
          productId: l.productId || l.product?.id || '',
          account: '',
          accountCode: '',
          description: '',
          qty: q || '',
          unitPrice: u || '',
          total: t,
        }
      })
      setEditBill({
        vendor: po.vendor || '',
        vendorId: po.vendorId || '',
        date: po.date || new Date().toISOString().split('T')[0],
        lines: mappedLines.length ? mappedLines : [{ ...EMPTY_LINE }, { ...EMPTY_LINE }],
        vendorRef: '',
        billRef: '',
        billBody: `From PO: ${po.poId || po.id || ''}`
      })
      setModalOpen(true)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const filtered = bills.filter(b => {
    const q = search.toLowerCase()
    return (!search || b.id.toLowerCase().includes(q) || b.vendor.toLowerCase().includes(q)) &&
           (statusFlt === 'All' || b.status === statusFlt)
  })

  const { page, setPage, paged, total: totalFiltered } = usePagination(filtered, 10)

  const openNew  = ()  => { setEditBill(null); setModalOpen(true) }
  const openEdit = (b) => { setEditBill(b);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false); setEditBill(null) }

  const handleSave = async (data, newStatus) => {
    try {
      if (editBill?.rawId) {
        if (newStatus === 'Confirmed' && editBill.status !== 'Confirmed') {
          await api.purchases.confirmBill(editBill.rawId)
          toast.success(`Vendor Bill ${editBill.id} confirmed!`)
        } else {
          toast.success(`Vendor Bill ${editBill.id} updated!`)
        }
        loadBills()
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
        billDate: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        lines: validLines,
      }

      const created = await api.purchases.createBill(payload)
      if (newStatus === 'Confirmed' && created?.id) {
        await api.purchases.confirmBill(created.id)
        toast.success(`Vendor Bill ${created.billNumber || 'BILL'} confirmed!`)
      } else {
        toast.success(`Vendor Bill ${created?.billNumber || 'BILL'} created successfully!`)
      }
      loadBills()
      close()
    } catch (err) {
      toast.error('Error saving vendor bill: ' + err.message)
    }
  }

  const handlePay = async (data) => {
    try {
      let bId = editBill?.rawId
      if (!bId) {
        let vId = data.vendorId
        if (!vId && vendors.length > 0) {
          const found = vendors.find(v => v.name.toLowerCase() === (data.vendor || '').toLowerCase())
          if (found) vId = found.id
        }
        if (!vId && vendors.length > 0) vId = vendors[0].id

        const validLines = data.lines.filter(l => (l.product || l.productId) && Number(l.qty) > 0).map(l => ({
          productId: l.productId || products[0]?.id,
          quantity: parseInt(l.qty, 10) || 1,
          unitPrice: parseFloat(l.unitPrice) || 0,
        }))
        const created = await api.purchases.createBill({
          vendorId: vId,
          billDate: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
          lines: validLines.length ? validLines : [{ productId: products[0]?.id, quantity: 1, unitPrice: 1000 }],
        })
        bId = created.id
      }
      if (editBill?.status !== 'Confirmed' && editBill?.status !== 'Paid') {
        try { await api.purchases.confirmBill(bId) } catch (e) { /* ignore if already confirmed */ }
      }
      const subtotal = data.lines.reduce((s,l) => s + (Number(l.total) || ((Number(l.qty)||0)*(Number(l.unitPrice)||0))), 0)
      const total = Number((subtotal * 1.18).toFixed(2))
      close()
      loadBills()
      toast.info('Opening payment registration...')
      navigate('/dashboard/data/payments', { state: { fromBill: { ...data, vendorBillId: bId, rawId: bId, billId: editBill?.id || 'BILL', total, vendor: data.vendor } } })
    } catch (err) {
      toast.error('Error preparing payment: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Vendor Bill',
      message: `Are you sure you want to delete vendor bill "${id}"?`,
      detail: 'This will remove the vendor bill record from your accounts payable.',
      confirmText: 'Delete Bill',
      confirmVariant: 'danger',
    })
    if (ok) {
      setBills(prev => prev.filter(b => b.id !== id))
      toast.info(`Vendor Bill ${id} deleted`)
    }
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
            <thead><tr><th>Bill No.</th><th>Vendor</th><th>Bill Date</th><th className="align-right">Total</th><th className="align-center">Status</th><th>Actions</th></tr></thead>
            <tbody>
              {paged.map(b => (
                <tr key={b.id} className="df-tr">
                  <td><button className="df-link-btn" onClick={() => openEdit(b)}>{b.id}</button></td>
                  <td className="df-vendor">{b.vendor}</td>
                  <td className="df-date">{b.date}</td>
                  <td className="align-right df-total">{fmtINR(b.total)}</td>
                  <td className="align-center"><span className={`df-badge ${STATUS_STYLE[b.status]||''}`}>{b.status}</span></td>
                  <td><div className="df-actions"><button className="df-edit-btn" onClick={() => openEdit(b)}>Edit</button><button className="df-del-btn" onClick={() => handleDelete(b.id)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination total={totalFiltered} page={page} pageSize={10} onChange={setPage} />
        </div>
      </div>
      <VendorBillModal
        isOpen={modalOpen}
        onClose={close}
        onSave={handleSave}
        onPay={handlePay}
        editBill={editBill}
        vendors={vendors}
        products={products}
        accounts={accounts}
      />
    </DashboardLayout>
  )
}

/* ── Vendor Bill Modal ── */
function VendorBillModal({ isOpen, onClose, onSave, onPay, editBill, vendors = [], products = [], accounts = [] }) {
  const toast         = useToast()
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
        const mappedLines = editBill.lines?.length
          ? editBill.lines.map(l => {
              const q = Number(l.qty || l.quantity || 0)
              const u = Number(l.unitPrice || 0)
              const calcTotal = q * u
              const t = Number(l.total || l.totalPrice || 0) || calcTotal
              return {
                product: typeof l.product === 'string' ? l.product : (l.product?.name || ''),
                productId: l.productId || l.product?.id || '',
                account: l.account || '',
                accountCode: l.accountCode || '',
                description: l.description || '',
                qty: q || '',
                unitPrice: u || '',
                total: t,
              }
            })
          : [{ ...EMPTY_LINE }, { ...EMPTY_LINE }]
        setFields({
          vendorRef: editBill.vendorRef||'',
          vendor: editBill.vendor||'',
          vendorId: editBill.vendorId||'',
          billRef: editBill.billRef||'',
          billBody: editBill.billBody||'',
          date: editBill.date||'',
          lines: mappedLines,
        })
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

  const subtotal = fields.lines.reduce((s, l) => {
    const q = Number(l.qty) || 0
    const u = Number(l.unitPrice) || 0
    const lineTot = Number(l.total) || (q * u)
    return s + lineTot
  }, 0)
  const taxRate = 0.18 // 18% GST Standard Tax
  const taxAmount = subtotal * taxRate
  const totalAmount = subtotal + taxAmount

  const changeField = (name, value) => { setFields(p => ({ ...p, [name]: value })); setErrors(p => ({ ...p, [name]: undefined })) }

  const updateLine = (idx, key, value) => {
    setFields(p => {
      const lines = p.lines.map((l, i) => {
        if (i !== idx) return l
        const updated = { ...l, [key]: value }
        if (key === 'qty' || key === 'unitPrice') {
          const q = Number(key === 'qty' ? value : l.qty) || 0
          const u = Number(key === 'unitPrice' ? value : l.unitPrice) || 0
          updated.total = q * u
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
    if (!fields.vendor && !fields.vendorId) e.vendor = 'Vendor is required'
    if (!fields.date)   e.date   = 'Bill date is required'
    const hasValidLine = fields.lines.some(l => (l.product || l.productId) && Number(l.qty) > 0)
    if (!hasValidLine) e.lines = 'At least one product line with a valid quantity is required'
    return e
  }

  const handleConfirm = () => {
    const v = validate(); if (Object.keys(v).length) { setErrors(v); return }
    setConfirmed(true); onSave(fields, 'Confirmed')
  }

  const handlePay = () => {
    if (!confirmed) { toast.warning('Please confirm the bill before payment.'); return }
    onPay(fields)
  }

  const billId = editBill?.id || 'BILL-NEW'

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
                <label className="dfm-lbl">
                  Vendor Name <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <div className="dfm-input-wrap dfm-dropdown-wrap">
                  <input type="text" className={`dfm-input${errors.vendor?' dfm-input--err':''}`}
                    placeholder="Select vendor..." value={fields.vendor}
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
              <div className="dfm-field">
                <label className="dfm-lbl">
                  Bill Date <span style={{ color: 'var(--error)' }}>*</span>
                </label>
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
                  const prodOpts = products.filter(p => !line.product || p.name.toLowerCase().includes(line.product.toLowerCase()))
                  const acctOpts = accounts.filter(a => !line.account || a.name.toLowerCase().includes(line.account.toLowerCase()))
                  const lineTotal = Number(line.total) || ((Number(line.qty) || 0) * (Number(line.unitPrice) || 0))
                  return (
                    <tr key={idx} className="dfm-line-row">
                      <td className="dfm-line-td dfm-line-idx">{idx+1}</td>
                      {/* Product */}
                      <td className={`dfm-line-td${prodDropIdx===idx?' dfm-line-td--active':''}`} style={{position:'relative', zIndex: prodDropIdx===idx?1100:'auto'}}>
                        <input type="text" className="dfm-line-input" placeholder="Product..."
                          value={line.product}
                          onChange={e => { updateLine(idx,'product',e.target.value); setProdDropIdx(idx) }}
                          onFocus={() => setProdDropIdx(idx)} autoComplete="off" />
                        {prodDropIdx===idx && prodOpts.length>0 && (
                          <div className="dfm-line-dropdown">
                            <div className="dfm-line-dropdown-header">Available Products ({prodOpts.length})</div>
                            {prodOpts.map(p => (
                              <button key={p.id} type="button" className="dfm-line-opt" onMouseDown={() => {
                                const price = p.costPrice || p.salesPrice || 0
                                updateLine(idx, 'product', p.name)
                                updateLine(idx, 'productId', p.id)
                                updateLine(idx, 'unitPrice', price)
                                if (line.qty) {
                                  updateLine(idx, 'total', Number(line.qty) * Number(price))
                                }
                                setProdDropIdx(null)
                              }}>
                                <span className="dfm-opt-name">{p.name}</span>
                                <span className="dfm-opt-price">{fmtINR(p.costPrice || p.salesPrice)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      {/* Account */}
                      <td className={`dfm-line-td${acctDropIdx===idx?' dfm-line-td--active':''}`} style={{position:'relative', zIndex: acctDropIdx===idx?1100:'auto'}}>
                        <input type="text" className="dfm-line-input" placeholder="Account..."
                          value={line.account}
                          onChange={e => { updateLine(idx,'account',e.target.value); setAcctDropIdx(idx) }}
                          onFocus={() => setAcctDropIdx(idx)} autoComplete="off" />
                        {acctDropIdx===idx && acctOpts.length>0 && (
                          <div className="dfm-line-dropdown">
                            <div className="dfm-line-dropdown-header">Chart of Accounts ({acctOpts.length})</div>
                            {acctOpts.map(a => (
                              <button key={a.id || a.code} type="button" className="dfm-line-opt" onMouseDown={() => selectAccount(idx, a)}>
                                <span className="dfm-opt-code">{a.code}</span>
                                <span className="dfm-opt-name">{a.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="dfm-line-td"><input type="text" className="dfm-line-input" placeholder="Description" value={line.description} onChange={e => updateLine(idx,'description',e.target.value)} /></td>
                      <td className="dfm-line-td"><input type="number" className="dfm-line-input dfm-line-input--num" placeholder="Qty" value={line.qty} onChange={e => updateLine(idx,'qty',e.target.value)} /></td>
                      <td className="dfm-line-td"><input type="number" className="dfm-line-input dfm-line-input--num" placeholder="0.00" value={line.unitPrice} onChange={e => updateLine(idx,'unitPrice',e.target.value)} /></td>
                      <td className="dfm-line-td dfm-line-total">{lineTotal > 0 ? fmtINR(lineTotal) : '—'}</td>
                      <td className="dfm-line-td">{fields.lines.length>1&&<button type="button" className="dfm-remove-btn" onClick={() => removeLine(idx)}><TrashIcon /></button>}</td>
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
