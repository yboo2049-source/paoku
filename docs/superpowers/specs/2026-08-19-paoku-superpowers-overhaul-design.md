# 设计文档：paoku 项目 Superpowers 驱动重构 + 质量守护闭环

> **日期**：2026-08-19  
> **作者**：Dispatcher (主 Agent)  
> **方法论**：obra/superpowers (v6.3.0) — 已安装至 `~/.workbuddy/skills/`  
> **分支**：`feat/babylon-engine-upgrade`  
> **路径分类**：Architectural（影响文档体系 + 工程护栏，不涉及玩法架构重设计）  
> **审批门 (HARD-GATE)**：本文档需经用户审阅通过后方可进入 writing-plans / 实现阶段。

---

## 0. 背景与动机

用户要求：

1. 基于 obra/superpowers 重新生成 `AGENTS.md` 及关联的 `docs/` / `specs/` 文档，使其真正由 superpowers 方法论驱动（而非仅口号式引用 Harness Engineering）。
2. 拉取当前分支最新远程代码后做必要的修改。
3. 跑一遍完整的代码生成流程（经确认采用 **方案 A**：单元测试 + 任务系统）。

### 0.1 代码现状盘点（已实测，非推测）

为保证设计文档与代码现实一致，已实现下列实测盘点：

| 维度 | 现状 | 与文档/清单的差异 |
| :--- | :--- | :--- |
| 渲染引擎 | **Babylon.js**（`@babylonjs/core`, `@babylonjs/loaders`），入口 `src/render/babylon.ts` | `AGENTS.md` 仍写 "Three.js" 与 `src/render/three.ts` ❌ |
| 物理/碰撞 | `src/systems/physics.ts`，导出 `getPlayerBoundingBox` / `checkAABBCollision` / `isPlayerOverlappingObstacleZ` / `checkObstacleCollision` / `updatePhysics` | `AGENTS.md` 写 `src/systems/collision.ts` ❌ |
| 任务系统 | `src/systems/mission.ts` **已实现并完整接入**：`MissionSystem`（`initMissions` / `resetMissions` / `update` / `trackAction`）；`main.ts` 初始化并在 `START_GAME` 重置、在 `PLAYER_ACTION` 的 JUMP/ROLL 调 `trackAction`、主循环调 `update`；`dom.ts` 监听 `MISSION_COMPLETED` 弹 Toast | `FEATURE_LIST.md` 仍标记"任务系统核心逻辑"为 `[ ]` 待实现 ❌；实际上是 **已完成（仅缺测试）** |
| 单元测试 | `tests/` 下仅有 2 个 TS 文件（`tests/` 实测），**无 Vitest 物理/任务测试** | `FEATURE_LIST.md` 标记"核心跳跃/碰撞 Vitest 单元测试"为 `[ ]` ✅（确实缺失） |
| 导航文档 | `docs/` 实测存在：`PRODUCT_REQUIREMENT_DOCUMENT.md`、`ARCHITECTURE_DESIGN.md`、`SYSTEM_WORKFLOW_SPEC.md`、`TEST_PLAN_AND_SENSORS.md`、`HARNESS_ENGINEERING_REPORT.md`、`PROGRESS.md`、`FEATURE_LIST.md`、`SESSION_HANDOFF.md`、`superpowers/specs/*` | `AGENTS.md` 导航表引用了**并不存在**的 `V4_PRODUCT_DOCUMENT.md` ❌ |
| 传感器 | `main.ts` 已挂载 `window.__GAME_SENSOR__`（`getGameState` / `getPlayerPos` / `getScore` / `getCoins` / `getActiveObstaclesCount`） | 与既有规范一致 ✅ |

**结论**：本次重构的"重头戏"不是新增玩法逻辑，而是
(a) **文档去伪存真**（对齐 Babylon.js 现实），
(b) **补齐 QA 缺口**（物理/任务的 Vitest 单元测试），
(c) **固化 superpowers 工作流**（把已安装的 14 个 skill 与现有 5 个 Subagent 角色显式映射，并写入 `SUPERPOWERS_WORKFLOW.md`）。

