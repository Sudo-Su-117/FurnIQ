# FurnIQ Frontend — Complete Field & API Integration Document

**Project:** FurnIQ — Furniture Business Management System  
**Frontend:** React 18 + Vite + React Router v6 + Recharts  
**Document Purpose:** All fields used across every page + complete API list required for backend integration

---

## TABLE OF CONTENTS

1. [Authentication Pages](#1-authentication-pages)
2. [Dashboard](#2-dashboard)
3. [Sales Module](#3-sales-module)
4. [Master Data Module](#4-master-data-module)
5. [Budget Module](#5-budget-module)
6. [Data Input Forms](#6-data-input-forms)
7. [Reports Module](#7-reports-module)
8. [Customer Portal](#8-customer-portal)
9. [Complete API List](#9-complete-api-list)

---

## 1. AUTHENTICATION PAGES

### 1.1 Login Page — `/login`

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| loginId | text | Required, 6–12 chars | Unique login identifier |
| password | password | Required | Show/hide toggle |

**Flow:** On success → ADMIN/ACCOUNTANT → `/dashboard` · CONTACT → `/portal`

---

### 1.2 Sign Up Page — `/signup`

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| loginId | text | Required, 6–12 chars, unique | |
| email | email | Required, unique, valid format | |
| password | password | >8 chars, uppercase, lowercase, special char | |
| rePassword | password | Must match password | |

**Note:** Creates a "User/Contact" role account only.

---

### 1.3 Forgot Password Page — `/forgot-password`

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| email | email | Required, valid format | Sends reset link |

---

### 1.4 Create User Page — `/admin/create-user`

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| name | text | Required | Full name |
| loginId | text | Required, 6–12 chars, unique | |
| email | email | Required, unique | |
| role | radio | User / Administrator | Admin = full access, User = invoices only |
| password | password | >8 chars, upper+lower+special | |
| rePassword | password | Must match | |

---

## 2. DASHBOARD

**Route:** `/dashboard`

### KPI Cards (data fetched from backend)

| KPI | Field | Source |
|-----|-------|--------|
| Total Sales | total_sales | Sales Orders / Invoices aggregate |
| Total Purchased | total_purchased | Purchase Orders aggregate |
| Cash & Bank | cash_bank_balance | Journal Entries (Bank+Cash accounts) |
| Receivables | receivables | Outstanding customer invoices |
| Payables | payables | Outstanding vendor bills |
| Low Stock Products | low_stock_count | Products where stock < threshold |

### Charts

| Chart | Data Points | Fields |
|-------|-------------|--------|
| Monthly Revenue vs Expenses | 6 months | month, revenue, expenses |
| Cash Flow Distribution | 4 categories | Cash, Bank, Debtors, Creditors amounts |
| Sales Volume by Product | 6 months × 5 products | month, product_name, units_sold |

### Quick Stat Cards

| Card | Fields | Links to |
|------|--------|---------|
| Sales | all_count, confirmed_count, draft_count | `/dashboard/sales/orders` |
| Purchase | all_count, confirmed_count, draft_count | `/dashboard/purchase/orders` |
| Budget Reports | achieved_count, budget_count, committed_count | `/dashboard/budget` |

---

## 3. SALES MODULE

### 3.1 Sales Orders — `/dashboard/sales/orders`

**Tabs:** Sales Orders · Customer Invoices · Invoice Payments

#### Sales Orders Table Columns

| Column | Field | Type |
|--------|-------|------|
| Order No. | id | string (S00001) |
| Customer ID | customerId | string (CUST-001) |
| Customer | customer | string |
| Date | date | date |
| Subtotal | subtotal | decimal |
| Tax Amount | taxAmount | decimal |
| Total | total | decimal |
| Status | status | enum: Confirmed / Draft |

#### Customer Invoices Table Columns

| Column | Field | Type |
|--------|-------|------|
| Invoice No. | id | string (INV-001) |
| Customer ID | customerId | string |
| Customer | customer | string |
| Date | date | date |
| Subtotal | subtotal | decimal |
| Tax Amount | taxAmount | decimal |
| Total | total | decimal |
| Status | status | enum: Confirmed / Draft |

#### Invoice Payments Table Columns

| Column | Field | Type |
|--------|-------|------|
| Payment No. | id | string (PAY-001) |
| Customer ID | customerId | string |
| Customer | customer | string |
| Date | date | date |
| Total | total | decimal |
| Status | status | enum: Confirmed / Draft |

---

## 4. MASTER DATA MODULE

### 4.1 Contacts — `/dashboard/master/contacts`

#### List View Columns

| Column | Field | Type |
|--------|-------|------|
| Avatar | name (first letter) | computed |
| Name | name | string |
| ID | id | string (CUST-001 / VEND-001) |
| Type | type | enum: CUSTOMER / VENDOR / BOTH |
| Email | email | string |
| Mobile | mobile | string |
| City | city | string |
| Status | status | enum: ACTIVE / ARCHIVED |

#### New / Edit Contact Form Fields

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| name | text | Required | Full name or business name |
| type | toggle | CUSTOMER / VENDOR / BOTH | |
| email | email | Valid format if provided | |
| mobile | tel | Valid format if provided | |
| street | text | Optional | |
| city | text | Optional | |
| state | text | Optional | |
| country | text | Default: India | |
| pincode | text | Optional | |
| address | textarea | Optional | Full address |
| image | file | Image only | Profile photo, drag+drop |

---

### 4.2 Products — `/dashboard/master/products`

#### List View Columns

| Column | Field | Type |
|--------|-------|------|
| Name | name | string |
| ID | id | string (PROD-001) |
| Type | type | enum: GOODS / SERVICE / COMBO |
| Category | category | string (Many2one — creatable) |
| Sales Price | salesPrice | decimal |
| Cost Price | costPrice | decimal |
| Current Stock | stock | integer / null (null for SERVICE) |
| Tax Rate | taxRate | integer (%) |

#### New / Edit Product Form Fields

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| name | text | Required | Product name |
| type | select | GOODS / SERVICE / COMBO | Dropdown |
| category | text | Creatable on-the-fly | Many2one field |
| salesPrice | number | Required, ≥ 0 | |
| costPrice | number | Optional, ≥ 0 | |
| stock | number | Hidden for SERVICE | |
| taxRate | select | 0 / 5 / 12 / 18 / 28 % | |
| image | file | Image only | Upload / drag+drop |

---

### 4.3 Chart of Accounts — `/dashboard/master/coa`

#### List Display (Grouped by Account Group)

| Field | Type | Notes |
|-------|------|-------|
| code | string | e.g. 1001, 2001 |
| name | string | Account name |
| group | enum | ASSET / LIABILITY / INCOME / EXPENSE / CAPITAL |
| type | enum | Asset / Liability / Bank / Cash / Capital / Income / Expenses / Other Expenses |

#### New / Edit Account Form Fields

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| name | text | Required | Account name |
| type | select (hierarchical) | Required | Balance Sheet: Asset/Liability/Bank/Capital/Cash · P&L: Income/Expenses/Other Expenses |

**Auto-assigned:** group (derived from type), code (auto-generated by group prefix)

---

### 4.4 Journals — `/dashboard/master/journals`

#### List View Columns

| Column | Field | Type |
|--------|-------|------|
| ID | id | string (JNL-001) |
| Journal Name | name | string |
| Type | type | enum: Sales / Purchase / Bank / Cash |
| Default Account | defaultAccount | string (Many2one from COA) |
| Account Code | accountCode | string |

#### New / Edit Journal Form Fields

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| name | text | Required | Journal name |
| type | toggle | Sales / Purchase / Bank / Cash | Auto-suggests default account |
| defaultAccount | search | Required | Many2one from Chart of Accounts |
| accountCode | auto | Read-only | Auto-filled from account selection |

---

### 4.5 Journal Entries — `/dashboard/master/journal-entries`

#### List View Columns

| Column | Field | Type |
|--------|-------|------|
| Date | date | date |
| Number | number | string (JE/2026/001) |
| Partner | partner | string |
| Journal | journal | string |
| Total | total | decimal |
| Status | status | enum: Draft / Posted |

#### New / Edit Journal Entry Form Fields

**Header:**

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| accountingDate | date | Required | |
| journalId | select | Required | From Journals (Many2one) |
| journal | auto | Read-only | Journal name |

**Line Items (repeatable rows):**

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| account | search | Required | Many2one from Chart of Accounts |
| accountCode | auto | Read-only | |
| partner | search | Optional | Many2one from Contacts |
| debit | number | ≥ 0 | Clears credit if entered |
| credit | number | ≥ 0 | Clears debit if entered |

**Validation:** Total Debit = Total Credit (blocking if not balanced)

---

## 5. BUDGET MODULE

### 5.1 Analytic Accounts — `/dashboard/budget/analytics`

#### List View Columns

| Column | Field | Type |
|--------|-------|------|
| ID | id | string (AA-001) |
| Account Name | name | string |
| Type | type | enum: Budget / Short Body / End Body / Committed / Achieved |
| Analytic Amount | analyticAmount | decimal |

#### New / Edit Form Fields

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| name | text | Required | |
| type | toggle | Budget / Short Body / End Body / Committed / Achieved | |
| analyticAmount | number | Required, ≥ 0 | ₹ prefix |

---

### 5.2 Budget Plans — `/dashboard/budget/plans`

#### List: Plan Card Display

| Field | Type | Notes |
|-------|------|-------|
| id | string (BP-001) | Auto-generated |
| name | string | Budget plan name |
| startDate | date | |
| endDate | date | |
| status | enum | Draft / Confirmed / Cancelled / Installed |
| responsible | string | Person responsible |

#### Budget Lines (per plan):

| Field | Type | Notes |
|-------|------|-------|
| analyticId | string | Many2one from Analytic Accounts |
| analyticName | string | Auto-filled |
| type | string | Auto-filled from analytic |
| committedAmount | decimal | |
| allowedAmount | decimal | |
| allowedPct | decimal | % |
| amountToBudget | decimal | |

#### New / Edit Plan Form Fields

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| name | text | Required | Budget plan name |
| startDate | date | Required | |
| endDate | date | Required, > startDate | |
| status | select | Draft / Confirmed / Cancelled / Installed | |
| responsible | text | Optional | |
| lines[] | array | Min 1 line recommended | Budget line items |

---

### 5.3 Budget Reports — `/dashboard/budget`

#### List View Columns

| Column | Field | Type |
|--------|-------|------|
| Budget Name | name | string |
| Start Date | startDate | string DD/MM/YYYY |
| End Date | endDate | string DD/MM/YYYY |
| Status | status | enum: Draft / Confirmed / Cancelled |
| Pie Chart | (computed) | achieved + balance |

#### Pie Chart Data (per report):

| Field | Type | Notes |
|-------|------|-------|
| achieved | decimal | Actual amount achieved |
| balance | decimal | Remaining balance |

#### New / Edit Form Fields

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| name | text | Required | |
| startDate | text | Required | DD/MM/YYYY |
| endDate | text | Required | DD/MM/YYYY |
| status | select | Draft / Confirmed / Cancelled | |
| achieved | number | Optional | |
| balance | number | Optional | |

---

## 6. DATA INPUT FORMS

### 6.1 Sales Orders — `/dashboard/data/sales-orders`

#### List Columns

| Column | Field | Type |
|--------|-------|------|
| SO No. | id | string (S00001) |
| Customer | customer | Many2one from Contacts |
| SO Date | date | date |
| Total | total | decimal (computed) |
| Status | status | enum: Draft / Confirmed / Invoiced |

#### New / Edit SO Form Fields

**Header:**

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| id | auto | Read-only | Auto-generated SO number |
| customer | search | Required | Many2one from Contacts |
| address | text | Optional | Delivery address |
| date | date | Required | Order date |

**SO Entry Line Items:**

| Field | Type | Notes |
|-------|------|-------|
| product | search | Many2one from Products |
| budgetAnalytics | search | Many2one from Analytic Accounts |
| qty | number | Quantity |
| unitPrice | number | Auto-filled from Product |
| total | auto | qty × unitPrice |

**Buttons:** New · Confirm · Create Invoice → navigates to Customer Invoices

---

### 6.2 Customer Invoices — `/dashboard/data/customer-invoices`

#### List Columns

| Column | Field | Type |
|--------|-------|------|
| Invoice No. | id | string (INV/2026/0001) |
| Customer | customer | string |
| Invoice Date | invoiceDate | date |
| Due Date | dueDate | date |
| Total | total | decimal |
| Amount Due | amountDue | decimal |
| Status | status | enum: Draft / Posted / Paid / Overdue |

#### New / Edit Invoice Form Fields

**Left column:**

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| id (Customer Service No.) | auto | Read-only | Auto-generated |
| customer | search | Required | Many2one from Contacts |
| serviceDate | date | Optional | |
| status | select | Draft/Posted/Paid/Overdue | |

**Right column:**

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| invoiceRef | text | Optional | Reference text |
| invoiceDate | date | Required | |
| dueDate | date | Optional | |
| billBody | text | Optional | Description |

**Invoice Body Line Items:**

| Field | Type | Notes |
|-------|------|-------|
| product | search | Many2one from Products |
| account | search | Many2one from COA |
| accountCode | auto | Read-only |
| budgetAnalytics | search | Many2one from Analytic Accounts |
| qty | number | |
| unitPrice | number | |
| total | auto | qty × unitPrice |

**Computed summary:**

| Field | Notes |
|-------|-------|
| postViaCash | Payments received via Cash |
| postViaBank | Payments received via Bank |
| amountDue | total − paid amount |

**Buttons:** New · Confirm · Pay · AR · Budget → Pay navigates to Invoice Payments

---

### 6.3 Invoice Payments — `/dashboard/data/invoice-payments`

#### List Columns

| Column | Field | Type |
|--------|-------|------|
| Payment No. | id | string (INVPAY-001) |
| Partner | partner | string |
| Type | paymentType | enum: Receive / Send |
| Date | date | date |
| Via | paymentVia | enum: Bank / Cash |
| Amount | amount | decimal |
| Status | status | enum: Draft / Confirmed / Cancelled |

#### New / Edit Payment Form Fields

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| id | auto | Read-only | Auto-generated |
| paymentType | toggle | Receive / Send | Receive = from customer, Send = to vendor |
| partner | search | Required | Many2one from Contacts |
| date | date | Required | |
| paymentVia | toggle | Bank / Cash | |
| amount | number | Required, > 0 | ₹ prefix |
| memo | text | Optional | Alpha-numeric |

---

### 6.4 Purchase Orders — `/dashboard/data/purchase-orders`

#### List Columns

| Column | Field | Type |
|--------|-------|------|
| PO No. | id | string (PO-001) |
| Vendor | vendor | Many2one from Contacts (VENDOR type) |
| Order Date | date | date |
| Total | total | decimal |
| Status | status | enum: Draft / Confirmed / Billed |

#### New / Edit PO Form Fields

**Header:**

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| id | auto | Read-only | Auto-generated |
| address | text | Optional | |
| vendor | search | Required | Many2one from Contacts (type=VENDOR) |
| date | date | Required | Order date |

**PO Entry Line Items:**

| Field | Type | Notes |
|-------|------|-------|
| product | search | Many2one from Products |
| qty | number | Quantity/Month |
| price | number | Price field |
| available | text | Availability info |
| day | text | Day info |
| unitPrice | number | Auto-filled from Product |
| total | auto | qty × unitPrice |

**Budget Warning:** Shown if total > budget limit (₹2,00,000)  
**Buttons:** New · Confirm · Create Bill → navigates to Vendor Bills

---

### 6.5 Vendor Bills — `/dashboard/data/vendor-bills`

#### List Columns

| Column | Field | Type |
|--------|-------|------|
| Bill Ref | id | string (BILL/2026/0001) |
| Vendor Bill Ref | vendorRef | string |
| Vendor | vendor | string |
| Bill Date | date | date |
| Total | total | decimal |
| Status | status | enum: Draft / Confirmed / Paid |

#### New / Edit Bill Form Fields

**Left column:**

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| vendorRef | text | Optional | Vendor's own reference |
| vendor | search | Required | Many2one from Contacts (VENDOR) |
| date | date | Required | Bill date |

**Right column:**

| Field | Type | Notes |
|-------|------|-------|
| id (Bill No.) | auto | Read-only, auto-generated |
| billRef | text | Internal reference |
| billBody | text | Description |

**Bill Body Line Items:**

| Field | Type | Notes |
|-------|------|-------|
| product | search | Many2one from Products |
| account | search | Many2one from COA |
| accountCode | auto | Read-only |
| description | text | Line description |
| qty | number | |
| unitPrice | number | |
| total | auto | qty × unitPrice |

**Buttons:** New · Confirm · Pay → Pay navigates to Payments

---

### 6.6 Payments (Vendor) — `/dashboard/data/payments`

#### List Columns

| Column | Field | Type |
|--------|-------|------|
| Payment No. | id | string (PAY-001) |
| Partner | partner | string |
| Type | paymentType | enum: Send / Receive |
| Amount | amount | decimal |
| Account | account | string |
| Journal | journal | string |
| Status | status | enum: Draft / Posted |

#### New / Edit Payment Form Fields

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| paymentType | toggle | Receive / Send | |
| partner | search | Required | Many2one from Contacts |
| amount | number | Required, > 0 | ₹ prefix |
| account | search | Required | Bank / Cash accounts from COA |
| accountCode | auto | Read-only | |
| journal | auto | Read-only | Auto-filled from account (Bank/Cash) |
| memo | textarea | Optional | |

---

## 7. REPORTS MODULE

### 7.1 Financial Reports — `/dashboard/reports/financial`

**Tabs:** Profit & Loss · Balance Sheet · Stock Report

#### Profit & Loss Fields (computed from Journal Entries + COA)

| Row Label | Source | Formula |
|-----------|--------|---------|
| Income | All accounts type=Income | Sum of credits |
| Income from Sales | Account 3001 | Sales Income account balance |
| Expenses | All expense accounts | Sum of debits |
| Purchase Expense | Account 4001 | COGS account balance |
| Other Expense | Accounts 4002-4005 | Sum |
| Net Income | Computed | Income − Expenses |

#### Balance Sheet Fields

| Column | Accounts | Type |
|--------|---------|------|
| Bank | type=Bank | Asset |
| Cash | type=Cash | Asset |
| Debtors | type=Asset (Receivable) | Asset |
| Capital | type=Capital | Liability |
| Creditors | type=Liability (Payable) | Liability |

#### Stock Report Fields (from Products)

| Column | Field |
|--------|-------|
| Product | name |
| Category | category |
| Qty | stock |
| Cost Price | costPrice |
| Sales Price | salesPrice |
| Stock Value | stock × costPrice |

---

## 8. CUSTOMER PORTAL

### Route: `/portal`

#### Access Control

| Role | Access |
|------|--------|
| CONTACT | Can view own invoices, bills, payments. Can pay outstanding invoices. |
| ADMIN / ACCOUNTANT | Redirect to `/dashboard` |

#### Invoices Tab Fields (per customer)

| Field | Type | Notes |
|-------|------|-------|
| id | string | Invoice number |
| status | enum | Paid / Posted / Overdue / Draft |
| issued | date | Issue date |
| due | date | Due date |
| total | decimal | Invoice total |
| paid | decimal | Amount paid so far |
| amountDue | decimal | total − paid |

#### Pay Now Modal Fields

| Field | Type | Notes |
|-------|------|-------|
| paymentMethod | toggle | Bank / Cash / UPI |
| amount | number | Pre-filled with amountDue, editable |

#### Payments Tab Fields

| Field | Type | Notes |
|-------|------|-------|
| id | string | Payment ID |
| date | date | |
| amount | decimal | |
| method | string | Bank / Cash / UPI |
| status | enum | Confirmed / Draft |

---

## 9. COMPLETE API LIST

### BASE URL: `https://api.furniq.in/api/v1` (or your backend URL)

---

### 9.1 AUTHENTICATION APIs

| # | Method | Endpoint | Request Body | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 1 | POST | `/auth/login` | `{ loginId, password }` | `{ token, user: { id, name, role } }` | Login page |
| 2 | POST | `/auth/signup` | `{ loginId, email, password }` | `{ token, user }` | Sign Up |
| 3 | POST | `/auth/forgot-password` | `{ email }` | `{ message }` | Forgot Password |
| 4 | POST | `/auth/reset-password` | `{ token, newPassword }` | `{ message }` | Reset link |
| 5 | POST | `/auth/logout` | — | `{ message }` | Logout button |
| 6 | GET | `/auth/me` | — (JWT header) | `{ id, name, role, loginId }` | App startup |

---

### 9.2 USER MANAGEMENT APIs

| # | Method | Endpoint | Request Body | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 7 | POST | `/admin/users` | `{ name, loginId, email, role, password }` | `{ user }` | Create User |
| 8 | GET | `/admin/users` | — | `[{ id, name, loginId, email, role }]` | Admin panel |
| 9 | PUT | `/admin/users/:id` | `{ name, email, role }` | `{ user }` | Edit user |
| 10 | DELETE | `/admin/users/:id` | — | `{ message }` | Archive user |

---

### 9.3 DASHBOARD APIs

| # | Method | Endpoint | Query Params | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 11 | GET | `/dashboard/summary` | `?period=2026-09` | `{ totalSales, totalPurchased, cashBank, receivables, payables, lowStockCount }` | Dashboard KPIs |
| 12 | GET | `/dashboard/revenue-chart` | `?months=6` | `[{ month, revenue, expenses }]` | Area chart |
| 13 | GET | `/dashboard/cashflow-chart` | `?period=2026-09` | `[{ name, value }]` | Bar chart |
| 14 | GET | `/dashboard/sales-volume` | `?months=6` | `[{ month, Chair, Table, ... }]` | Stacked bar chart |
| 15 | GET | `/dashboard/quick-stats` | — | `{ sales, purchase, budget }` | Quick stat cards |

---

### 9.4 CONTACTS APIs

| # | Method | Endpoint | Request Body / Params | Response | Used In |
|---|--------|----------|--------------------|----------|---------|
| 16 | GET | `/contacts` | `?type=&search=&page=` | `{ data: [...], total, page }` | Contacts list |
| 17 | GET | `/contacts/:id` | — | `{ contact }` | Edit contact |
| 18 | POST | `/contacts` | `{ name, type, email, mobile, street, city, state, country, pincode, address, image }` | `{ contact }` | New contact |
| 19 | PUT | `/contacts/:id` | Same fields | `{ contact }` | Edit contact |
| 20 | DELETE | `/contacts/:id` | — | `{ message }` | Archive contact |
| 21 | POST | `/contacts/:id/image` | FormData (image file) | `{ imageUrl }` | Upload image |

---

### 9.5 PRODUCTS APIs

| # | Method | Endpoint | Request Body / Params | Response | Used In |
|---|--------|----------|--------------------|----------|---------|
| 22 | GET | `/products` | `?type=&search=&page=` | `{ data: [...], total }` | Products list |
| 23 | GET | `/products/:id` | — | `{ product }` | Edit product |
| 24 | POST | `/products` | `{ name, type, category, salesPrice, costPrice, stock, taxRate, image }` | `{ product }` | New product |
| 25 | PUT | `/products/:id` | Same fields | `{ product }` | Edit product |
| 26 | DELETE | `/products/:id` | — | `{ message }` | Archive product |
| 27 | GET | `/products/categories` | — | `[{ id, name }]` | Category dropdown |
| 28 | POST | `/products/categories` | `{ name }` | `{ category }` | Create category on-the-fly |

---

### 9.6 CHART OF ACCOUNTS APIs

| # | Method | Endpoint | Request Body | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 29 | GET | `/accounts` | `?search=` | `[{ code, name, group, type }]` | COA list |
| 30 | POST | `/accounts` | `{ name, type, group }` | `{ account }` | New account |
| 31 | PUT | `/accounts/:code` | `{ name, type, group }` | `{ account }` | Edit account |
| 32 | DELETE | `/accounts/:code` | — | `{ message }` | Archive account |

---

### 9.7 JOURNALS APIs

| # | Method | Endpoint | Request Body | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 33 | GET | `/journals` | — | `[{ id, name, type, defaultAccount, accountCode }]` | Journals list |
| 34 | POST | `/journals` | `{ name, type, defaultAccount, accountCode }` | `{ journal }` | New journal |
| 35 | PUT | `/journals/:id` | Same fields | `{ journal }` | Edit journal |
| 36 | DELETE | `/journals/:id` | — | `{ message }` | Delete journal |

---

### 9.8 JOURNAL ENTRIES APIs

| # | Method | Endpoint | Request Body | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 37 | GET | `/journal-entries` | `?status=&search=&page=` | `{ data: [...], total }` | JE list |
| 38 | GET | `/journal-entries/:id` | — | `{ entry }` | Edit JE |
| 39 | POST | `/journal-entries` | `{ accountingDate, journalId, partner, lines: [{ account, accountCode, partner, debit, credit }] }` | `{ entry }` | New JE |
| 40 | PUT | `/journal-entries/:id` | Same fields | `{ entry }` | Edit JE |
| 41 | POST | `/journal-entries/:id/post` | — | `{ entry }` | Post JE |
| 42 | DELETE | `/journal-entries/:id` | — | `{ message }` | Delete JE |

---

### 9.9 ANALYTIC ACCOUNTS APIs

| # | Method | Endpoint | Request Body | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 43 | GET | `/analytic-accounts` | `?type=&search=` | `[{ id, name, type, analyticAmount }]` | Analytic list |
| 44 | POST | `/analytic-accounts` | `{ name, type, analyticAmount }` | `{ account }` | New analytic |
| 45 | PUT | `/analytic-accounts/:id` | Same fields | `{ account }` | Edit analytic |
| 46 | DELETE | `/analytic-accounts/:id` | — | `{ message }` | Delete analytic |

---

### 9.10 BUDGET PLANS APIs

| # | Method | Endpoint | Request Body | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 47 | GET | `/budget-plans` | `?status=&search=` | `[{ id, name, startDate, endDate, status, responsible, lines }]` | Budget Plans list |
| 48 | GET | `/budget-plans/:id` | — | `{ plan }` | Edit plan |
| 49 | POST | `/budget-plans` | `{ name, startDate, endDate, status, responsible, lines: [{ analyticId, committedAmount, allowedAmount, allowedPct, amountToBudget }] }` | `{ plan }` | New plan |
| 50 | PUT | `/budget-plans/:id` | Same fields | `{ plan }` | Edit plan |
| 51 | DELETE | `/budget-plans/:id` | — | `{ message }` | Delete plan |

---

### 9.11 BUDGET REPORTS APIs

| # | Method | Endpoint | Request Body | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 52 | GET | `/budget-reports` | `?status=&search=` | `[{ id, name, startDate, endDate, status, achieved, balance }]` | Budget Reports list |
| 53 | POST | `/budget-reports` | `{ name, startDate, endDate, status, achieved, balance }` | `{ report }` | New report |
| 54 | PUT | `/budget-reports/:id` | Same fields | `{ report }` | Edit report |
| 55 | DELETE | `/budget-reports/:id` | — | `{ message }` | Delete report |

---

### 9.12 SALES ORDERS APIs (Data Input)

| # | Method | Endpoint | Request Body | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 56 | GET | `/sales-orders` | `?status=&search=&page=` | `{ data, total }` | SO list |
| 57 | POST | `/sales-orders` | `{ customer, address, date, lines: [{ product, budgetAnalytics, qty, unitPrice }] }` | `{ order }` | New SO |
| 58 | PUT | `/sales-orders/:id` | Same fields | `{ order }` | Edit SO |
| 59 | POST | `/sales-orders/:id/confirm` | — | `{ order }` | Confirm SO |
| 60 | POST | `/sales-orders/:id/create-invoice` | — | `{ invoice }` | Create Invoice from SO |
| 61 | DELETE | `/sales-orders/:id` | — | `{ message }` | Delete SO |

---

### 9.13 CUSTOMER INVOICES APIs

| # | Method | Endpoint | Request Body | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 62 | GET | `/customer-invoices` | `?status=&search=&page=` | `{ data, total }` | Invoice list |
| 63 | GET | `/customer-invoices/:id` | — | `{ invoice }` | Edit invoice |
| 64 | POST | `/customer-invoices` | `{ customer, invoiceRef, serviceDate, invoiceDate, dueDate, status, lines: [{ product, account, budgetAnalytics, qty, unitPrice }] }` | `{ invoice }` | New invoice |
| 65 | PUT | `/customer-invoices/:id` | Same fields | `{ invoice }` | Edit invoice |
| 66 | POST | `/customer-invoices/:id/confirm` | — | `{ invoice }` | Post invoice |
| 67 | POST | `/customer-invoices/:id/pay` | — | `{ payment }` | Create payment from invoice |
| 68 | DELETE | `/customer-invoices/:id` | — | `{ message }` | Delete invoice |

---

### 9.14 INVOICE PAYMENTS APIs

| # | Method | Endpoint | Request Body | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 69 | GET | `/invoice-payments` | `?status=&search=` | `{ data, total }` | Payments list |
| 70 | POST | `/invoice-payments` | `{ paymentType, partner, date, paymentVia, amount, memo }` | `{ payment }` | New payment |
| 71 | PUT | `/invoice-payments/:id` | Same fields | `{ payment }` | Edit payment |
| 72 | POST | `/invoice-payments/:id/confirm` | — | `{ payment }` | Confirm payment |
| 73 | POST | `/invoice-payments/:id/cancel` | — | `{ payment }` | Cancel payment |

---

### 9.15 PURCHASE ORDERS APIs

| # | Method | Endpoint | Request Body | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 74 | GET | `/purchase-orders` | `?status=&search=&page=` | `{ data, total }` | PO list |
| 75 | POST | `/purchase-orders` | `{ vendor, address, date, lines: [{ product, qty, price, available, day, unitPrice }] }` | `{ order }` | New PO |
| 76 | PUT | `/purchase-orders/:id` | Same fields | `{ order }` | Edit PO |
| 77 | POST | `/purchase-orders/:id/confirm` | — | `{ order }` | Confirm PO |
| 78 | POST | `/purchase-orders/:id/create-bill` | — | `{ bill }` | Create Vendor Bill from PO |
| 79 | DELETE | `/purchase-orders/:id` | — | `{ message }` | Delete PO |

---

### 9.16 VENDOR BILLS APIs

| # | Method | Endpoint | Request Body | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 80 | GET | `/vendor-bills` | `?status=&search=&page=` | `{ data, total }` | Bills list |
| 81 | GET | `/vendor-bills/:id` | — | `{ bill }` | Edit bill |
| 82 | POST | `/vendor-bills` | `{ vendorRef, vendor, billRef, billBody, date, lines: [{ product, account, description, qty, unitPrice }] }` | `{ bill }` | New bill |
| 83 | PUT | `/vendor-bills/:id` | Same fields | `{ bill }` | Edit bill |
| 84 | POST | `/vendor-bills/:id/confirm` | — | `{ bill }` | Confirm bill |
| 85 | POST | `/vendor-bills/:id/pay` | — | `{ payment }` | Create payment from bill |
| 86 | DELETE | `/vendor-bills/:id` | — | `{ message }` | Delete bill |

---

### 9.17 VENDOR PAYMENTS APIs

| # | Method | Endpoint | Request Body | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 87 | GET | `/payments` | `?status=&search=` | `{ data, total }` | Payments list |
| 88 | POST | `/payments` | `{ paymentType, partner, amount, account, accountCode, journal, memo }` | `{ payment }` | New payment |
| 89 | PUT | `/payments/:id` | Same fields | `{ payment }` | Edit payment |
| 90 | POST | `/payments/:id/post` | — | `{ payment }` | Post payment |
| 91 | DELETE | `/payments/:id` | — | `{ message }` | Delete payment |

---

### 9.18 FINANCIAL REPORTS APIs

| # | Method | Endpoint | Query Params | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 92 | GET | `/reports/profit-loss` | `?period=2026-09` | `{ income, purchaseExpense, otherExpense, netIncome, rows[] }` | P&L report |
| 93 | GET | `/reports/balance-sheet` | `?period=2026-09` | `{ assets[], liabilities[], totalAssets, totalLiabilities }` | Balance Sheet |
| 94 | GET | `/reports/stock` | — | `[{ id, name, category, qty, costPrice, salesPrice, stockValue }]` | Stock Report |

---

### 9.19 CUSTOMER PORTAL APIs

| # | Method | Endpoint | Query Params | Response | Used In |
|---|--------|----------|-------------|----------|---------|
| 95 | GET | `/portal/invoices` | `?customerId=` | `[{ id, status, issued, due, total, paid, amountDue }]` | Portal invoices tab |
| 96 | GET | `/portal/payments` | `?customerId=` | `[{ id, date, amount, method, status }]` | Portal payments tab |
| 97 | POST | `/portal/pay` | `{ invoiceId, amount, paymentMethod, customerId }` | `{ payment, updatedInvoice }` | Pay Now button |

---

## SUMMARY COUNTS

| Category | API Count |
|----------|-----------|
| Authentication & Users | 10 |
| Dashboard | 5 |
| Master Data (Contacts, Products, COA, Journals, JEs, Analytics) | 33 |
| Budget (Plans + Reports) | 12 |
| Data Input Forms (6 forms) | 36 |
| Financial Reports | 3 |
| Customer Portal | 3 |
| **TOTAL** | **102 APIs** |

---

## AUTHENTICATION HEADER

All protected APIs require:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

## ROLE-BASED ACCESS

| Role | Access |
|------|--------|
| ADMIN | All APIs |
| ACCOUNTANT | All except User Management |
| CONTACT (User) | Portal APIs only (`/portal/*`) |

---

*Document generated from FurnIQ frontend codebase analysis.*  
*Last updated: September 2026*
