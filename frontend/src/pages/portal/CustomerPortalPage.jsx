import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './CustomerPortalPage.css'

/* ── Mock customers ── */
const CUSTOMERS = [
  { id: 'CUST-001', name: 'Ratan Mehra',    firstName: 'Ratan'  },
  { id: 'CUST-002', name: 'Priya Kapoor',   firstName: 'Priya'  },
  { id: 'CUST-003', name: 'Ananya Sharma',  firstName: 'Ananya' },
  { id: 'CUST-004', name: 'Mahindra Living',firstName: 'Mahindra'},
]

/* ── Mock data per customer ── */
const DATA = {
  'CUST-001': {
    invoices: [
      { id: 'INV/2026/0001', status: 'Paid',   issued: '1 Sept 2026', due: '15 Sept 2026', total: 56640,  paid: 56640,  amountDue: 0      },
    ],
    bills:    [],
    payments: [
      { id: 'PAY-001', date: '10 Sept 2026', amount: 56640, method: 'Bank', status: 'Confirmed' },
    ],
  },
  'CUST-002': {
    invoices: [
      { id: 'INV/2026/0002', status: 'Posted', issued: '3 Sept 2026', due: '3 Oct 2026',   total: 126850, paid: 50000,  amountDue: 76850  },
    ],
    bills:    [],
    payments: [],
  },
  'CUST-003': {
    invoices: [
      { id: 'INV/2026/0003', status: 'Posted', issued: '5 Sept 2026', due: '5 Oct 2026',   total: 48000,  paid: 0,      amountDue: 48000  },
      { id: 'INV/2026/0004', status: 'Paid',   issued: '1 Aug 2026',  due: '1 Sept 2026',  total: 22500,  paid: 22500,  amountDue: 0      },
    ],
    bills:    [],
    payments: [
      { id: 'PAY-003', date: '2 Sept 2026', amount: 22500, method: 'Cash', status: 'Confirmed' },
    ],
  },
  'CUST-004': {
    invoices: [
      { id: 'INV/2026/0005', status: 'Overdue', issued: '1 Aug 2026', due: '1 Sept 2026',  total: 227440, paid: 100000, amountDue: 127440 },
    ],
    bills:    [],
    payments: [
      { id: 'PAY-004', date: '15 Aug 2026', amount: 100000, method: 'Bank', status: 'Confirmed' },
    ],
  },
}

const fmtINR = (n) => `₹${Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const STATUS_BADGE = {
  Paid:    { cls: 'cp-badge--paid',    label: 'Paid'    },
  Posted:  { cls: 'cp-badge--posted',  label: 'Posted'  },
  Overdue: { cls: 'cp-badge--overdue', label: 'Overdue' },
  Draft:   { cls: 'cp-badge--draft',   label: 'Draft'   },
}

const TABS = ['Invoices', 'Bills', 'Payments']

export default function CustomerPortalPage() {
  const navigate    = useNavigate()
  const [activeCustomer, setActiveCustomer] = useState(CUSTOMERS[1]) // default: Priya
  const [activeTab, setActiveTab]           = useState('Invoices')
  const [payingInv, setPayingInv]           = useState(null)
  const [payAmt,    setPayAmt]              = useState('')
  const [payMethod, setPayMethod]           = useState('Bank')
  const [paidInvoices, setPaidInvoices]     = useState({})

  const customerData = DATA[activeCustomer.id] || { invoices: [], bills: [], payments: [] }

  /* Merge any payments made in-session */
  const invoices = customerData.invoices.map(inv => {
    const extra = paidInvoices[inv.id]
    if (!extra) return inv
    const newPaid = Math.min(inv.total, inv.paid + extra)
    return { ...inv, paid: newPaid, amountDue: Math.max(0, inv.total - newPaid), status: newPaid >= inv.total ? 'Paid' : inv.status }
  })

  const totalOutstanding = invoices.reduce((s, inv) => s + (inv.amountDue || 0), 0)
  const outstandingCount = invoices.filter(inv => inv.amountDue > 0).length

  /* Pay Now handler */
  const handlePayNow = (inv) => { setPayingInv(inv); setPayAmt(inv.amountDue); setPayMethod('Bank') }
  const confirmPayment = () => {
    const amt = Number(payAmt)
    if (!amt || amt <= 0) return
    setPaidInvoices(prev => ({ ...prev, [payingInv.id]: (prev[payingInv.id] || 0) + amt }))
    setPayingInv(null)
  }

  return (
    <div className="cp-portal">
      {/* ── Top navbar ── */}
      <nav className="cp-navbar">
        <div className="cp-navbar-brand">
          <div className="cp-navbar-logo">F</div>
          <div>
            <div className="cp-navbar-name">FurnIQ</div>
            <div className="cp-navbar-sub">Customer Portal · Role: CONTACT</div>
          </div>
        </div>

        <div className="cp-navbar-right">
          {/* Customer switcher */}
          <div className="cp-customer-select-wrap">
            <select
              className="cp-customer-select"
              value={activeCustomer.id}
              onChange={e => {
                const c = CUSTOMERS.find(c => c.id === e.target.value)
                if (c) { setActiveCustomer(c); setActiveTab('Invoices') }
              }}
              aria-label="Switch customer"
            >
              {CUSTOMERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronIcon />
          </div>

          {/* Back to Admin */}
          <button className="cp-admin-btn" onClick={() => navigate('/dashboard')}>
            ← Admin
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
            <h1 className="cp-greeting">Hello, {activeCustomer.firstName}.</h1>
            {totalOutstanding > 0
              ? <p className="cp-summary">You have <strong>{fmtINR(totalOutstanding)}</strong> outstanding across {outstandingCount} invoice(s).</p>
              : <p className="cp-summary cp-summary--clear">You have no outstanding invoices. All paid! ✓</p>
            }

            <div className="cp-inv-list">
              {invoices.length === 0
                ? <div className="cp-empty">No invoices found.</div>
                : invoices.map(inv => {
                  const paidPct = inv.total > 0 ? Math.round((inv.paid / inv.total) * 100) : 0
                  const badge   = STATUS_BADGE[inv.status] || STATUS_BADGE.Draft
                  return (
                    <div key={inv.id} className={`cp-inv-card${inv.status === 'Overdue' ? ' cp-inv-card--overdue' : ''}`}>
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
                })
              }
            </div>
          </div>
        )}

        {/* ── BILLS tab ── */}
        {activeTab === 'Bills' && (
          <div className="cp-content">
            <h1 className="cp-greeting">Bills</h1>
            <p className="cp-summary">Your purchase bills and statements.</p>
            <div className="cp-empty">No bills on record for this account.</div>
          </div>
        )}

        {/* ── PAYMENTS tab ── */}
        {activeTab === 'Payments' && (
          <div className="cp-content">
            <h1 className="cp-greeting">Hello, {activeCustomer.firstName}.</h1>
            <p className="cp-summary">
              You have <strong>{fmtINR(totalOutstanding)}</strong> outstanding across {outstandingCount} invoice(s).
            </p>

            {customerData.payments.length === 0
              ? <div className="cp-empty">No payments recorded yet.</div>
              : (
                <div className="cp-pay-card-list">
                  {customerData.payments.map(p => (
                    <div key={p.id} className="cp-pay-card">
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
                </div>
              )
            }
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
              <button className="cp-pay-modal-confirm" onClick={confirmPayment}>
                Confirm Payment — {fmtINR(payAmt)}
              </button>
              <button className="cp-pay-modal-cancel" onClick={() => setPayingInv(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChevronIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
}
