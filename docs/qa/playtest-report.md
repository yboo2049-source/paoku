# Playtest 报告 — paoku（Phase 6 打磨阶段）

> **QA 负责人**：严守真（quality-lead）
> **项目**：/Users/smzdm/ai/paoku
> **测试类型**：灰盒（Gray-box）桌面 Playtest —— 基于源码静态走查 + 单元测试证据 + 既有 6 张 E2E 截图 + 传感器接口数据，非真人实机试玩。
> **质量基线（本轮复核）**：`tsc --noEmit` 0 错误 ✅；`vitest run` 22/22 全绿 ✅；Playwright E2E 基线 1/1（本环境因 WorkBuddy 安全删除护栏拦截 Vite dep 缓存清理，dev server 未能拉起，未能复跑，见「测试环境」节）。
> **结论速览**：核心循环「跑-躲-吃」完整闭环、判定公式与 PRD 逐条一致；主要风险集中在 **E2E 稳定性**、**道具/音频验收缺口** 与 **难度曲线缺乏渐进设计**。质量门判定：**PASS（附 CONCERNS）** —— 不阻塞发布，但发布签字前需人工复核下列 4 项风险。

---

## 0. 方法论与证据来源

| 证据 | 来源 |
|---|---|
| 物理/判定公式 | `src/systems/physics.ts`、`src/types/index.ts`（CONSTANTS） |
| 生成器与障碍布局 | `src/systems/spawner.ts` |
| 输入/状态机 | `src/systems/input.ts`、`src/core/gameLoop.ts`、`src/main.ts` |
| UI/暂停/结算 | `src/ui/dom.ts` |
| 单元测试证据 | `tests/unit/physics.test.ts`（14）、`tests/unit/mission.test.ts`（8） |
| 视觉证据 | 根目录 `screenshot_1_menu.png` ~ `screenshot_6_paused_screen.png` |

> 说明：本报告为「可自动化结论 + 需人工确认项」双轨输出。凡标注【需人工】的条目，灰盒分析无法替代真人手感，最终手感签收需一次 15 分钟真人试玩。

---

## 1. 测试环境（Test Environment）

| 项 | 值 |
|---|---|
| 引擎 | Babylon.js @9.19.0（@babylonjs/core/loaders/gui） |
| 构建 | Vite 8 + TypeScript 6（tsc 零错误） |
| 单测 | Vitest 4，22/22 全绿 |
| E2E | Playwright @1.62.1，1/1（基线） |
| 传感器 | `window.__GAME_SENSOR__`（只读 5 个 getter） |

**环境阻塞记录**：本环境复跑 Playwright 时，dev server 启动失败——Vite 尝试清理 `node_modules/.vite/deps`（568 个文件）触发 WorkBuddy 安全删除护栏 `SAFE_DELETE_BULK_CONFIRM_REQUIRED`（阈值 50）。此为**环境护栏问题，非游戏/测试缺陷**；真实 CI 无此护栏时可正常拉起。复核建议：在 CI 或已预热 `node_modules/.vite/deps` 的环境复跑一次 E2E 作为发布门禁。

---

## 2. 核心循环手感（Round 1 — Core Loop Feel）

### 2.1 循环完整性 ✅
`MENU → PLAYING（跑/切道/跳/滚）→ 撞车 GAMEOVER → 结算持久化 → RESTART` 闭环完整：
- 启动：`START_GAME` 事件重置 score/coins/speed/player 位置/障碍/任务（`main.ts:51-75`），无状态残留。
- 跑动：`ctx.player.z += ctx.speed * dt`，速度 `V(t)=min(18+0.25t, 45)`，108 秒达到上限。
- 输入：`A/D/←/→` 切道（3 车道、边界钳制 `Math.max(0, Math.min(2,...))`）、`W/↑/空格` 跳跃、`S/↓` 翻滚，触摸滑动手势已实现（`input.ts`）。
- 结算：GAMEOVER 时 `dom.ts` 一次性写 localStorage（highScore / totalCoins），有 `processedGameOver` 幂等保护，**不会重复入账** ✅。

### 2.2 手感指标（灰盒推算）
| 指标 | 数值 | 评估 |
|---|---|---|
| 切道响应 | 插值系数 `dt*15`，约 0.15s 收敛 | 顺畅，无瞬移感 ✅ |
| 跳跃滞空 | 初速 13.5 / 重力 -38，全程约 0.71s，最高点约 2.4m | 手感标准 ✅ |
| 空中翻滚 | 跳中按 `S` → `vy = -JUMP_VELOCITY*1.5` 急坠 | 快速落地，符合跑酷直觉 ✅ |
| 得分节奏 | `score += speed*dt*0.1`，18~45 速度对应 ~1.8~4.5 分/秒 | 平滑 ✅ |

