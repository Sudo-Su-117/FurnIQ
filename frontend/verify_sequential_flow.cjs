const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1536,864']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 864 });

  // 1. Login as Admin
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  await page.type('#email', 'admin@urbanfurniture.com');
  await page.type('#password', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // 2. Go to Customer Portal
  await page.goto('http://localhost:5173/portal', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: 'C:/Users/Legio/.gemini/antigravity-ide/brain/fa18efad-b3b4-4d61-8fa7-ced5576fe42e/customer_portal_dropdown_closed.png' });

  // 3. Click the custom dropdown switcher button
  await page.click('#customer-portal-switcher');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'C:/Users/Legio/.gemini/antigravity-ide/brain/fa18efad-b3b4-4d61-8fa7-ced5576fe42e/customer_portal_dropdown_open.png' });

  // 4. Click a different customer option (Prestige Living)
  const items = await page.$$('.cp-cust-item');
  if (items.length > 0) {
    await items[items.length - 1].click();
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'C:/Users/Legio/.gemini/antigravity-ide/brain/fa18efad-b3b4-4d61-8fa7-ced5576fe42e/customer_portal_switched.png' });

  console.log('Customer portal dropdown screenshots captured successfully!');
  await browser.close();
})();
