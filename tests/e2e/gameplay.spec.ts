import { test, expect, type Page } from '@playwright/test';

/**
 * paoku E2E — 确定性回放（Phase 6 打磨 · 第 2 批）
 *
 * 稳定性加固要点：
 * 1. 每个测试通过 `page.addInitScript` 开启 `__QA_MODE__`，解锁传感器写控制面。
 * 2. 启动游戏后用 `freezeSpawner + clearWorld + setPlayerPos + grantInvulnerable`
 *    构造确定性无碰撞环境，彻底消除「跳跃帧撞车 → GAMEOVER → Escape 失效」的偶发失败。
 * 3. 状态断言一律用 `expect.poll` / `waitForFunction`，不再盲用 `waitForTimeout`。
 */

type SensorState = { lane: number; isJumping: boolean; isRolling: boolean };

/** 启动游戏并构造确定性无碰撞环境（冻结生成器 + 清空世界 + 中道定位 + 兜底免死） */
async function startRunDeterministic(page: Page): Promise<void> {
  await page.click('#start-btn');
  await page.waitForFunction(
    () => (window as any).__GAME_SENSOR__.getGameState() === 'PLAYING'
  );
  await page.evaluate(() => {
    const S = (window as any).__GAME_SENSOR__;
    S.freezeSpawner(true);
    S.clearWorld();
    S.setPlayerPos(0, 0, 0);
    S.setGodMode(true);
  });
}

async function getState(page: Page): Promise<string> {
  return page.evaluate(() => (window as any).__GAME_SENSOR__.getGameState());
}

async function getPlayerState(page: Page): Promise<SensorState> {
  return page.evaluate(() => (window as any).__GAME_SENSOR__.getPlayerState());
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__QA_MODE__ = true;
  });
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err));
  await page.goto('/');
  await page.waitForFunction(
    () => typeof (window as any).__GAME_SENSOR__ !== 'undefined'
  );
});

test.describe('状态机（确定性）', () => {
  test('MENU → PLAYING via start button', async ({ page }) => {
    await expect(page.locator('#menu-screen')).toBeVisible();
    await page.click('#start-btn');
    await expect.poll(() => getState(page)).toBe('PLAYING');
  });

  test('PLAYING → 切道（左/右 + 边界钳制）', async ({ page }) => {
    await startRunDeterministic(page);

    await page.keyboard.press('a'); // 中(1) → 左(0)
    await expect.poll(() => getPlayerState(page).then((s) => s.lane)).toBe(0);

    await page.keyboard.press('a'); // 已左，继续左应钳制在 0
    await expect.poll(() => getPlayerState(page).then((s) => s.lane)).toBe(0);

    await page.keyboard.press('d'); // 0 → 1
    await page.keyboard.press('d'); // 1 → 2
    await expect.poll(() => getPlayerState(page).then((s) => s.lane)).toBe(2);

    await page.keyboard.press('d'); // 已右，继续右应钳制在 2
    await expect.poll(() => getPlayerState(page).then((s) => s.lane)).toBe(2);
  });

  test('PLAYING → 跳跃（isJumping=true）', async ({ page }) => {
    await startRunDeterministic(page);
    await page.keyboard.press('w');
    await expect.poll(() => getPlayerState(page).then((s) => s.isJumping)).toBe(true);
  });

  test('PLAYING → 翻滚（isRolling=true）', async ({ page }) => {
    await startRunDeterministic(page);
    await page.keyboard.press('s');
    await expect.poll(() => getPlayerState(page).then((s) => s.isRolling)).toBe(true);
  });

  test('PLAYING → PAUSED via Escape，再 resume 回到 PLAYING', async ({ page }) => {
    await startRunDeterministic(page);

    await page.keyboard.press('Escape');
    await expect.poll(() => getState(page)).toBe('PAUSED');
    await expect(page.locator('#paused-screen')).toBeVisible();

    await page.click('#resume-btn');
    await expect.poll(() => getState(page)).toBe('PLAYING');
  });
});

test.describe('截图回放（确定性）', () => {
  test('捕获 6 张高保真截图（无 GAMEOVER 风险）', async ({ page }) => {
    // 1. 主菜单
    await expect(page.locator('#menu-screen')).toBeVisible();
    await page.screenshot({ path: 'screenshot_1_menu.png', fullPage: true });

    // 2. 商店与皮肤
    await page.click('#open-shop-btn');
    await expect(page.locator('#shop-screen')).toBeVisible();
    await page.screenshot({ path: 'screenshot_2_shop.png', fullPage: true });
    await page.click('#close-shop-btn');
    await expect(page.locator('#menu-screen')).toBeVisible();

    // 启动游戏（确定性环境）
    await startRunDeterministic(page);

    // 3. 奔跑视效（追捕警官、警犬与高压龙门架）
    await page.screenshot({ path: 'screenshot_3_gameplay_chase.png', fullPage: true });

    // 4. 切道镜头侧倾（Bank Tilt）
    await page.keyboard.press('a');
    await expect.poll(() => getPlayerState(page).then((s) => s.lane)).toBe(0);
    await page.screenshot({ path: 'screenshot_4_bank_tilt.png', fullPage: true });

    // 5. 空中跳跃与全景透视
    await page.keyboard.press('w');
    await expect.poll(() => getPlayerState(page).then((s) => s.isJumping)).toBe(true);
    await page.waitForFunction(() => (window as any).__GAME_SENSOR__.getPlayerPos().y > 0.8);
    await page.screenshot({ path: 'screenshot_5_jump_action.png', fullPage: true });

    // 6. 暂停界面（确定性无 GAMEOVER，Escape 必然进入 PAUSED）
    await page.keyboard.press('Escape');
    await expect.poll(() => getState(page)).toBe('PAUSED');
    await expect(page.locator('#paused-screen')).toBeVisible();
    await page.screenshot({ path: 'screenshot_6_paused_screen.png', fullPage: true });
  });
});
