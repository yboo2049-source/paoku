# PAO-18/19 限定接线实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在18现有事实桥和镜头上接入19已验收UI及真实HUD占区，交付同帧写读render、自然交互与最终三实体投影的可验证工程批次。

**Architecture:** main是唯一帧编排者，捕获同次presentation/AppSnapshot并执行UI写→批量读→纯值适配→render第三参；Babylon不读DOM、不改变事实或业务权威。UI与纯几何取固定19对象，CameraRig solver、模拟/交易/音频模块不动。

**Tech Stack:** TypeScript、Babylon.js、Vite、Vitest、Playwright/Chromium ANGLE D3D11。

## 1. 用户批准与实际基线

2026-11-06，用户对[独立主审的三个限定范围](../reviews/2026-11-06-pao18-pao19-integration-design-review.md)明确回复“批准”：串行接线、旧HUD布局断言归属例外、检查点同步及单项已知车尾失败的阶段提交/推送。无需再次审批同一设计、测试例外或发布范围；任何未列新范围仍只读。

目标已复用：D:/worker/paoku-sessions/pao-18-font-diagnosis，codex/pao18-font-diagnosis，HEAD=d303633e2539a26ca595438b51216a02900df92f。主Agent已正常推送3aa62fb/c5a9edd/d303633，指定远端同d303633，树干净、暂存空。只读UI来源D:/worker/paoku-sessions/pao-19、codex/pao-19-ui@b474845a972005b83f1278884b7dbe02c8af9615，干净/远端一致；通过固定Git对象取内容，不读写活动树。顶层/common-dir/登记、源祖先及30项内容保护已核验；已有node_modules，5198无实际监听。本轮未重新跑旧基线，320单测/71与1失败均不是新集成成绩。

准备稿以目标树的以下三文件为固定设计输入，状态文字中的待批/禁止实施由本计划及主审补充覆盖，其他技术边界保持：docs/superpowers/specs/2026-11-06-pao18-pao19-integration-design.md、docs/presentation/pao18-pao19-integration-contract.md、docs/evidence/PAO-19/integration-preparation/v1/README.md。[主审](../reviews/2026-11-06-pao18-pao19-integration-design-review.md)限定优先；不是整枝merge/cherry-pick许可。

## 2. 唯一执行方与精确白名单

所有下列路径相对目标18树；由原18聊天唯一实现方串行操作，主Agent只规划/调度/独立验收。无其他Agent、无新worktree、无跨树写入。

| 类别 | 精确路径 | 限定动作 |
| --- | --- | --- |
| 修改生产 | src/main.ts、src/render/babylon.ts | 主审批准的帧顺序、命令回执兼容、第三纯值参/尺寸门面、最终投影/局部pose保护与新增资源清理 |
| 固定来源替换/新增 | src/ui/dom.ts、src/ui/views/models.ts、src/ui/views/screens.ts、src/presentation/hudSafeArea.ts | b474845原字节迁入，按准备回执的4个blob验证，不自行改producer |
| 必要宿主适配 | src/style.css、index.html | 迁19布局并保留18同源@font-face/Canvas层级；index只继承lang/viewport-fit，不带外链字体 |
| 新纯值边界 | src/presentation/hudCameraInput.ts | HudCameraFrame/数值校验及CameraInput组合，不含DOM、总线或业务写入 |
| 迁入19测试 | tests/unit/pao19-ui.test.ts、tests/unit/pao19-hud-safe-area.test.ts、tests/e2e/rebuild-ui.spec.ts、tests/e2e/pao19-hud-safe-area.spec.ts | 原断言/故障注入/预算保持；仅批准的host读缓存、补齐替身能力和输出出口适配 |
| 新集成测试 | tests/unit/pao19-hud-camera-integration.test.ts、tests/e2e/pao19-hud-camera-integration.spec.ts | I01–I12剩余接线RED与真实最终投影/N-F传感器 |
| 旧HUD例外 | tests/e2e/pao18-controller-camera.spec.ts；新增tests/fixtures/pao18-legacy-hud.ts | 仅原149–150及227–238所在两段的旧布局归属/证据装配；原N行为护栏保持生产页面 |
| 本树计划/精简证据 | docs/plans/2026-11-06-pao18-pao19-integration-execution.md；docs/evidence/PAO-19/integration/v1/ | 本批实际步骤/命令、映射、hash、N/F、结果及限制，不覆盖旧证据 |

