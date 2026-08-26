# paoku 工程债治理方案（Engineering Debt Plan）

> 作者：程基岩（技术负责人 / 引擎） · 阶段：Phase 6 打磨
> 范围：文档同步/合并、`three` 依赖清理核查、分支收尾；附赠本次走查发现的增量工程债。

---

## 0. 现状快照（实测，非任务简报）

> 任务简报中「领先 main 5 个 commit，其中 1 个未 push」与实测**不符**，以下为实测值（执行于本次走查）：

| 项 | 实测值 |
| :--- | :--- |
| 分支 | `feat/babylon-engine-upgrade` |
| 领先 `main` 的 commit 数 | **7**（非 5） |
| 未 push 到 origin 的 commit | **0**（`HEAD == origin/feat/babylon-engine-upgrade`，非 1） |
| 工作区状态 | 干净；存在未跟踪目录 `docs/art/`、`docs/audio/`、`docs/qa/`（并行同伴产出）+ 已修改 `test-results/.last-run.json` |
| 质量门禁 | `tsc --noEmit` ✅ 0 错误；`vitest run` ✅ 22/22；`playwright` 未在本轮重跑（不影响本结论） |

---

## 1. 文档滞后（已知债 #1）

### 现象

根目录 `PROGRESS.md` 的「第一阶段：视觉升级与物理机制严谨化」（2026-08-01）段落仍残留旧文件名：

| 行 | 残留旧名 | 现状 |
| :--- | :--- | :--- |
| L33 | `textures.ts` | 已不存在（SVG 绘制现内联在 `babylon.ts` / 历史 `models.ts`） |
| L34 | `three.ts` + `BoxGeometry→PlaneGeometry` | 引擎已迁 Babylon，`src/render/three.ts` 为待删除死亡代码 |
| L35 | `movement.ts` | 已迁 `src/systems/physics.ts` |
| L36 | （`index.html` 注入清 SW 脚本描述） | 现状见 §4 增量债 |

### 处置建议

这些段落是**历史记录**，不应简单改写成「现在时」——它们如实描述了当时的迭代。建议二选一：

- **方案 A（推荐，成本最低）**：在文件头加一句「**历史条目中的文件名按当时状态记录，不随重构回溯改写；当前文件名以 `AGENTS.md` 与 `src/` 为准**」，历史条目原样保留。零风险、零信息损失。
- **方案 B（彻底）**：逐条补注「（旧名 `textures.ts`，现已迁至 `babylon.ts`）」等映射括号。

**结论：采用方案 A**，避免为「历史正确性」付出改写成本与误导风险。

---

## 2. 进度文档重复（已知债 #2）

### 现象

存在两份进度文档：

| 文件 | 定位 | 独有内容 |
| :--- | :--- | :--- |
| `PROGRESS.md`（根） | 「开发进度与反馈追踪」 | Phase 1~6 全量特性演进 + 教训反思 |
| `docs/PROGRESS.md` | 「项目进展与重构日志」 | 2026-08-19 Superpowers 重构闭环 + Babylon 迁移 + 历史遗留问题修复 |

两份内容**高度重叠且部分相互矛盾**（`docs/PROGRESS.md` 已把引擎/文件名对齐到 Babylon，而根 `PROGRESS.md` 仍残留旧名）。

### 处置建议

**合并为单一事实源（single source of truth）**：

1. **选定根 `PROGRESS.md` 为唯一进度文档**——它更完整（含 Phase 1~6 全史），且 `AGENTS.md` §机械化约束第 1 条明确要求「更新到 `docs/` 目录 + `PROGRESS.md`」，根目录版本正是该引用所指。
2. 将 `docs/PROGRESS.md` 的**独有增量条目**（Superpowers 重构闭环、Babylon 迁移说明、历史遗留问题修复、22/22 测试里程碑）**上移合并**进根 `PROGRESS.md` 顶部「最新进展」区。
3. 删除 `docs/PROGRESS.md`（或改为一句话跳转指针 `→ ../PROGRESS.md`，避免旧链接 404）。

> ⚠️ 此为文档改动，按项目「文档先行」约束应先经 team-lead 审批，再由本人或文策侧执行。

---

## 3. `three` 依赖清理核查（任务重点）

### 核查结论：**`three` 当前仍有引用，暂不可直接清理**

| 证据 | 说明 |
| :--- | :--- |
| 4 个死亡文件仍 `import * as THREE from 'three'` | `src/render/three.ts`、`src/render/models.ts`、`src/render/particles.ts`、`src/render/environment.ts`（合计 1233 行） |
| 这 4 个文件仅互相引用 | `three.ts` import 另 3 个；**没有任何入口/其他模块 import `three.ts`**（`main.ts` 只 import `babylon.ts` 的 `BabylonRenderEngine`） |
| `tsconfig.json` 为 `include: ["src"]` | 意味着 `tsc --noEmit` 会**类型检查全部 4 个死亡文件**，进而解析其 `three` import |
| 依赖 | `three@^0.185.1`（dependencies）+ `@types/three@^0.185.1`（devDependencies）仍被这些文件使用 |

