# PAO-18/19 本树接线 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 固定19 UI接入18事实桥，单帧UI写→读→render，保留真实冻结、同源字体与独立receipt。
**Architecture:** main唯一编排，Babylon第三纯值参数；四份UI/geometry TS原字节取b474845。CameraRig/CharacterView/模拟/业务只读。
**Tech Stack:** TypeScript / Babylon / Vite / Vitest / Playwright Chromium D3D11。

## 授权与固定输入

[获批主计划](D:/worker/paoku/docs/plans/2026-11-06-pao18-pao19-approved-integration-execution.md)和[独立主审](D:/worker/paoku/docs/reviews/2026-11-06-pao18-pao19-integration-design-review.md)优先。[设计](../superpowers/specs/2026-11-06-pao18-pao19-integration-design.md)、[契约](../presentation/pao18-pao19-integration-contract.md)技术边界沿用，待批准文字由本授权覆盖。共享规范只读当前2026-11-06段：[架构](D:/worker/paoku/docs/ARCHITECTURE_DESIGN.md)、[流程](D:/worker/paoku/docs/SYSTEM_WORKFLOW_SPEC.md)、[测试](D:/worker/paoku/docs/TEST_PLAN_AND_SENSORS.md)、[需求](D:/worker/paoku/docs/PRODUCT_REQUIREMENT_DOCUMENT.md)。

原树 codex/pao18-font-diagnosis，起点/远端d303633e2539a26ca595438b51216a02900df92f，干净；UI Git对象b474845a972005b83f1278884b7dbe02c8af9615。独占main/render，无其他Agent/新树。准确生产、测试与文档白名单完全依主计划第2节，不修改其他文件。

## Task 1：保护与行为RED

1. 核Git/远端/common-dir/worktree登记和5198无监听；建立索引blob保护、关键源/旧测试/字体SHA256和固定UI blob记录，原历史证据不覆盖。
2. 本机脚本仅.pao18.local/pao19-integration，原始新输出仅D:/worker/paoku-diagnostics/pao18-pao19-integration-20261106；先确认新根存在状态和绝对位置。
3. 新tests/unit/pao19-hud-camera-integration.test.ts以真实main/真实Simulation、隔离DOM/render边界替身驱动GameLoop展示回调；断言UI update→measure→render、同一view/app、UI异常仍交事实、命令pending身份。原代码应行为断言RED，不能把缺模块/替身报错记RED。
4. node node_modules/vitest/vitest.mjs run tests/unit/pao19-hud-camera-integration.test.ts；留首RED输出。后续每一新增数值/冻结行为先追加RED再实现，工程性编译/测试替身问题单独记录。

## Task 2：固定UI与旧HUD归属

1. 从B19原字节迁四份TS：src/ui/dom.ts、src/ui/views/{models,screens}.ts、src/presentation/hudSafeArea.ts；逐一核blob。
2. 从B19迁四份专属测试；只改批准的生产host读cache/隔离F采样、补齐mock、根外输出，不动原断言/故障/预算。
3. tests/fixtures/pao18-legacy-hud.ts携固定c5a9edd真实旧DOM/CSS（不含外链），显式F页面装配。旧controller-camera仅移149–150旧top/bottom112和227–238旧五行bottom240三组布局断言到该F夹具，保留数值/viewport/五行输入。
4. 原N仍生产UI：lane、真实骨骼/组暂停、无横向溢出、恢复重开与错误断言全部保留。证据mode/profile归属更新为production19。
5. src/style.css采用B19布局+18原两个同源font-face，index仅lang/viewport-fit；不带19Google字体或车尾reach(31)，不动PWA/public/17场景。
6. 源tsc和迁入unit验证；main接线RED仍留到Task4。

## Task 3：纯值与Babylon第三参

1. 新unit追加行为RED：实际buffer、仅换算一次、UNREADY/null不safe、页型/旧二参/选项、缺实体、尺寸中途变化。
2. 新src/presentation/hudCameraInput.ts声明契约HudCameraFrame并校验/组合CameraInput，无DOM/总线/业务。
3. src/render/babylon.ts新增getPresentationSize()、render第三参和只读hudDiagnostics。保持前两参与MotionReceipt；保留reducedMotion，实际尺寸优先；新桥不可用不当旧profile。
4. 用真实NullEngine/Babylon单测追加冻结RED：UNREADY保持本局已呈现pose且落地消费一次，最终投影在poseguard后计算，PAUSED/GAMEOVER真实组/pose/FOV冻结，reset/dispose不可复活；不得跳CameraRig事实消费。
5. 最小门面实现，不改solver/CharacterView/actors。node node_modules/typescript/bin/tsc --noEmit及目标unit GREEN。