---

## 1. 总体三阶段

| 阶段 | 目标 | 关键交付 |
| :--- | :--- | :--- |
| **Phase 1 — 文档体系重构（superpowers 驱动）** | 让 `AGENTS.md`/`docs` 反映真实代码与方法论 | 重写 `AGENTS.md`、`SUPERPOWERS_WORKFLOW.md`、`specs/` 索引 |
| **Phase 2 — 拉取远程 + 功能盘点** | 同步当前分支最新代码，盘点真实功能状态 | `git pull` 报告、刷新 `FEATURE_LIST.md` |
| **Phase 3 — 代码生成闭环（方案 A）** | 单元测试 + 任务系统验证 + bug 修复，全量验证 | Vitest 物理/任务测试、任务系统清理、`tsc`+`vitest`+`Playwright` 门禁通过 |

### 1.1 方案 A 范围（用户已确认）

- **3A. 核心跳跃/碰撞 Vitest 单元测试**：覆盖 `physics.ts` 纯函数与跳跃/翻滚状态机，对齐 AC-PRD-01 / 02 / 03 与物理常量。
- **3B. 任务系统核心逻辑验证与测试**：`mission.ts` 已存在，本阶段做"接线校验 + 边界修正 + 单测"，对齐 AC-PRD-09。
- **3C. Bug 修复 + 全量门禁**：`tsc` 编译、`vitest` 单测、`Playwright` 截图回归，发现即修（Ralph Cycle）。

> 其余 7 项 pending（`FEATURE_LIST.md` 中移动端手势、悬浮滑板双击、mock-backend 防抖、天气粒子、DayNight、拖尾、`Playwright` E2E）**本轮明确延后**，将写入"后续迭代清单"段落，不进入本轮 DoD。

---

## 2. Phase 1 设计：文档体系重构

### 2.1 重写 `AGENTS.md`

保留既有 Harness Engineering 的"Dispatcher + 5 隔离 Subagent"骨架，做以下修订：

1. **修正引擎与文件路径事实**
   - 全文 "Three.js" → "Babylon.js"；`src/render/three.ts` → `src/render/babylon.ts`；`src/systems/collision.ts` → `src/systems/physics.ts`。
   - 修正 mermaid 图中 `Sub2 -->|交付| three.ts` → `babylon.ts`；`Sub3 -->|交付| collision.ts` → `physics.ts`。

2. **修正导航表（Progressive Disclosure）**
   - 删除指向不存在的 `V4_PRODUCT_DOCUMENT.md` 的行；替换为真实存在的 `PRODUCT_REQUIREMENT_DOCUMENT.md`（PM 视角）。
   - 增加一行 "Superpowers 工作流" → `SUPERPOWERS_WORKFLOW.md`。

3. **新增「Superpowers Skill ↔ Subagent 角色映射」表**
   将已安装的 14 个 obra/superpowers skill 与 5 个 Subagent 及 Dispatcher 职责显式绑定：

   | Superpowers Skill | 绑定角色 / 时机 | 用途 |
   | :--- | :--- | :--- |
   | `using-superpowers` | Dispatcher（每次会话手动触发，WorkBuddy 无 SessionStart hook） | 声明方法论基线 |
   | `brainstorming` | Dispatcher（新功能/重构入口） | 三路径分类 + HARD-GATE 审批 |
   | `writing-plans` | Dispatcher（审批后） | 生成可执行计划 |
   | `writing-skills` | Dispatcher（沉淀可复用流程） | 把 paoku 专属流程固化为 skill |
   | `test-driven-development` | Subagent（3A/3B） | RED-GREEN-REFACTOR 写单测 |
   | `systematic-debugging` | 任意 Subagent（3C） | 先建假设再修 bug |
   | `subagent-driven-development` | Dispatcher | 下发隔离任务 |
   | `dispatching-parallel-agents` | Dispatcher（独立任务并行） | 提速多文件生成 |
   | `executing-plans` | Subagent | 按计划落地 |
   | `verification-before-completion` | 所有 Subagent | 完工前自验 |
   | `requesting-code-review` / `receiving-code-review` | Dispatcher ↔ Subagent | 关键改动互审 |
   | `using-git-worktrees` | Dispatcher（大改动） | 隔离分支 |
   | `finishing-a-development-branch` | Dispatcher（收尾） | 合并/收尾 |

