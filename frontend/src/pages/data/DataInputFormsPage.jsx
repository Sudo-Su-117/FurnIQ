import React from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import './DataInputFormsPage.css'

const CARDS = [
  {
    id: 'purchase-orders',
    icon: <POIcon />,
    title: 'Purchase Orders',
    description: 'Create and manage purchase orders sent to vendors. Track order status from draft through confirmation and billing.',
    count: 3,
    countLabel: 'orders',
    path: '/dashboard/data/purchase-orders',
    accent: 'di-card--po',
  },
  {
    id: 'vendor-bills',
    icon: <BillIcon />,
    title: 'Vendor Bills',
    description: 'Record and process vendor bills linked to purchase orders. Confirm bills and initiate payments from here.',
    count: 2,
    countLabel: 'bills',
    path: '/dashboard/data/vendor-bills',
    accent: 'di-card--vb',
  },
  {
    id: 'payments',
    icon: <PayIcon />,
    title: 'Payments',
    description: 'Log outgoing payments to vendors and incoming receipts from customers. Post payments to update account balances.',
    count: 2,
    countLabel: 'payments',
    path: '/dashboard/data/payments',
    accent: 'di-card--pay',
  },
]

export default function DataInputFormsPage() {
  const navigate = useNavigate()

  return (
    <DashboardLayout>
      <div className="di-page">
        <div className="di-breadcrumb">Data Input Forms</div>

        <div className="di-header">
          <div>
            <h1 className="di-title">Data Input Forms</h1>
            <p className="di-subtitle">Manage purchase orders, vendor bills, and payments</p>
          </div>
        </div>

        <div className="di-cards">
          {CARDS.map(card => (
            <div key={card.id} className={`di-card ${card.accent}`}>
              <div className="di-card-icon">{card.icon}</div>
              <div className="di-card-body">
                <div className="di-card-top">
                  <h2 className="di-card-title">{card.title}</h2>
                  <span className="di-count-badge">{card.count} {card.countLabel}</span>
                </div>
                <p className="di-card-desc">{card.description}</p>
              </div>
              <div className="di-card-footer">
                <button
                  className="di-open-btn"
                  onClick={() => navigate(card.path)}
                  aria-label={`Open ${card.title}`}
                >
                  Open <ArrowIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

function POIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}
function BillIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
      <line x1="7" y1="15" x2="12" y2="15"/>
    </svg>
  )
}
function PayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  )
}
function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}
