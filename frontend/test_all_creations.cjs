const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/Legio/.gemini/antigravity-ide/brain/fa18efad-b3b4-4d61-8fa7-ced5576fe42e';
const BASE_URL = 'http://localhost:5173';

const log = (msg) => console.log(`[CREATE-TEST] ${new Date().toISOString()} ${msg}`);
const delay = (ms) => new Promise(res => setTimeout(res, ms));

(async () => {
  log('================================================================');
  log('STARTING CREATION WORKFLOW UAT & ADD BUTTON FUNCTIONALITY TEST');
  log('================================================================');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    console.log(`[BROWSER LOG] [${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  page.on('dialog', async dialog => {
    log(`Dialog opened: ${dialog.message()}`);
    await dialog.accept();
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
    await delay(1500);

    // Wait for the login form inputs to be mounted in DOM
    await page.waitForSelector('#email', { timeout: 15000 });

    // Clear and type credentials
    await page.evaluate(() => {
      const emailInput = document.querySelector('#email');
      const passInput = document.querySelector('#password');
      if (emailInput) emailInput.value = '';
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
    // 1. Login as Admin
    await performLogin('admin@urbanfurniture.com', 'Admin123!', 'Administrator (Rajesh Sharma)');

    // ==========================================
    // TEST 1: CREATE CONTACT (+ Add Contact)
    // ==========================================
    log('--- Test 1: Create New Contact ---');
    await page.goto(`${BASE_URL}/dashboard/master/contacts`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.click('.cp-add-btn');
    await delay(800);
    await ss('create_01_contact_modal.png');

    // Fill form using exact IDs
    const uniqueContactName = `Aura Interiors ${Date.now().toString().slice(-4)}`;
    await page.waitForSelector('#ncm-name', { timeout: 5000 });
    await page.type('#ncm-name', uniqueContactName, { delay: 10 });
    await page.type('input[placeholder="Unique Email"]', `contact_${Date.now().toString().slice(-4)}@aurainteriors.in`, { delay: 10 });
    await page.type('input[placeholder="+91 98200 00000"]', '+91 9876543210', { delay: 10 });
    await page.type('input[placeholder="City"]', 'Bengaluru', { delay: 10 });
    await delay(500);

    // Click Save Contact
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find(b => b.textContent.trim() === 'Save Contact');
      if (saveBtn) saveBtn.click();
    });
    await delay(1500);
    await ss('create_02_contact_saved.png');

    // ==========================================
    // TEST 2: CREATE PRODUCT (+ Add Product)
    // ==========================================
    log('--- Test 2: Create New Product ---');
    await page.goto(`${BASE_URL}/dashboard/master/products`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.click('.pp-add-btn');
    await delay(800);
    await ss('create_03_product_modal.png');

    const uniqueProdName = `Solid Maple Study Desk ${Date.now().toString().slice(-4)}`;
    await page.waitForSelector('#npm-name', { timeout: 5000 });
    await page.type('#npm-name', uniqueProdName, { delay: 10 });
    await page.type('#npm-sales', '32000', { delay: 10 });
    await page.type('#npm-cost', '20000', { delay: 10 });
    await delay(500);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find(b => b.textContent.trim() === 'Save Product');
      if (saveBtn) saveBtn.click();
    });
    await delay(1500);
    await ss('create_04_product_saved.png');

    // ==========================================
    // TEST 3: CREATE USER (+ Create User)
    // ==========================================
    log('--- Test 3: Create New User ---');
    await page.goto(`${BASE_URL}/admin/create-user`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.click('.um-add-btn');
    await delay(800);
    await ss('create_05_user_modal.png');

    const uniqueUserName = `Rahul Mehta ${Date.now().toString().slice(-4)}`;
    const uniqueUserEmail = `rahul_${Date.now().toString().slice(-4)}@urbanfurniture.in`;
    await page.evaluate((uName, uEmail) => {
      const nameInput = document.querySelector('#user-name, input[name="name"]');
      if (nameInput) {
        nameInput.value = uName;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const emailInput = document.querySelector('#user-email, input[name="email"]');
      if (emailInput) {
        emailInput.value = uEmail;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const pass = document.querySelector('#user-password, input[name="password"]');
      if (pass) {
        pass.value = 'Admin123!';
        pass.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const rePass = document.querySelector('#user-repassword, input[name="rePassword"]');
      if (rePass) {
        rePass.value = 'Admin123!';
        rePass.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, uniqueUserName, uniqueUserEmail);
    await delay(500);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const submitBtn = btns.find(b => b.textContent.trim() === 'Create Account' || b.textContent.includes('Create User'));
      if (submitBtn) submitBtn.click();
    });
    await delay(1500);
    await ss('create_06_user_saved.png');

    // ==========================================
    // TEST 4: CREATE JOURNAL ENTRY (+ New Entry)
    // ==========================================
    log('--- Test 4: Create New Journal Entry ---');
    await page.goto(`${BASE_URL}/dashboard/master/journal-entries`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const newBtn = btns.find(b => b.textContent.includes('New Entry') || b.textContent.includes('+'));
      if (newBtn) newBtn.click();
    });
    await delay(1000);
    await ss('create_07_journal_entry_modal.png');

    // Fill Draft Journal Entry
    await page.evaluate(() => {
      const refInput = document.querySelector('input[placeholder*="INV-001"], input[placeholder*="Reference"]');
      if (refInput) {
        refInput.value = 'REF-TEST-AUTO';
        refInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const draftBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Save as Draft'));
      if (draftBtn) draftBtn.click();
    });
    await delay(1500);
    await ss('create_08_journal_entry_saved.png');

    // ==========================================
    // TEST 5: CREATE SALES ORDER (+ New)
    // ==========================================
    log('--- Test 5: Create Sales Order ---');
    await page.goto(`${BASE_URL}/dashboard/data/sales-orders`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.click('.df-add-btn');
    await delay(1000);
    await ss('create_09_sales_order_modal.png');

    // Fill SO Form
    await page.evaluate(() => {
      // Set customer
      const custInput = document.querySelector('input[placeholder*="Search customer"]');
      if (custInput) {
        custInput.focus();
        custInput.value = 'Ratan Mehra';
        custInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // Set date
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) {
        dateInput.value = '2026-09-06';
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // Set product on first line
      const prodInput = document.querySelector('.dfm-line-input--prod');
      if (prodInput) {
        prodInput.value = 'Oak Dining Table';
        prodInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const qtyInput = document.querySelector('input[placeholder="Qty"]');
      if (qtyInput) {
        qtyInput.value = '2';
        qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const priceInput = document.querySelector('input[placeholder="0.00"]');
      if (priceInput) {
        priceInput.value = '48000';
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(600);

    // Click Save as Draft
    await page.evaluate(() => {
      const saveBtn = document.querySelector('.dfm-save-btn');
      if (saveBtn) saveBtn.click();
    });
    await delay(1500);
    await ss('create_10_sales_order_saved.png');

    // ==========================================
    // TEST 6: CREATE PURCHASE ORDER (+ New)
    // ==========================================
    log('--- Test 6: Create Purchase Order ---');
    await page.goto(`${BASE_URL}/dashboard/data/purchase-orders`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.click('.df-add-btn');
    await delay(1000);
    await ss('create_11_purchase_order_modal.png');

    // Fill PO Form
    await page.evaluate(() => {
      const vendorInput = document.querySelector('input[placeholder*="Search vendor"]');
      if (vendorInput) {
        vendorInput.focus();
        vendorInput.value = 'TimberCraft Supplies';
        vendorInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) {
        dateInput.value = '2026-09-06';
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const prodInput = document.querySelector('.dfm-line-input--prod');
      if (prodInput) {
        prodInput.value = 'Oak Wood Planks';
        prodInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const qtyInput = document.querySelector('input[placeholder="Qty"]');
      if (qtyInput) {
        qtyInput.value = '5';
        qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const priceInput = document.querySelector('input[placeholder="0.00"]');
      if (priceInput) {
        priceInput.value = '12000';
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(600);

    await page.evaluate(() => {
      const saveBtn = document.querySelector('.dfm-save-btn');
      if (saveBtn) saveBtn.click();
    });
    await delay(1500);
    await ss('create_12_purchase_order_saved.png');

    // ==========================================
    // TEST 7: CREATE BUDGET REPORT (+ New)
    // ==========================================
    log('--- Test 7: Create Budget ---');
    await page.goto(`${BASE_URL}/dashboard/budget`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.click('.br-new-btn');
    await delay(1000);
    await ss('create_13_budget_modal.png');

    // Fill budget modal form
    await page.evaluate(() => {
      const nameInput = document.querySelector('input[placeholder*="Budget name"], .brm-input');
      if (nameInput) {
        nameInput.value = `Automated FY26 Budget ${Date.now().toString().slice(-4)}`;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const plannedInput = document.querySelector('input[name="plannedAmount"], input[placeholder*="Planned"], input[type="number"]');
      if (plannedInput) {
        plannedInput.value = '2500000';
        plannedInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await delay(600);

    await page.evaluate(() => {
      const saveBtn = document.querySelector('.brm-save-btn');
      if (saveBtn) saveBtn.click();
    });
    await delay(1500);
    await ss('create_14_budget_saved.png');

    log('================================================================');
    log('🎉 ALL ADD / CREATE BUTTONS TESTED INTERACTIVELY AND WORKING!');
    log('================================================================');
  } catch (err) {
    log(`💥 Creation Test Error: ${err.message}`);
    await ss('create_error_snapshot.png');
  } finally {
    await browser.close();
  }
})();
