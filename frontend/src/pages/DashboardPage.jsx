import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import DashboardLayout from '../layouts/DashboardLayout'
import './DashboardPage.css'

/* ---- Chart data ---- */
const revenueData = [
  { month: 'Apr', expenses: 180000, revenue: 210000 },
  { month: 'May', expenses: 195000, revenue: 240000 },
  { month: 'Jun', expenses: 210000, revenue: 275000 },
  { month: 'Jul', expenses: 198000, revenue: 295000 },
  { month: 'Aug', expenses: 220000, revenue: 320000 },
  { month: 'Sep', expenses: 205000, revenue: 358000 }
]

const cashFlowData = [
  { name: 'Cash', value: 495000 },
  { name: 'Bank', value: 320000 },
  { name: 'Debtors', value: 310000 },
  { name: 'Creditors', value: 82000 }
]

const CASH_FLOW_COLORS = ['#A67C3D', '#5A8C6A', '#7B6E5A', '#C0392B']

const salesVolumeData = [
  { month: 'Apr', Chair: 12, Table: 8, Sofa: 5, Wardrobe: 3, Bed: 6 },
  { month: 'May', Chair: 18, Table: 10, Sofa: 7, Wardrobe: 4, Bed: 9 },
  { month: 'Jun', Chair: 15, Table: 14, Sofa: 9, Wardrobe: 6, Bed: 8 },
  { month: 'Jul', Chair: 22, Table: 11, Sofa: 12, Wardrobe: 5, Bed: 10 },
  { month: 'Aug', Chair: 20, Table: 16, Sofa: 10, Wardrobe: 8, Bed: 12 },
  { month: 'Sep', Chair: 25, Table: 18, Sofa: 14, Wardrobe: 9, Bed: 13 }
]

const BAR_COLORS = ['#A67C3D', '#C49A2A', '#5A8C6A', '#7B6E5A', '#C47A3A']

