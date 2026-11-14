# PAO-20 ~ PAO-26 并行调度与串行集成执行计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and superpowers:dispatching-parallel-agents to implement this plan.

**Goal:** 并行推进 M2 收口（PAO-20/21）、M3 内容扩展（PAO-22/23/24）与 M4 性能分档（PAO-25），随后串行完成主机接线与 PAO-26 全局回归、真实截图验收及远程推送。

**Architecture:**
- 基线固定为 `7d7d69c278db992ed7defec1256ad2cd437de975`（`codex/pao18-font-diagnosis`）。
- 阶段一（3 路并行 Subagent，独立工作树 + 零重叠文件白名单）：
  1. **Subagent A（`D:/worker/paoku-sessions/pao-20-21`，分支 `codex/pao-20-21-m2-vertical-slice`）**：负责 PAO-20 音频/反馈生命周期与 PAO-21 完整可玩样板路线见证。
  2. **Subagent B（`D:/worker/paoku-sessions/pao-22-23`，分支 `codex/pao-22-23-m3-powerups-tracks`）**：负责 PAO-22 四道具 3D 造型/目录/生命周期与 PAO-23 扩展轨道段落/主题区段/速度曲线。
  3. **Subagent C（`D:/worker/paoku-sessions/pao-24-25`，分支 `codex/pao-24-25-m3-m4-systems`）**：负责 PAO-24 商店/设置/加载/任务全流程控制器与 PAO-25 画质分档/帧率遥测管理器。
- 阶段二（串行汇合与 PAO-26 全局门禁）：
  - 将三路已验证并推送的模块汇入集成树，串行完成 `src/main.ts`、`src/render/babylon.ts`、`vite.config.ts` 及 `tests/e2e/pao20-26-delivery.spec.ts` 接线，执行完整 `tsc`、`npm run build`、全量 Vitest 单测与 Playwright E2E 门禁，抽检真实截图并推送所有分支。

---

## 1. 并行白名单划分

| Subagent | 工作树 | 分支 | 允许写入路径 |
|---|---|---|---|
| Subagent A (PAO-20/21) | `D:/worker/paoku-sessions/pao-20-21` | `codex/pao-20-21-m2-vertical-slice` | `src/systems/audio.ts`, `src/systems/feedbackLifecycle.ts`, `src/systems/verticalSlice.ts`, `tests/unit/pao20-feedback-audio.test.ts`, `tests/unit/pao21-vertical-slice.test.ts` |
| Subagent B (PAO-22/23) | `D:/worker/paoku-sessions/pao-22-23` | `codex/pao-22-23-m3-powerups-tracks` | `src/render/entityViews.ts`, `src/systems/powerupCatalog.ts`, `src/data/extendedTrackSegments.ts`, `src/systems/speedCurve.ts`, `tests/unit/pao22-powerups-complete.test.ts`, `tests/unit/pao23-tracks-speed-curve.test.ts` |
| Subagent C (PAO-24/25) | `D:/worker/paoku-sessions/pao-24-25` | `codex/pao-24-25-m3-m4-systems` | `src/systems/progressionFlow.ts`, `src/render/qualityManager.ts`, `tests/unit/pao24-shop-settings-missions.test.ts`, `tests/unit/pao25-performance-quality.test.ts` |

## 2. 严格门禁约束
1. 任何新增或修改不得破坏既有 353 项单测与 106 项 E2E 断言。
2. `D:/worker/paoku-sessions/pao-15-roof-diagnosis` 严禁触碰。
3. 每个并行工作树完成后须通过 `npx tsc --noEmit` 与 `npm run test`（全量单测），提交并推送至 `origin`。
4. 最终集成后串行运行完整 WebGL E2E 套件（避免多路 Chromium 并发争抢 GPU），检查桌面与移动端真实截图。

