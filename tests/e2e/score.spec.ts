import { test, expect } from '@playwright/test';

test.describe('Score Extraction Test', () => {
  test('Run game without input until GAMEOVER and extract score', async ({ page }) => {
    // 1. 打开页面
    await page.goto('/');
    await expect(page.locator('#menu-screen')).toBeVisible();
    
    // 2. 启用 AI 代打模式
    console.log('AI Player: 开启内置的启发式 AI (Heuristic Autopilot)...');
    await page.click('#autopilot-btn');
    
    // 3. 等待 GAMEOVER 屏幕出现 (设置最大超时 60 秒)
    const gameOverScreen = page.locator('#game-over-screen');
    await expect(gameOverScreen).toBeVisible({ timeout: 60000 });
    
    // 4. 读取最终分数
    const scoreText = await page.locator('#final-score').innerText();
    console.log(`\n\n========================================`);
    console.log(`💥 AI 测试结束 💥`);
    console.log(`在【没有任何人为干预（不躲闪）】的情况下：`);
    console.log(`本次苟活获得的最终分数为: ${scoreText} 分`);
    console.log(`========================================\n\n`);
    
    // 确保分数存在
    expect(Number(scoreText)).toBeGreaterThanOrEqual(0);
  });
});