**因此**：直接 `npm uninstall three @types/three` 会导致 `tsc --noEmit` 报「找不到模块 'three'」而**打破质量门禁**。

### 清理路线（三步，务必顺序执行）

1. **删除死亡代码**：删除 `src/render/three.ts`、`src/render/models.ts`、`src/render/particles.ts`、`src/render/environment.ts` 四个文件（1233 行，纯 Three.js 旧渲染簇，无任何活引用）。
2. **卸载依赖**：`npm uninstall three && npm uninstall -D @types/three`。
3. **门禁回归**：`npx tsc --noEmit`（0 错误）→ `npx vitest run`（22/22）→ `npx playwright test`（1/1）。

> 删除前建议先 `git tag` 或保留当前 commit 以便回滚（已有 git 历史，天然可回滚，可省 tag）。

### 附赠发现：另一个可清依赖

`@babylonjs/gui@^9.19.0` 在 `src/` 与 `tests/` 中**零引用**（UI 全部为 DOM 实现，见 `src/ui/dom.ts`）。可在同一轮顺手卸载，进一步瘦身产物。

---

## 4. 分支收尾（合并/推送）建议

基于 §0 实测状态：

1. **推送**：本地与 `origin/feat/babylon-engine-upgrade` 已同步（0 未 push），无需推送动作；若后续有本报告驱动的改动，再走常规 commit+push。
2. **合并策略**：7 个 commit 均为「升级/特性」粒度，建议 **Squash & Merge 到 `main`**（一条清晰的「Babylon.js 引擎升级 + Phase 6 打磨」提交），或 **Rebase 保留分项历史**——取决于团队偏好；本人倾向 **Squash** 以保持 `main` 线性、可读。
3. **合并前置条件**：Phase 6 三项质量门禁全绿（`tsc`/`vitest`/`playwright`）+ 本文档 §3 死亡代码清理 + 视觉验收截图复核后，再合并。
4. **收尾**：合并后删除 `feat/babylon-engine-upgrade` 远端与本地分支。

---

## 5. 增量工程债（本次走查新发现）

### 5.1 `index.html` 存在整段陈旧 UI 标记（中）

`index.html` 的 `<div id="ui-layer">…</div>` 内包含整套旧版 UI（`#hud-layer`、`#score`、`#speed-bar-fill`、`#buffs-container`、`#menu-high-score`、`#final-score`、`#game-over-screen`、`#autopilot-btn`、`#debug-panel` 等），但 `UIManager.buildUI()` 启动时会 `querySelector('#ui-layer').remove()` 后重建自己的 UI——**这段静态标记是纯死代码**，且 `id` 与运行期 UI 冲突易误导维护者。

**建议**：清空/精简 `index.html` 内静态 UI，只保留 `<canvas id="game-canvas">` 与 `<div id="game-container">` 容器（Babylon 会复用该 canvas）。同时把 `<title>Subway Surfer V1 (Harness)</title>` 更正为「paoku」/「SUBWAY SURFERS」。

### 5.2 测试产物被 git 跟踪（低）

- `test-results/.last-run.json`（Playwright 产物）与根目录 `screenshot_*.png`（截图产物）**已被 git 跟踪**，每次跑测试都会产生 dirty diff。
- **建议**：在 `.gitignore` 追加 `test-results/`、`screenshot_*.png`，并 `git rm --cached` 已跟踪项。

### 5.3 远程字体/粒子纹理依赖（低-中）

- `index.html` 依赖 Google Fonts（`fonts.googleapis.com`）——离线/内网环境会回退字体。
- 粒子纹理依赖 `raw.githubusercontent.com`（见性能报告 §2.2）。
- **建议**：字体自托管或提供本地回退；粒子纹理本地化。

---

## 6. 执行优先级汇总

| 优先级 | 事项 | 类型 | 依赖/审批 |
| :--- | :--- | :--- | :--- |
| P0 | 删除 4 个 Three.js 死亡文件 + 卸载 `three`/`@types/three`（+ 顺手 `@babylonjs/gui`） | 代码 | team-lead 审批 |
| P0 | 合并两份 `PROGRESS.md` + 历史条目声明 | 文档 | team-lead 审批 |
| P1 | `index.html` 陈旧 UI 清理 + title 更正 | 代码/文档 | 低 |
| P1 | `.gitignore` 追加 `test-results/`、`screenshot_*.png` | 配置 | 低 |
| P2 | 远程字体/粒子纹理本地化 | 资产 | 与美术/音频协作 |
| P2 | 分支 Squash 合并 + 收尾 | 流程 | 门禁全绿后 |

---

## 7. 结论

- **`three` 依赖「不可直接清理」**：其被 4 个死亡文件（1233 行）引用，且 `tsconfig` 会全量类型检查 `src/`。正确顺序是「先删死亡文件 → 再卸载依赖 → 再跑门禁」。
- **文档债**采用「历史条目声明 + 合并单一事实源」的低风险方案，不建议回溯改写历史条目。
- **分支实测为 7 个 commit、0 未 push**，与任务简报的「5/1」不符；合并建议 Squash 到 `main`，前置条件为门禁全绿 + 死亡代码清理。

> 关联交付：性能剖析报告见 `docs/architecture/performance-audit.md`。
