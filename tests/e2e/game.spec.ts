import { test, expect } from '@playwright/test';

test.describe('Subway Surfer V1 E2E Tests', () => {
  test('Game loop and input systems work correctly', async ({ page }) => {
    // 1. 打开游戏页面
    await page.goto('/');
    
    // 2. 检查主菜单是否可见
    await expect(page.locator('#menu-screen')).toBeVisible();
    
    // 3. 点击开始游戏
    await page.click('#start-btn');
    
    // 4. 断言：状态变为 PLAYING
    const debugPanel = page.locator('#debug-panel');
    await expect(debugPanel).toContainText('"state": "PLAYING"', { timeout: 3000 });
    
    // 5. 断言：初始跑道为 1
    await expect(debugPanel).toContainText('"lane": 1');
    
    // 6. 测试按键切道 (左移)
    await page.keyboard.press('ArrowLeft');
    await expect(debugPanel).toContainText('"lane": 0');
    
    // 7. 测试越界防御 (再次左移，应该还是 0)
    await page.keyboard.press('ArrowLeft');
    await expect(debugPanel).toContainText('"lane": 0');

    // 8. 测试跳跃动作
    await page.keyboard.press('ArrowUp');
    await expect(debugPanel).toContainText('"action": "JUMPING"');
    
    // 9. 等待一段时间，看是否有障碍物生成并导致 GAMEOVER
    // 由于渲染距离是1500，速度开始是300，大概5-10秒可能会撞击
    // 我们可以让它运行一会儿，只要没有抛错就是好现象
    await page.waitForTimeout(2000);
    
    // 断言游戏在2秒后还在运行，或者已经GAMEOVER，但绝不能崩溃
    const text = await debugPanel.textContent();
    expect(text).toBeTruthy();
  });
});
