import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './DashboardLayout.css'

const NAV = [
  {
    label: 'Home',
    icon: <HomeIcon />,
    path: '/dashboard',
    single: true
  },
  {
    label: 'Sales',
    icon: <SalesIcon />,
    children: [
      { label: 'Sales Orders', path: '/dashboard/sales/orders' },
      { label: 'Customer Invoices', path: '/dashboard/sales/invoices' },
      { label: 'Invoice Payments', path: '/dashboard/sales/payments' }
    ]
  },

  {
    label: 'Master Data',
    icon: <MasterIcon />,
    children: [
      { label: 'Contacts', path: '/dashboard/master/contacts' },
      { label: 'Products', path: '/dashboard/master/products' },
      { label: 'Chart of Accounts', path: '/dashboard/master/coa' },
      { label: 'Journals', path: '/dashboard/master/journals' },
      { label: 'Journal Entries', path: '/dashboard/master/journal-entries' }
    ]
  },
  {
    label: 'Budget',
    icon: <BudgetIcon />,
    children: [
      { label: 'Analytic Accounts', path: '/dashboard/budget/analytics' },
      { label: 'Budget Plans',      path: '/dashboard/budget/plans'     },
      { label: 'Budget Reports',    path: '/dashboard/budget'           }
    ]
  },
  {
    label: 'Data Input',
    icon: <DataIcon />,
    children: [
      { label: 'Sales Orders',       path: '/dashboard/data/sales-orders'      },
      { label: 'Customer Invoices',   path: '/dashboard/data/customer-invoices'  },
      { label: 'Invoice Payments',    path: '/dashboard/data/invoice-payments'   },
      { label: 'Purchase Orders',     path: '/dashboard/data/purchase-orders'    },
      { label: 'Vendor Bills',        path: '/dashboard/data/vendor-bills'       },
      { label: 'Payments',            path: '/dashboard/data/payments'           },
    ]
  },
  {
    label: 'Reports',
    icon: <ReportIcon />,
    children: [
      { label: 'Financial Reports', path: '/dashboard/reports/financial' }
    ]
  },
  {
    label: 'Customer Portal',
    icon: <PortalIcon />,
    path: '/portal',
    single: true
  }
]

export default function DashboardLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [openSections, setOpenSections] = useState({ 'Sales': true, 'Master Data': true })

  const toggleSection = (label) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const isActive = (path) => location.pathname === path
  const isSectionActive = (children) =>
    children?.some(c => location.pathname.startsWith(c.path))

  return (
    <div className="dl-root">
      {/* Sidebar */}
      <aside className="dl-sidebar">
        {/* Logo */}
        <div className="dl-sidebar-logo">
          <div className="dl-logo-box">F</div>
          <div className="dl-logo-text">
            <span className="dl-logo-name">FurnIQ</span>
            <span className="dl-logo-sub">Accounting</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="dl-nav" aria-label="Main navigation">
          {NAV.map(item => (
            item.single ? (
              <Link
                key={item.label}
                to={item.path}
                className={`dl-nav-single${isActive(item.path) ? ' dl-nav-single--active' : ''}`}
              >
                <span className="dl-nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ) : (
              <div key={item.label} className="dl-nav-group">
                <button
                  className={`dl-nav-group-btn${isSectionActive(item.children) ? ' dl-nav-group-btn--active' : ''}`}
                  onClick={() => toggleSection(item.label)}
                  aria-expanded={!!openSections[item.label]}
                >
                  <span className="dl-nav-icon">{item.icon}</span>
                  <span className="dl-nav-group-label">{item.label}</span>
                  <span className={`dl-nav-chevron${openSections[item.label] ? ' dl-nav-chevron--open' : ''}`}>
                    <ChevronIcon />
                  </span>
                </button>
                {openSections[item.label] && (
                  <div className="dl-nav-children">
                    {item.children.map(child => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`dl-nav-child${isActive(child.path) ? ' dl-nav-child--active' : ''}`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          ))}
        </nav>

        {/* User footer */}
        <div className="dl-sidebar-footer">
          <div className="dl-user-avatar">V</div>
          <div className="dl-user-info">
            <span className="dl-user-name">Vikram</span>
            <span className="dl-user-role">Admin</span>
          </div>
          <button
            className="dl-logout-btn"
            onClick={() => navigate('/login')}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogoutIcon />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="dl-main">
        {children}
      </main>
    </div>
  )
}

/* ---- Icons ---- */
function HomeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function SalesIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
}
function PurchaseIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.97-1.67L23 6H6"/></svg>
}
function MasterIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
}
function BudgetIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
}
function ReportIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
}
function DataIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}
function PortalIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
}
function ChevronIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
}
function LogoutIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
