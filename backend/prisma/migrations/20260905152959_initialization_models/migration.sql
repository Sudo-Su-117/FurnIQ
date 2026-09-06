-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ACCOUNTANT', 'CONTACT_USER');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CUSTOMER', 'VENDOR', 'BOTH');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('GOODS', 'SERVICE', 'COMBO');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EXPENSE', 'INCOME', 'CAPITAL');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JournalType" AS ENUM ('SALES', 'PURCHASE', 'BANK', 'CASH');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CUSTOMER_PAYMENT', 'VENDOR_PAYMENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK');

-- CreateEnum
CREATE TYPE "AnalyticAccountType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ACCOUNTANT',
    "contactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContactType" NOT NULL DEFAULT 'CUSTOMER',
    "email" TEXT,
    "mobile" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "profileImage" TEXT,
    "status" "ContactStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProductType" NOT NULL DEFAULT 'GOODS',
    "salesPrice" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "category" TEXT,
    "image" TEXT,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "AccountType" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "JournalType" NOT NULL,
    "defaultDebitAccountId" TEXT,
    "defaultCreditAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "journalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_lines" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entry_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0.0,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_bills" (
    "id" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" "TransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_bill_lines" (
    "id" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0.0,

    CONSTRAINT "vendor_bill_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_lines" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0.0,

    CONSTRAINT "sales_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salesOrderId" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" "TransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_invoice_lines" (
    "id" TEXT NOT NULL,
    "customerInvoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0.0,

    CONSTRAINT "customer_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK',
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "contactId" TEXT NOT NULL,
    "customerInvoiceId" TEXT,
    "vendorBillId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytic_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AnalyticAccountType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytic_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "analyticAccountId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "responsiblePerson" TEXT NOT NULL,
    "plannedAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_contactId_key" ON "users"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_email_key" ON "contacts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_name_key" ON "accounts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_code_key" ON "accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "journals_name_key" ON "journals"("name");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_entryNumber_key" ON "journal_entries"("entryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_orderNumber_key" ON "purchase_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_bills_billNumber_key" ON "vendor_bills"("billNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_orderNumber_key" ON "sales_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "customer_invoices_invoiceNumber_key" ON "customer_invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentNumber_key" ON "payments"("paymentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "analytic_accounts_name_key" ON "analytic_accounts"("name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journals" ADD CONSTRAINT "journals_defaultDebitAccountId_fkey" FOREIGN KEY ("defaultDebitAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journals" ADD CONSTRAINT "journals_defaultCreditAccountId_fkey" FOREIGN KEY ("defaultCreditAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_lines" ADD CONSTRAINT "vendor_bill_lines_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "vendor_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_lines" ADD CONSTRAINT "vendor_bill_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_invoice_lines" ADD CONSTRAINT "customer_invoice_lines_customerInvoiceId_fkey" FOREIGN KEY ("customerInvoiceId") REFERENCES "customer_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_invoice_lines" ADD CONSTRAINT "customer_invoice_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerInvoiceId_fkey" FOREIGN KEY ("customerInvoiceId") REFERENCES "customer_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "vendor_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_analyticAccountId_fkey" FOREIGN KEY ("analyticAccountId") REFERENCES "analytic_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
