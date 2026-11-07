# PAO-18/19 限定接线集成独立终审报告

2026-11-07，Asia/Shanghai。**结论：PAO-18/19 限定接线集成（`7d7d69c278db992ed7defec1256ad2cd437de975`）通过主 Agent 独立终审，本地与远端 `origin/codex/pao18-font-diagnosis` 已同步一致。**

## 1. Git、白名单与固定来源独立核验

- **目标工作树**：`D:/worker/paoku-sessions/pao-18-font-diagnosis`，分支 `codex/pao18-font-diagnosis`
- **提交与远端**：HEAD = `7d7d69c278db992ed7defec1256ad2cd437de975`（父提交 `d303633e2539a26ca595438b51216a02900df92f`），`git ls-remote origin refs/heads/codex/pao18-font-diagnosis` 实测同为 `7d7d69c278db992ed7defec1256ad2cd437de975`；工作树与暂存区干净。
- **变更文件白名单**：`d303633..7d7d69c` 变更仅包含获批的 `index.html`、`src/main.ts`、`src/render/babylon.ts`、`src/style.css`、固定迁入四份 B19 生产 TS、新增 `src/presentation/hudCameraInput.ts`、迁入四份 B19 测试、新增两份集成测试、`pao18-controller-camera.spec.ts` 旧布局归属拆分与 `tests/fixtures/pao18-legacy-hud.ts`、本树实施计划及 `docs/evidence/PAO-19/integration/v1/` 证据。
- **固定 B19 生产 TS Git blob 字节核对**：
  - `src/ui/dom.ts`: `3909d2dbdeefc70fb34ebc9f2221bed11c93c9c4`（与 `b474845` 完全相等）
  - `src/ui/views/models.ts`: `67a9c3ecf60ca97329fd88aa4ee0dfe10d9c5d77`（与 `b474845` 完全相等）
  - `src/ui/views/screens.ts`: `865ecdd56b9fb6defcfb89ce451020ebf0b0f878`（与 `b474845` 完全相等）
  - `src/presentation/hudSafeArea.ts`: `e402beb9dd4824d3a1b360a78058099fa8d13db5`（与 `b474845` 完全相等）
- **保护清单与可逆镜像**：白名单外 93 项受保护文件（87 项源码/配置/旧测试/字体 + 根目录 6 张历史 `screenshot_*.png`）运行前后 SHA256 与 Git blob 100% 未变；20 个 `full-final` `.pw.ts` 镜像反向还原与源测试文件字节 100% 一致；端口 `5198` 已释放无残留监听。

## 2. 门禁成绩与三项修复复核

依据 [停止点独立主审](2026-11-07-pao18-pao19-integration-followup-review.md) 与本树最终回执 [FINAL_GATE.md](D:/worker/paoku-sessions/pao-18-font-diagnosis/docs/evidence/PAO-19/integration/v1/FINAL_GATE.md)：

1. **静态类型与构建/单测**：
   - 源码 `tsc --noEmit`：exit 0
   - 显式新测试 `tsc`：exit 0
   - 串行 `npm run build`：exit 0
   - 串行全量单元测试（`vitest`）：**34 个文件，353/353 全部通过**（含新增重开后备点击与 `disposeGame` 清理单测），exit 0
2. **唯一一次完整 106 项 E2E 门禁**：
   - 根外诊断目录：`D:/worker/paoku-diagnostics/pao18-pao19-integration-20261107/full-final/`
   - 实测结果：**20 个 E2E 文件，106/106 全部通过**（`expected: 106, unexpected: 0, skipped: 0, flaky: 0, retries: 0`，耗时 `989077.155ms`，exit 0）。
   - 上一轮失败的 3 项（`pao18-fact-bridge:75`、`pao19-hud-safe-area:70`、`pao19-hud-safe-area:191`）均在定向复验（17/17）与完整门禁（106/106）中通过；`pao6-baseline` 的 `ramp-roof-jump-land` 本次亦通过（未改源码/等待/断言，不据此关闭历史已知车尾问题 KI-001）。

## 3. 视觉、投影与资源稳定性独立抽检

主 Agent 独立抽检本轮完整运行生成的三张关键截图：
- `F-maximal-1440.png`（桌面 1440×900 最大 HUD）：顶部 15 位分数/金币、速度表、Toast 与左下四项道具计时条布局清晰，`player`、`officer`、`dog` 三实体完整位于安全区内（`front: true, safe: true`）。
- `F-maximal-390.png`（移动竖屏 390×844 最大 HUD）：15 位数字自动换行，左下四枚 buff 胶囊与顶部卡片均未遮挡三实体（注：15 位极端数字压力夹具下 Toast 与速度卡背景存在 14 CSS px 纵向相交，文字可读，属固定 B19 布局已知边界，如实保留记录）。
- `F-paused-rotation.png`（844×390 暂停横屏旋转）：暂停模态卡片完整居中于视口内，背景暗化正常，相机 pose/FOV 与骨骼动画组保持冻结。
- 资源暖机 20 轮失效 + 10 次重开 + `disposeGame()`（`F-resources-20261107.json`）：`listeners: 4 -> 4 -> 0`、`observers: 1 -> 1 -> 0`、`subscriptions: 1 -> 1 -> 0`、`probe: 1 -> 1 -> 0`，无监听或场景对象泄漏。

## 4. 阶段边界声明

- 本批完成 PAO-18 事实桥/镜头与 PAO-19 新 UI / 动态 HUD 安全区的限定接线工程验收。
- 不代表正式 `runner` 绑定/13 动作或 16 世界静态资产生产资格已完成；不解除 PAO-15/16/17 父任务未完成项；不关闭已延期的车尾问题（KI-001/002）。