### 2.3 发现问题
- **【低】跳跃帧无「土狼时间/输入缓冲（Coyote Time / Input Buffering）」**：`jump()` 仅在 `!player.isJumping` 时生效（`input.ts:75`），落地瞬间连按跳若仍在 `isJumping` 判定窗口内会被吞掉。对竞品跑酷而言这是手感细节，非阻塞，但可列入后续手感打磨项。
- **【低】切道为「即时生效 + 插值视觉」**：`moveLane` 立刻改 `lane`/`targetX`，物理插值随后追赶。极端快速连按 `A/D` 时 `lane` 跳变、视觉 X 插值追不上，可能出现一帧「视觉还在左道、判定已在右道」的短暂错位——实际因插值 `dt*15` 收敛快，感知轻微。建议后续加「切道冷却」或锁死输入节流。

---

## 3. 碰撞宽容度与判定公平性（Round 2 — Collision Tolerance & Fairness）

### 3.1 判定公式与 PRD 一致性 ✅
| AC | 判定 | 实现 | 一致性 |
|---|---|---|---|
| AC-PRD-01 | LOW 需跳 `y>1.2` | `player.y>1.2 → 免撞` | ✅（且站立/翻滚必撞，有测试） |
| AC-PRD-02 | HIGH 需翻滚 | `isRolling → 免撞` | ✅（站立/跳跃必撞，有测试） |
| AC-PRD-03 | RAMP→y=3.0 车顶 | 地面平面按 progress 插值 | ✅（有测试） |

### 3.2 宽容度（Forgiveness）量化
- **横向宽容度大**：玩家碰撞盒宽 0.8 vs 车道宽 3.0，障碍宽 2.2~2.4 → 玩家在车道内即使偏离中心，仍有约 1.1~1.2 单位的横向安全余量。对玩家友好，无「贴边即死」误判 ✅。
- **纵向（跳跃）窗口宽**：LOW 障碍高度仅 1.0，却要求 `y>1.2`（多 0.2 冗余）；跳跃滞空期间 `y>1.2` 持续约 **0.5s**（解 `13.5t-19t²=1.2` 得 t≈0.10~0.61s），而障碍深度仅 0.5，即便满速 45 也只需 0.011s 穿越 → **跳跃时机窗口极为慷慨，几乎不会「看着跳过去却撞死」** ✅。
- **翻滚判定偏「宽松」**：HIGH 障碍 `isRolling===true` 即免撞，不校验 `player.y`。意味着「跳在空中同时翻滚」也能躲过 HIGH（`input.ts:87` 跳中翻滚保留 `isRolling`，且急坠）。行为略超 PRD 语义（PRD 未定义空中翻滚对 HIGH 的判定），但对玩家有利，暂不视为缺陷，建议记录为「已知宽松判定」。

### 3.3 问题
- **【中】翻滚对 HIGH 的免撞不看高度**：若玩家在车顶（y=3.0）翻滚，理论上 HIGH 障碍（bottom y=1.2, top y=3.0）AABB 在 Y 轴已不重叠，本就不该撞；但反过来「站在地面翻滚」也通过——而翻滚盒高 0.9 < HIGH bottom 1.2，物理上确实从下方通过，**判定自洽**。结论：无需改，仅补充一条「空中翻滚对 HIGH 免撞」的语义测试以固化契约。
- **【中】MOVING_TRAIN 迎面驶来无「警告距离」**：`spawnMovingRush` 在 `z=spawnZ+10/+30` 生成迎面列车（`speedZ=-10/-12`），中车道为安全道。玩家若在左/右道且刚切道，从出现到碰撞的视觉预警时间短，可能「突然撞上」。属难度设计问题，见 Round 3。

---

## 4. 难度曲线（Round 3 — Difficulty Curve）

### 4.1 现状
- 速度曲线：`V(t)=min(18+0.25t,45)`，108s 到顶 → **唯一的时间维度难度上升项**。
- 障碍生成：`spawnPattern` 每 40 单位从 4 个模式（ZigZag_Trains / Under_Over / Moving_Rush / Coin_Frenzy）**均匀随机**选取，**无速度/距离/分数加权的难度爬坡**（`spawner.ts:52-53`）。

### 4.2 评估
| 阶段 | 速度 | 障碍 | 主观难度 |
|---|---|---|---|
| 0~30s | 18~25 | 均匀随机 | 简单（跳跃窗口极宽） |
| 30~70s | 25~35 | 均匀随机 | 中 |
| 70~108s+ | 35~45 | 均匀随机 | 靠速度硬拉，模式未变难 |

- **【中】难度主要靠「速度」硬拉，模式密度/复杂度未随进度提升**。满速 45 时 40 单位间距 → 相邻模式生成点间隔仅 0.89s，而 ZigZag_Trains 单模式跨度约 27 单位（RAMP z → 右道 RAMP z+20），在高密度下「移动火车 + 静态火车」叠加时，3 车道里安全道可能只剩 1 条，容错骤降，可能让玩家感觉「从简单突然跳到不公平」。
- **【中】无「难度平滑」**：模式随机性带来「连续 3 个 Coin_Frenzy（几乎无威胁）→ 突然 Moving_Rush」的体感波动。建议：`spawnPattern` 增加基于 `player.z` 或 `ctx.speed` 的**模式权重表 + 连续同模式冷却**，使难度单调递增。

