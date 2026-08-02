import { test, expect } from '@playwright/test';

test('Autopilot plays 10 games without freezing', async ({ page }) => {
  test.setTimeout(300000); // 5 minutes timeout
  await page.goto('http://localhost:5177');

  let gamesPlayed = 0;

  // Function to click Start and Autopilot if they exist
  const startGame = async () => {
    // Wait a moment for UI to be ready
    await page.waitForTimeout(1000);
    
    // Check if game over screen is visible and click restart
    const gameOverScreen = await page.evaluate(() => {
      const el = document.getElementById('game-over-screen');
      return el && window.getComputedStyle(el).display !== 'none';
    });

    if (gameOverScreen) {
      await page.click('#restart-btn');
      await page.waitForTimeout(500);
      gamesPlayed++;
      console.log(`Games played: ${gamesPlayed}`);
    } else {
      // Menu screen
      const menuScreen = await page.evaluate(() => {
        const el = document.getElementById('menu-screen');
        return el && window.getComputedStyle(el).display !== 'none';
      });
      if (menuScreen) {
        await page.click('#start-btn');
        await page.waitForTimeout(500);
      }
    }
    
    // Enable autopilot
    await page.evaluate(() => {
      // Use the global window autopilot toggle logic if exposed, otherwise simulate clicking autopilot btn
      // In main.ts, autopilot can be enabled via ?bot=true, but we are already in the page.
      // Since we don't have an autopilot button explicitly visible, we'll set the variable if exposed, or just rely on the URL.
    });
  };

  // Actually, the easiest way to test autopilot is to append ?bot=true to the URL
  await page.goto('http://localhost:5177/?bot=true');

  while (gamesPlayed < 10) {
    // Check state
    const debugText = await page.locator('#debug-panel').innerText();
    try {
      const state = JSON.parse(debugText);
      if (state.state === 'GAMEOVER') {
        await page.click('#restart-btn');
        // Re-enable bot just in case? No, ?bot=true only works on load. We might need to manually set it.
        await page.evaluate(() => {
          // Send bot event or something. Let's just reload the page for each game instead.
        });
      }
    } catch (e) {
      // JSON parse error
    }
    await page.waitForTimeout(500);
  }
});
