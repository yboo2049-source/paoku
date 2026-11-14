# PAO-18/19 限定接线集成最终完整门禁回执（2026-11-07）

2026-11-07，Asia/Shanghai。**本批完整门禁 106/106 全部通过（exit 0，skip/retry/flaky 均 0），源码 `tsc`、显式新测试 `tsc`、`npm run build`、全量单测 34 文件 353/353 全部 exit 0。**

依据：[独立主审与最小修复指令](D:/worker/paoku/docs/reviews/2026-11-07-pao18-pao19-integration-followup-review.md)、[获批实施计划](D:/worker/paoku/docs/plans/2026-11-06-pao18-pao19-approved-integration-execution.md)。历史首次停止记录 [README.md](README.md)、上一轮 103/106 停止记录 [FOLLOWUP.md](FOLLOWUP.md) 及旧诊断目录 `D:/worker/paoku-diagnostics/pao18-pao19-integration-20261106` 完整保留未覆盖；本轮全部原始诊断与工件隔离在 `D:/worker/paoku-diagnostics/pao18-pao19-integration-20261107/`。

## 1. 四项最小修复与验证映射

| 序号 | 修复文件 / 脚本 | 修复内容 | 验证结果 |
| --- | --- | --- | --- |
| 1 | `src/main.ts`、`tests/unit/pao19-hud-camera-integration.test.ts` | 不改固定 B19 `src/ui/dom.ts` 或旧测试 `tests/e2e/pao18-fact-bridge.spec.ts`。在 `src/main.ts` 维护 `lastRestartIntentAt`，对 `#pause-restart-btn`（`PAUSED`）和 `#restart-btn`（`GAMEOVER`）注册后备点击监听（随 `subscriptions` 在 `disposeGame` 清理，不改动 `layoutStats.listeners`）：当 `<300ms` 前的 `#start-btn` 防连点窗口吞掉首次重开点击（且距离上次 `RESTART` 意图 ≥300ms）时触发重开意图；保留同一重开按钮自身的 300ms 防连点。 | 新增单测通过（34 文件 353/353 通过）；定向复验与完整门禁中 `pao18-fact-bridge.spec.ts:75` 均通过。 |
| 2 | `tests/e2e/pao19-hud-safe-area.spec.ts` | 按接线契约第 8 节第 137 行，在 `sample(page)` 的 `!f.app` 生产主机分支中，若 `readOcclusion()` 当前非 `READY` 或 `page !== app.appState` / `runId !== app.activeRunId`（如页面切换微任务 `focusin` 触发 `DIRTY` 后尚未进入下一展示帧），在 250ms 上限内通过 `requestAnimationFrame` 等待主机发布最新布局，不自行调用 `measureOcclusion`。 | 定向复验与完整门禁中 `:70`（键盘生命周期）与 `:191`（CDP 触摸生命周期）均通过。 |
| 3 | `.pao18.local/pao19-integration/prepare-qa.mjs`、`bootstrap.mjs` | 将 `tests/e2e/gameplay.spec.ts` 中 6 处 `screenshot_*.png` 重定向至 `D:/worker/paoku-diagnostics/pao18-pao19-integration-20261107/<phase>/legacy/screenshot_*.png`，可逆还原 100% 字节匹配原文件；将根目录 6 张历史 `screenshot_*.png` 纳入运行前后 SHA256 与 Git blob 保护核验。 | 完整门禁运行后根目录 6 张 `screenshot_*.png` SHA256 100% 未变，重定向截图均生成于根外 `legacy/` 目录。 |

## 2. 门禁执行统计

- 源码类型检查：[source-tsc-20261107.txt](source-tsc-20261107.txt)，exit 0
- 显式新测试类型检查：[explicit-test-tsc-20261107.txt](explicit-test-tsc-20261107.txt)，exit 0
- 生产构建（串行）：[build-serial-20261107.txt](build-serial-20261107.txt)，exit 0
- 全量单元测试（串行）：[unit-serial-20261107.txt](unit-serial-20261107.txt)，34 个测试文件、353/353 全部通过，exit 0
- 定向 E2E 复验（`pao18-fact-bridge.pw.ts` + `pao19-hud-safe-area.pw.ts`）：[target-verify-20261107.txt](target-verify-20261107.txt)，17/17 全部通过，exit 0
- 唯一一次完整 106 项 E2E 门禁：[final-gate-20261107.json](final-gate-20261107.json)、[artifact-manifest-20261107.json](artifact-manifest-20261107.json)
  - 固定条件：端口 5198，`strictPort`、`reuseExistingServer=false`、`workers=1`、`retries=0`、ANGLE D3D11，`DEBUG=vite:time,vite:transform`
  - 开始 / 耗时：`2026-11-07T09:06:32.620Z`，`989077.155ms`（约 16.5 分钟）
  - 结果：**20 个 E2E 文件、106/106 全部通过**（`expected: 106, unexpected: 0, skipped: 0, flaky: 0, retries: 0`，exit 0）
  - 先前失败的 3 项（`pao18-fact-bridge:75`、`pao19-hud-safe-area:70`、`pao19-hud-safe-area:191`）全部通过；`pao6-baseline` `ramp-roof-jump-land` 本次亦通过（未改文件/等待/断言）。

## 3. 本轮视觉、投影与资源核验

- 本轮完整运行关键截图副本：[桌面最大 HUD](visual-20261107/F-maximal-1440.png)、[390 最大 HUD](visual-20261107/F-maximal-390.png)、[暂停旋转](visual-20261107/F-paused-rotation.png)。
- 桌面与 390 普通/最大 HUD 下 `player`、`officer`、`dog` 三实体最终投影均 `front: true`、`safe: true`；暂停旋转（844×390）下模态卡片完整位于视口内且相机 pose/FOV 与动画组保持冻结。
- 暖机后 20 轮失效、10 次重开与 `disposeGame` 实测（[F-resources-20261107.json](F-resources-20261107.json)）：
  - 暖机前后 `host` 监听（`listeners: 4, observers: 1, subscriptions: 1`）、`probe: 1`、`meshes: 102, materials: 26, textures: 8, animationGroups: 7, skeletons: 1` 零增长；
  - `disposeGame()` 后 `listeners: 0, observers: 0, subscriptions: 0, probe: 0`，`renderer.status: 'RELEASED'`，`sceneDisposed: true`。

## 4. 保护核验与收尾

- 四份固定 B19 生产 TS（`src/ui/dom.ts`、`src/ui/views/models.ts`、`src/ui/views/screens.ts`、`src/presentation/hudSafeArea.ts`）Git blob 100% 匹配 `b474845a972005b83f1278884b7dbe02c8af9615`。
- 白名单外 93 项受保护文件（87 项源码/配置/旧测试/字体 + 根目录 6 张 `screenshot_*.png`）SHA256 与 Git blob 100% 未变。
- 20 个 `full-final` 可逆测试镜像还原后与当前目标测试文件字节 100% 一致。
- 5198 临时服务已停止，确认 `5198` 端口无残留 `LISTENING` 进程。
