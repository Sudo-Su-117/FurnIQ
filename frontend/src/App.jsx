import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import CreateUserPage from './pages/CreateUserPage'
import DashboardPage from './pages/DashboardPage'
import SalesPage from './pages/sales/SalesPage'
import PurchasePage from './pages/purchase/PurchasePage'
import BudgetReportsPage from './pages/budget/BudgetReportsPage'
import AnalyticAccountsPage from './pages/budget/AnalyticAccountsPage'
import BudgetPlansPage from './pages/budget/BudgetPlansPage'
import ContactsPage from './pages/master/ContactsPage'
import ProductsPage from './pages/master/ProductsPage'
import ChartOfAccountsPage from './pages/master/ChartOfAccountsPage'
import JournalsPage from './pages/master/JournalsPage'
import JournalEntriesPage from './pages/master/JournalEntriesPage'
import FinancialReportsPage from './pages/reports/FinancialReportsPage'
import PurchaseOrdersPage from './pages/data/PurchaseOrdersPage'
import VendorBillsPage from './pages/data/VendorBillsPage'
import PaymentsPage from './pages/data/PaymentsPage'
import SalesOrdersPage from './pages/data/SalesOrdersPage'
import CustomerInvoicesPage from './pages/data/CustomerInvoicesPage'
import InvoicePaymentsPage from './pages/data/InvoicePaymentsPage'
import CustomerPortalPage from './pages/portal/CustomerPortalPage'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
        {/* Auth */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/admin/create-user" element={<CreateUserPage />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Sales — default tab: orders */}
        <Route path="/dashboard/sales" element={<Navigate to="/dashboard/sales/orders" replace />} />
        <Route path="/dashboard/sales/:tab" element={<SalesPage />} />

        {/* Purchase — default tab: orders */}
        <Route path="/dashboard/purchase" element={<Navigate to="/dashboard/purchase/orders" replace />} />
        <Route path="/dashboard/purchase/:tab" element={<PurchasePage />} />

        {/* Budget */}
        <Route path="/dashboard/budget/analytics" element={<AnalyticAccountsPage />} />
        <Route path="/dashboard/budget/plans"     element={<BudgetPlansPage />} />
        <Route path="/dashboard/budget"           element={<BudgetReportsPage />} />
        <Route path="/dashboard/budget/*"         element={<BudgetReportsPage />} />

        {/* Master Data */}
        <Route path="/dashboard/master/contacts" element={<ContactsPage />} />
        <Route path="/dashboard/master/products" element={<ProductsPage />} />
        <Route path="/dashboard/master/coa"      element={<ChartOfAccountsPage />} />
        <Route path="/dashboard/master/journals"        element={<JournalsPage />} />
        <Route path="/dashboard/master/journal-entries" element={<JournalEntriesPage />} />
        <Route path="/dashboard/reports/financial"      element={<FinancialReportsPage />} />

        {/* Data Input Forms */}
        <Route path="/dashboard/data/sales-orders"       element={<SalesOrdersPage />} />
        <Route path="/dashboard/data/customer-invoices"  element={<CustomerInvoicesPage />} />
        <Route path="/dashboard/data/invoice-payments"   element={<InvoicePaymentsPage />} />
        <Route path="/dashboard/data/purchase-orders"    element={<PurchaseOrdersPage />} />
        <Route path="/dashboard/data/vendor-bills"       element={<VendorBillsPage />} />
        <Route path="/dashboard/data/payments"           element={<PaymentsPage />} />

        {/* Customer Portal */}
        <Route path="/portal" element={<CustomerPortalPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </ConfirmProvider>
    </ToastProvider>
  </AuthProvider>
)
}

export default App