function formatINR(val) {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`
  return `₹${val}`
}

import { api, getUser } from '../services/api'

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const navigate = useNavigate()
  const user = getUser()

  React.useEffect(() => {
    let mounted = true
    api.dashboard.getSummary()
      .then(data => {
        if (mounted) setSummary(data)
      })
      .catch(err => {
        console.warn('Could not load live dashboard summary:', err.message)
      })
    return () => { mounted = false }
  }, [])

  const kpis = summary?.kpis || summary || {}
  const dynamicRevenueData = summary?.monthlyTrends || revenueData

  const dynamicCashFlow = [
    { name: 'Cash', value: Math.max(kpis.netProfit || 0, 1000) },
    { name: 'Bank', value: Math.max(kpis.totalInventoryValuation || 0, 1000) },
    { name: 'Debtors', value: Math.max(kpis.outstandingCustomerInvoices || 0, 1000) },
    { name: 'Creditors', value: Math.max(kpis.unpaidVendorBills || 0, 1000) }
  ]

  const kpiCards = [
    {
      label: 'Total Sales',
      sublabel: 'Confirmed Invoices',
      value: formatINR(kpis.totalSales ?? 0),
      note: 'Total Sales',
      color: 'kpi-default',
      icon: 'sales'
    },
    {
      label: 'Total Purchased',
      sublabel: 'Confirmed Bills',
      value: formatINR(kpis.totalPurchases ?? 0),
      note: 'Total Purchases',
      color: 'kpi-default',
      icon: 'purchase'
    },
    {
      label: 'Cash & Bank',
      sublabel: 'Net Margin / Liquidity',
      value: formatINR(kpis.netProfit ?? 0),
      note: 'Available liquidity',
      color: 'kpi-default',
      icon: 'cash'
    },
    {
      label: 'Receivables',
      sublabel: 'Outstanding invoices',
      value: formatINR(kpis.outstandingCustomerInvoices ?? 0),
      note: 'From customers',
      color: 'kpi-default',
      icon: 'receivable'
    },
    {
      label: 'Payables',
      sublabel: 'Outstanding bills',
      value: formatINR(kpis.unpaidVendorBills ?? 0),
      note: 'To vendors',
      color: 'kpi-default',
      icon: 'payable'
    },
    {
      label: 'Low Stock Products',
      sublabel: 'Warehouse stock',
      value: String(kpis.totalStockUnits ?? 0),
      note: 'Manage Products',
      color: 'kpi-alert',
      icon: 'alert'
    },
  ]

  return (
    <DashboardLayout>
      <div className="db-page">
        {/* ---- Header ---- */}
        <header className="db-header">
          <div className="db-header-left">
            <h1 className="db-greeting">Good day, {user?.name || 'Administrator'}.</h1>
            <p className="db-subline">FurnIQ · Furniture Management System</p>
          </div>
        </header>

        <div className="db-content">
          {/* ---- KPI Cards ---- */}
          <section className="db-kpi-grid" aria-label="Key metrics">
            {kpiCards.map(card => (
              <div key={card.label} className={`kpi-card ${card.color}`}>
                <div className="kpi-top">
                  <span className="kpi-label">{card.label}</span>
                  <span className="kpi-icon"><KpiIcon type={card.icon} /></span>
                </div>
                <div className="kpi-value">{card.value}</div>
                <div className="kpi-sub">{card.sublabel}</div>
                <div className="kpi-note">{card.note}</div>
              </div>
            ))}
          </section>

          {/* ---- Section label ---- */}
          <div className="db-section-label">Dashboard</div>

          {/* ---- Charts row 1 ---- */}
          <section className="db-charts-row">
            {/* Monthly Revenue vs Expenses */}
            <div className="chart-card chart-card--wide">
              <h3 className="chart-title">Monthly revenue vs expenses</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dynamicRevenueData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A67C3D" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#A67C3D" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C0392B" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#C0392B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9E8A6E' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatINR} tick={{ fontSize: 10, fill: '#9E8A6E' }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #D4C4A0', background: '#FDFAF5' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="expenses" stroke="#C0392B" strokeWidth={2} fill="url(#gradExpenses)" name="Expenses" dot={false} />
                  <Area type="monotone" dataKey="revenue" stroke="#A67C3D" strokeWidth={2} fill="url(#gradRevenue)" name="Revenue" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Cash Flow Distribution */}
            <div className="chart-card">
              <h3 className="chart-title">Cash flow distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dynamicCashFlow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9E8A6E' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatINR} tick={{ fontSize: 10, fill: '#9E8A6E' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #D4C4A0', background: '#FDFAF5' }} />
                  <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                    {dynamicCashFlow.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CASH_FLOW_COLORS[index % CASH_FLOW_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ---- Sales Volume chart ---- */}
          <section className="db-charts-row">
            <div className="chart-card chart-card--full">
              <h3 className="chart-title">Sales volume by product × month — units sold</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={salesVolumeData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9E8A6E' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9E8A6E' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #D4C4A0', background: '#FDFAF5' }} />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  {['Chair', 'Table', 'Sofa', 'Wardrobe', 'Bed'].map((key, i) => (
                    <Bar key={key} dataKey={key} stackId="a"
                      fill={BAR_COLORS[i]}
                      radius={i === 4 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ---- Quick stat cards ---- */}
          <section className="db-quick-row">
            <QuickStatCard
              title="Sales" badge="New" badgeColor="badge-blue"
              navigateTo="/dashboard/sales/orders"
              stats={[
                { label: 'All', sub: '12' },
                { label: 'Confirmed', sub: '10' },
                { label: 'Draft', sub: '2' }
              ]}
            />
            <QuickStatCard
              title="Purchase" badge="New" badgeColor="badge-blue"
              navigateTo="/dashboard/purchase/orders"
              stats={[
                { label: 'All', sub: '12' },
                { label: 'Confirmed', sub: '10' },
                { label: 'Draft', sub: '2' }
              ]}
            />
            <QuickStatCard
              title="Budget Reports" badge="Report" badgeColor="badge-gold"
              navigateTo="/dashboard/budget"
              stats={[
                { label: 'Achieved', sub: '3' },
                { label: 'Budget', sub: '2' },
                { label: 'Committed', sub: '4' }
              ]}
            />
          </section>
        </div>
      </div>
    </DashboardLayout>
  )
}

/* ---- Quick Stat Card ---- */
function QuickStatCard({ title, badge, badgeColor, stats, navigateTo }) {
  const navigate = useNavigate()
  return (
    <div
      className="qs-card qs-card--clickable"
      onClick={() => navigate(navigateTo)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(navigateTo)}
      aria-label={`Go to ${title}`}
    >
      <div className="qs-header">
        <span className="qs-title">{title}</span>
        <span className={`qs-badge ${badgeColor}`}>{badge}</span>
      </div>
      <div className="qs-stats">
        {stats.map(s => (
          <div key={s.label} className="qs-stat">
            <span className="qs-stat-val">{s.sub}</span>
            <span className="qs-stat-lbl">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---- KPI Icon switcher ---- */
function KpiIcon({ type }) {
  switch (type) {
    case 'sales': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
    case 'purchase': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.97-1.67L23 6H6" /></svg>
    case 'cash': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
    case 'receivable': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
    case 'payable': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
    case 'alert': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
    default: return null
  }
}

function ChevronSmIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
}
