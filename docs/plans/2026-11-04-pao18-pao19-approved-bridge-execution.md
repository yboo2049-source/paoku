# PAO-18事件桥 / PAO-19 UI测量并行实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 18交付真实运动事实到动画/镜头的完整工程链；19并行交付可独立验证的UI占区producer及纯几何模块。

**Architecture:** 18的权威步内draft随成功提交发布，main唯一交付，audio/render独立确认；19的布局租约只输出只读几何，不触碰18活动入口。公共接线本轮仅归18；19接入相机留待固定18交付审查后另定集成基线。

**Tech Stack:** TypeScript、Babylon.js、Vitest、Playwright、Vite。

## 1. 批准与工作树就绪

2026-11-04，用户在[联合主审及具体范围](../reviews/2026-11-04-pao18-pao19-bridge-design-joint-review.md)请求批准后回复“继续 给出提示词”，据此批准两A设计、联合主审参数/最小扩围及下列限定实施。覆盖任务树候选稿中“待批准、仅设计”的阶段限制，未开放的技术边界仍有效。用户已选原聊天手动执行，不再询问同一许可、不自动创建Agent。

| 任务 | 复用实际目录 / 分支 | 本地HEAD=远端HEAD |
| --- | --- | --- |
| 18 | D:/worker/paoku-sessions/pao-18-font-diagnosis / codex/pao18-font-diagnosis | c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85 |
| 19 | D:/worker/paoku-sessions/pao-19 / codex/pao-19-ui | ff02092344fcef2f5a96f29f9762a01ea5043907 |

下发前已核验登记、顶层、分支、共同Git目录D:/worker/paoku/.git、含未跟踪项status为空，表中批准提交祖先exit0，ls-remote指定分支一致。两树已有node_modules，本次不重复运行游戏检查、安装或启动服务；过去成绩不算本批通过。仍沿用18历史字体目录名，它已包含控制器/镜头、获审字体和事实桥设计。不要另建树、改名或先移植原18。

## 2. PAO-18生产与测试白名单

可修改：`src/types/contracts.ts`、`src/core/simulation.ts`、`src/systems/input.ts`、`src/systems/physics.ts`的**观测/emit接缝**、`src/main.ts`的本批接线、`src/render/babylon.ts`、`src/render/characterView.ts`、`src/render/cameraRig.ts`的事实消费。

可新增：`tests/unit/pao18-fact-journal.test.ts`、`tests/unit/pao18-fact-producers.test.ts`、`tests/unit/pao18-fact-lifecycle.test.ts`、`tests/e2e/pao18-fact-bridge.spec.ts`；本树`docs/plans/2026-11-04-pao18-fact-bridge-execution.md`和`docs/evidence/PAO-18/fact-bridge-implementation/v1/`。必要设计澄清只更新本轮三份事实桥设计文档，记录与已批准设计的关系，不借机变更范围。

不开放：application/存档/结算/mission算法、audio.ts、core/eventBus/gameLoop/snapshot/inputQueue、types/index、surfaces/contacts、assets/environment/entityViews、UI/CSS/HTML/public/依赖/默认配置、旧测试和历史证据。不能改碰撞、合法动作、任务规则或姿态时长。新增专属辅助模块若确需超白名单，给最小路径/理由交主Agent，不擅自扩大。

### 18 Task 1：固定基线、保护和本树计划

1. 显式目标目录核对Git及祖先；按需读本树已批准fact-bridge spec/contract，重点FB01–17。记录所有拟改生产/新增测试及旧源/证据/固定资产的保护清单，输出留本树忽略目录`.pao18.local/fact-bridge/`。
2. 新增本树执行计划，按本白名单列具体接缝和每组RED命令；主Agent不编写游戏实现，具体实现细节由唯一任务执行方完成。
3. 执行`npm run build`、`npm run test`保存当前基线；若失败先区分环境/继承问题，不把旧65项成绩代替本批最终回归。初始化新门禁输出，保留首次失败。

### 18 Task 2：先RED，再提交事实日志及异常边界

Files：contracts.ts、simulation.ts；新pao18-fact-journal/lifecycle单测。

1. 写行为RED：同tick多事实/空tick、稳定身份、独立游标、同次stamp、只读payload、旧/未来水位拒绝、phase-only与WORLD_EDIT、失败步不得发布半批。
2. `npm run test -- tests/unit/pao18-fact-journal.test.ts tests/unit/pao18-fact-lifecycle.test.ts`。保存因缺少新行为而失败的断言，不以测试导入/编译拼错充RED。
3. 最小实现MotionFact/Stamp/Batch/Cursor/Read/Receipt、完整tick journal和原子提交。预算初值256批/1024事件、单tick64 draft；超限按完整批GAP、序号范围可诊断，合法输入和任务不受日志容量影响。时间取提交tick×stepSec，序号单调、不复用，不按ID字符串排序。
4. 失败步保留最后已提交snapshot、取消draft/待播音频并停该局推进；禁止重试受污染context，fresh-context经原应用门禁恢复。明确fault与REBASE、GAP、OK不同，不改交易服务来掩盖故障。
5. 每组修改执行`npx tsc --noEmit`及上述目标单测到GREEN；不提前开启半套生产模式。