4. **保留 7 条 Mechanical Enforcement**，并追加第 8 条：
   - **8. Superpowers 门禁**：任何"新功能/重构"入口必须先经 `brainstorming`（Architectural 路径须产出本类设计文档并经用户审批），严禁跳过审批直接写码。

### 2.2 新建 `docs/SUPERPOWERS_WORKFLOW.md`

内容纲要：
- 安装说明（14 个 skill 已装，`version: 6.3.0`，`source: obra/superpowers`）。
- WorkBuddy 与 obra/superpowers 的差异适配（无 SessionStart hook → `using-superpowers` 手动触发；视觉伴随能力以 Playwright 截图替代）。
- 标准闭环：`brainstorming` →（审批）→ `writing-plans` → `test-driven-development` / `subagent-driven-development` → `verification-before-completion` → `requesting-code-review` → `finishing-a-development-branch`。
- 与既有 Harness 7 条机械约束的融合点。

### 2.3 新建 `docs/superpowers/specs/README.md`（索引）

列出 specs 目录全部设计文档：
- `2026-08-02-gap-jumps-design.md`（已废弃机制的设计记录，保留备查）
- `2026-08-04-v5-master-spec.md`（V5 主架构）
- `2026-08-19-paoku-superpowers-overhaul-design.md`（本文档）

---

## 3. Phase 2 设计：拉取远程 + 功能盘点

### 3.1 `git pull`（仅当前分支）

- 执行 `git pull --ff-only origin feat/babylon-engine-upgrade`（或普通 `git pull`，用户选择"仅拉取当前分支"）。
- 实测基线（来自会话前置探查）：当前分支与 `origin/feat/babylon-engine-upgrade` 无 ahead/behind 标记，领先本地 `main` 5 个 commit。预计结果为 "Already up to date."；若确有更新则报告差异并重新盘点。
- 前置检查：确认工作区无未提交改动阻塞 pull（`git status --porcelain`）。

### 3.2 功能盘点与 `FEATURE_LIST.md` 刷新

对照 `PRODUCT_REQUIREMENT_DOCUMENT.md` 的 AC-PRD-01~24 与实测代码，更新 `FEATURE_LIST.md`：

- 将"增加任务系统核心逻辑"由 `[ ]` 改为 `[x]`（核心逻辑已实现并接入；本轮补齐测试）。
- 将"编写核心跳跃/碰撞逻辑的 Vitest 单元测试"保留 `[ ]`（Phase 3A 完成后再勾选）。
- 其余 7 项 pending 保持 `[ ]`，并在文末新增「后续迭代清单（本轮延后）」段落，明确列出并标注延后原因。

---

## 4. Phase 3A 设计：核心跳跃/碰撞 Vitest 单元测试

### 4.1 测试目标与 AC 映射

| 测试分组 | 覆盖函数 | 对齐 AC / 常量 |
| :--- | :--- | :--- |
| AABB 基础 | `checkAABBCollision` | 通用包围盒重叠语义 |
| 玩家包围盒 | `getPlayerBoundingBox` | `PLAYER_HEIGHT=1.8`，翻滚时高度减半（`isRolling`） |
| AC-PRD-01 LOW_OBSTACLE | `checkObstacleCollision` | 玩家 `y > 1.2` 越过 → 不碰撞；`y ≤ 1.2` 站立 → 碰撞 |
| AC-PRD-02 HIGH_OBSTACLE | `checkObstacleCollision` | `isRolling` → 不碰撞；站立 → 碰撞 |
| AC-PRD-03 无敌帧 | `checkObstacleCollision` | `invulnerableTimer > 0` → 不碰撞 |
| 跳跃物理 | `updatePhysics`（最小 ctx） | `JUMP_VELOCITY=13.5` 起跳；`GRAVITY=-38.0` 下落；落地回到 `y=0` 且 `isJumping=false` |
| 超级跳鞋 | `updatePhysics` | `SUPER_SNEAKERS` 生效时 `vy = SUPER_JUMP_VELOCITY=20.25` |
| 翻滚计时 | `updatePhysics` | `ROLL_DURATION=0.8`，超时后 `isRolling=false` |

