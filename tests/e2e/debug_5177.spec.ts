import { test, expect } from '@playwright/test';
test('screenshot port 5177', async ({ page }) => {
  await page.goto('http://127.0.0.1:5177/');
  await page.waitForTimeout(2000);
  await page.click('#start-btn');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\4d122890-b38e-40ea-8ad7-206dc4841dcc\\scratch\\debug_5177.png' });
});