### 18 Task 3：先RED，再真实producer与原任务语义

Files：input.ts、physics.ts观测段、simulation.ts、main.ts任务hook；新pao18-fact-producers单测。

1. RED以实际applyInputAction和updatePhysics调用证明来源，不只手造事件数组。初始jumping/rolling均false且无physics介入时，JUMP→ROLL→JUMP只有2次成功，最终true/true；ROLL→JUMP→ROLL有3次成功，状态false/true→true/false→true/true。无效命令仍可记原输入日志，但不生成事实/动作实例/音效/任务计数。
2. `npm run test -- tests/unit/pao18-fact-producers.test.ts`确认失败后，加入可选显式production观测能力，默认legacy调用保持原接口/emit；新模式关闭对应旧emit，仅在实际成功动作或现有didLand点复制事实。
3. ground/ramp/roof位置与Surface身份从producer当点读取，relativeImpactSpeedMps=null及明确reason。不得修改solver或用before/final vy伪造冲击速度，不进入车尾边界调查。
4. main owned-context成功输入hook保持trackAction在原afterStep奖励检查前，未完成任务才按既有逻辑计数；journal复投不增加奖励。先tsc及目标单测GREEN，再继续接线。

### 18 Task 4：先RED，再main单路交付与render消费

Files：main.ts、babylon.ts、characterView.ts、cameraRig.ts；上述新单测及新pao18-fact-bridge E2E。

1. RED：一帧跨多个实际模拟tick的LAND→新ACTION不漏；同clip新实例可区分，重复packet无双播；同次presentation时间/stamp，不改root位移；音频/旧通知/任务各单路，消费者失败互不drain。
2. main独占新production模式切换。原音频方法仅在成功提交后按原发生ordinal尝试一次，调用前记attempted；256调用/step上限显式诊断。coin/powerup/shield/collision/chase仅暂存原方法调用保时序，不新增这些权威事实，不改音效/素材/BGM策略。
3. 生命周期交付屏障覆盖副作用及receipt确认；observer重入的世界/phase命令在边界经原应用门禁串行执行，不递归flush、不让旧回执推进新局。
4. 同次presentation交只读事实批、timeSec/stepSec及epoch；角色与镜头消费后receipt，取消同epoch CONTACT_EDGE_ONLY双路。末tick/暂停待播/重开/世界编辑/迟到/释放按批准合同；镜头落地输入有界、未知impact不虚构强度。
5. `npx tsc --noEmit`及三个新unit文件逐组GREEN，新E2E先RED再GREEN。资源使用legacy/隔离夹具，不加载新runner，不接19动态布局。兼容旧门面和旧测试，不以删断言放宽规则。

## 3. PAO-19本轮生产与测试白名单（仅producer阶段）

可修改：`src/ui/dom.ts`的本桥登记/失效/量测/新增监听清理。可新增：`src/presentation/hudSafeArea.ts`、`tests/unit/pao19-hud-safe-area.test.ts`、`tests/e2e/pao19-hud-safe-area.spec.ts`、本树`docs/plans/2026-11-04-pao19-hud-safe-area-producer-execution.md`和`docs/evidence/PAO-19/hud-safe-area-producer/v1/`。本轮三份设计文档仅可澄清阶段交付，不改批准边界。

main、所有render/相机、types/application、业务事务/音频、旧views/CSS/HTML、public/依赖/配置、旧测试/历史证据均只读。**不实现真实应用帧接线或setHudSafeArea运行时消费，不做新相机求解器。** 新模块可独立导出纯换算函数供测试；本轮不把“能输出几何”当“相机已避让”。设计建议追加旧rebuild-ui用例在本轮改为新增专属E2E，保留全部旧断言更利于隔离。

### 19 Task 1：固定输入和只读阶段边界

1. 核对表中工作树；读取本树批准safe-area spec/contract、原UI主审末节及本计划，建立保护清单与本树执行计划。输出留`.pao19-hud.local/`或tests/e2e/.pao19-hud.local，防止Vitest误收Playwright。
2. build/unit记录当前基线，不重做已关闭菜单遮挡/重试P2。不得读取18活动目录，18接口参考仍用固定826b10f Git对象；不因18产物推进擅自改本树。

### 19 Task 2：先RED，再中立纯值几何

Files：新hudSafeArea.ts和pao19-hud-safe-area.test.ts。

