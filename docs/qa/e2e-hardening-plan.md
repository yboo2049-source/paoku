# E2E 稳定性加固方案 + PRD 验收标准自动化覆盖缺口清单

> **QA 负责人**：严守真（quality-lead）
> **项目**：/Users/smzdm/ai/paoku
> **对象**：`tests/e2e/gameplay.spec.ts`、`src/main.ts`（传感器）、PRD 24 条验收标准（AC-PRD-01~24）
> **本轮性质**：研究与方案产出，**不改游戏源码**；代码片段为给工程侧（程基岩）的实施建议，改动留待评审后执行。

---

## 1. 问题根因（已确认）

`tests/e2e/gameplay.spec.ts` 当前是**单一巨型用例**，通过固定 `waitForTimeout` + 键盘按键驱动，且 `window.__GAME_SENSOR__` 仅暴露 **5 个只读 getter**（`main.ts:159-165`）：

```typescript
(window as any).__GAME_SENSOR__ = {
  getGameState, getPlayerPos, getScore, getCoins, getActiveObstaclesCount,
};
```

由此产生两处脆弱性：

1. **无确定性定位（隐患 #1）**：测试无法把玩家放到无碰撞坐标。`press('a')` 切入左道后，左道在 `z=30` 处有 `RAMP`、`z=39` 处有 `STATIC_TRAIN`（`spawner.ts` ZigZag_Trains 首个模式）；`press('w')` 跳跃帧若与障碍 Z 区间重叠 → `checkObstacleCollision` 命中 → `GAMEOVER`。
2. **状态感知保护使失败被放大**：`dom.ts:160-169` 的 Escape 仅当 `lastState ∈ {PLAYING, PAUSED}` 才 `TOGGLE_PAUSE`。进入 `GAMEOVER` 后 `Escape` 为 no-op（行为**正确**），导致 `screenshot_6` 拍到 GAMEOVER 而非 PAUSED，断言/截图回归失效——**这是测试设计问题，不是游戏缺陷**。

> 结论：游戏行为符合设计；需修复的是「测试缺少确定性控制面」与「单一用例缺少状态断言」。

---

## 2. 加固方案 A（推荐）：扩展 `__GAME_SENSOR__` 写控制面

在 `src/main.ts` 扩展传感器，新增**测试专用写接口**，并建议用 `window.__QA_MODE__` 门控，避免污染生产暴露面。

### 2.1 传感器扩展（建议实现，供程基岩评审）

```typescript
// src/main.ts —— 扩展 __GAME_SENSOR__（建议）
type SensorControls = {
  // 只读（既有）
  getGameState(): GameState;
  getPlayerPos(): { x: number; y: number; z: number };
  getScore(): number;
  getCoins(): number;
  getSpeed(): number;
  getPlayerState(): { lane: number; isJumping: boolean; isRolling: boolean };
  getActiveObstaclesCount(): number;
  getMissions(): Array<{ type: string; current: number; target: number; completed: boolean }>;

  // 新增：确定性控制面（仅测试使用）
  setPlayerPos(x: number, y: number, z: number): void;   // 硬定位（同步 targetX=x，跳过插值）
  setPlayerLane(lane: number): void;                     // 硬切道（x=LANE_X[lane]）
  clearWorld(): void;                                     // 清空 obstacles/coins/powerUps
  grantInvulnerable(sec: number): void;                   // 兜底免死帧
  freezeSpawner(frozen: boolean): void;                   // 暂停/恢复生成器更新
};

(window as any).__GAME_SENSOR__ = {
  getGameState: () => ctx.state,
  getPlayerPos: () => ({ x: ctx.player.x, y: ctx.player.y, z: ctx.player.z }),
  getScore: () => ctx.score,
  getCoins: () => ctx.coins,
  getSpeed: () => ctx.speed,
  getPlayerState: () => ({
    lane: ctx.player.lane,
    isJumping: ctx.player.isJumping,
    isRolling: ctx.player.isRolling,
  }),
  getActiveObstaclesCount: () => ctx.obstacles.length,
  getMissions: () =>
    ctx.missions.map((m) => ({ type: m.type, current: m.current, target: m.target, completed: m.completed })),

  // —— 控制面 ——
  setPlayerPos: (x, y, z) => {
    ctx.player.x = x; ctx.player.targetX = x;
    ctx.player.y = y; ctx.player.z = z;
    ctx.player.vy = 0; ctx.player.isJumping = false; ctx.player.isRolling = false;
  },
  setPlayerLane: (lane) => {
    const l = Math.max(0, Math.min(2, lane));
    ctx.player.lane = l;
    ctx.player.targetX = CONSTANTS.LANE_X[l];
    ctx.player.x = CONSTANTS.LANE_X[l];
  },
  clearWorld: () => {
    ctx.obstacles.length = 0;
    ctx.coinEntities.length = 0;
    ctx.powerUpEntities.length = 0;
  },
  grantInvulnerable: (sec) => { ctx.player.invulnerableTimer = sec; },
  freezeSpawner: (frozen) => { /* 在 main.ts 用一个模块级 flag，update() 中 `if (!spawnerFrozen) spawnerSystem.update(...)` */ },
} as SensorControls;
```

