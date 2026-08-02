import { test, expect } from '@playwright/test';
import fs from 'fs';

test('visual layout and centering test', async ({ page }) => {
  // Navigate to the game
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  await page.goto('/');

  // Wait for the game canvas to load
  await page.waitForSelector('canvas');

  // Wait a moment for the game state to switch to PLAYING
  await page.waitForTimeout(1000);
  
  // Start the game by clicking the start button
  await page.click('#start-btn');
  await page.waitForTimeout(500);

  // Move right to change lane
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1000); // Wait for camera to transition

  // Take a screenshot of the gameplay layout
  const screenshotPath = 'screenshot_visual_test.png';
  await page.screenshot({ path: screenshotPath });

  console.log(`Screenshot saved to ${screenshotPath}`);
});