1. RED覆盖H01/H08/H11：C=(30,20,390,844)、可见R=(46,44,100,48)、buffer780×1688应得到局部CSS(16,24,100,48)、buffer(32,48,200,96)；visual偏移不重复扣，DPR不直接乘，buffer比率取实际值。非法rect/零尺寸/unsupported transform返回明确不可用。
2. `npm run test -- tests/unit/pao19-hud-safe-area.test.ts`确认缺行为失败后，实现不可变值、验证/裁剪/归一化/纯buffer适配。env设备边界与HUD位移分开，safeInsets/顶部包络取max不重复加。
3. edge=top绘制面产生明确保守包络；间隙4 CSS px仅扩一次，向外1/64 CSS px量化。实际占区与包络分报，不能把侧列/toast扩成任意整边。每步tsc/unit到GREEN。

### 19 Task 3：先RED，再UI producer与租约

Files：dom.ts及新unit/E2E。

1. RED覆盖H02–H05/H09–H12/H16的producer部分：只登记真实绘制面、不漏兄弟Toast/背景反馈/inert HUD、滚动裁片与卡片全框、文本/道具/字体/交互态失效、同帧多dirty合并、producer/epoch/revision、释放与晚到。
2. 实现measureOcclusion、失效订阅、resetLayout/disposeLayout门面及只属本桥的observer/监听/探针。无main接线，新方法不自启动第二游戏循环；旧业务门面和命令/重试语义保持。尺寸或页基准无效整批UNREADY，不返回空数组冒充无遮挡。
3. dirty同步撤销可用性，读阶段仅在明确调用时一次批量采样；缓存读不触碰DOM。应用级canvas/viewport失效由接口显式传入，不能声称本轮已监听/接入未来main。
4. 新E2E通过真实应用UI及**只读测量夹具**调用公开producer，标明F的测量调度不是生产接线。N真实输入走已验收UI完整流程，量测不写业务状态；长数字/200%/inset等F与N分开。证明稳定菜单/HUD/暂停及旋转后几何与DOM一致，不声称最终角色投影/镜头避让通过。
5. `npx tsc --noEmit`、目标unit及新E2E逐组到GREEN；若旧业务出现回归，在本桥白名单内修复，不重写原UI或借机改CSS/main。无法在白名单实现的必要接口先给具体请求。

## 4. 两边最终门禁、证据与提交

- 每批代码修改立即tsc/unit；最终各自`npm run build`、`npm run test`、`npm run test:e2e`完整旧+新增suite通过，新增测试显式tsc，记录版本/计数/时长/skip/retry/flaky及首次失败。目标子集和旧成绩不得替代完整门禁。
- 独占端口18=5198、19=5189，启动前检查，strictPort/reuseExistingServer=false、1worker、retries0、Windows ANGLE D3D11。不得停其他任务服务。19纯几何不需要与18同时运行浏览器；最终完整E2E尽量错峰，避免本机GPU负载混淆。
- 旧E2E镜像仅可逆重定向输出；18仅允许沿已批准例外将其旧PAO-18录屏导航字面量5188→5198。反向还原须逐字一致，不改旧断言/时钟/超时/错误收集，不覆盖旧证据/根截图。新测试和输出在本树专属路径，排除误收。
- 18看真实多tick事件清单逐ID对receipt、N动作/暂停/重开、F地面/坡/车顶与重复/异常/溢出，配短录屏；默认查看2–3张真实新图，异常扩看。继续验证实际组暂停、root==presentation、资源稳态和幂等释放，不重验17美术。
- 19查看本轮桌面HUD、390最大HUD、暂停/旋转测量叠加三图，必要时扩看；实际DOM/发布值及原交互分别验证。H13真实相机投影、生产UI写→读→render接线及H14/H16的render策略留后续集成，不当本轮已实现。
- 新证据记录raw源码/HTTP身份、前后保护、N/F、未实现项与明确限制。共享规范/主仓进度仅Dispatcher写；执行方只交本树任务文档，不改Linear或父依赖，不相互读写活动树。
- 若完整旧suite出现车尾/预览或其他继承失败，保留首现场报告，**不扩大修复、不skip或重复跑到绿**；车尾KI-001/002继续延期。未过完整门禁不提交/推送生产批次，保留本地改动交主Agent。
- 全部相应门禁通过后，暂存仅本任务白名单，正常hooks、明确commit、push当前任务分支并ls-remote核SHA；不跳hook/强推/捎带其他改动。可有完整通过检查点的阶段提交，不能提交已知门禁失败批次。
- 返回固定SHA、检查证据、实际查看截图/录屏及阶段能力，等待Dispatcher独立验收；18不标父Done，19不把producer等同完整接入，不自动合并或继续公共接线。字体/17不重做，新runner/正式动作、音频重构、20/21不开放。

## 5. 手动提示词入口

18使用第1/2/4节：按获批合同完成真实事实桥及唯一main/render接线。

19使用第1/3/4节：本轮仅UI producer+中立纯值几何，main/render保持只读。

复制提示词后首次简报实际目录/分支/HEAD及本批阶段；发生HEAD推进先查新增，不reset，不重复请求本次已批准A方案。任何未批准跨界改动仍须交具体最小请求。