> **实施要点**：`freezeSpawner` 需在 `main.ts` 的 `update()` 内加一个模块级布尔 `let spawnerFrozen = false;`，并在调 `spawnerSystem.update(...)` 前短路。其余 setter 直接操作 `ctx`（与 `START_GAME` 事件同源），无需改动游戏逻辑。

### 2.2 E2E 用例改造（建议实现）

**原则**：拆分为多个独立 `test()`，用 `beforeEach` 建立干净状态；用 `page.evaluate` + 传感器断言，替代 `waitForTimeout` 盲等；用 `expect.poll` 替代固定延时。

```typescript
import { test, expect } from '@playwright/test';

// 稳定等待某个传感器条件成立（替代 waitForTimeout）
const waitFor = async (page: import('@playwright/test').Page, fn: string) =>
  page.waitForFunction(`() => (${fn})`, { timeout: 10000 });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof (window as any).__GAME_SENSOR__ !== 'undefined');
});

test('MENU → PLAYING 状态机 + 安全定位防撞', async ({ page }) => {
  await page.click('#start-btn');

  // 断言进入 PLAYING
  await waitFor(page, `(window as any).__GAME_SENSOR__.getGameState() === 'PLAYING'`);

  // 【关键】确定性安全定位：清空世界 + 冻结生成器 + 兜底免死
  await page.evaluate(() => {
    const S = (window as any).__GAME_SENSOR__;
    S.freezeSpawner(true);
    S.clearWorld();
    S.setPlayerPos(0, 0, 0);      // 中间道、地面
    S.grantInvulnerable(999);     // 即使有漏网障碍也不致死
  });

  // 切道 + 跳跃（现在不会撞车）
  await page.keyboard.press('a');
  await page.keyboard.press('w');

  // 用传感器断言动作已生效，而非猜时间
  await expect
    .poll(() => page.evaluate(() => (window as any).__GAME_SENSOR__.getPlayerState().lane))
    .toBe(0);
  await expect
    .poll(() => page.evaluate(() => (window as any).__GAME_SENSOR__.getPlayerState().isJumping))
    .toBe(true);

  // 截图（安全状态下）
  await page.screenshot({ path: 'screenshot_5_jump_action.png', fullPage: true });
});

test('PLAYING → PAUSED 状态机（Escape）', async ({ page }) => {
  await page.click('#start-btn');
  await waitFor(page, `(window as any).__GAME_SENSOR__.getGameState() === 'PLAYING'`);

  // 冻结生成器，避免测试期间撞车导致状态漂移
  await page.evaluate(() => {
    const S = (window as any).__GAME_SENSOR__;
    S.freezeSpawner(true); S.clearWorld(); S.setPlayerPos(0, 0, 0);
  });

  await page.keyboard.press('Escape');
  await waitFor(page, `(window as any).__GAME_SENSOR__.getGameState() === 'PAUSED'`);

  // 断言 PAUSED 屏可见（而非仅靠截图）
  await expect(page.locator('#paused-screen')).toBeVisible();

  await page.screenshot({ path: 'screenshot_6_paused_screen.png', fullPage: true });
});
```

