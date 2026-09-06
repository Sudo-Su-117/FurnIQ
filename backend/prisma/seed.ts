import {
  PrismaClient,
  UserRole,
  ContactType,
  ContactStatus,
  ProductType,
  AccountType,
  AccountStatus,
  JournalType,
  TransactionStatus,
  PaymentType,
  PaymentMethod,
  AnalyticAccountType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed for FurnIQ Accounting System (India)...');

  // 1. Clean existing records in reverse dependency order
  await prisma.payment.deleteMany();
  await prisma.customerInvoiceLine.deleteMany();
  await prisma.customerInvoice.deleteMany();
  await prisma.salesOrderLine.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.vendorBillLine.deleteMany();
  await prisma.vendorBill.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.journalEntryLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.journal.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.analyticAccount.deleteMany();
  await prisma.account.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.contact.deleteMany();

  console.log('🧹 Cleaned all previous database tables.');

  // 2. Hash default passwords
  const defaultPassword = await bcrypt.hash('Admin123!', 10);
  const userPassword = await bcrypt.hash('Furniq123!', 10);

  // 3. Seed Users (Indian Names & Profiles)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@urbanfurniture.com',
      password: defaultPassword,
      name: 'Rajesh Sharma',
      role: UserRole.ADMIN,
    },
  });

  const accountantUser = await prisma.user.create({
    data: {
      email: 'accountant@urbanfurniture.com',
      password: defaultPassword,
      name: 'Priya Nair',
      role: UserRole.ACCOUNTANT,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      email: 'amit.patel@urbanfurniture.in',
      password: userPassword,
      name: 'Amit Patel',
      role: UserRole.ACCOUNTANT, // Full module access
    },
  });

  const purchaseUser = await prisma.user.create({
    data: {
      email: 'vikram.verma@urbanfurniture.in',
      password: userPassword,
      name: 'Vikram Verma',
      role: UserRole.ACCOUNTANT,
    },
  });

  console.log(`👤 Seeded 4 System Users: ${adminUser.name}, ${accountantUser.name}, ${salesUser.name}, ${purchaseUser.name}`);

  // 4. Seed Chart of Accounts (COA - Indian Standard Double Entry)
  const cashAccount = await prisma.account.create({
    data: { name: 'Cash on Hand', code: '1001', type: AccountType.ASSET, status: AccountStatus.ACTIVE },
  });

  const sbiBankAccount = await prisma.account.create({
    data: { name: 'State Bank of India – Current A/c', code: '1002', type: AccountType.ASSET, status: AccountStatus.ACTIVE },
  });

  const hdfcBankAccount = await prisma.account.create({
    data: { name: 'HDFC Bank – Business A/c', code: '1003', type: AccountType.ASSET, status: AccountStatus.ACTIVE },
  });

  const debtorsAccount = await prisma.account.create({
    data: { name: 'Accounts Receivable (Debtors)', code: '1100', type: AccountType.ASSET, status: AccountStatus.ACTIVE },
  });

  const inventoryAccount = await prisma.account.create({
    data: { name: 'Finished Goods Inventory', code: '1200', type: AccountType.ASSET, status: AccountStatus.ACTIVE },
  });

  const machineryAccount = await prisma.account.create({
    data: { name: 'Workshop Machinery & Equipment', code: '1500', type: AccountType.ASSET, status: AccountStatus.ACTIVE },
  });

  const creditorsAccount = await prisma.account.create({
    data: { name: 'Accounts Payable (Creditors)', code: '2100', type: AccountType.LIABILITY, status: AccountStatus.ACTIVE },
  });

  const gstPayableAccount = await prisma.account.create({
    data: { name: 'Output GST 18% Payable', code: '2200', type: AccountType.LIABILITY, status: AccountStatus.ACTIVE },
  });

  const capitalAccount = await prisma.account.create({
    data: { name: 'Promoter Capital & Reserves', code: '3000', type: AccountType.CAPITAL, status: AccountStatus.ACTIVE },
  });

  const salesIncomeAccount = await prisma.account.create({
    data: { name: 'Furniture Sales Revenue', code: '4000', type: AccountType.INCOME, status: AccountStatus.ACTIVE },
  });

  const serviceIncomeAccount = await prisma.account.create({
    data: { name: 'Design & Installation Services Income', code: '4100', type: AccountType.INCOME, status: AccountStatus.ACTIVE },
  });

  const purchaseExpenseAccount = await prisma.account.create({
    data: { name: 'Timber & Raw Material Purchases', code: '5000', type: AccountType.EXPENSE, status: AccountStatus.ACTIVE },
  });

  const rentExpenseAccount = await prisma.account.create({
    data: { name: 'Workshop & Showroom Lease Rent', code: '5100', type: AccountType.EXPENSE, status: AccountStatus.ACTIVE },
  });

  const salaryExpenseAccount = await prisma.account.create({
    data: { name: 'Artisan Wages & Staff Salaries', code: '5200', type: AccountType.EXPENSE, status: AccountStatus.ACTIVE },
  });

  console.log('📊 Seeded 14 Chart of Accounts.');

  // 5. Seed Journals
  const salesJournal = await prisma.journal.create({
    data: {
      name: 'Customer Invoices (Sales)',
      type: JournalType.SALES,
      defaultDebitAccountId: debtorsAccount.id,
      defaultCreditAccountId: salesIncomeAccount.id,
    },
  });

  const purchaseJournal = await prisma.journal.create({
    data: {
      name: 'Vendor Bills (Purchases)',
      type: JournalType.PURCHASE,
      defaultDebitAccountId: purchaseExpenseAccount.id,
      defaultCreditAccountId: creditorsAccount.id,
    },
  });

  const bankJournal = await prisma.journal.create({
    data: {
      name: 'SBI Bank Transactions',
      type: JournalType.BANK,
      defaultDebitAccountId: sbiBankAccount.id,
      defaultCreditAccountId: sbiBankAccount.id,
    },
  });

  const cashJournal = await prisma.journal.create({
    data: {
      name: 'Cash Register',
      type: JournalType.CASH,
      defaultDebitAccountId: cashAccount.id,
      defaultCreditAccountId: cashAccount.id,
    },
  });

  console.log('📖 Seeded 4 Standard Journals.');

  // 6. Seed Indian Contacts (Customers & Vendors)
  const custPrestige = await prisma.contact.create({
    data: {
      id: 'CUST-2026-001',
      name: 'Prestige Living Interiors Pvt. Ltd.',
      type: ContactType.CUSTOMER,
      email: 'ratan.mehra@prestigeliving.co.in',
      mobile: '+91 9820123456',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      status: ContactStatus.ACTIVE,
    },
  });

  const custAnanya = await prisma.contact.create({
    data: {
      id: 'CUST-2026-002',
      name: 'Ananya Sharma Design Studio',
      type: ContactType.CUSTOMER,
      email: 'ananya.sharma@sharmadesigns.in',
      mobile: '+91 9845198765',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      status: ContactStatus.ACTIVE,
    },
  });

  const custGodrej = await prisma.contact.create({
    data: {
      id: 'CUST-2026-003',
      name: 'Godrej Living Spaces',
      type: ContactType.CUSTOMER,
      email: 'kavita.rao@godrejspaces.in',
      mobile: '+91 9930876543',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      status: ContactStatus.ACTIVE,
    },
  });

  const custMahindra = await prisma.contact.create({
    data: {
      id: 'CUST-2026-004',
      name: 'Mahindra Heritage Resorts',
      type: ContactType.CUSTOMER,
      email: 'arjun.kapoor@mahindraresorts.in',
      mobile: '+91 9811234567',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      status: ContactStatus.ACTIVE,
    },
  });

  const custTaj = await prisma.contact.create({
    data: {
      id: 'CUST-2026-005',
      name: 'Taj Palace Hospitality Projects',
      type: ContactType.CUSTOMER,
      email: 'sunil.verma@tajprojects.in',
      mobile: '+91 9822345678',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302001',
      profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
      status: ContactStatus.ACTIVE,
    },
  });

  // Create Portal Customer User for Prestige Living
  const portalCustomerUser = await prisma.user.create({
    data: {
      email: 'ratan.mehra@prestigeliving.co.in',
      password: defaultPassword,
      name: 'Ratan Mehra',
      role: UserRole.CONTACT_USER,
      contactId: custPrestige.id,
    },
  });

  // Vendors
  const vendTimber = await prisma.contact.create({
    data: {
      id: 'VEND-2026-001',
      name: 'Timber Crafts Lumber Co.',
      type: ContactType.VENDOR,
      email: 'suresh.patel@timbercrafts.in',
      mobile: '+91 9724123890',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380001',
      profileImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
      status: ContactStatus.ACTIVE,
    },
  });

  // Create Portal Vendor User for Timber Crafts
  const portalVendorUser = await prisma.user.create({
    data: {
      email: 'suresh.patel@timbercrafts.in',
      password: defaultPassword,
      name: 'Suresh Patel',
      role: UserRole.CONTACT_USER,
      contactId: vendTimber.id,
    },
  });

  const vendTeak = await prisma.contact.create({
    data: {
      id: 'VEND-2026-002',
      name: 'South Indian Teak Suppliers',
      type: ContactType.VENDOR,
      email: 'murugan@southindianteak.co.in',
      mobile: '+91 9444156789',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
      status: ContactStatus.ACTIVE,
    },
  });

  const vendFabric = await prisma.contact.create({
    data: {
      id: 'VEND-2026-003',
      name: 'Jaipur Royal Fabric & Foam',
      type: ContactType.VENDOR,
      email: 'mahesh.agrawal@jaipurfabrics.in',
      mobile: '+91 9829034567',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302002',
      profileImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
      status: ContactStatus.ACTIVE,
    },
  });

  const vendHardware = await prisma.contact.create({
    data: {
      id: 'VEND-2026-004',
      name: 'Bharat Hardware & Precision Fittings',
      type: ContactType.VENDOR,
      email: 'deepak.joshi@bharathardware.in',
      mobile: '+91 9830145678',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700001',
      profileImage: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
      status: ContactStatus.ACTIVE,
    },
  });

  const vendCane = await prisma.contact.create({
    data: {
      id: 'VEND-2026-005',
      name: 'Deccan Cane & Wicker Works',
      type: ContactType.VENDOR,
      email: 'raghavan.reddy@deccancane.in',
      mobile: '+91 9849012345',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
      profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
      status: ContactStatus.ACTIVE,
    },
  });

  console.log(`🤝 Seeded 10 Indian Contacts with Profile Images and 1 Customer Portal User (${portalCustomerUser.name}).`);

  // 7. Seed Furniture Products & Services
  const prodDining = await prisma.product.create({
    data: {
      id: 'PROD-2026-001',
      name: 'Sheesham Wood 6-Seater Dining Table',
      type: ProductType.GOODS,
      salesPrice: 48000.0,
      costPrice: 30000.0,
      category: 'Dining Furniture',
      stockQuantity: 15,
      image: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=500&auto=format&fit=crop&q=60',
    },
  });

  const prodBed = await prisma.product.create({
    data: {
      id: 'PROD-2026-002',
      name: 'Teakwood Royal King Bed with Storage',
      type: ProductType.GOODS,
      salesPrice: 68000.0,
      costPrice: 42000.0,
      category: 'Bedroom Furniture',
      stockQuantity: 10,
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&auto=format&fit=crop&q=60',
    },
  });

  const prodSofa = await prisma.product.create({
    data: {
      id: 'PROD-2026-003',
      name: 'Velvet 3-Seater Chesterfield Sofa',
      type: ProductType.GOODS,
      salesPrice: 54000.0,
      costPrice: 35000.0,
      category: 'Living Room Furniture',
      stockQuantity: 12,
      image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&auto=format&fit=crop&q=60',
    },
  });

  const prodChair = await prisma.product.create({
    data: {
      id: 'PROD-2026-004',
      name: 'Ergonomic High-Back Executive Chair',
      type: ProductType.GOODS,
      salesPrice: 16500.0,
      costPrice: 10500.0,
      category: 'Office Furniture',
      stockQuantity: 35,
      image: 'https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=500&auto=format&fit=crop&q=60',
    },
  });

  const prodCoffee = await prisma.product.create({
    data: {
      id: 'PROD-2026-005',
      name: 'Handcrafted Solid Oak Coffee Table',
      type: ProductType.GOODS,
      salesPrice: 22500.0,
      costPrice: 14000.0,
      category: 'Living Room Furniture',
      stockQuantity: 20,
      image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500&auto=format&fit=crop&q=60',
    },
  });

  const prodArmchair = await prisma.product.create({
    data: {
      id: 'PROD-2026-006',
      name: 'Natural Wicker Balcony Armchair Pair',
      type: ProductType.GOODS,
      salesPrice: 28000.0,
      costPrice: 17500.0,
      category: 'Outdoor Furniture',
      stockQuantity: 14,
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&auto=format&fit=crop&q=60',
    },
  });

  const prodBookshelf = await prisma.product.create({
    data: {
      id: 'PROD-2026-007',
      name: 'Sheesham Wood 5-Shelf Bookcase',
      type: ProductType.GOODS,
      salesPrice: 26000.0,
      costPrice: 16000.0,
      category: 'Living Room Furniture',
      stockQuantity: 18,
      image: 'https://images.unsplash.com/photo-1594643156337-6714244e730b?w=500&auto=format&fit=crop&q=60',
    },
  });

  const prodAssemblyService = await prisma.product.create({
    data: {
      id: 'PROD-2026-008',
      name: 'Custom On-Site Polishing & Assembly Service',
      type: ProductType.SERVICE,
      salesPrice: 3500.0,
      costPrice: 1200.0,
      category: 'Professional Services',
      stockQuantity: 0,
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=60',
    },
  });

  const prodPanelingService = await prisma.product.create({
    data: {
      id: 'PROD-2026-009',
      name: 'Architectural Wood Paneling & Wall Cladding',
      type: ProductType.SERVICE,
      salesPrice: 18000.0,
      costPrice: 8000.0,
      category: 'Professional Services',
      stockQuantity: 0,
      image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&auto=format&fit=crop&q=60',
    },
  });

  console.log('🪑 Seeded 9 Products & Services with realistic INR pricing.');

  // 8. Seed Sales Orders (for SalesOrdersPage & SalesPage)
  const so1 = await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-2026-001',
      customerId: custPrestige.id,
      orderDate: new Date('2026-08-15'),
      status: TransactionStatus.CONFIRMED,
      totalAmount: 162000.0,
      lines: {
        create: [
          { productId: prodDining.id, quantity: 2, unitPrice: 48000.0, total: 96000.0 },
          { productId: prodChair.id, quantity: 4, unitPrice: 16500.0, total: 66000.0 },
        ],
      },
    },
  });

  const so2 = await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-2026-002',
      customerId: custAnanya.id,
      orderDate: new Date('2026-08-20'),
      status: TransactionStatus.CONFIRMED,
      totalAmount: 76500.0,
      lines: {
        create: [
          { productId: prodSofa.id, quantity: 1, unitPrice: 54000.0, total: 54000.0 },
          { productId: prodCoffee.id, quantity: 1, unitPrice: 22500.0, total: 22500.0 },
        ],
      },
    },
  });

  const so3 = await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-2026-003',
      customerId: custMahindra.id,
      orderDate: new Date('2026-09-01'),
      status: TransactionStatus.DRAFT,
      totalAmount: 275500.0,
      lines: {
        create: [
          { productId: prodBed.id, quantity: 4, unitPrice: 68000.0, total: 272000.0 },
          { productId: prodAssemblyService.id, quantity: 1, unitPrice: 3500.0, total: 3500.0 },
        ],
      },
    },
  });

  console.log('📑 Seeded 3 Sales Orders.');

  // 9. Seed Customer Invoices (for CustomerInvoicesPage & SalesPage)
  const inv1 = await prisma.customerInvoice.create({
    data: {
      invoiceNumber: 'INV-2026-001',
      customerId: custPrestige.id,
      salesOrderId: so1.id,
      invoiceDate: new Date('2026-08-16'),
      dueDate: new Date('2026-09-15'),
      status: TransactionStatus.PAID,
      totalAmount: 162000.0,
      paidAmount: 162000.0,
      lines: {
        create: [
          { productId: prodDining.id, quantity: 2, unitPrice: 48000.0, total: 96000.0 },
          { productId: prodChair.id, quantity: 4, unitPrice: 16500.0, total: 66000.0 },
        ],
      },
    },
  });

  const inv2 = await prisma.customerInvoice.create({
    data: {
      invoiceNumber: 'INV-2026-002',
      customerId: custAnanya.id,
      salesOrderId: so2.id,
      invoiceDate: new Date('2026-08-21'),
      dueDate: new Date('2026-09-20'),
      status: TransactionStatus.CONFIRMED,
      totalAmount: 76500.0,
      paidAmount: 0.0,
      lines: {
        create: [
          { productId: prodSofa.id, quantity: 1, unitPrice: 54000.0, total: 54000.0 },
          { productId: prodCoffee.id, quantity: 1, unitPrice: 22500.0, total: 22500.0 },
        ],
      },
    },
  });

  console.log('🧾 Seeded 2 Customer Invoices.');

  // 10. Seed Purchase Orders (for PurchaseOrdersPage & PurchasePage)
  const po1 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2026-001',
      vendorId: vendTimber.id,
      orderDate: new Date('2026-08-05'),
      status: TransactionStatus.CONFIRMED,
      totalAmount: 120000.0,
      lines: {
        create: [
          { productId: prodDining.id, quantity: 4, unitPrice: 30000.0, total: 120000.0 },
        ],
      },
    },
  });

  const po2 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2026-002',
      vendorId: vendFabric.id,
      orderDate: new Date('2026-08-10'),
      status: TransactionStatus.CONFIRMED,
      totalAmount: 70000.0,
      lines: {
        create: [
          { productId: prodSofa.id, quantity: 2, unitPrice: 35000.0, total: 70000.0 },
        ],
      },
    },
  });

  const po3 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2026-003',
      vendorId: vendHardware.id,
      orderDate: new Date('2026-09-02'),
      status: TransactionStatus.DRAFT,
      totalAmount: 32000.0,
      lines: {
        create: [
          { productId: prodCoffee.id, quantity: 2, unitPrice: 14000.0, total: 28000.0 },
          { productId: prodAssemblyService.id, quantity: 3, unitPrice: 1200.0, total: 3600.0 },
        ],
      },
    },
  });

  console.log('📦 Seeded 3 Purchase Orders.');

  // 11. Seed Vendor Bills (for VendorBillsPage & PurchasePage)
  const bill1 = await prisma.vendorBill.create({
    data: {
      billNumber: 'BILL-2026-001',
      vendorId: vendTimber.id,
      purchaseOrderId: po1.id,
      billDate: new Date('2026-08-08'),
      dueDate: new Date('2026-09-07'),
      status: TransactionStatus.PAID,
      totalAmount: 120000.0,
      paidAmount: 120000.0,
      lines: {
        create: [
          { productId: prodDining.id, quantity: 4, unitPrice: 30000.0, total: 120000.0 },
        ],
      },
    },
  });

  const bill2 = await prisma.vendorBill.create({
    data: {
      billNumber: 'BILL-2026-002',
      vendorId: vendFabric.id,
      purchaseOrderId: po2.id,
      billDate: new Date('2026-08-12'),
      dueDate: new Date('2026-09-11'),
      status: TransactionStatus.CONFIRMED,
      totalAmount: 70000.0,
      paidAmount: 0.0,
      lines: {
        create: [
          { productId: prodSofa.id, quantity: 2, unitPrice: 35000.0, total: 70000.0 },
        ],
      },
    },
  });

  console.log('📨 Seeded 2 Vendor Bills.');

  // 12. Seed Payments (Customer Payment & Vendor Payment)
  await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2026-C01',
      type: PaymentType.CUSTOMER_PAYMENT,
      paymentMethod: PaymentMethod.BANK,
      amount: 162000.0,
      paymentDate: new Date('2026-08-25'),
      reference: 'HDFC-NEFT-992381',
      contactId: custPrestige.id,
      customerInvoiceId: inv1.id,
    },
  });

  await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2026-V01',
      type: PaymentType.VENDOR_PAYMENT,
      paymentMethod: PaymentMethod.BANK,
      amount: 120000.0,
      paymentDate: new Date('2026-08-28'),
      reference: 'SBI-RTGS-448102',
      contactId: vendTimber.id,
      vendorBillId: bill1.id,
    },
  });

  console.log('💳 Seeded 2 Payments (1 Customer Receipt & 1 Vendor Disbursement).');

  // 13. Seed General Ledger Journal Entries (for JournalEntriesPage)
  const je1 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-001',
      date: new Date('2026-08-01'),
      reference: 'Capital Infusion by Promoter Rajesh Sharma',
      journalId: bankJournal.id,
      lines: {
        create: [
          { accountId: sbiBankAccount.id, debit: 2000000.0, credit: 0.0, description: 'Capital deposited into SBI A/c' },
          { accountId: capitalAccount.id, debit: 0.0, credit: 2000000.0, description: 'Promoter Equity Issued' },
        ],
      },
    },
  });

  const je2 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-002',
      date: new Date('2026-08-16'),
      reference: 'Sales Invoice INV-2026-001 (Prestige Living)',
      journalId: salesJournal.id,
      lines: {
        create: [
          { accountId: debtorsAccount.id, debit: 162000.0, credit: 0.0, description: 'Receivable from Prestige Living' },
          { accountId: salesIncomeAccount.id, debit: 0.0, credit: 162000.0, description: 'Dining Sets & Chairs Sales' },
        ],
      },
    },
  });

  const je3 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-003',
      date: new Date('2026-08-08'),
      reference: 'Vendor Bill BILL-2026-001 (Timber Crafts Lumber)',
      journalId: purchaseJournal.id,
      lines: {
        create: [
          { accountId: purchaseExpenseAccount.id, debit: 120000.0, credit: 0.0, description: 'Timber Raw Material Procurement' },
          { accountId: creditorsAccount.id, debit: 0.0, credit: 120000.0, description: 'Payable to Timber Crafts' },
        ],
      },
    },
  });

  console.log('🏛️ Seeded 3 Balanced General Ledger Journal Entries.');

  // 14. Seed Analytic Accounts & Budgets (for AnalyticAccountsPage, BudgetPlansPage & BudgetReportsPage)
  const analyticTimber = await prisma.analyticAccount.create({
    data: {
      name: 'Timber & Raw Material Sourcing',
      type: AnalyticAccountType.EXPENSE,
    },
  });

  const analyticShowroom = await prisma.analyticAccount.create({
    data: {
      name: 'Luxury Living Showroom Expansion',
      type: AnalyticAccountType.EXPENSE,
    },
  });

  const analyticHospitality = await prisma.analyticAccount.create({
    data: {
      name: 'Corporate & Hospitality Turnkey Projects',
      type: AnalyticAccountType.INCOME,
    },
  });

  const analyticLogistics = await prisma.analyticAccount.create({
    data: {
      name: 'Factory Logistics & Freight',
      type: AnalyticAccountType.EXPENSE,
    },
  });

  await prisma.budget.create({
    data: {
      name: 'Q3 Timber Sourcing Budget',
      analyticAccountId: analyticTimber.id,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-09-30'),
      responsiblePerson: 'Vikram Verma - Purchase Head',
      plannedAmount: 500000.0,
    },
  });

  await prisma.budget.create({
    data: {
      name: 'Annual Retail Showroom Budget FY 2026-27',
      analyticAccountId: analyticShowroom.id,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      responsiblePerson: 'Rajesh Sharma - Business Owner',
      plannedAmount: 1250000.0,
    },
  });

  await prisma.budget.create({
    data: {
      name: 'H2 High-End Interior Contracts Revenue',
      analyticAccountId: analyticHospitality.id,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-03-31'),
      responsiblePerson: 'Amit Patel - Sales Head',
      plannedAmount: 3500000.0,
    },
  });

  await prisma.budget.create({
    data: {
      name: 'Q3 Interstate Freight & Warehousing',
      analyticAccountId: analyticLogistics.id,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-09-30'),
      responsiblePerson: 'Vikram Verma - Purchase Head',
      plannedAmount: 350000.0,
    },
  });

  console.log('📈 Seeded 4 Analytic Accounts and 4 Planned Budgets.');

  console.log('========================================================');
  console.log('🎉 Comprehensive FurnIQ database seed completed successfully!');
  console.log('All entities localized with Indian names, cities, mobiles, and emails.');
  console.log('========================================================');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