### 4.2 测试文件与结构

- 新建 `tests/physics.test.ts`（Vitest，`describe`/`it`/`expect`）。
- **纯函数测试**（无需 ctx）：直接构造 `PlayerEntity` / `ObstacleEntity` 字面量调用 `checkAABBCollision` / `getPlayerBoundingBox` / `checkObstacleCollision`。注意这些函数会 `import { eventBus }` —— 导入即实例化单例，但纯函数路径不触发 `emit`，无副作用，可直接测。
- **状态机测试**（需最小 `GameContext`）：构造仅含 `player` + 空 `obstacles/coinEntities/powerUpEntities` 的 ctx，调用 `updatePhysics(ctx, dt)` 多帧推进，断言跳跃/翻滚/落地结论。事件 `emit` 会触发已注册监听（若测试环境无 DOM，`main.ts` 未加载，监听不存在，安全）；为稳妥可在测试内 `eventBus.off` 或仅断言 ctx 状态变化，不依赖监听。

### 4.3 执行流程（TDD）

1. 先写 `tests/physics.test.ts` 全部用例（RED）。
2. 运行 `npx vitest run tests/physics.test.ts`（预期失败/部分失败）。
3. 仅在确有 bug 时修正 `physics.ts`（当前实测逻辑正确，预期大部分直接 GREEN；若有边界缺陷则修）。
4. GREEN 后跑 `npx vitest run` 全量确认无回归。

---

## 5. Phase 3B 设计：任务系统验证与测试

### 5.1 现状（已实测）

`MissionSystem` 已完整实现并接入（见 0.1）。本轮不做重写，目标是**校验 + 补测 + 微清理**。

### 5.2 接线校验清单

- [x] `main.ts`：`ctx.missions = missionSystem.initMissions()`；`START_GAME` → `resetMissions`；主循环 → `update(ctx)`。
- [x] `input.ts` + `main.ts`：`PLAYER_ACTION` JUMP/ROLL → `trackAction(ctx.missions, ...)`。
- [x] `dom.ts`：`MISSION_COMPLETED` → `showToast`。

### 5.3 待修正的边界问题（若存在则修）

1. **奖励重复计入持久化**：`update()` 中 `ctx.totalCoins += mission.rewardCoins` 会被 `dom.ts` 每帧 `ctx.totalCoins = this.savedTotalCoins` 覆盖，实际奖励通过 `ctx.coins` 在 GAMEOVER 时结算入账——功能正确但 `totalCoins +=` 为冗余写。建议删除该行，避免误导（不改行为）。
2. **JUMP_TIMES / ROLL_TIMES 完成判定依赖 `trackAction` 先于 `update` 执行**：当前顺序正确（输入事件 → trackAction → 下一帧 update 判定），但 `update` 的 switch 未显式处理这两类，仅靠 `mission.current` 已由 trackAction 自增。建议在 `update` 中对 `JUMP_TIMES`/`ROLL_TIMES` 也显式 `mission.current = Math.max(mission.current, ...)` 或补充注释，提升可读性/健壮性。
3. 单测覆盖（见 5.4）。

### 5.4 测试文件

新建 `tests/mission.test.ts`：
- `initMissions()` 返回 4 个独立 mission（深拷贝，互不影响）。
- `resetMissions()` 将 current/completed 归零。
- `update(ctx)`：当 `ctx.coins >= target` 且 type=COLLECT_COINS → 标记 completed 且 `ctx.coins += reward`。
- `trackAction()`：JUMP → JUMP_TIMES.current++；ROLL → ROLL_TIMES.current++；已完成 mission 不再计数。
- 已完成 mission 不重复发放奖励（幂等）。
- `ctx.state !== 'PLAYING'` 时 `update` 直接返回（不结算）。

