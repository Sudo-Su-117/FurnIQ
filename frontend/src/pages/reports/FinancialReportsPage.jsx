import React, { useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import './FinancialReportsPage.css'

/* ─── Formatting helpers ─── */
const fmtINR = (n) => {
  if (n === null || n === undefined) return '—'
  const abs = Math.abs(n)
  const str = abs.toLocaleString('en-IN', { minimumFractionDigits: 2 })
  return n < 0 ? `−₹${str}` : `₹${str}`
}

/* ─── Period options ─── */
const PERIODS = [
  'September 2026', 'August 2026', 'July 2026',
  'Q2 FY2026-27', 'Q1 FY2026-27', 'FY 2025-26'
]

/* ══════════════════════════════════════════════════════
   TAB 1 — PROFIT & LOSS  (matches wireframe exactly)
   Layout: Two-column table (Income/Expenses | Balance)
   Rows:
     Income          = total of all Income-type accounts
     Income from Sales = account type Income
     ---
     Expenses        = total of all expenses
     Purchase Expense = account type Expenses (COGS)
     Other Expense   = account type Other Expenses
     ---
     Net Income      = Difference of Income - Revenue
══════════════════════════════════════════════════════ */

/* Data sourced from Chart of Accounts / Journal Entries */
const PL_ACCOUNTS = {
  income: [
    { label: 'Furniture Sales Income', amount: 357500, type: 'Income' },
    { label: 'Service Revenue',        amount: 18000,  type: 'Income' },
  ],
  purchaseExpense: [
    { label: 'Cost of Goods Sold', amount: 233500, type: 'Expenses' },
  ],
  otherExpense: [
    { label: 'Workshop Rent',           amount: 36000,  type: 'Other Expenses' },
    { label: 'Salaries & Wages',        amount: 84000,  type: 'Other Expenses' },
    { label: 'Utilities & Power',       amount: 9200,   type: 'Other Expenses' },
    { label: 'Marketing & Advertising', amount: 11300,  type: 'Other Expenses' },
  ],
}

function ProfitLossReport({ period, year }) {
  /* Computed totals */
  const totalIncome     = PL_ACCOUNTS.income.reduce((s, r) => s + r.amount, 0)
  const incomeFromSales = PL_ACCOUNTS.income.find(r => r.label === 'Furniture Sales Income')?.amount ?? 0
  const purchaseExpense = PL_ACCOUNTS.purchaseExpense.reduce((s, r) => s + r.amount, 0)
  const otherExpense    = PL_ACCOUNTS.otherExpense.reduce((s, r) => s + r.amount, 0)
  const totalExpenses   = purchaseExpense + otherExpense
  const netIncome       = totalIncome - totalExpenses

  const rows = [
    /* ── INCOME section ── */
    { type: 'section-header', label: 'Income' },
    { type: 'row',    label: 'Income',           note: '(Total of all Income type)',          balance: totalIncome    },
    { type: 'row',    label: 'Income from Sales', note: '(Account type: Income)',              balance: incomeFromSales },
    /* ── EXPENSES section ── */
    { type: 'section-header', label: 'Expenses' },
    { type: 'row',    label: 'Expenses',          note: '(Total of all expenses)',             balance: totalExpenses   },
    { type: 'row',    label: 'Purchase Expense',  note: '(Account type: Expenses)',            balance: purchaseExpense },
    { type: 'row',    label: 'Other Expense',     note: '(Account type: Other Expenses)',      balance: otherExpense    },
    /* ── NET INCOME ── */
    { type: 'net',    label: 'Net Income',        note: '(Difference of Income − Revenue)',    balance: netIncome       },
  ]

  return (
    <div className="fr-report">
      {/* Wireframe-style 2-col table: left label | right Balance */}
      <table className="fr-pl-table">
        <thead>
          <tr>
            <th className="fr-pl-th-wide"></th>
            <th className="fr-pl-th-bal">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.type === 'section-header') {
              return (
                <tr key={i} className="fr-pl-section-row">
                  <td colSpan={2} className="fr-pl-section-label">{row.label}</td>
                </tr>
              )
            }
            if (row.type === 'net') {
              return (
                <tr key={i} className="fr-pl-net-row">
                  <td className="fr-pl-net-label">
                    {row.label}
                    {row.note && <span className="fr-pl-note">{row.note}</span>}
                  </td>
                  <td className={`fr-pl-net-bal${row.balance < 0 ? ' fr-pl-neg' : ''}`}>
                    {fmtINR(row.balance)}
                  </td>
                </tr>
              )
            }
            return (
              <tr key={i} className="fr-pl-row">
                <td className="fr-pl-label">
                  {row.label}
                  {row.note && <span className="fr-pl-note">{row.note}</span>}
                </td>
                <td className="fr-pl-bal">{fmtINR(row.balance)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Detailed breakdown (keep existing detail below) */}
      <div className="fr-pl-detail-toggle">
        <details>
          <summary className="fr-pl-detail-summary">View detailed breakdown ▾</summary>
          <div className="fr-pl-detail-body">
            <div className="fr-section">
              <div className="fr-section-header">SALESINCOME (Income type accounts)</div>
              {PL_ACCOUNTS.income.map(r => (
                <div key={r.label} className="fr-row">
                  <span className="fr-row-label">{r.label}</span>
                  <span className="fr-row-amount">{fmtINR(r.amount)}</span>
                </div>
              ))}
              <div className="fr-subtotal-row">
                <span className="fr-subtotal-label">Total Income</span>
                <span className="fr-subtotal-amount">{fmtINR(totalIncome)}</span>
              </div>
            </div>

            <div className="fr-section">
              <div className="fr-section-header">PURCHASEEXPENSE (COGS)</div>
              {PL_ACCOUNTS.purchaseExpense.map(r => (
                <div key={r.label} className="fr-row">
                  <span className="fr-row-label">{r.label}</span>
                  <span className="fr-row-amount">{fmtINR(r.amount)}</span>
                </div>
              ))}
              <div className="fr-subtotal-row">
                <span className="fr-subtotal-label">purchaseExpense</span>
                <span className="fr-subtotal-amount">{fmtINR(purchaseExpense)}</span>
              </div>
            </div>

            <div className="fr-highlight-box fr-highlight-box--green">
              <div className="fr-highlight-title">GROSS PROFIT</div>
              <div className="fr-highlight-formula">salesIncome − purchaseExpense</div>
              <div className="fr-highlight-value">{fmtINR(totalIncome - purchaseExpense)}</div>
            </div>

            <div className="fr-section">
              <div className="fr-section-header">OTHEREXPENSES</div>
              {PL_ACCOUNTS.otherExpense.map(r => (
                <div key={r.label} className="fr-row">
                  <span className="fr-row-label">{r.label}</span>
                  <span className="fr-row-amount">{fmtINR(r.amount)}</span>
                </div>
              ))}
              <div className="fr-subtotal-row">
                <span className="fr-subtotal-label">otherExpenses</span>
                <span className="fr-subtotal-amount">{fmtINR(otherExpense)}</span>
              </div>
            </div>

            <div className={`fr-highlight-box${netIncome >= 0 ? ' fr-highlight-box--gold' : ' fr-highlight-box--red'}`}>
              <div className="fr-highlight-title">NET INCOME</div>
              <div className="fr-highlight-formula">grossProfit − otherExpenses · {period}</div>
              <div className="fr-highlight-value fr-highlight-value--large">{fmtINR(netIncome)}</div>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TAB 2 — BALANCE SHEET  (matches wireframe exactly)
   Two-column layout: Assets (left) | Liabilities (right)
   Assets:      Bank, Cash, Debtors  (Account type: Bank / Cash / Asset)
   Liabilities: Capital, Creditors   (Account type: Capital / Liability)
   Footer:      Total Asset | Total Liability
══════════════════════════════════════════════════════ */

const BS_ACCOUNTS = {
  assets: [
    { label: 'Bank',     note: 'Account type: Bank',    amount: 495000 },
    { label: 'Cash',     note: 'Account type: Cash',    amount: 12000  },
    { label: 'Debtors',  note: 'Account type: Asset',   amount: 310000 },
  ],
  liabilities: [
    { label: 'Capital',   note: 'Account type: Capital',   amount: 826500 },
    { label: 'Creditors', note: 'Account type: Liability',  amount: 220500 },
  ],
}

function BalanceSheetReport() {
  const totalAssets      = BS_ACCOUNTS.assets.reduce((s, r) => s + r.amount, 0)
  const totalLiabilities = BS_ACCOUNTS.liabilities.reduce((s, r) => s + r.amount, 0)
  const balanced         = totalAssets === totalLiabilities

  return (
    <div className="fr-report">
      {/* Two-column balance sheet table */}
      <table className="fr-bs-table">
        <thead>
          <tr>
            <th className="fr-bs-th fr-bs-th--asset">Assets</th>
            <th className="fr-bs-th fr-bs-th--liability">Liabilities</th>
          </tr>
        </thead>
        <tbody>
          {/* Render rows: one asset and one liability per row */}
          {Array.from({ length: Math.max(BS_ACCOUNTS.assets.length, BS_ACCOUNTS.liabilities.length) }).map((_, i) => {
            const asset = BS_ACCOUNTS.assets[i]
            const liab  = BS_ACCOUNTS.liabilities[i]
            return (
              <tr key={i} className="fr-bs-row">
                {/* Asset cell */}
                <td className="fr-bs-cell fr-bs-cell--asset">
                  {asset ? (
                    <div className="fr-bs-item">
                      <div className="fr-bs-item-label">{asset.label}</div>
                      <div className="fr-bs-item-note">{asset.note}</div>
                      <div className="fr-bs-item-amount">{fmtINR(asset.amount)}</div>
                    </div>
                  ) : null}
                </td>
                {/* Liability cell */}
                <td className="fr-bs-cell fr-bs-cell--liability">
                  {liab ? (
                    <div className="fr-bs-item">
                      <div className="fr-bs-item-label">{liab.label}</div>
                      <div className="fr-bs-item-note">{liab.note}</div>
                      <div className="fr-bs-item-amount">{fmtINR(liab.amount)}</div>
                    </div>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="fr-bs-total-row">
            <td className="fr-bs-total fr-bs-total--asset">
              <span className="fr-bs-total-label">Total Asset</span>
              <span className="fr-bs-total-val">{fmtINR(totalAssets)}</span>
            </td>
            <td className="fr-bs-total fr-bs-total--liability">
              <span className="fr-bs-total-label">Total Liability</span>
              <span className={`fr-bs-total-val${!balanced ? ' fr-bs-unbalanced' : ''}`}>
                {fmtINR(totalLiabilities)}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Balance check notice */}
      <div className={`fr-bs-balance-note${balanced ? ' fr-bs-balance-note--ok' : ' fr-bs-balance-note--warn'}`}>
        {balanced
          ? '✓ Balance sheet is balanced'
          : `⚠ Difference: ${fmtINR(Math.abs(totalAssets - totalLiabilities))} — Assets and Liabilities do not match`
        }
      </div>

      {/* Field explanation panel */}
      <div className="fr-bs-field-explanation">
        <div className="fr-bs-fe-title">Field Explanation</div>
        <div className="fr-bs-fe-grid">
          <div className="fr-bs-fe-item">
            <span className="fr-bs-fe-field">Bank</span>
            <span className="fr-bs-fe-desc">— Account type Asset · Bank</span>
          </div>
          <div className="fr-bs-fe-item">
            <span className="fr-bs-fe-field">Cash</span>
            <span className="fr-bs-fe-desc">— Account type Asset · Cash</span>
          </div>
          <div className="fr-bs-fe-item">
            <span className="fr-bs-fe-field">Debtors</span>
            <span className="fr-bs-fe-desc">— Account type Asset · Debtors</span>
          </div>
          <div className="fr-bs-fe-item">
            <span className="fr-bs-fe-field">Creditors</span>
            <span className="fr-bs-fe-desc">— Account type Liability · Creditors</span>
          </div>
          <div className="fr-bs-fe-item">
            <span className="fr-bs-fe-field">Capital</span>
            <span className="fr-bs-fe-desc">— Account type Capital</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TAB 3 — STOCK REPORT
══════════════════════════════════════════════════════ */
const STOCK_DATA = [
  { id: 'PROD-001', name: 'Oak Dining Table (6-seater)', category: 'Tables',  qty: 5,  costPrice: 28000,  salesPrice: 48000,  stockValue: 140000 },
  { id: 'PROD-002', name: 'Rosewood Sofa Set (3+1+1)',   category: 'Seating', qty: 3,  costPrice: 52000,  salesPrice: 85000,  stockValue: 156000 },
  { id: 'PROD-003', name: 'Teak Coffee Table',           category: 'Tables',  qty: 2,  costPrice: 13500,  salesPrice: 22500,  stockValue: 27000  },
  { id: 'PROD-004', name: 'Wicker Armchair',             category: 'Seating', qty: 11, costPrice: 8200,   salesPrice: 14000,  stockValue: 90200  },
  { id: 'PROD-005', name: 'Sheesham Bookshelf (5-tier)', category: 'Storage', qty: 4,  costPrice: 10800,  salesPrice: 18500,  stockValue: 43200  },
  { id: 'PROD-006', name: 'Bedroom Combo Package',       category: 'Bedroom', qty: 2,  costPrice: 82000,  salesPrice: 125000, stockValue: 164000 },
]

const LOW_STOCK = 4

function StockReport() {
  const totalValue = STOCK_DATA.reduce((s, r) => s + r.stockValue, 0)
  const lowCount   = STOCK_DATA.filter(r => r.qty < LOW_STOCK).length

  return (
    <div className="fr-report">
      {/* Summary row */}
      <div className="fr-stock-summary">
        <div className="fr-ss-card">
          <span className="fr-ss-label">Total Products</span>
          <span className="fr-ss-val">{STOCK_DATA.length}</span>
        </div>
        <div className="fr-ss-card">
          <span className="fr-ss-label">Total Stock Value</span>
          <span className="fr-ss-val fr-ss-val--primary">{fmtINR(totalValue)}</span>
        </div>
        <div className="fr-ss-card fr-ss-card--warn">
          <span className="fr-ss-label">Low Stock Items</span>
          <span className="fr-ss-val fr-ss-val--warn">{lowCount}</span>
        </div>
      </div>

      {/* Table */}
      <table className="fr-stock-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th className="align-right">Qty</th>
            <th className="align-right">Cost Price</th>
            <th className="align-right">Sales Price</th>
            <th className="align-right">Stock Value</th>
          </tr>
        </thead>
        <tbody>
          {STOCK_DATA.map((r, i) => (
            <tr key={r.id} className={`fr-stock-row${i % 2 === 1 ? ' fr-stock-row--alt' : ''}`}>
              <td>
                <div className="fr-stock-name">{r.name}</div>
                <div className="fr-stock-id">{r.id}</div>
              </td>
              <td>{r.category}</td>
              <td className="align-right">
                {r.qty < LOW_STOCK
                  ? <span className="fr-stock-low">⚠ {r.qty}</span>
                  : <span className="fr-stock-ok">{r.qty}</span>
                }
              </td>
              <td className="align-right">{fmtINR(r.costPrice)}</td>
              <td className="align-right">{fmtINR(r.salesPrice)}</td>
              <td className="align-right fr-stock-value">{fmtINR(r.stockValue)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="fr-stock-total-row">
            <td colSpan={5} className="fr-stock-total-label">Total Stock Value</td>
            <td className="align-right fr-stock-total-val">{fmtINR(totalValue)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TAB 4 — BUDGET REPORT
══════════════════════════════════════════════════════ */
const BUDGET_RPT_DATA = [
  { id: 'BP-001', name: 'Annual Budget FY 2026-27', category: 'Capital',   budgeted: 1550000, actual: 1253000, variance: 297000,  pct: 80.8 },
  { id: 'BP-002', name: 'Q3 Marketing Plan',        category: 'Operating', budgeted: 120000,  actual: 110500,  variance: 9500,    pct: 92.1 },
  { id: 'BG-003', name: 'Marketing – Sept',         category: 'Operating', budgeted: 120000,  actual: 110500,  variance: 9500,    pct: 92.1 },
  { id: 'BG-004', name: 'Raw Materials – Oct',      category: 'Operating', budgeted: 350000,  actual: 0,       variance: 350000,  pct: 0    },
  { id: 'BG-005', name: 'Staff Training – Q4',      category: 'HR',        budgeted: 80000,   actual: 0,       variance: 80000,   pct: 0    },
  { id: 'BG-006', name: 'Warehouse Expansion',      category: 'Capital',   budgeted: 1200000, actual: 450000,  variance: 750000,  pct: 37.5 },
]

function BudgetReportTab() {
  const totalBudgeted = BUDGET_RPT_DATA.reduce((s, r) => s + r.budgeted, 0)
  const totalActual   = BUDGET_RPT_DATA.reduce((s, r) => s + r.actual, 0)
  const totalVariance = totalBudgeted - totalActual

  return (
    <div className="fr-report">
      {/* Summary */}
      <div className="fr-stock-summary">
        <div className="fr-ss-card">
          <span className="fr-ss-label">Total Budgeted</span>
          <span className="fr-ss-val fr-ss-val--primary">{fmtINR(totalBudgeted)}</span>
        </div>
        <div className="fr-ss-card">
          <span className="fr-ss-label">Total Actual</span>
          <span className="fr-ss-val">{fmtINR(totalActual)}</span>
        </div>
        <div className="fr-ss-card">
          <span className="fr-ss-label">Variance</span>
          <span className="fr-ss-val fr-ss-val--warn">{fmtINR(totalVariance)}</span>
        </div>
      </div>

      {/* Table */}
      <table className="fr-stock-table">
        <thead>
          <tr>
            <th>Budget Name</th>
            <th>Category</th>
            <th className="align-right">Budgeted</th>
            <th className="align-right">Actual Spend</th>
            <th className="align-right">Variance</th>
            <th className="align-right">Used %</th>
          </tr>
        </thead>
        <tbody>
          {BUDGET_RPT_DATA.map((r, i) => (
            <tr key={r.id} className={`fr-stock-row${i % 2 === 1 ? ' fr-stock-row--alt' : ''}`}>
              <td>
                <div className="fr-stock-name">{r.name}</div>
                <div className="fr-stock-id">{r.id}</div>
              </td>
              <td>{r.category}</td>
              <td className="align-right">{fmtINR(r.budgeted)}</td>
              <td className="align-right">{fmtINR(r.actual)}</td>
              <td className="align-right">
                <span style={{ color: r.variance > 0 ? '#8B6429' : '#1E7D3E', fontWeight: 600 }}>
                  {fmtINR(r.variance)}
                </span>
              </td>
              <td className="align-right">
                <div className="fr-budget-bar-wrap">
                  <div className="fr-budget-bar">
                    <div className="fr-budget-bar-fill"
                      style={{ width: `${Math.min(r.pct, 100)}%`, background: r.pct > 90 ? '#C0392B' : r.pct > 60 ? '#A67C3D' : '#1E7D3E' }} />
                  </div>
                  <span className="fr-budget-pct">{r.pct.toFixed(1)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="fr-stock-total-row">
            <td colSpan={2} className="fr-stock-total-label">Totals</td>
            <td className="align-right fr-stock-total-val">{fmtINR(totalBudgeted)}</td>
            <td className="align-right fr-stock-total-val">{fmtINR(totalActual)}</td>
            <td className="align-right fr-stock-total-val">{fmtINR(totalVariance)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
const TABS = [
  { key: 'pl',    label: 'Profit & Loss' },
  { key: 'bs',    label: 'Balance Sheet' },
  { key: 'stock', label: 'Stock Report'  },
]

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState('pl')
  const [period,    setPeriod]    = useState(PERIODS[0])

  const handlePrint = () => window.print()

  return (
    <DashboardLayout>
      <div className="fr-page">
        {/* Breadcrumb */}
        <div className="fr-breadcrumb">Reports</div>

        {/* Page title */}
        <h1 className="fr-title">Financial Reports</h1>

        {/* Tab bar */}
        <div className="fr-tabs">
          {TABS.map(t => (
            <button key={t.key}
              className={`fr-tab${activeTab === t.key ? ' fr-tab--active' : ''}`}
              onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Report card */}
        <div className="fr-card">
          {/* Report header: company · period · print */}
          <div className="fr-report-header">
            <span className="fr-company">Urban Furniture Co. · {period}</span>
            <div className="fr-report-header-right">
              <div className="fr-period-wrap">
                <select className="fr-period-select" value={period} onChange={e => setPeriod(e.target.value)}>
                  {PERIODS.map(p => <option key={p}>{p}</option>)}
                </select>
                <ChevronIcon />
              </div>
              <button className="fr-print-btn" onClick={handlePrint}>
                <PrintIcon /> Print
              </button>
            </div>
          </div>

          {/* Active report content */}
          {activeTab === 'pl'    && <ProfitLossReport period={period} year={period} />}
          {activeTab === 'bs'    && <BalanceSheetReport />}
          {activeTab === 'stock' && <StockReport />}
        </div>
      </div>
    </DashboardLayout>
  )
}

function ChevronIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
}
function PrintIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
}