其余全部只读，特别是cameraRig.ts、characterView.ts、simulation/input/physics、core/eventBus/gameLoop、types/contracts、application/存档/交易、audio、environment/entityViews/assets、public及PWA/依赖/默认测试配置。旧PAO-6文件和其等待/断言不能动；不得带入B19那条额外reach(page,31)。共享核心规范/主仓进度只由Dispatcher更新。

## 3. 运行与取证固定条件

- Node/npm：C:/Program Files/nodejs/；Git：D:/APP/WorkBuddy/resources/vendor/PortableGit/cmd/git.exe。命令显式目标workdir，必要时仅本进程PATH前置既有npm shim、PortableGit/bin/cmd和Node路径，正常hooks、不跳检查。
- Vitest：node node_modules/vitest/vitest.mjs run [目标文件]；源类型：node node_modules/typescript/bin/tsc --noEmit；构建/全单测：npm run build、npm run test。
- 新测试显式类型检查：node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --target ES2023 --module ESNext --moduleResolution bundler --lib ES2023,DOM --skipLibCheck --allowImportingTsExtensions --allowArbitraryExtensions --typeRoots C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@types,./node_modules/@types --types node node_modules/vite/client.d.ts tests/unit/pao19-ui.test.ts tests/unit/pao19-hud-safe-area.test.ts tests/unit/pao19-hud-camera-integration.test.ts tests/e2e/rebuild-ui.spec.ts tests/e2e/pao19-hud-safe-area.spec.ts tests/e2e/pao19-hud-camera-integration.spec.ts tests/fixtures/pao18-legacy-hud.ts。
- 浏览器5198、strictPort、reuseExistingServer=false、workers1、retries0、D3D11；原load和60000ms用例预算、错误收集不变。DEBUG=vite:time,vite:transform保留。
- 本机QA脚本/配置/可逆测试镜像仅在本树忽略目录.pao18.local/pao19-integration/，不纳入提交；镜像以.pw.ts防Vitest误收，不新增跟踪配置。root外新输出D:/worker/paoku-diagnostics/pao18-pao19-integration-20261106/，与先前main-review分离。日志/trace/截图/录像/字体输出及所有显式evidence目录均隔离到该根；只改Playwright outputDir不够。先核绝对路径在项目外，不覆盖历史。
- 旧测试镜像仅输出重定向及既批准的录像导航5188→5198，反向还原必须等于当前批准后的目标测试字节；迁入19与新集成测试仅允许参数化输出。用--list确认完整用例清单，列举JSON另存，不覆盖实际运行结果。
- 原代码已审基线不重复完整跑；各逻辑任务先行为RED再GREEN，源tsc/目标unit即时验证；最终只做一次完整旧+迁入+新增suite，计数由实际列举得出，不沿用72或相加两树成绩。中间GREEN不擅自提交尚未过完整门禁的代码。

## 4. Task 1：固定源、保护和本树计划

1. 显式核对target顶层/分支/HEAD/status/common-dir、主仓登记、指定远端d303633及B19固定对象。HEAD若推进先审新增，不reset/clean/stash。确认无其他写入者及5198服务。
2. 按白名单和直接依赖建立保护清单：四份原字节源blob、目标旧测试/关键源/资产和历史证据。按需读取固定路径，不扫库；记录新旧测试来源及“旧三组布局断言→F夹具、原N行为→生产UI”的逐项映射。
3. 新增本树执行计划，指向主仓本计划/主审/四份共享规范，列命令、预期行为失败点、输出/提交边界。不要重做brainstorming或再申请已批准范围。
4. 建立新根外证据目录及本机QA配置；完整suite在代码完成前只列举，不执行。保留原71/72与所有历史错误。

## 5. Task 2：先立接线RED与旧布局护栏，再迁固定UI

