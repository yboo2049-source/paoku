import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5174/');
  
  await page.waitForTimeout(1000);
  await page.click('#start-btn');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'scratch/screenshot.png' });
  
  await browser.close();
  console.log("Screenshot taken at scratch/screenshot.png");
})();
