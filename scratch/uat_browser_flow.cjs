const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runUatFlow() {
  console.log('=== STARTING END-TO-END BROWSER UAT WORKFLOW TEST ===\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const screenDir = path.join(__dirname, '../uat_screenshots');
  if (!fs.existsSync(screenDir)) fs.mkdirSync(screenDir, { recursive: true });

  const takeScreenshot = async (name) => {
    const file = path.join(screenDir, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`📸 Screenshot saved: ${name}.png`);
  };

  try {
    // 1. Navigate to Login page
    console.log('1. Navigating to http://localhost:5174/login...');
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    await takeScreenshot('01_login_page');

    // Fill login credentials
    await page.type('input[type="email"]', 'admin@urbanfurniture.com');
    await page.type('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    await takeScreenshot('02_dashboard');

    // 2. Purchase Flow: PO -> Vendor Bill -> Vendor Payment
    console.log('\n2. Testing Purchase Flow (PO -> Bill -> Payment)...');
    await page.goto('http://localhost:5174/dashboard/data/purchase-orders', { waitUntil: 'networkidle2' });
    await takeScreenshot('03_po_list');

    // Click "+ New"
    await page.click('.df-add-btn');
    await new Promise(r => setTimeout(r, 1000));
    await takeScreenshot('04_po_modal_open');

    // Fill PO Vendor and Product
    await page.type('.dfm-dropdown-wrap input', 'Jaipur Royal Fabric & Foam');
    await new Promise(r => setTimeout(r, 500));
    const vendorOpt = await page.$('.dfm-drop-opt');
    if (vendorOpt) await vendorOpt.click();

    // Select Product
    const prodInputs = await page.$$('.dfm-line-td input[placeholder="Product..."]');
    if (prodInputs.length > 0) {
      await prodInputs[0].type('Modern Ergonomic Office Recliner');
      await new Promise(r => setTimeout(r, 500));
      const pOpt = await page.$('.dfm-line-opt');
      if (pOpt) await pOpt.click();
    }

    // Set Qty
    const qtyInputs = await page.$$('.dfm-line-td input[placeholder="Qty"]');
    if (qtyInputs.length > 0) {
      await qtyInputs[0].click({ clickCount: 3 });
      await qtyInputs[0].type('5');
    }

    await takeScreenshot('05_po_modal_filled');

    // Click "Confirm"
    await page.click('.dfm-btn--confirm');
    await new Promise(r => setTimeout(r, 1500));
    await takeScreenshot('06_po_confirmed');

    // Click "Create Bill"
    await page.click('.dfm-btn--action');
    await new Promise(r => setTimeout(r, 2000));
    await takeScreenshot('07_vendor_bills_after_create_bill');

    // Edit top bill and Pay
    const editBtns = await page.$$('.df-edit-btn');
    if (editBtns.length > 0) {
      await editBtns[0].click();
      await new Promise(r => setTimeout(r, 1000));
      await takeScreenshot('08_vendor_bill_modal');

      // Click "Confirm" if needed then "Pay"
      const payBtn = await page.$('.dfm-btn--pay') || await page.$('button:has-text("Pay")');
      if (payBtn) {
        await payBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        await takeScreenshot('09_payment_modal_opened');

        // Click "Post"
        const postBtn = await page.$('.dfm-btn--new');
        if (postBtn) {
          await postBtn.click();
          await new Promise(r => setTimeout(r, 2000));
          await takeScreenshot('10_payment_posted');
        }
      }
    }

    // 3. Sales Flow: SO -> Customer Invoice -> Payment
    console.log('\n3. Testing Sales Flow (SO -> Invoice -> Payment)...');
    await page.goto('http://localhost:5174/dashboard/data/sales-orders', { waitUntil: 'networkidle2' });
    await takeScreenshot('11_so_list');

    // Click "+ New"
    await page.click('.df-add-btn');
    await new Promise(r => setTimeout(r, 1000));

    // Fill Customer
    await page.type('.dfm-field input[placeholder="Search customer..."]', 'Taj Palace Hospitality Projects');
    await new Promise(r => setTimeout(r, 500));
    const custOpt = await page.$('.dfm-drop-opt');
    if (custOpt) await custOpt.click();

    // Select Product
    const soProdInputs = await page.$$('.dfm-line-td input[placeholder="Product..."]');
    if (soProdInputs.length > 0) {
      await soProdInputs[0].type('Oak Dining Table');
      await new Promise(r => setTimeout(r, 500));
      const pOpt = await page.$('.dfm-line-opt');
      if (pOpt) await pOpt.click();
    }

    const soQtyInputs = await page.$$('.dfm-line-td input[placeholder="Qty"]');
    if (soQtyInputs.length > 0) {
      await soQtyInputs[0].click({ clickCount: 3 });
      await soQtyInputs[0].type('2');
    }

    await takeScreenshot('12_so_modal_filled');

    // Click "Confirm"
    await page.click('.dfm-btn--confirm');
    await new Promise(r => setTimeout(r, 1500));

    // Click "Create Invoice"
    await page.click('.dfm-btn--create-inv');
    await new Promise(r => setTimeout(r, 2000));
    await takeScreenshot('13_invoices_after_create_invoice');

    console.log('\n=== BROWSER UAT WORKFLOW COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('UAT Error:', err.message);
    await takeScreenshot('99_uat_error');
  } finally {
    await browser.close();
  }
}

runUatFlow().catch(console.error);
