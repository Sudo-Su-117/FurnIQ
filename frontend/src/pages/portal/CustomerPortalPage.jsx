import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Pagination, { usePagination } from '../../components/Pagination'
import { api, extractList } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import './CustomerPortalPage.css'

const PORTAL_CUST_KEY = 'furniq_portal_cust_id'

const fmtINR = (n) => `₹${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const STATUS_BADGE = {
  Paid:    { cls: 'cp-badge--paid',    label: 'Paid'    },
  Posted:  { cls: 'cp-badge--posted',  label: 'Posted'  },
  Overdue: { cls: 'cp-badge--overdue', label: 'Overdue' },
  Draft:   { cls: 'cp-badge--draft',   label: 'Draft'   },
}

const TABS = ['Invoices', 'Bills', 'Payments']

export default function CustomerPortalPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user, isContactUser, contactId, logout } = useAuth()
  const [customers, setCustomers] = useState([])
  const [activeCustomer, setActiveCustomer] = useState(null)
  const [activeTab, setActiveTab] = useState('Invoices')
  const [loading, setLoading] = useState(false)
  const [invoices, setInvoices] = useState([])
  const [bills, setBills] = useState([])
  const [payments, setPayments] = useState([])

  const [payingInv, setPayingInv] = useState(null)
  const [payAmt, setPayAmt] = useState('')
  const [payMethod, setPayMethod] = useState('Bank')
  const [paying, setPaying] = useState(false)

  // Custom customer switcher dropdown state
  const [custDropOpen, setCustDropOpen] = useState(false)
  const [custSearch, setCustSearch] = useState('')
  const custDropRef = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => {
      if (custDropRef.current && !custDropRef.current.contains(e.target)) {
        setCustDropOpen(false)
      }
    }
    const handleEsc = (e) => {
      if (e.key === 'Escape') setCustDropOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [])

  // 1. Load real contacts from database with persistent active selection
  useEffect(() => {
    api.contacts.list({ limit: 100 })
      .then(res => {
        const list = extractList(res)
        const custs = list.filter(c => c.type === 'CUSTOMER' || c.type === 'BOTH')
        setCustomers(custs.length > 0 ? custs : list)
        if (list.length > 0) {
          // If logged in as contact user, find their contact regardless of type (Customer or Vendor)
          if (isContactUser && contactId) {
            const myContact = list.find(c => c.id === contactId) || list[0]
            setActiveCustomer(myContact)
            sessionStorage.setItem(PORTAL_CUST_KEY, myContact.id)
            return
          }

          // Restore previously active customer from sessionStorage
          const savedId = sessionStorage.getItem(PORTAL_CUST_KEY)
          const matched = list.find(c => c.id === savedId) || custs[0] || list[0]
          setActiveCustomer(matched)
          sessionStorage.setItem(PORTAL_CUST_KEY, matched.id)
        }
      })
      .catch(err => console.error('Failed to load customers for portal:', err))
  }, [isContactUser, contactId])

  // 2. Load live data for selected customer
  const loadCustomerData = useCallback(async (customerId) => {
    if (!customerId) return
    setLoading(true)
    try {
      const [invRes, billsRes, payRes] = await Promise.allSettled([
        api.sales.listInvoices({ limit: 100 }),
        api.purchases.listBills({ limit: 100 }),
        api.payments.list({ limit: 100 }),
      ])

      if (invRes.status === 'fulfilled') {
        const list = extractList(invRes.value)
        const custInvoices = list.filter(inv => inv.customerId === customerId || inv.customer?.id === customerId)
        setInvoices(custInvoices.map(inv => {
          const total = Number(inv.totalAmount || 0)
          const paid = Number(inv.paidAmount || 0)
          const amountDue = Math.max(0, total - paid)
          let status = 'Draft'
          if (inv.status === 'PAID' || amountDue === 0) status = 'Paid'
          else if (inv.status === 'CONFIRMED') status = 'Posted'

          return {
            id: inv.invoiceNumber || 'INV-001',
            rawId: inv.id,
            status,
            issued: inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
            due: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
            total,
            paid,
            amountDue,
          }
        }))
      }

      if (billsRes.status === 'fulfilled') {
        const list = extractList(billsRes.value)
        const custBills = list.filter(b => b.vendorId === customerId || b.vendor?.id === customerId)
        setBills(custBills.map(b => ({
          id: b.billNumber || 'BILL-001',
          rawId: b.id,
          status: b.status === 'PAID' ? 'Paid' : 'Posted',
          total: Number(b.totalAmount || 0),
          paid: Number(b.paidAmount || 0),
          amountDue: Math.max(0, Number(b.totalAmount || 0) - Number(b.paidAmount || 0)),
          date: b.billDate ? new Date(b.billDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
        })))
      }

      if (payRes.status === 'fulfilled') {
        const list = extractList(payRes.value)
        const custPayments = list.filter(p =>
          p.contactId === customerId ||
          p.contact?.id === customerId ||
          p.customerInvoice?.customerId === customerId
        )
        setPayments(custPayments.map(p => ({
          id: p.paymentNumber || (p.id ? `PAY-${p.id.slice(0, 8).toUpperCase()}` : 'PAY-001'),
          rawId: p.id,
          date: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
          amount: Number(p.amount || 0),
          method: p.paymentMethod || 'BANK',
          status: 'Confirmed',
        })))
      }
    } catch (err) {
      console.error('Failed to load customer portal data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeCustomer?.id) {
      loadCustomerData(activeCustomer.id)
    }
  }, [activeCustomer, loadCustomerData])

  const totalOutstanding = invoices.reduce((s, inv) => s + (inv.amountDue || 0), 0)
  const outstandingCount = invoices.filter(inv => inv.amountDue > 0).length

  // Pagination for portal tabs (10 items per page)
  const { page: invPage, setPage: setInvPage, paged: pagedInvoices, total: totalInvoices } = usePagination(invoices, 10)
  const { page: billPage, setPage: setBillPage, paged: pagedBills, total: totalBills } = usePagination(bills, 10)
  const { page: payPage, setPage: setPayPage, paged: pagedPayments, total: totalPayments } = usePagination(payments, 10)

  /* Pay Now handler */
  const handlePayNow = (inv) => {
    setPayingInv(inv)
    setPayAmt(inv.amountDue)
    setPayMethod('Bank')
  }

  /* Real Backend Persistence for Payments */
  const confirmPayment = async () => {
    const amt = Number(payAmt)
    if (!amt || amt <= 0 || !payingInv) return
    setPaying(true)
    try {
      await api.payments.recordCustomerPayment({
        customerInvoiceId: payingInv.rawId,
        paymentMethod: payMethod.toUpperCase() === 'CASH' ? 'CASH' : 'BANK',
        amount: amt,
        paymentDate: new Date().toISOString(),
        reference: `PORTAL-${payMethod.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      })
      await loadCustomerData(activeCustomer.id)
      setPayingInv(null)
      toast.success(`Payment of ${fmtINR(amt)} successfully recorded and settled in database!`)
    } catch (err) {
      console.error('Failed to record portal payment:', err)
      toast.error(`Payment failed: ${err.message || 'Error occurred'}`)
    } finally {
      setPaying(false)
    }
  }

  const customerFirstName = activeCustomer?.name ? activeCustomer.name.split(' ')[0] : 'Customer'

  return (
    <div className="cp-portal">
      {/* ── Top navbar ── */}
      <nav className="cp-navbar">
        <div className="cp-navbar-brand">
          <div className="cp-navbar-logo">F</div>
          <div>
            <div className="cp-navbar-name">FurnIQ</div>
            <div className="cp-navbar-sub">
              {isContactUser ? `Customer Portal · ${user?.name || 'Customer'}` : 'Customer Portal · Role: CONTACT'}
            </div>
          </div>
        </div>

        <div className="cp-navbar-right">
          {/* Customer switcher (shown for admins/accountants to test different accounts) */}
          {!isContactUser ? (
            <div className="cp-custom-dropdown" ref={custDropRef}>
              <button
                type="button"
                className={`cp-cust-trigger ${custDropOpen ? 'cp-cust-trigger--open' : ''}`}
                onClick={() => setCustDropOpen(v => !v)}
                aria-expanded={custDropOpen}
                aria-haspopup="listbox"
                id="customer-portal-switcher"
              >
                <div className="cp-cust-avatar">
                  {activeCustomer?.profileImage ? (
                    <img src={activeCustomer.profileImage} alt="" />
                  ) : (
                    <span>{(activeCustomer?.name || 'C').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="cp-cust-info">
                  <span className="cp-cust-label">ACTIVE ACCOUNT</span>
                  <span className="cp-cust-name">{activeCustomer?.name || 'Select Customer'}</span>
                </div>
                <ChevronIcon open={custDropOpen} />
              </button>

              {custDropOpen && (
                <div className="cp-cust-menu" role="listbox">
                  <div className="cp-cust-menu-header">
                    <span>SWITCH ACCOUNT</span>
                    <span className="cp-cust-menu-count">{customers.length} Accounts</span>
                  </div>

                  {customers.length > 5 && (
                    <div className="cp-cust-search-box">
                      <input
                        type="text"
                        placeholder="Search accounts..."
                        value={custSearch}
                        onChange={e => setCustSearch(e.target.value)}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  )}

                  <div className="cp-cust-list">
                    {customers
                      .filter(c => !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase()) || (c.city && c.city.toLowerCase().includes(custSearch.toLowerCase())))
                      .map(c => {
                        const isSelected = c.id === activeCustomer?.id
                        return (
                          <div
                            key={c.id}
                            className={`cp-cust-item ${isSelected ? 'cp-cust-item--selected' : ''}`}
                            onClick={() => {
                              setActiveCustomer(c)
                              sessionStorage.setItem(PORTAL_CUST_KEY, c.id)
                              setActiveTab('Invoices')
                              setCustDropOpen(false)
                              setCustSearch('')
                            }}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div className="cp-item-avatar">
                              {c.profileImage ? (
                                <img src={c.profileImage} alt="" />
                              ) : (
                                <span>{c.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="cp-item-meta">
                              <span className="cp-item-name">{c.name}</span>
                              <span className="cp-item-sub">
                                {c.id.startsWith('CUST-') || c.id.startsWith('VEND-') ? `${c.id} · ` : ''}
                                {c.city ? `${c.city} · ` : ''}
                                {c.type === 'VENDOR' ? 'Vendor' : 'Customer'}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="cp-item-check" aria-hidden="true">✓</span>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="cp-contact-badge">
              <div className="cp-cust-avatar" style={{ width: 22, height: 22, fontSize: 11 }}>
                <span>{(activeCustomer?.name || 'C').charAt(0).toUpperCase()}</span>
              </div>
              {activeCustomer?.name}
            </div>
          )}

          {/* Back to Admin (if not restricted contact user) */}
          {!isContactUser && (
            <button className="cp-admin-btn" onClick={() => navigate('/dashboard')}>
              ← Admin
            </button>
          )}

          {/* Sign Out button */}
          <button
            className="cp-portal-logout-btn"
            onClick={() => {
              logout()
              toast.info('You have been signed out of the portal successfully.', 'Signed Out')
              navigate('/login')
            }}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogoutIcon /> Sign Out
          </button>
        </div>
      </nav>

      {/* ── Tab bar ── */}
      <div className="cp-tabs-bar">
        {TABS.map(tab => (
          <button key={tab}
            className={`cp-tab${activeTab === tab ? ' cp-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      <main className="cp-main">

        {/* ── INVOICES tab ── */}
        {activeTab === 'Invoices' && (
          <div className="cp-content">
            <h1 className="cp-greeting">Hello, {customerFirstName}.</h1>
            {loading ? (
              <p className="cp-summary">Loading your account invoices from database...</p>
            ) : totalOutstanding > 0 ? (
              <p className="cp-summary">You have <strong>{fmtINR(totalOutstanding)}</strong> outstanding across {outstandingCount} invoice(s).</p>
            ) : (
              <p className="cp-summary cp-summary--clear">You have no outstanding invoices. All paid! ✓</p>
            )}

            <div className="cp-inv-list">
              {invoices.length === 0 ? (
                <div className="cp-empty">{loading ? 'Loading invoices...' : 'No invoices found for this customer.'}</div>
              ) : (
                <>
                  {pagedInvoices.map(inv => {
                    const badge = STATUS_BADGE[inv.status] || STATUS_BADGE.Draft
                    const paidPct = inv.total > 0 ? Math.min(100, Math.round((inv.paid / inv.total) * 100)) : 0
                    return (
                      <div key={inv.rawId || inv.id} className={`cp-inv-card${inv.status === 'Overdue' ? ' cp-inv-card--overdue' : ''}`}>
                        <div className="cp-inv-card-left">
                          <div className="cp-inv-top">
                            <span className="cp-inv-id">{inv.id}</span>
                            <span className={`cp-badge ${badge.cls}`}>{badge.label}</span>
                          </div>
                          <div className="cp-inv-dates">
                            Issued {inv.issued} · Due {inv.due}
                          </div>

                          {/* Progress bar */}
                          {inv.total > 0 && (
                            <div className="cp-inv-progress-wrap">
                              <div className="cp-inv-progress">
                                <div className="cp-inv-progress-fill" style={{ width: `${paidPct}%` }} />
                              </div>
                              {inv.paid > 0 && <span className="cp-inv-paid-label">{fmtINR(inv.paid)} paid</span>}
                            </div>
                          )}
                        </div>

                        <div className="cp-inv-card-right">
                          <div className="cp-inv-total">{fmtINR(inv.total)}</div>
                          {inv.amountDue > 0 && (
                            <>
                              <div className="cp-inv-due">Due: {fmtINR(inv.amountDue)}</div>
                              <button className="cp-pay-btn" onClick={() => handlePayNow(inv)}>Pay Now</button>
                            </>
                          )}
                          {inv.amountDue === 0 && <div className="cp-inv-paid-badge">✓ Paid</div>}
                        </div>
                      </div>
                    )
                  })}
                  <Pagination total={totalInvoices} page={invPage} pageSize={10} onChange={setInvPage} />
                </>
              )}
            </div>
          </div>
        )}

        {/* ── BILLS tab ── */}
        {activeTab === 'Bills' && (
          <div className="cp-content">
            <h1 className="cp-greeting">Bills</h1>
            <p className="cp-summary">Your purchase bills and statements.</p>
            {bills.length === 0 ? (
              <div className="cp-empty">No bills on record for this account.</div>
            ) : (
              <div className="cp-inv-list">
                {pagedBills.map(b => (
                  <div key={b.rawId || b.id} className="cp-inv-card">
                    <div className="cp-inv-card-left">
                      <div className="cp-inv-top">
                        <span className="cp-inv-id">{b.id}</span>
                        <span className={`cp-badge ${STATUS_BADGE[b.status]?.cls || 'cp-badge--posted'}`}>{b.status}</span>
                      </div>
                      <div className="cp-inv-dates">Date: {b.date}</div>
                    </div>
                    <div className="cp-inv-card-right">
                      <div className="cp-inv-total">{fmtINR(b.total)}</div>
                    </div>
                  </div>
                ))}
                <Pagination total={totalBills} page={billPage} pageSize={10} onChange={setBillPage} />
              </div>
            )}
          </div>
        )}

        {/* ── PAYMENTS tab ── */}
        {activeTab === 'Payments' && (
          <div className="cp-content">
            <h1 className="cp-greeting">Hello, {customerFirstName}.</h1>
            <p className="cp-summary">
              Recorded payments and bank receipts.
            </p>

            {payments.length === 0 ? (
              <div className="cp-empty">{loading ? 'Loading payments...' : 'No payments recorded yet.'}</div>
            ) : (
              <div className="cp-pay-card-list">
                {pagedPayments.map(p => (
                  <div key={p.rawId || p.id} className="cp-pay-card">
                    <div className="cp-pay-card-left">
                      <span className="cp-pay-inv-id">{p.id}</span>
                      <span className="cp-pay-meta">
                        {p.date} · <span className="cp-pay-method-tag">{p.method.toUpperCase()}</span>
                      </span>
                    </div>
                    <div className="cp-pay-card-right">
                      <span className="cp-pay-card-amount">{fmtINR(p.amount)}</span>
                      <span className={`cp-badge ${STATUS_BADGE[p.status]?.cls || 'cp-badge--posted'}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
                <Pagination total={totalPayments} page={payPage} pageSize={10} onChange={setPayPage} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="cp-footer">
        <span>FurnIQ · Mumbai</span>
        <span>accounts@furniq.in</span>
      </footer>

      {/* ── Pay Now modal ── */}
      {payingInv && (
        <div className="cp-pay-overlay" onClick={e => e.target === e.currentTarget && setPayingInv(null)}>
          <div className="cp-pay-modal">
            <div className="cp-pay-modal-header">
              <div>
                <h3 className="cp-pay-modal-title">Pay Invoice</h3>
                <p className="cp-pay-modal-sub">{payingInv.id}</p>
              </div>
              <button className="cp-pay-modal-close" onClick={() => setPayingInv(null)}>✕</button>
            </div>

            <div className="cp-pay-modal-body">
              <div className="cp-pay-modal-row">
                <span>Invoice Total</span>
                <strong>{fmtINR(payingInv.total)}</strong>
              </div>
              <div className="cp-pay-modal-row">
                <span>Amount Due</span>
                <strong className="cp-pay-modal-due">{fmtINR(payingInv.amountDue)}</strong>
              </div>

              <div className="cp-pay-modal-field">
                <label className="cp-pay-modal-lbl">Payment Method</label>
                <div className="cp-pay-method-toggle">
                  {['Bank','Cash','UPI'].map(m => (
                    <button key={m} type="button"
                      className={`cp-pay-method-btn${payMethod===m?' cp-pay-method-btn--active':''}`}
                      onClick={() => setPayMethod(m)}>{m}</button>
                  ))}
                </div>
              </div>

              <div className="cp-pay-modal-field">
                <label className="cp-pay-modal-lbl">Amount to Pay (₹)</label>
                <input type="number" className="cp-pay-modal-input" min="1" max={payingInv.amountDue}
                  value={payAmt} onChange={e => setPayAmt(e.target.value)} />
              </div>
            </div>

            <div className="cp-pay-modal-footer">
              <button className="cp-pay-modal-confirm" onClick={confirmPayment} disabled={paying}>
                {paying ? 'Processing...' : `Confirm Payment — ${fmtINR(payAmt)}`}
              </button>
              <button className="cp-pay-modal-cancel" onClick={() => setPayingInv(null)} disabled={paying}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`cp-chevron ${open ? 'cp-chevron--open' : ''}`}
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
function LogoutIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
