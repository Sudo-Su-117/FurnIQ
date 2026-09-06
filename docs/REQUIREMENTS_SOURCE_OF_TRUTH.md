# FurnIQ — Urban Furniture Accounting System: Source of Truth Specification

> **Synthesized From:**
> 1. `Urban Furniture: Accounting System (1).pdf`
> 2. `Accounting Hackathon - 24 Hours.png` (Architecture & Flow Diagram)
> 3. `FurnIQ_Page_Flow_Implementation_Guide.docx`

---

## 1. System Overview & Scope Rule
**FurnIQ** is an internal double-entry accounting and inventory ERP system for Urban Furniture.
- **Nature of System**: Internal business record system (NOT an e-commerce marketplace).
- **Primary Purpose**: Enables entry of master data, recording of purchase and sales transactions, automatic stock movements, double-entry general ledger journal generation, and automated financial reports (Balance Sheet, P&L, Budget Report, Stock Report).

---

## 2. Primary Actors & Permission Matrix

| Feature / Action | Admin (`ADMIN`) | Invoicing User / Accountant (`ACCOUNTANT`) | Contact User (`CONTACT_USER`) |
| :--- | :---: | :---: | :---: |
| **Landing Route** | `/dashboard` | `/dashboard` | `/portal` |
| **User Provisioning (`/admin/create-user`)** | ✅ Full Access | ❌ Restricted / Hidden | ❌ Blocked |
| **Contacts Master** | Create, Edit, **Archive** | Create, Edit (**No Archive**) | ❌ Blocked |
| **Products Master** | Create, Edit, **Archive** | Create, Edit (**No Archive**) | ❌ Blocked |
| **Chart of Accounts (COA)** | Create, Edit, Archive | View & Use in Entries | ❌ Blocked |
| **Journals Master** | Create, Edit, Config | View & Post Entries | ❌ Blocked |
| **Purchase Flow (PO → Bill → Pay)** | ✅ Full Access | ✅ Full Access | ❌ Blocked |
| **Sales Flow (SO → Invoice → Pay)** | ✅ Full Access | ✅ Full Access | ❌ Blocked |
| **Budget Plans & Analytic Accounts** | ✅ Full Access | ✅ Full Access | ❌ Blocked |
| **Financial Reports (BS, P&L, Stock)** | ✅ Full Access | ✅ Full Access | ❌ Blocked |
| **Customer / Vendor Portal (`/portal`)** | Switch & Preview All | Switch & Preview All | **Only Own** Invoices & Bills |

---

## 3. Verified Permanent Test Logins

All passwords are standardized to `Admin123!` for consistency across evaluation:

| Role | Name | Email | Password | Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | Rajesh Sharma | `admin@urbanfurniture.com` | `Admin123!` | Full system access, user creation, master data archiving |
| **Accountant** | Priya Nair | `accountant@urbanfurniture.com` | `Admin123!` | Operational transactions, invoices, bills, journals, reports |
| **Customer Portal** | Ratan Mehra | `ratan.mehra@prestigeliving.co.in` | `Admin123!` | Scoped to Prestige Living Interiors (view invoices, pay dues) |
| **Vendor Portal** | Suresh Patel | `suresh.patel@timbercrafts.in` | `Admin123!` | Scoped to Timber Crafts Lumber Co. (view bills & payment status) |

---

## 4. End-to-End Transaction Loops & Accounting Engine

### A. The Purchase Branch (Inventory Inflow)
```
Purchase Order (PO) ──► Vendor Bill ──► Vendor Payment
```
1. **Purchase Order (`/purchase/orders`)**:
   - Fields: Vendor (Contact type `VENDOR`/`BOTH`), Products, Quantity, Unit Price (Cost Price), Order Date.
   - Status: `DRAFT` → `CONFIRMED`.
2. **Convert to Vendor Bill (`/purchase/bills`)**:
   - Creates Vendor Bill with Bill Date and Due Date.
   - **System Effects on Post**:
     - Stock increases for Goods products (+Qty).
     - Account Payable (Creditors) created.
     - **Journal Entry Generated**:
       - `Debit`: Purchase Expense Account (`5000`)
       - `Credit`: Accounts Payable / Creditors (`2000`)
3. **Register Vendor Payment (`/purchase/bills/:id/pay` or `/dashboard/data/payments`)**:
   - Fields: Bill ID, Payment Date, Payment Method (`CASH` or `BANK`), Amount.
   - **System Effects**:
     - Bill balance decreases; status transitions to `PARTIALLY_PAID` or `PAID`.
     - **Journal Entry Generated**:
       - `Debit`: Accounts Payable / Creditors (`2000`)
       - `Credit`: Cash on Hand (`1001`) or Bank Account (`1002`/`1003`)

---

### B. The Sales Branch (Inventory Outflow & Revenue)
```
Sales Order (SO) ──► Customer Invoice ──► Customer Payment
```
1. **Sales Order (`/sales/orders`)**:
   - Fields: Customer (Contact type `CUSTOMER`/`BOTH`), Products, Quantity, Unit Price (Sales Price), Tax (GST %), Order Date.
   - Status: `DRAFT` → `CONFIRMED`. Checks available stock.
2. **Convert to Customer Invoice (`/sales/invoices`)**:
   - Creates Customer Invoice with Invoice Date and Due Date.
   - **System Effects on Post**:
     - Stock decreases for Goods products (-Qty).
     - Account Receivable (Debtors) created.
     - **Journal Entry Generated**:
       - `Debit`: Accounts Receivable / Debtors (`1100`)
       - `Credit`: Sales Revenue / Income (`4000`)
3. **Receive Customer Payment (`/sales/invoices/:id/pay` or `/portal`)**:
   - Fields: Invoice ID, Payment Date, Payment Method (`CASH` or `BANK`), Amount.
   - **System Effects**:
     - Invoice balance decreases; status transitions to `PARTIALLY_PAID` or `PAID`.
     - **Journal Entry Generated**:
       - `Debit`: Cash on Hand (`1001`) or Bank Account (`1002`/`1003`)
       - `Credit`: Accounts Receivable / Debtors (`1100`)

---

### C. Financial Reporting Requirements
1. **Balance Sheet**:
   - **Assets**: Cash on Hand, Bank Accounts, Debtors (Receivables), Inventory.
   - **Liabilities**: Creditors (Payables).
   - **Capital / Equity**: Initial Capital + Retained Earnings.
   - Equation: $\text{Assets} = \text{Liabilities} + \text{Equity}$.
2. **Profit & Loss (P&L)**:
   - **Income**: Sales Revenue.
   - **Expenses**: Cost of Goods Sold / Purchase Expense + Operating Expenses.
   - **Net Profit**: $\text{Income} - \text{Expenses}$.
3. **Budget Report**:
   - Tracks planned budget amounts linked to Analytic Accounts (Income/Expense) by period.
4. **Stock Report**:
   - Displays real-time inventory on hand, unit cost, and total valuation.