> 其余截图（1 menu / 2 shop / 3 chase / 4 bank_tilt）沿用现有逻辑即可，但每个都应加「进入目标状态」的传感器断言，并把「截图」与「状态断言」解耦。

---

## 3. 加固方案 B（备选）：Mock Spawner

若团队倾向**不改游戏源码**，可用 Playwright 的 `page.addInitScript` 在应用加载前注入一个「确定性命中 Coin_Frenzy」或「空生成」的替身：

```typescript
// 备选：注入脚本，在 spawnPattern 前强制返回空（不推荐，侵入 render 生命周期）
await page.addInitScript(() => {
  // 仅示意：劫持 Math.random 使 spawner 恒选 Coin_Frenzy（无致死障碍）
  const realRandom = Math.random;
  Math.random = () => 0.999; // 命中 Coin_Frenzy 分支（patterns[3]）
  (window as any).__realRandom = realRandom;
});
```

**对比结论**：方案 B 依赖「随机数劫持」这类脆弱 hack，且无法覆盖「切道撞车/护盾免死」等需要精确坐标的场景；**推荐方案 A**（传感器写控制面），方案 B 仅作无源码改动权的临时降级。

---

## 4. 覆盖缺口清单（PRD 24 条验收标准）

> 图例：✅ 已自动化覆盖 · 🟡 部分覆盖/需补强 · ❌ 无自动化 · 👁 仅视觉（需截图/人工签收）

| AC | 内容 | 可自动化性 | 当前覆盖 | 判定 | 补测建议 |
|---|---|---|---|---|---|
| AC-PRD-01 | LOW 障碍跳跃 `y>1.2` | 单测 | physics.test.ts | ✅ | — |
| AC-PRD-02 | HIGH 障碍翻滚 | 单测 | physics.test.ts | ✅ | — |
| AC-PRD-03 | RAMP/车顶 `y=3.0` | 单测 | physics.test.ts | ✅ | — |
| AC-PRD-04 | MAGNET 磁铁吸附（半径 15、速度 25） | 单测 | 无 | ❌ | 单测：构造金币在 15 内 → 断言金币向玩家位移；15 外不动 |
| AC-PRD-05 | SUPER_SNEAKERS 跳速 1.5×（20.25） | 单测 | 无 | ❌ | 单测：激活后 `vy` 应为 `SUPER_JUMP_VELOCITY` |
| AC-PRD-06 | DOUBLE_SCORE 得分 2× | 单测 | 无 | ❌ | 单测：注入 activePowerUps 后分数增量翻倍（当前逻辑在 main.ts，需抽成纯函数） |
| AC-PRD-07 | HOVERBOARD 免死护盾 | 单测 | 无（仅 invulnerableTimer 测试，非护盾抵扣） | ❌ | 单测：碰撞 → hoverboardActive 置 false + 1.2s 无敌 + 不 GAMEOVER |
| AC-PRD-08 | Web Audio 音效/BGM/静音 | 可 mock | 无 | ❌ | 单测（mock AudioContext）：各事件触发对应 play 调用；静音/音量 |
| AC-PRD-09 | 任务监控与奖励 | 单测 | mission.test.ts | 🟡 | 补 `SCORE_REACH` 用例（现只测 COLLECT_COINS/JUMP_TIMES/ROLL_TIMES） |
| AC-PRD-10 | 赛博背景/天空盒/FOV | 视觉 | 截图 3/5 | 👁 | 截图回归基线 |
| AC-PRD-11 | 3D 骨骼角色 | 视觉 | 截图 1/3/5 | 👁 | 截图回归基线 |
| AC-PRD-12 | 3D 组件精细化（火车/斜坡/栅栏/金币） | 视觉 | 截图 3/4/5 | 👁 | 截图回归基线 |
| AC-PRD-13 | 轨旁环境元素 | 视觉 | 截图 3 | 👁 | 截图回归基线 |
| AC-PRD-14 | 镜头切道侧倾 15°/震屏 | 视觉+可测 | 截图 4，无断言 | 🟡 | 补「切道后 FOV/roll 值」传感器断言或截图对比 |
| AC-PRD-15 | 速度风阻粒子 | 视觉 | 截图 5 | 👁 | 截图回归基线 |
| AC-PRD-16 | 果冻挤压拉伸 | 视觉 | 截图 5 | 👁 | 截图回归基线 |
| AC-PRD-17 | 警官警犬追赶 | 视觉 | 截图 3 | 👁 | 截图回归基线 |
| AC-PRD-18 | Bloom/Glow/FXAA 后处理 | 视觉 | 截图全 | 👁 | 截图回归基线 |
| AC-PRD-19 | 主菜单 3D 环绕镜头 | 视觉 | 截图 1 | 👁 | 截图回归基线 |
| AC-PRD-20 | 金币飞入 UI 轨迹 | 视觉 | 无 | ❌👁 | 定向截图（吃金币瞬间） |
| AC-PRD-21 | 隧道入口/火花 | 视觉 | 无 | ❌👁 | 定向截图（穿越 250m 拱门） |
| AC-PRD-22 | 喷气飞行/滑板碎片 | 视觉 | 无 | ❌👁 | 定向截图（Jetpack y=8.0 / 滑板破裂） |
| AC-PRD-23 | 弯曲世界 shader | 视觉 | 截图 3/5 | 👁 | 截图回归基线 |
| AC-PRD-24 | 骨骼动画状态机（Idle/Run/Jump/Roll/Stumble） | 视觉 | 截图 1/3/5 | 👁 | 各动作定向截图 |

