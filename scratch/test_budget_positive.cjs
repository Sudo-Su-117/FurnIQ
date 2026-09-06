const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  await page.goto('http://localhost:5174/dashboard/budget', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const outPath = path.join('C:', 'Users', 'Legio', '.gemini', 'antigravity-ide', 'brain', 'fa18efad-b3b4-4d61-8fa7-ced5576fe42e', 'budget_positive_verified.png');
  await page.screenshot({ path: outPath, fullPage: true });

  console.log('Screenshot saved to:', outPath);
  await browser.close();
})();
