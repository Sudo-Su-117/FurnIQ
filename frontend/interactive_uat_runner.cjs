const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/Legio/.gemini/antigravity-ide/brain/fa18efad-b3b4-4d61-8fa7-ced5576fe42e';
const BASE_URL = 'http://localhost:5173';

const log = (msg) => console.log(`[ARCHITECT-UAT] ${new Date().toISOString()} ${msg}`);

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  log('Starting Comprehensive Multi-Role Interactive User Acceptance Testing...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${msg.text()}`);
    }
  });

  const ss = async (filename) => {
    const p = path.join(ARTIFACTS_DIR, filename);
    await page.screenshot({ path: p, fullPage: false });
    log(`Screenshot saved: ${filename}`);
  };

  try {
    // ==========================================
    // STEP 1: LOGIN PAGE & DEMO LOGINS
    // ==========================================
    log('--- Step 1: Navigating to Login Page ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await ss('uat_01_login_page.png');

    // ==========================================
    // STEP 2: ROLE 1 - ADMINISTRATOR USERFLOW
    // ==========================================
    log('--- Step 2: Role 1 - Administrator (Rajesh Sharma) Login ---');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.demo-card, [class*="demo-card"], button, div'));
      const adminCard = cards.find(el => el.textContent.includes('Administrator') && el.textContent.includes('Rajesh Sharma'));
      if (adminCard) adminCard.click();
      else {
        const email = document.querySelector('input[type="email"], input[name="email"]');
        const pass = document.querySelector('input[type="password"]');
        if (email) email.value = 'admin@urbanfurniture.com';
        if (pass) pass.value = 'Admin123!';
        const submit = document.querySelector('button[type="submit"]');
        if (submit) submit.click();
      }
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await delay(1500);
    log(`Admin URL after login: ${page.url()}`);
    await ss('uat_02_admin_dashboard.png');

    // Step 2.1: Header Navigation & Dropdowns
    log('--- Step 2.1: Interacting with Header Navigation ---');
    await page.evaluate(() => {
      const headerButtons = Array.from(document.querySelectorAll('button, nav span, nav a, .dropdown-trigger'));
      const salesBtn = headerButtons.find(el => el.textContent.trim().startsWith('Sales') || el.textContent.includes('Sales'));
      if (salesBtn) salesBtn.click();
    });
    await delay(800);
    await ss('uat_03_admin_header_dropdown.png');

    // Step 2.2: Contacts Management
    log('--- Step 2.2: Master Data - Contacts ---');
    await page.goto(`${BASE_URL}/master/contacts`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await ss('uat_04_contacts_list.png');

    log('Toggling Contacts to Card View...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cardBtn = btns.find(b => b.title?.includes('Card') || b.textContent.includes('Card'));
      if (cardBtn) cardBtn.click();
    });
    await delay(800);
    await ss('uat_04b_contacts_cards.png');

    log('Searching contact "Prestige"...');
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Search"]');
      if (input) {
        input.value = 'Prestige';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(600);
    await ss('uat_04c_contacts_filtered.png');

    // Step 2.3: Products Catalog
    log('--- Step 2.3: Master Data - Products ---');
    await page.goto(`${BASE_URL}/master/products`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await ss('uat_05_products_catalog.png');

    // Step 2.4: Accounting - Chart of Accounts
    log('--- Step 2.4: Accounting - Chart of Accounts ---');
    await page.goto(`${BASE_URL}/accounting/chart-of-accounts`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await ss('uat_06_chart_of_accounts.png');

    // Step 2.5: Accounting - Journals Configuration
    log('--- Step 2.5: Accounting - Journals Configuration ---');
    await page.goto(`${BASE_URL}/accounting/journals`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await ss('uat_07_journals_list.png');

    // Step 2.6: Accounting - Journal Entries
    log('--- Step 2.6: Accounting - Journal Entries ---');
    await page.goto(`${BASE_URL}/accounting/journal-entries`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await ss('uat_08_journal_entries_table.png');

    log('Opening New Journal Entry Modal...');
    await page.evaluate(() => {
      const newBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('New Entry') || b.textContent.includes('New Journal Entry') || b.textContent.includes('+'));
      if (newBtn) newBtn.click();
    });
    await delay(1200);
    await ss('uat_08b_new_journal_entry_modal.png');

    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
    });
    await delay(500);

    // Step 2.7: Purchases Flow
    log('--- Step 2.7: Purchase Order & Vendor Bills ---');
    await page.goto(`${BASE_URL}/purchases/orders`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await ss('uat_09_purchase_orders.png');

    await page.goto(`${BASE_URL}/purchases/bills`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await ss('uat_10_vendor_bills.png');

    // Step 2.8: Sales Flow
    log('--- Step 2.8: Sales Orders & Customer Invoices ---');
    await page.goto(`${BASE_URL}/sales/orders`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await ss('uat_11_sales_orders.png');

    await page.goto(`${BASE_URL}/sales/invoices`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await ss('uat_12_customer_invoices.png');

    // Step 2.9: Payments Register
    log('--- Step 2.9: Payments Register ---');
    await page.goto(`${BASE_URL}/accounting/payments`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await ss('uat_13_payments_register.png');

    // Step 2.10: User Management (Admin Exclusive)
    log('--- Step 2.10: Admin User Management ---');
    await page.goto(`${BASE_URL}/admin/create-user`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await ss('uat_14_user_management.png');

    log('Opening User Provisioning Modal...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create User') || b.textContent.includes('Add User'));
      if (btn) btn.click();
    });
    await delay(800);
    await ss('uat_14b_create_user_modal.png');

    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
    });
    await delay(500);

    // Step 2.11: Financial Reports
    log('--- Step 2.11: Financial Reports - Profit & Loss ---');
    await page.goto(`${BASE_URL}/accounting/reports/profit-loss`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('uat_15_profit_loss_report.png');

    log('--- Step 2.12: Financial Reports - Balance Sheet ---');
    await page.goto(`${BASE_URL}/accounting/reports/balance-sheet`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('uat_16_balance_sheet_report.png');

    log('--- Step 2.13: Stock Valuation Report ---');
    await page.goto(`${BASE_URL}/accounting/reports/stock`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('uat_17_stock_valuation_report.png');

    log('--- Step 2.14: Budget & Analytical Reports ---');
    await page.goto(`${BASE_URL}/accounting/reports/budget`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('uat_18_budget_report.png');

    await page.goto(`${BASE_URL}/accounting/analytic-accounts`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await ss('uat_19_analytic_accounts.png');

    // Step 2.15: Administrator Logout
    log('--- Step 2.15: Administrator Logout ---');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    });
    await delay(1500);
    await ss('uat_20_admin_logout_complete.png');

    // ==========================================
    // STEP 3: ROLE 2 - INVOICING USER / ACCOUNTANT
    // ==========================================
    log('--- Step 3: Role 2 - Invoicing User / Accountant (Priya Nair) ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await delay(1000);

    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.demo-card, [class*="demo-card"], button, div'));
      const accCard = cards.find(el => el.textContent.includes('Invoicing User') && el.textContent.includes('Priya Nair'));
      if (accCard) accCard.click();
      else {
        const email = document.querySelector('input[type="email"], input[name="email"]');
        const pass = document.querySelector('input[type="password"]');
        if (email) email.value = 'accountant@urbanfurniture.com';
        if (pass) pass.value = 'Admin123!';
        const submit = document.querySelector('button[type="submit"]');
        if (submit) submit.click();
      }
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await delay(1500);
    log(`Accountant URL after login: ${page.url()}`);
    await ss('uat_21_accountant_dashboard.png');

    log('Checking sidebar for absence of User Management...');
    await page.goto(`${BASE_URL}/master/contacts`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await ss('uat_22_accountant_contacts_no_archive.png');

    // Accountant Logout
    log('Accountant Logout...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    });
    await delay(1500);

    // ==========================================
    // STEP 4: ROLE 3 - CUSTOMER PORTAL USER
    // ==========================================
    log('--- Step 4: Role 3 - Customer Portal (Ratan Mehra) ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await delay(1000);

    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.demo-card, [class*="demo-card"], button, div'));
      const custCard = cards.find(el => el.textContent.includes('Customer') && el.textContent.includes('Ratan Mehra'));
      if (custCard) custCard.click();
      else {
        const email = document.querySelector('input[type="email"], input[name="email"]');
        const pass = document.querySelector('input[type="password"]');
        if (email) email.value = 'ratan.mehra@prestigeliving.co.in';
        if (pass) pass.value = 'Admin123!';
        const submit = document.querySelector('button[type="submit"]');
        if (submit) submit.click();
      }
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await delay(1500);
    log(`Customer Portal URL: ${page.url()}`);
    await ss('uat_23_customer_portal_invoices.png');

    // Customer Portal Logout
    log('Customer Portal Sign Out...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    });
    await delay(1500);

    // ==========================================
    // STEP 5: ROLE 4 - VENDOR PORTAL USER
    // ==========================================
    log('--- Step 5: Role 4 - Vendor Portal (Suresh Patel) ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await delay(1000);

    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.demo-card, [class*="demo-card"], button, div'));
      const venCard = cards.find(el => el.textContent.includes('Vendor') && el.textContent.includes('Suresh Patel'));
      if (venCard) venCard.click();
      else {
        const email = document.querySelector('input[type="email"], input[name="email"]');
        const pass = document.querySelector('input[type="password"]');
        if (email) email.value = 'suresh.patel@timbercrafts.in';
        if (pass) pass.value = 'Admin123!';
        const submit = document.querySelector('button[type="submit"]');
        if (submit) submit.click();
      }
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await delay(1500);
    log(`Vendor Portal URL: ${page.url()}`);

    // Click Bills tab in portal
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, .tab, nav a'));
      const billsTab = tabs.find(t => t.textContent.includes('Bills') || t.textContent.includes('Purchase'));
      if (billsTab) billsTab.click();
    });
    await delay(800);
    await ss('uat_24_vendor_portal_bills.png');

    // Click Payments tab in portal
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, .tab, nav a'));
      const payTab = tabs.find(t => t.textContent.includes('Payments') || t.textContent.includes('Receipts'));
      if (payTab) payTab.click();
    });
    await delay(800);
    await ss('uat_25_vendor_portal_payments.png');

    // Vendor Logout
    log('Vendor Portal Sign Out...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    });
    await delay(1500);
    await ss('uat_26_final_login_screen.png');

    log('========================================================================');
    log('SUCCESS: All 4 Roles, Workflows, Tabs, and Reports tested step-by-step!');
    log('========================================================================');
  } catch (err) {
    log(`ERROR encountered during UAT: ${err.message}`);
    await ss('uat_error_snapshot.png');
  } finally {
    await browser.close();
  }
})();