1. 在新integration unit中为原main帧顺序及回执建立传感器：一次捕获view/app，update→measure→render、UI异常仍交事实、pending-before-dispatch、原身份/summary保留。原基线应在行为断言失败；不要把缺模块/缺mock方法当有效RED，必要时仅建立最小边界替身。
2. 运行node node_modules/vitest/vitest.mjs run tests/unit/pao19-hud-camera-integration.test.ts，保存首次RED和失败断言。新浏览器RED只针对尚缺门面/生产接线，不重复producer矩阵。
3. 按b474845迁入四份生产TS及四份专属测试，逐个核blob；仅调整批准的新迁入测试替身/host缓存读取/根外输出，保留其原断言与故障注入，记录补丁。
4. 建legacy fixture：固定c5a9edd的旧真实DOM/CSS来源与必要结构，保留原viewport/五行输入及三组布局数值断言。不伪造rect、不悄换生产CSS，不引Google；精确来源和装配方式入映射证据。fixture只供显式F兼容量测。
5. 仅移动旧controller-camera两段中的布局断言/证据归属。其N键盘/触摸仍加载生产新UI，lane、实际骨骼/组暂停、无横向溢出、恢复/重开及错误收集保持。不得将整段N重定向夹具、删断言或skip；新UI真实布局另由I02/I03验证。
6. 选择性适配style/index：19布局/断点/宿主层级，保留18两个同源font-face/public/PWA、原入口和17场景。源tsc及迁入unit检查；此时主机缺接线的行为RED仍保留，不能以复制UI算完成。

## 6. Task 3：纯值适配与Babylon第三参，RED→GREEN

1. 新unit补I05/I06/I07/I09 RED：CSS/buffer仅换算一次、尺寸二次核验、布局/事实代际分离、null/UNREADY非safe、旧二参兼容、已有options保留、缺实体不可全体safe。签名按已批准契约HudCameraFrame、getPresentationSize和render第三参，不新建setter/总线。
2. 运行目标unit保存RED；只实现hudCameraInput纯值边界及babylon局部门面。保留前两参、MotionReceipt、角色/追逐者同步、原事实消费和动画；不改CameraRig solver/characterView。
3. 新桥每帧显式传第三参，即使null；仅旧入口缺第三参才兼容legacy profile。以实际engine尺寸构造CameraInput，reducedMotion等非几何选项保留，不spread整包几何或清空原options。
4. I04/I05/I08 RED证明：UNREADY不能吞落地或伪记消费；局部pose保护后按当前实际bounds重算projection；PAUSED/GAMEOVER实际组和pose/FOV保持，resize只更新aspect/诊断。无本局pose按批准规则初始化，不借旧局pose。
5. 最小实现后运行源tsc和目标unit到GREEN；普通桌面/390三实体必须可见且避开实际HUD。刻意无解单独报FRAMING_CONFLICT/NO_SAFE_REGION，不移动/缩放actor、改追逐距离或隐藏实体。

## 7. Task 4：main唯一同帧编排和UI命令兼容，RED→GREEN

1. 按I01/I08/I10补真实主机RED，覆盖UI写读顺序、同一presentation/AppSnapshot、同帧晚dirty、布局异常/重入暂停重开、命令pending/result及完整summary。保留原18故障局、pauseBarrier、deliveryGeneration和streamEpoch守卫。
2. main捕获一次只读view/app，帧作用域readApp在finally清理；inDelivery覆盖UI写读render。先update一次，再批量读基准/measure/normalize/buffer适配，最后render；去掉尾部第二次UI更新和另取snapshot拼UI。展示frameId独立单调，暂停也递增。
3. UI/量测异常单独诊断，仍交原事实/实体；只有真正render失败才走原RENDER_EXCEPTION路径。尺寸/租约晚失效交不可用几何，不同帧第二次measure，不回旧profile假报safe。
4. 接现有UI pending/result、同意图重试commandId/封存summary、TOGGLE_AUDIO身份透传及故障局拒绝回执；业务幂等/存档/奖励规则不动，不双Toast，不让旧run回执清新局等待。
5. 订阅/基准监听只失效，不在回调读DOM；成功新局reset布局租约，暂停恢复仅失效。disposeGame停止循环、撤销订阅、disposeLayout和renderer幂等；不声称治理旧UI全部监听。
6. 源tsc、迁入与新增unit到GREEN，再跑新增集成E2E目标组。I01–I12逐项给实际证据，禁止只验传参而不验最终投影。

## 8. Task 5：最终一次完整门禁、截图与保护

