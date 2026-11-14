# PAO-18/19 完整门禁 103/106 停止点独立主审与最小修复指令

2026-11-07，Asia/Shanghai。主Agent对 `D:/worker/paoku-sessions/pao-18-font-diagnosis`（分支 `codex/pao18-font-diagnosis`，HEAD `d303633e2539a26ca595438b51216a02900df92f`）在 [FOLLOWUP.md](D:/worker/paoku-sessions/pao-18-font-diagnosis/docs/evidence/PAO-19/integration/v1/FOLLOWUP.md) 报告的 103/106 完整 E2E 停止现场及三份原始 trace 进行了独立只读核验。

## 1. 三项失败与一项输出隔离缺口的根因核定

| 序号 | 失败项 / 缺口 | 实测 Trace 与源码根因 | 最小修复边界（均在已批准白名单内） |
| --- | --- | --- | --- |
| 1 | `tests/e2e/pao18-fact-bridge.spec.ts:75`（`:92` 点击 `#pause-restart-btn` 后等待 `PLAYING` 60s 超时） | Trace 实测 `#start-btn` 点击完成于 `575953.037ms`，QA 故障注入使其立即进入 `PAUSED`，旧版 CSS 有 `.animate-pop` 350ms 缩放动画使 Playwright 点击自然延后 >300ms；迁入 B19 低动态样式后无缩放动画，`#pause-restart-btn` 在 `576038.897ms`（仅间隔 **85.86ms < 300ms**）即被点击。固定 B19 `src/ui/dom.ts:140-158` 中 `#start-btn` 与 `triggerRestart` 共用同一个 300ms `isTransitioning` 闭包布尔值，导致 `#start-btn` 的 300ms 防连点锁把随后已进入 `PAUSED` 页面的首次 `#pause-restart-btn` 点击静默丢弃。 | **不修改固定 B19 `src/ui/dom.ts` 或旧测试 `pao18-fact-bridge.spec.ts`**。在可写文件 `src/main.ts` 中记录最近一次 `RESTART` 意图时间戳 `lastRestartIntentAt`；对 `#pause-restart-btn`（`PAUSED`）和 `#restart-btn`（`GAMEOVER`）挂载冒泡后备点击监听（随 `subscriptions` 在 `disposeGame` 清理，不计入 `layoutStats.listeners`）：当按钮未禁用、应用处于对应可重开状态、且距离上次 `RESTART` 意图 ≥300ms（证明 `UIManager` 仅因更早的 `#start-btn` 300ms 窗口未过而早退，同时保留同一重开按钮自身的 300ms 防连点）时，调用 `(uiManager as any).intent?.('RESTART') ?? dispatchIntent('RESTART_RUN')`。在 `tests/unit/pao19-hud-camera-integration.test.ts` 补充对应单测。 |
| 2 | `tests/e2e/pao19-hud-safe-area.spec.ts:70`（`:76` `#close-shop-btn` 回 `MENU` 后 `ready()` 报 `UNREADY/DIRTY`） | Trace 实测 `#close-shop-btn` 点击结束于 `650567.804ms`，`#menu-screen` 可见于 `650581.2ms`，`sample(page)` 在 `650581.779ms`（仅 0.58ms 后）立即读取 `f.ui.readOcclusion()`。固定 B19 `UIManager.update()` 在页面切换帧（`changed === true`）会通过 `queueMicrotask` 执行 `active.focus({preventScroll:true})`，该微任务在 `main.ts` 同帧同步 `measureOcclusion()` 完成后触发 `focusin` 捕获监听并调用 `invalidateLayout('DIRTY')`（同时 `ResizeObserver` 也可能在该帧末触发失效），需下一 `requestAnimationFrame` 由主机重新采样发布 `READY`。 | 按已批准 [接线契约](D:/worker/paoku-sessions/pao-18-font-diagnosis/docs/presentation/pao18-pao19-integration-contract.md) 第 8 节第 137 行（“生产主机运行时改读当前UI实例 `readOcclusion()`，由 `main` 唯一调度量测……必要同步只等待主机发布本次布局，沿原预算，不增加retries”），在可写文件 `tests/e2e/pao19-hud-safe-area.spec.ts` 的 `sample(page)` 生产分支（`!f.app`）中：若 `readOcclusion()` 当前非 `READY` 或 `page !== app.appState` / `runId !== app.activeRunId`，通过 `requestAnimationFrame` 等待主机下一展示帧发布（上限 250ms），不自行调用 `measureOcclusion`。 |
| 3 | `tests/e2e/pao19-hud-safe-area.spec.ts:191`（`:198` CDP 触摸 `#pause-menu-btn` 回 `MENU` 后 `ready()` 报 `UNREADY/DIRTY`） | 与第 2 项完全同源：Trace 实测 `#menu-screen` 可见后 0.67ms 即调用 `sample(page)`，正处于页面切换微任务 `focusin` 触发 `DIRTY` 后、主机下一帧重采前的窗口。 | 与第 2 项共用同一处 `sample(page)` 生产分支同步等待修复。 |
| 4 | 本机镜像输出隔离漏项：`gameplay.spec.ts:101/106/114/119/125/131` 写根目录 `screenshot_*.png` | 旧 `gameplay.spec.ts` 中 6 处相对路径截图未被本机镜像脚本重定向到根外目录。 | 在 `.pao18.local/pao19-integration/` 的可逆镜像生成与还原逻辑中，将 `gameplay.spec.ts` 这 6 处 `screenshot_*.png` 重定向至根外诊断目录（还原后字节与 `tests/e2e/gameplay.spec.ts` 原文件 100% 一致），并将根目录 6 张历史图片纳入 SHA256 保护核验。 |

## 2. 执行与门禁要求

1. 保持 `D:/worker/paoku-sessions/pao-18-font-diagnosis` 现有 WIP 与历史首次失败记录（`README.md`、`FOLLOWUP.md`、旧诊断目录 `pao18-pao19-integration-20261106` 不覆盖）；新完整运行产物写入新根外目录 `D:/worker/paoku-diagnostics/pao18-pao19-integration-20261107/`。
2. 依次通过：源码 `tsc`、显式新测试 `tsc`、`npm run build`、串行全量 `vitest`（含新增重开防吞单测）、定向复验 `pao18-fact-bridge` 与 `pao19-hud-safe-area`，最后执行唯一一次 106 项完整 E2E。
3. 核验四份 B19 生产 TS Git blob 字节全匹配、白名单外全部受保护文件（含根目录 6 张 `screenshot_*.png`）SHA256 不变、5198 端口收尾释放。
4. 若完整 E2E 106/106 全部通过（或 105/106 且唯一失败仍为已批准的 `pao6-baseline.spec.ts` `roof-exit-land` 同一断言），更新 `docs/evidence/PAO-19/integration/v1/` 最终回执，只暂存已批准白名单文件，正常 hooks 提交并推送到 `origin codex/pao18-font-diagnosis`，返回提交 SHA 与证据供主 Agent 独立终审。

