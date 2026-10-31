# PAO-11 浏览器 QA

2026-11-01，工作区 `D:/worker/paoku-sessions/pao-11`，独占端口 `http://127.0.0.1:5182`；Vite strictPort，禁止复用已有服务。使用 Playwright Chromium headless、ANGLE D3D11 启动参数。桌面 1440×900、竖屏 390×844；竖屏为桌面 Chromium 的 viewport/CDP touch 模拟，不是手机真机。

## 最终验证

PowerShell：`$env:PAO11_PHASE='verified'; node docs/evidence/PAO-11/browser-runner.mjs`。

wrapper 实际调用 `npm run test:e2e -- --config docs/evidence/PAO-11/playwright.config.ts`。完整既有 16 项及新增 4 项均执行：**20/20 通过，94.887s，0 skipped、0 unexpected、0 flaky，退出0**。没有改旧断言。详见 [机器结果](runs/verified/e2e-results.json)、[stdout](runs/verified/e2e.log) 与 [采样简表](runs/verified/browser-summary.json)。

七份生产源码在本轮开/结束 SHA256 一致，见 [source-stability.json](runs/verified/source-stability.json)。新用例通过 HTTP `?raw` 与磁盘逐字源匹配 main.ts/physics.ts，实际工作区与 URL 见 [browser-source-identity.json](runs/verified/browser-source-identity.json)。本轮浏览器验证期间未发生生产源码变化。

## N/F 范围与支撑证据

- **N 普通输入**：不开 QA，不写传感器，真实菜单点击、A/D/W、Escape；读取已提交快照及输入日志。新增短流程与旧 PAO-10 完整自然键盘/触摸流程均通过。生产生成器仍随机，不能外推所有随机路线安全。
- **F 固定夹具**：仅浏览器内临时替换现有 spawner.update 取得实体数组，QA 门控定位起点；不改磁盘生成器，不开 godMode、不额外免死。完整控制由真实键盘或 CDP touch 完成。逐帧记录脚底世界 Y、tick、supportSurfaceId、contact，新增各项 errors=[]。

| F 用例 | 实测结果 |
| --- | --- |
| 桌面 ground→ramp→roof→jump→ground | 坡 tick56：z16.0104/y1.0026，route-ramp:ramp；顶 tick83：y3，route-roof:roof；W 跳 tick114：y3.4183，support=null/AIRBORNE；tick165：y0，ground/SUPPORTED；177帧样本 |
| 竖屏真实上划同路径 | 坡 tick55 y1.0017；顶 tick82 y3；TOUCH 跳 tick120 y3.4183，support=null/AIRBORNE；tick171 y0/ground；178帧样本，无横向布局溢出 |
| 高基准坡 B=(0,5,100), D12/H3 | 从 y5 的入口平台自然前进至高坡；tick32 z99.03646/y6.25911，与 `5+(z-94)/4` 一致；tick56 z106.310625/y8，route-roof:roof/SUPPORTED；62帧样本 |

端点精确值、容差边界、相对接触、移动携带和回收矩阵以 unit/surfaces.test.ts 为主要断言；本轮浏览器不是所有边界的逐一视觉证明。

## 截图检查及局限

已打开检查 verified 截图 `F-desktop-roof.png`、`F-portrait-jump.png`、`F-portrait-land.png`，以及 initial 的桌面坡道、竖屏车顶、高基准车顶。人物在车顶/跳离/落地画面居中可见，桌面及竖屏 HUD 未见新增溢出/遮挡。

旧黄色坡体在上坡时仍遮住人物大部分躯干，PAO-6 已记录；高基准时远景/空白比例及旧相机取景仍属渲染范围。物理快照高度通过不表示已修复模型或相机，不宣称本任务改善这些旧问题。截图采样与快照读取相隔短时间，逐帧物理事实应以 JSON trace 为准。未做真机性能、视觉资产验收、音频听测。

## 历史保护与先前轮次

wrapper 在运行前备份 PAO-6、PAO-10 全证据目录及六张根截图，结束按 before/after 并集恢复，包含原文件被删除时的恢复。verified 共 **233 个历史路径逐字节/SHA256 核验通过**，本轮改写的60个结果复制到 `runs/verified/regression-output/`，历史原件已恢复。见 [history-restoration.json](runs/verified/history-restoration.json)。`history-backup/` 仅留本地应急，不提交重复资产。

- `initial`：新增4项通过，用于早期页面验证。
- `final`（中间轮，名称不表示最终验收）：19/20，旧 PAO-10 `N-mobile-production-touch` 在 `pao10-simulation.spec.ts:83` 等待 touch 跳跃时超时，错误上下文页面为 Main menu；记录 errors=[]。该轮运行时物理实现仍有修改，Vite HMR 重载是可能因素，不能仅据此断定原因或声称随机路况导致死亡。最终冻结源码后，原用例未经改动在 verified 通过。
- 中间轮清理最后根截图时遇 Windows `UNKNOWN(-4094)` open 错误；已从durable备份恢复233文件，并与 initial 最初 baseline SHA逐项匹配。见 `runs/final/recovered-history-baseline-check.json`。wrapper 增加 Windows 短重试后，verified 正常恢复、退出0。