1. 代码完成后运行npm run build、npm run test、源及本计划列出的新测试显式tsc，全部exit0；执行原字节固定源、白名单、旧测试映射和保护检查。
2. QA镜像只输出重定向，先--list保存完整清单/预期数量/来源；检查没有grep/skip/重试、所有输出在新根外、5198仅本次拥有，旧PAO-6原断言和等待保持。
3. 使用本树新专属配置执行一次完整旧+迁入+新增E2E，保存真实退出码、JSON、raw/HTTP源身份、服务日志和首失败trace；没有新源码变化或新裁定不再完整重跑。不要将分段成功拼成单次完整通过。
4. N真实新上下文键盘/390触摸；F标明注入/夹具。至少包含正常桌面与390最终三实体成功投影，长数字/四buff/Toast、dirty/迟到/reset/dispose、暂停旋转和尺寸变化。不可用/模态/刻意无解独立报告。
5. 实际查看默认2–3张本轮关键图（正常桌面、390最大HUD、暂停旋转），异常扩看；短录屏涵盖跳滑、布局失效和暂停旋转，不能只靠静图签收冻结或动作自然性。暖机后20轮页型/失效、10reset及dispose验证host新增资源不累计，保留真实计数。
6. 收尾本次服务，确认5198无实际监听，不停止其他任务。只读副本/精简证据入本树新integration/v1，原始大输出留根外；不覆盖准备、旧18或19历史证据。

## 9. 失败裁定与正常提交/推送

仅两种情况允许本批代码阶段提交：完整suite全部通过；或**唯一失败**仍是未改tests/e2e/pao6-baseline.spec.ts的ramp-roof-jump-land在roof-exit-land预期PLAYING/实际GAMEOVER同一断言，且其余全部新旧门禁（含源/测试类型、build/unit、实际投影、图/录屏/保护）通过。后一情况来自用户本次明确例外，必须写真实计数/exit1和未知根因，不能写全绿、skip/expected failure或扩大豁免。

若出现任何新失败（含旧HUD兼容/正常新UI投影/命令回执/资源）、不同车尾断言或其他继承失败：保留首现场/最终完整计数并停止交主审；不借本例外提交、不改旧断言/超时或循环重跑到绿。车尾/预览仍不修复/复现，旧候选不移植。

允许提交时逐项检查暂存区仅本白名单；正常hooks、明确commit、push当前任务分支并ls-remote核SHA，不强推、不跳hooks、不捎带本机配置或外部输出。全部检查与stage风险可先汇成精简证据，再一次提交；不要为每个RED/GREEN或可逆搬文件都提交半成品。

交固定SHA、实际完整成绩/例外分类、N/F与真实图/录屏入口、保护清单和未实现项待Dispatcher独立主审。任务方不自动合并/继续20/21、不标父18 Done或解除依赖，也不将本批工程等同正式runner/13动作/真机预算验收。

## 10. 给原PAO-18聊天的手动提示词

```text
用户已批准18/19限定接线、旧HUD布局归属最小例外、检查点同步及单项已知车尾失败的阶段提交/推送，不再申请同一批准。
复用D:/worker/paoku-sessions/pao-18-font-diagnosis，codex/pao18-font-diagnosis；主Agent已推送d303633e2539a26ca595438b51216a02900df92f，远端一致、树干净。
唯一UI源b474845a972005b83f1278884b7dbe02c8af9615，只读Git对象，不读写19活动树，不新建树/启动其他Agent。

先读D:/worker/paoku/docs/plans/2026-11-06-pao18-pao19-approved-integration-execution.md及其中主审/本树设计契约，按精确白名单执行；先核实际Git，HEAD推进先审新增，不reset/clean/stash。
先本树计划/保护与行为RED，再迁固定UI、纯值第三参、main同帧UI写→批量读→render及既有命令回执适配，保持18事实/重入/故障/字体/冻结。
旧HUD三组布局断言原样移到明确F兼容夹具；原N仍跑生产新UI的输入/实际组暂停/重开/错误护栏，不能整段改夹具或删除断言。新UI真实DOM与最终三实体投影另验。
主Agent不写实现，原聊天唯一执行方按计划落地。cameraRig solver、simulation/input/physics、application/audio、资产和其他旧测试只读；不合并整枝，不带19那条车尾等待行。

QA沿5198 strictPort/不复用/DEBUG/原load60秒/retries0，全部产物根外新目录；源/新测试types、build/unit、I01–I12及一次完整旧+迁入+新增suite和本轮图/录屏/保护按计划完成。
仅唯一仍为原PAO-6 roof-exit-land的PLAYING→GAMEOVER且其余全部通过时，才按已批准例外真实记录失败后正常hooks提交推送；任何新失败留首现场停止，不循环换绿。车尾/预览不恢复。
返回固定SHA/远端核验和完整证据待独立验收；不自动合并、标父Done或启动20/21。
```