## Task 4：main单帧接线与反馈

1. Task1传感器继续RED；追加同帧晚dirty、重入/异常、完整summary和重复pending行为RED。
2. main帧作用域捕一次presentation/app/view，inDelivery覆盖UI写读render；独立frameId，UI只update一次，measure→normalize→实际buffer换算→render(view,identity,hud)。
3. 布局异常不能记为RENDER_EXCEPTION、不能吞事实；尺寸/代际不符交不可用，原audio/render cursor、faulted/pauseBarrier/streamEpoch保持。
4. 只兼容UI pending/result、commandId/完整summary、TOGGLE_AUDIO透传和故障局拒绝结果；application/audio/奖励规则原字节。
5. host订阅及canvas/viewport监听仅失效，成功新局resetLayout，暂停恢复invalidate；finally清帧app，dispose幂等。
6. 源tsc、迁入/新增unit GREEN。新tests/e2e/pao19-hud-camera-integration.spec.ts覆盖I01–I12；只针对新增门面先做有限浏览器RED，目标组GREEN后不反复跑旧suite。

## Task 5：完整门禁与发布

1. npm run build、npm run test、源tsc、新测试显式tsc全部通过。显式命令：
    node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --target ES2023 --module ESNext --moduleResolution bundler --lib ES2023,DOM --skipLibCheck --allowImportingTsExtensions --allowArbitraryExtensions --typeRoots C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@types,./node_modules/@types --types node node_modules/vite/client.d.ts tests/unit/pao19-ui.test.ts tests/unit/pao19-hud-safe-area.test.ts tests/unit/pao19-hud-camera-integration.test.ts tests/e2e/rebuild-ui.spec.ts tests/e2e/pao19-hud-safe-area.spec.ts tests/e2e/pao19-hud-camera-integration.spec.ts tests/fixtures/pao18-legacy-hud.ts
2. 本机QA配置5198 strictPort/reuseExistingServer=false、workers1/retries0、D3D11、DEBUG=vite:time,vite:transform、load和60000ms不变。旧测试镜像仅重定向输出/5188录像导航→5198，反向等于目标字节。先--list记录来源和实际总数。
3. 只执行一次完整旧+迁入+新增suite；保留JSON/退出码/raw/HTTP/服务日志/首失败trace。不得拼分段成绩。
4. I01–I12实际证据：普通桌面/390三实体成功最终投影；最大HUD、侧列/Toast、dirty/迟到/reset、暂停旋转/DPR/实际buffer；N键盘/触摸与F分报。暖机20轮布局/页型+10reset+dispose真实计数。
5. 实际看2～3本轮关键截图与跳滑/失效/暂停旋转短录屏，正常/不可用/模态/刻意无解分开；收尾仅本次5198服务。
6. 检查白名单/固定四blob/旧断言映射/保护hash、git diff --check，精简证据只入docs/evidence/PAO-19/integration/v1，原大输出根外保留。
7. 仅全过，或唯一失败仍为未改PAO-6 roof-exit-land的PLAYING→GAMEOVER且其余全部门禁通过，才按已批阶段例外正常hooks一次提交/push/ls-remote核SHA；真实记录exit1，不能写全绿。任何新失败留现场停止交主审，不循环重跑、不恢复车尾调查。
8. 不合并、不标父Done、不解除依赖、不进入正式资产/20/21。

## 记录

实际步骤、首RED/GREEN/完整门禁及限制统一记本批integration/v1/README和JSON；任务过程中不创建半成品提交。任何代码门禁尚未完成均不称验收完成。

类型主审接续后已通过显式types/build、完整unit352/352，完成唯一完整E2E（106项，103通过/3项新失败）。按新运行时失败停止规则保留全部WIP，未提交推送；详见[接续回执](../evidence/PAO-19/integration/v1/FOLLOWUP.md)。未自动追加完整重跑或改变旧测试/预算。

2026-11-07 依[独立主审与最小修复指令](D:/worker/paoku/docs/reviews/2026-11-07-pao18-pao19-integration-followup-review.md)完成白名单内最小修复与本机镜像输出隔离补齐，依次通过源码 `tsc`、显式新测试 `tsc`、`npm run build`、串行全量单测（34文件 353/353）、定向复验（17/17）及唯一一次完整 106 项 E2E（106/106 全部通过，exit 0）；详见[最终门禁回执](../evidence/PAO-19/integration/v1/FINAL_GATE.md)。
