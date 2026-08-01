# PROGRESS.md — 开发进度与反馈追踪

本项目基于 Harness Engineering 范式，通过此文件追踪开发迭代（Iterative Progress）、失败教训（Lessons Learned）以及架构重构的演进。

---

## 📅 [2026-08-01] Harness 架构重构

### 🎯 目标 (Objective)
将现有零散的 Markdown 文档进行体系化收纳，使项目具备完整的 Harness 范式脚手架，以支持后续多 Agent 并行开发跑酷核心玩法。

### 🚧 进度 (Status)
- [x] 创建 `docs/` 目录并迁移现有的架构设计、测试计划与历代 PRD 文档。
- [x] 建立 `AGENTS.md`，定义 5 个职责明确的 Subagent。
- [x] 建立 `PROGRESS.md` 追踪表。
- [x] 建立 `CONTRIBUTING.md` 确定协作公约。
- [x] 创建 `scripts/` 目录用于存放自动化的 Sensor（传感器）脚本。

### 💡 教训与反思 (Failures & Refinements)
- **发现**：直接要求 AI 开发 3D 跑酷功能会导致严重的代码耦合（UI 与 WebGL 混杂）。
- **优化方案**：引入了严格的模块边界限制（详见 `AGENTS.md`），强迫 `subagent-3d-render` 只能专注渲染，不得触碰 DOM 事件。

---

## 📅 [2026-08-01] 第一阶段：视觉升级与物理机制严谨化

### 🎯 目标 (Objective)
- 将旧版 3D 纯色几何体替换为经典的 Subway Surfers 2.5D SVG 贴图风格（Jake 造型、跑鞋、路障）。
- 修复物理引擎的数值 Bug（防止平地直接跳跃上火车），强化碰撞宽容度的严格性。
- 解决 Vite PWA 带来的前端死缓存问题，确保每次持续集成或 HMR 能无缝触达用户。

### 🚧 进度 (Status)
- [x] 在 `textures.ts` 中完成所有核心道具的 SVG 绘制。
- [x] 将 `three.ts` 中的 `BoxGeometry` 渲染管线迁移为 `PlaneGeometry` (配合 `DoubleSide` 与 `alphaTest`)。
- [x] 修改 `movement.ts` 物理检测逻辑，将 `entityTop - 8` 的放纵阈值收紧至 `entityTop - 2`。
- [x] 在 `index.html` 中注入强制解除 ServiceWorker 缓存的 JS 脚本。
- [x] 将“自动化验收闭环”编入 `AGENTS.md`，强制 AI 每次修改后运行 `vitest`。

### 第二阶段：手感与核心循环强化 (Phase 2: Core Loop Polish)
- ✅ **侧面碰撞与跌倒系统 (Stumble Mechanics)**：实装了切道 0.2 秒内的侧碰弹回机制（允许 3 次容错，5秒无伤自动衰减），彻底消灭了切道暴毙的生硬感。
- ✅ **受击视觉反馈特效**：实装了侧碰时的摄像机震动、模型短暂挤压形变（Wobble）、红色 SVG 闪烁以及爆血粒子特效，极大增强了打击感。
- ✅ **地形生成器彻底重构 (Pattern-Based PCG)**：废弃了初版的“纯掷骰子”全随机机制。重构为“积木式拼接”算法。
  - **火车加长**：所有火车模型从 300 加长到 800。
  - **五大预设关卡阵型**：新增 `ZigZag_Trains`（Z字横跳）、`Under_Over`（高低钻跳）、`Moving_Rush`（死神移动列车）、`Slalom`（蛇形走位）、`Coin_Frenzy`（金币海）五种手工编排的高手感关卡模块。
  - **金币寻路 (Breadcrumbing)**：金币不再盲目铺设，而是沿着最优越行路线摆放，完美引导玩家跑酷心流。

### 💡 教训与反思 (Failures & Refinements)
- **发现**：开发环境中使用了 `vite-plugin-pwa` 的自动更新机制，但缺乏客户端提示。导致玩家浏览器端长久锁死在旧版 JavaScript 构建上，对热更新毫无反应。
- **优化方案**：开发阶段最好关闭 PWA 缓存，或在入口页添加硬刷新/清理 SW 的机制。
- **发现**：判定坐标时使用的“游戏体验容错值（例如玩家比障碍物低 8 也能自动爬上去）”直接打破了重力系统的平衡。
- **优化方案**：严谨的数学验证先于代码提交。跳跃极值 `h = 12.8` 时，碰撞容错不应使其能触及 `20` 的屋顶。
