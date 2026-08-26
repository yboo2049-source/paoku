# 特性与任务清单 (Feature List)

> **Harness 规则：** Agent 每次接管代码库时，**必须且只能**选择下方「本轮待办（Plan A）」中**未完成**的一项 (即 `[ ]`) 执行。
> 执行期间不得修改无关代码。执行完毕并通过测试后，请将其标记为 `[x]`。
> 「已完成」与「后续迭代（延后）」两项内的条目**不在本轮选择范围内**。

---

## 已完成 (Completed)

### 视觉重构与地形 (Graphics & Environment / Level PCG)
- [x] ~~添加连续断层路段 (Gap_Jumps) 以及对应的物理坠崖判定~~ (根据用户需求，已彻底移除深渊机制，改为无尽实心铁轨平地)
- [x] 全面 3D 视觉重构：引入 3D 铁轨系统、边墙视差、以及 PBR 光影和阴影投射（引擎已迁移至 **Babylon.js**，`src/render/babylon.ts`）。
- [x] 3D 障碍物区分与物理修正：将 LOW_OBSTACLE 与 HIGH_OBSTACLE 重新建模为视觉差异极大的跨栏和门架，并修复底层坐标判定（解决 HIGH_OBSTACLE 导致平地撞死的问题，见 `src/systems/physics.ts`）。

### 局外系统与任务 (Meta & Systems)
- [x] **任务系统核心逻辑**：`src/systems/mission.ts` 已实现并完整接入——`MissionSystem`（`initMissions` / `resetMissions` / `update` / `trackAction`），`main.ts` 在主循环调 `update`、`START_GAME` 重置、`PLAYER_ACTION` 的 JUMP/ROLL 调 `trackAction`；`dom.ts` 监听 `MISSION_COMPLETED` 弹 Toast（覆盖 AC-PRD-09：单局跳跃/金币统计、结算奖励、玩家升级）。同时 `mission.ts` 已清理一处冗余的 `ctx.totalCoins += reward` 写（dom.ts 每帧会以其为准覆盖，奖励通过 `ctx.coins` 在 GAMEOVER 时持久化入账）。

### 质量守护 (Quality Assurance)
- [x] **核心跳跃/碰撞 Vitest 单元测试**（`tests/unit/physics.test.ts`，14 用例 / 全绿）：覆盖 AABB 重叠/分离、玩家包围盒（含 `isRolling` 高度减半）、跳跃重力、AC-PRD-01 LOW_OBSTACLE（站立/翻滚碰撞 + 跳跃 `y>1.2` 越过）、AC-PRD-02 HIGH_OBSTACLE（站立/跳跃碰撞 + 翻滚通过）、AC-PRD-03 RAMP 平滑爬升、STATIC_TRAIN 顶部 `y=3.0` 重力平面、**无敌保护帧 (`invulnerableTimer>0`) 屏蔽碰撞**、**翻滚计时器自动解除**、**完整跳跃抛物线落地**（`y=0, isJumping=false, vy=0`）；并含 Spawner 模式生成测试。
- [x] **任务系统 Vitest 单元测试**（`tests/unit/mission.test.ts`，8 用例 / 全绿）：`initMissions` 深拷贝独立性、`resetMissions` 归零、COLLECT_COINS 完成与 `ctx.coins` 入账、`trackAction` 驱动 JUMP_TIMES 完成与奖励入账、ROLL_TIMES 计数、已完成任务幂等不重复发放、非 PLAYING 状态 early-return、已完成任务不再被 trackAction 累加。
- [x] **Playwright E2E 回放测试**（`tests/e2e/gameplay.spec.ts`）：通过 `window.__GAME_SENSOR__` 断言状态（`getGameState() === 'PLAYING'`），全流程回放（菜单 → 商店 → 启动 → 切道 → 跳跃 → 暂停）并捕获 6 张高保真截图供视觉回归。⚠️ 测试可靠性备注：当前未对玩家位置做安全防撞，跳跃帧可能撞车进入 GAMEOVER，使后续 Escape 不再触发 PAUSED 屏（状态感知保护，行为正确）—— 视觉验证请关注截图 1-5。

---

## 本轮待办 (Plan A — 当前迭代)

> ✅ **本轮已全部完成并通过 `tsc` + `vitest` + `playwright` 三道门禁（22/22 单测、1/1 E2E、tsc 零错误）。**
> 本节保留为占位以体现规划完成态；无未勾选项。

### 质量守护 (Quality Assurance)
- [x] 核心跳跃/碰撞 Vitest 单元测试（见上）
- [x] 任务系统 Vitest 单元测试（见上）

---

## 后续迭代（本轮延后，不在选择范围）

> 以下条目经 2026-08-19 设计文档（`docs/superpowers/specs/2026-08-19-paoku-superpowers-overhaul-design.md`）明确延后，待后续 `brainstorming` 单独立项。

### 移动端与交互 (Mobile & Controls)
- [ ] 增加移动端手势触控逻辑（支持上下左右滑动控制动作，重构 `input.ts`）
- [ ] 悬浮滑板双击触发（库存机制与 Double-tap 检测激活逻辑）

### 局外系统与任务 (Meta & Systems)
- [ ] `mock-backend` 数据交互防抖优化及实际的积分上传闭环

### 渲染与天气特效 (Graphics & Environment)
- [ ] 增加天气特效粒子发射器（如雨雪效果、拾取金币或护盾破裂的粒子反馈）
- [ ] 引入 `DayNight Cycle`（日夜交替）环境光线平滑过渡
- [ ] 增加滑板或喷气背包状态下的气流拖尾特效