### 4.3 建议（后续迭代，非本轮）
1. 模式选择从「均匀随机」改为「按速度/距离分档权重」。
2. `Moving_Rush` 生成前加「迎面警告」（鸣笛音 + 远距离可视，已具备实体，仅需拉远生成距离或加预警 UI）。
3. 引入 `Coin_Frenzy` 作为「喘息段」显式穿插，而非随机命中。

---

## 5. 卡死 / 崩溃 / 软锁场景（Round 4 — Stuck / Crash / Softlock）

### 5.1 已排查场景（灰盒结论）
| 场景 | 结果 | 依据 |
|---|---|---|
| 越界切道（lane 0 继续左 / lane 2 继续右） | 安全，钳制 | `input.ts:66` |
| 跳跃落地后状态残留 | 安全，归零 | `physics.test.ts`「完整跳跃抛物线落地」✅ |
| 翻滚计时耗尽 | 安全，自动解除 | `physics.ts:187-193` + 测试 ✅ |
| GAMEOVER 重复结算 | 安全，幂等 | `dom.ts:446` `processedGameOver` ✅ |
| PAUSED 下继续跑动 | 安全，主循环仅 PLAYING 更新 | `main.ts:126` |
| 悬浮滑板免死抵扣 | 安全，1.2s 无敌帧 + 单次抵扣 | `physics.ts:242-253` |

### 5.2 风险项
- **【高】E2E 判定软锁隐患（已确认，本报告重点）**：`__GAME_SENSOR__` 只有只读 getter，测试无法确定性定位玩家。E2E 里 `press('a')→press('w')` 后若跳跃帧撞车 → `GAMEOVER` → 后续 `Escape` 因 `dom.ts:160-169` 的状态感知保护（仅 PLAYING/PAUSED 才 `TOGGLE_PAUSE`）**不再触发 PAUSED** → `screenshot_6` 拍到的是 GAMEOVER 而非 PAUSED，测试断言/截图回归失效。**修复方案见 `docs/qa/e2e-hardening-plan.md`**。
- **【中】Pause 状态源为「上一帧快照」**：Escape 处理用 `this.lastState`（`dom.ts:162`），而 `lastState` 在 `update()` 末尾赋值。极端情况下（如状态刚好在帧间从 PLAYING 切到 GAMEOVER）存在一帧的判定滞后。当前风险极低，但建议 Escape 分支直接读 `ctx.state` 以消除快照滞后（需把 `ctx` 传入或由 main.ts 统一转发，属小重构）。
- **【低】localStorage 依赖**：存档读写在 `loadPersistence`/`savePersistence` 中 try/catch 包裹，损坏数据（如 `unlocked_skins` JSON 解析失败）会 `console.warn` 降级，不崩。但 `JSON.parse(unlocked)` 异常时 `unlockedSkinIds` 保持默认 `['cyan']`，可能让已购皮肤「静默消失」——**建议加「解析失败重置为该默认值并回写」**。
- **【低】`getActiveObstaclesCount` 语义**：返回 `ctx.obstacles.length`，但生成器每帧清理玩家身后 15 单位外的物体，故该值为「玩家前方 + 近身活跃障碍」，非全场总数。传感器语义与 E2E 断言需对齐（见加固方案）。

---

## 6. 汇总：质量门判定与待办

### 6.1 判定
**PASS（附 CONCERNS）**。核心循环、判定公式、任务结算、状态机均有单测或灰盒证据背书，无 Blocker/Critical 缺陷。

### 6.2 待人工确认项（发布签字前）
1. 【高】E2E 稳定性：按 `e2e-hardening-plan.md` 补齐安全定位，否则 E2E 存在偶发误判。
2. 【中】道具四件套（MAGNET/SUPER_SNEAKERS/DOUBLE_SCORE/HOVERBOARD）与音频引擎**零自动化覆盖**，需补单测或明确降级为「视觉/人工签收」。
3. 【中】难度曲线：无渐进设计，建议单独立项（后续迭代）。
4. 【低】真人手感：15 分钟试玩确认切道/跳跃/翻滚手感、满速段难度公平性。

### 6.3 建议下一步
- 工程侧（程基岩）：实现 `__GAME_SENSOR__` 写控制面 + 补 AC-04~07 单测（见加固方案 §2）。
- 视觉侧（美术/程）：对 AC-14/20/21/22 补定向截图用于视觉回归。
- 主理人：裁定上述缺口为「补测」还是「延后签收」，并安排一次真人 Playtest。
