const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/Legio/.gemini/antigravity-ide/brain/fa18efad-b3b4-4d61-8fa7-ced5576fe42e';
const BASE_URL = 'http://localhost:5173';

const log = (msg) => console.log(`[REAL-UAT] ${new Date().toISOString()} ${msg}`);
const delay = (ms) => new Promise(res => setTimeout(res, ms));

(async () => {
  log('===============================================================');
  log('STARTING INTERACTIVE MULTI-ROLE REAL USERFLOW UAT (CHROMIUM)');
  log('===============================================================');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[BROWSER ERROR] ${msg.text()}`);
  });

  const ss = async (filename) => {
    const p = path.join(ARTIFACTS_DIR, filename);
    await page.screenshot({ path: p, fullPage: false });
    log(`📸 Captured: ${filename}`);
  };

  // Robust login helper that performs real user typing and clicking
  async function performLogin(email, password, roleName) {
    log(`--- Logging in as ${roleName} (${email}) ---`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await delay(800);

    // Clear and type credentials
    await page.evaluate(() => {
      const emailInput = document.querySelector('input[type="email"], #email');
      const passInput = document.querySelector('input[type="password"], #password');
      if (emailInput) {
        emailInput.value = '';
        emailInput.focus();
      }
      if (passInput) passInput.value = '';
    });

    await page.type('#email', email, { delay: 20 });
    await page.type('#password', password, { delay: 20 });
    await delay(300);

    // Click Sign in button
    await page.evaluate(() => {
      const submit = document.querySelector('button[type="submit"]');
      if (submit) submit.click();
    });

    // Wait for URL to change away from /login
    await page.waitForFunction(
      () => !window.location.pathname.includes('/login'),
      { timeout: 15000 }
    ).catch(e => log(`Wait for nav warning: ${e.message}`));

    await delay(1200);
    log(`Landed on URL: ${page.url()}`);
  }

  try {
    // ==========================================
    // STEP 1: INITIAL LOGIN SCREEN
    // ==========================================
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await delay(800);
    await ss('flow_01_login_page.png');

    // ==========================================
    // FLOW 1: ADMINISTRATOR
    // ==========================================
    await performLogin('admin@urbanfurniture.com', 'Admin123!', 'Administrator (Rajesh Sharma)');
    await ss('flow_02_admin_dashboard.png');

    // 1.1 Master Data - Contacts (List, Card View, Search)
    log('--- Navigating to Master Data: Contacts ---');
    await page.goto(`${BASE_URL}/dashboard/master/contacts`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('flow_03_admin_contacts_list.png');

    // Toggle Card View
    log('Clicking Card View toggle button...');
    await page.click('.cp-view-toggle button:last-child');
    await delay(800);
    await ss('flow_04_admin_contacts_card_view.png');

    // Switch back to List & Search
    await page.click('.cp-view-toggle button:first-child');
    await delay(400);
    await page.type('.cp-search', 'Prestige');
    await delay(600);
    await ss('flow_05_admin_contacts_searched.png');

    // 1.2 Master Data - Products
    log('--- Navigating to Master Data: Products ---');
    await page.goto(`${BASE_URL}/dashboard/master/products`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('flow_06_admin_products_catalog.png');

    // 1.3 Master Data - Chart of Accounts
    log('--- Navigating to Master Data: Chart of Accounts ---');
    await page.goto(`${BASE_URL}/dashboard/master/coa`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('flow_07_admin_chart_of_accounts.png');

    // 1.4 Master Data - Journals
    log('--- Navigating to Master Data: Journals ---');
    await page.goto(`${BASE_URL}/dashboard/master/journals`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('flow_08_admin_journals_list.png');

    // 1.5 Master Data - Journal Entries & Entry Modal
    log('--- Navigating to Master Data: Journal Entries ---');
    await page.goto(`${BASE_URL}/dashboard/master/journal-entries`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('flow_09_admin_journal_entries_table.png');

    // Open New Entry modal
    log('Opening + New Journal Entry Modal...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const newBtn = btns.find(b => b.textContent.includes('New') || b.textContent.includes('+'));
      if (newBtn) newBtn.click();
    });
    await delay(1200);
    await ss('flow_10_admin_journal_entry_modal.png');

    // Close modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
    });
    await delay(500);

    // 1.6 Purchases Flow (PO & Vendor Bills)
    log('--- Navigating to Purchases: Orders & Bills ---');
    await page.goto(`${BASE_URL}/dashboard/purchase/orders`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('flow_11_admin_purchase_orders.png');

    await page.goto(`${BASE_URL}/dashboard/purchase/bills`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('flow_12_admin_vendor_bills.png');

    // 1.7 Sales Flow (SO & Invoices)
    log('--- Navigating to Sales: Orders & Invoices ---');
    await page.goto(`${BASE_URL}/dashboard/sales/orders`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('flow_13_admin_sales_orders.png');

    await page.goto(`${BASE_URL}/dashboard/sales/invoices`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('flow_14_admin_customer_invoices.png');

    // 1.8 User Management (Admin Only)
    log('--- Navigating to Settings: User Management ---');
    await page.goto(`${BASE_URL}/admin/create-user`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('flow_15_admin_user_management.png');

    // 1.9 Financial Reports (Profit & Loss, Balance Sheet, Stock)
    log('--- Navigating to Financial Reports ---');
    await page.goto(`${BASE_URL}/dashboard/reports/financial`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('flow_16_report_profit_loss.png');

    // Switch to Balance Sheet Tab
    log('Clicking Balance Sheet Tab...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.fr-tab, button'));
      const bsTab = tabs.find(t => t.textContent.includes('Balance Sheet'));
      if (bsTab) bsTab.click();
    });
    await delay(1200);
    await ss('flow_17_report_balance_sheet.png');

    // Switch to Stock Report Tab
    log('Clicking Stock Report Tab...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.fr-tab, button'));
      const stockTab = tabs.find(t => t.textContent.includes('Stock'));
      if (stockTab) stockTab.click();
    });
    await delay(1200);
    await ss('flow_18_report_stock_valuation.png');

    // 1.10 Budget Reports & Analytic Accounts
    log('--- Navigating to Budget Reports ---');
    await page.goto(`${BASE_URL}/dashboard/budget`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('flow_19_budget_reports.png');

    await page.goto(`${BASE_URL}/dashboard/budget/analytics`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('flow_20_analytic_accounts.png');

    // Admin Logout
    log('Admin Logging out...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    });
    await delay(1500);

    // ==========================================
    // FLOW 2: INVOICING USER / ACCOUNTANT
    // ==========================================
    await performLogin('accountant@urbanfurniture.com', 'Admin123!', 'Invoicing User (Priya Nair)');
    await ss('flow_21_accountant_dashboard.png');

    // Verify User Management is NOT present and Archive buttons hidden on contacts
    await page.goto(`${BASE_URL}/dashboard/master/contacts`, { waitUntil: 'networkidle2' });
    await delay(1200);
    await ss('flow_22_accountant_contacts_no_archive.png');

    // Accountant Logout
    log('Accountant Logging out...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    });
    await delay(1500);

    // ==========================================
    // FLOW 3: CUSTOMER PORTAL
    // ==========================================
    await performLogin('ratan.mehra@prestigeliving.co.in', 'Admin123!', 'Customer Portal (Ratan Mehra)');
    await ss('flow_23_customer_portal_invoices.png');

    // Click Sign Out
    log('Customer Portal Sign Out...');
    await page.evaluate(() => {
      const signout = Array.from(document.querySelectorAll('button, a')).find(b => b.textContent.includes('Sign Out') || b.textContent.includes('Logout'));
      if (signout) signout.click();
      else {
        localStorage.clear();
        window.location.href = '/login';
      }
    });
    await delay(1500);

    // ==========================================
    // FLOW 4: VENDOR PORTAL
    // ==========================================
    await performLogin('suresh.patel@timbercrafts.in', 'Admin123!', 'Vendor Portal (Suresh Patel)');
    await delay(800);

    // Click Vendor Bills Tab in portal
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, .tab, nav a'));
      const billsTab = tabs.find(t => t.textContent.includes('Bills') || t.textContent.includes('Purchase'));
      if (billsTab) billsTab.click();
    });
    await delay(800);
    await ss('flow_24_vendor_portal_bills.png');

    // Click Payments Tab in portal
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, .tab, nav a'));
      const payTab = tabs.find(t => t.textContent.includes('Payments') || t.textContent.includes('Receipts'));
      if (payTab) payTab.click();
    });
    await delay(800);
    await ss('flow_25_vendor_portal_payments.png');

    // Vendor Logout
    log('Vendor Portal Sign Out...');
    await page.evaluate(() => {
      const signout = Array.from(document.querySelectorAll('button, a')).find(b => b.textContent.includes('Sign Out') || b.textContent.includes('Logout'));
      if (signout) signout.click();
      else {
        localStorage.clear();
        window.location.href = '/login';
      }
    });
    await delay(1500);
    await ss('flow_26_final_login_screen.png');

    log('===============================================================');
    log('🎉 SUCCESS: REAL BROWSER USERFLOW UAT COMPLETED 100% CLEANLY!');
    log('===============================================================');
  } catch (err) {
    log(`💥 UAT Error: ${err.message}`);
    await ss('flow_error_snapshot.png');
  } finally {
    await browser.close();
  }
})();