---

## 6. Phase 3C 设计：Bug 修复 + 全量门禁

1. `npx tsc --noEmit`（或 `npm run build` 的 tsc 阶段）—— 编译零错误。
2. `npx vitest run` —— 所有单测（含 3A/3B）通过。
3. `npx playwright test` —— 运行既有 E2E；通过 `window.__GAME_SENSOR__` 抓真实页面截图，自审无明显异常（人物取景、UI 溢出/遮挡）。
4. 任一环节失败 → 启动 Ralph Cycle 自主修复，直到全绿，再进入下一步。

---

## 7. 风险

| 风险 | 影响 | 缓解 |
| :--- | :--- | :--- |
| `git pull` 引入远端新改动，与本地假设冲突 | Phase 3 测试基线漂移 | 3.1 先 pull 并重新盘点；冲突时优先对齐远端 |
| `physics.ts` 纯函数嵌套 `eventBus` 单例，测试环境影响 | 测试噪声 | 纯函数路径不触发 emit；状态机测试仅断言 ctx 状态 |
| 任务系统奖励逻辑误改导致金币重复/丢失 | 经济系统 bug | 5.3 仅删冗余写、补注释，不改动结算路径；用 5.4 单测守护 |
| WorkBuddy 无 SessionStart hook | `using-superpowers` 无法自动注入 | 已在 `SUPERPOWERS_WORKFLOW.md` 明确"手动触发"适配 |
| 文档大改后导航失效 | 子 Agent 找不到规范 | 2.1/2.2 严格对齐实测 `docs/` 文件名 |

---

## 8. 完成定义 (Definition of Done)

- [ ] `AGENTS.md` 已重写：引擎/路径事实正确、导航表指向真实文档、含 Superpowers↔Subagent 映射表、含第 8 条方法论门禁。
- [ ] `docs/SUPERPOWERS_WORKFLOW.md` 已创建并说明 WorkBuddy 适配差异。
- [ ] `docs/superpowers/specs/README.md` 索引已创建。
- [ ] `git pull` 已执行并产出真实状态报告（无未提交阻塞）。
- [ ] `FEATURE_LIST.md` 已刷新：任务系统标记已完成、单测仍为 pending、含后续迭代清单。
- [ ] `tests/physics.test.ts` 通过，映射到 AC-PRD-01/02/03 与物理常量。
- [ ] `tests/mission.test.ts` 通过，映射 AC-PRD-09。
- [ ] `tsc` / `vitest` / `Playwright` 三步全绿，截图自审无异常。
- [ ] 本次工作写入 `PROGRESS.md` 与当日 memory 日志。

---

## 9. 后续迭代清单（本轮明确延后）

以下仍为 pending，不进入本轮 DoD，待后续 brainstorming 单独立项：

1. 移动端手势触控逻辑（上下左右滑动，`input.ts` 重构）。
2. 悬浮滑板双击触发（库存机制 + Double-tap 检测）。
3. `mock-backend` 数据交互防抖优化与积分上传闭环。
4. 天气特效粒子发射器（雨雪、拾取/护盾破裂反馈）。
5. `DayNight Cycle` 日夜交替光线过渡。
6. 滑板/喷气背包气流拖尾特效。
7. `Playwright` E2E 回放测试补全。

---

## 附录 A：实测文件清单（本次涉及）

- 重写：`AGENTS.md`、`docs/FEATURE_LIST.md`
- 新建：`docs/SUPERPOWERS_WORKFLOW.md`、`docs/superpowers/specs/README.md`、`tests/physics.test.ts`、`tests/mission.test.ts`
- 可能微调：`src/systems/mission.ts`（仅 5.3 的微清理）
- 只读参考（已读）：`src/systems/physics.ts`、`src/systems/mission.ts`、`src/core/eventBus.ts`、`src/types/index.ts`、`src/main.ts`、`src/systems/input.ts`、`src/ui/dom.ts`、`docs/PROGRESS.md`
</content>
</invoke>