### 4.1 缺口统计
- **可自动化且当前为 ❌（需优先补单测）**：AC-PRD-04、05、06、07、08 —— 共 5 条，集中在**道具系统 + 音频引擎**，均为「核心玩法已实现但零自动化守护」的高价值缺口。
- **可自动化但部分缺失（🟡）**：AC-PRD-09（SCORE_REACH 子用例）、AC-PRD-14（镜头数值断言）。
- **纯视觉（👁，需截图回归基线 + 人工签收）**：AC-PRD-10~13、15~19、23、24 —— 共 12 条，多数已由现有 6 截图部分覆盖，缺 AC-20/21/22 三张定向截图。
- **已完整自动化（✅）**：AC-PRD-01、02、03 —— 共 3 条（物理核心）。

> **总评**：24 条中「逻辑可自动化」部分仅覆盖 3/9（01/02/03/09 命中 4 条，04~08 缺 5 条）。建议把 AC-04~08 纳入本轮/下轮补测，将可自动化逻辑覆盖率从 ~44% 提到 ~100%。

---

## 5. 传感器接口缺口（补充）

现有传感器对「可自动化断言」支撑不足，建议一并补齐：

| 缺失接口 | 用途 |
|---|---|
| `getSpeed()` | 断言加速曲线 `V(t)` |
| `getPlayerState()` | 断言 lane/isJumping/isRolling（替代猜时间） |
| `getMissions()` | 断言任务进度（E2E 级验证 AC-09） |
| `setPlayerPos/setPlayerLane` | 确定性定位（本方案核心） |
| `clearWorld/freezeSpawner/grantInvulnerable` | 构造无碰撞/免死环境 |
| `getActiveObstaclesCount` 语义对齐 | 文档明确「活跃=玩家前方+近身」，避免断言歧义 |

---

## 6. 落地建议（分工）

| 动作 | 归属 | 依赖 |
|---|---|---|
| 实现 `__GAME_SENSOR__` 写控制面（§2.1） | 工程侧（程基岩） | 本方案评审通过 |
| 重构 `gameplay.spec.ts` 为多用例 + 断言驱动（§2.2） | QA（严守真）/工程 | 控制面就绪 |
| 补 AC-04~08 单测 + AC-09 SCORE_REACH | 工程/QA | TDD 闭环 |
| 补 AC-20/21/22 定向截图 | 美术/QA | 对应视觉特性可稳定触发 |

> 最终质量门建议：`tsc 零错误` + `vitest 全绿（含新增道具/音频用例）` + `playwright 全绿（多用例、断言驱动、无 waitForTimeout 盲等）` 三项全过，方可发布签字。
