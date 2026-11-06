# PAO-18 / PAO-19 接线契约候选 v1

2026-11-06。限定集成准备，供主审冻结；以下新增签名均是拟议接口，当前未实现。目标18=c5a9edd103eaf3677a058b432c67ad9260450e4e；唯一19来源=b474845a972005b83f1278884b7dbe02c8af9615。参见[设计](../superpowers/specs/2026-11-06-pao18-pao19-integration-design.md)、[回执/固定 blob](../evidence/PAO-19/integration-preparation/v1/README.md)。

## 1. 已有 producer 门面与责任

以下签名来自 B19 src/ui/dom.ts / src/presentation/hudSafeArea.ts，不是本准备发明的生产能力：

    measureOcclusion(basis: MeasureBasis): UiLayoutSnapshot
    readOcclusion(): UiLayoutSnapshot | null
    invalidateLayout(reason = 'DIRTY'): void
    subscribeLayoutInvalidation(listener: (notice: LayoutNotice) => void): () => void
    resetLayout(): void
    disposeLayout(): void
    normalizeOcclusion(s: UiLayoutSnapshot): CanvasLayout
    toBufferGeometry(s: CanvasLayout, width: number, height: number): BufferGeometry

UIManager 所有 DOM 登记、env探针、字体/转场/scroll/ResizeObserver 和布局租约；readOcclusion 只读缓存。main 所有订阅、canvas/viewport基准、采样时机/单调frame序号和renderer调用。renderer 只收纯值，拥有最终 CameraInput/实际投影；不查询 HUD 或绑定 DOM 输入。正常 UI 业务 intent 继续经原总线/application，不经本通道。

MeasureBasis 包含 sampleFrame/page/runId、canvasRect、可选canvasTransform、layoutWidth/layoutHeight、visual矩形/visualScale。UiLayoutSnapshot 增加 producerId/epoch/layoutRevision、READY/UNREADY/RELEASED、profile/modal、deviceInsets/surfaces/reason。CanvasLayout 空间 canvas-css；BufferGeometry 空间 buffer，含 rawReservedRects/reservedRects/safeArea 和同一布局身份。不可用结果的0尺寸/空数组只是占位，不能当成无遮挡成功。

## 2. 精确冻结的消费入口提案

采用 render 第三参数作为等价数值入口，不另建 setter 缓存/总线。以下声明放拟议 src/presentation/hudCameraInput.ts；复用 B19 Page/BufferGeometry 和现有 CameraInput/RenderFrameIdentity 类型，不改共享 contracts：

    type HudCameraFrame = Readonly<{
      frameId: number;
      consumerGeneration: number;
      page: Page;
      runId: string | null;
      geometry: BufferGeometry | null;
      unavailableReason: string | null;
    }>;

BabylonRenderEngine 拟议公开签名：

    getPresentationSize(): Readonly<{ width: number; height: number }>;
    render(
      ctx: DeepReadonly<GameContext>,
      frame?: RenderFrameIdentity,
      hud?: HudCameraFrame
    ): MotionReceipt | undefined;

getPresentationSize 仅返回 engine.getRenderWidth()/getRenderHeight() 数值，不读DOM、不resize、不新增循环。render 的现有前两参/返回语义保留；第三参缺省为明确旧入口兼容，使用原 presentationOptions/legacyHudProfile。已激活19新UI的主机每帧必须传第三参，即使 geometry=null；不能用省略参数偷偷回退旧UI。

生产端是 main；消费端是 Babylon 门面。frameId 为展示调用序号，安全整数且本host单调递增；consumerGeneration 仅隔离该host的布局消费生命周期（换producer/重建/释放），不写入事实stamp。相同UI实例的 reset 使用新 epoch；不同 producerId 由显式订阅切换授权，不按 revision 大小跨实例竞争。

geometry 保存已换算的身份与数值；READY 时 unavailableReason=null，不可用时保留原 reason或明确 HOST_MEASUREMENT_FAILED / STALE_LAYOUT。geometry=null 用于首次无样本/读异常/租约被撤销，不代表SAFE。page/runId来自本次同一 AppSnapshot；几何中的 page/runId 必须一致。frame.appState=page，但 UI runId=null 不能与事实 podium runId 作等值要求。

renderer 不保留下一帧可消费的 hud 参数。可保存深复制的只读诊断；reset/dispose 清诊断可用性，不能使旧值复活。该设计不依赖 reset 清 setter 的时序。主机只允许一次当前调用；当前生产新入口不从异步回调重送旧帧。

## 3. 单帧写→读→render

| 顺序 | 唯一动作/输入 | 必须保持 |
| --- | --- | --- |
| 0 | main 捕获一次 presentation=simulation.presentation(alpha)、app=application.snapshot、事实读取和 RenderFrameIdentity | 原 stamp/tick/timeSec/stepSec 一致性及renderCursor规则；不以render帧伪造producer事实 |
| 1 | 建立帧作用域app/readApp和同一legacyView(presentation.context, app)，inDelivery屏障覆盖该帧 | UI/renderer不写模拟，重入生命周期沿18队列/generation守卫，不另读最新ctx混帧 |
| 2 | uiManager.update(view)，完成文本/页面/Toast/buff/控件写入 | 只有一次update；producer自己刷新登记及dirty |
| 3 | main 一次批量读canvas内容框/轴对齐transform、layout/visualViewport；调用measureOcclusion(basis) | 不读HUD选择器；canvas CSS不得含未扣border/padding，不支持变换报UNREADY |
| 4 | 校验当前producer/epoch/page/run/generation、normalizeOcclusion → 读取实际buffer尺寸 → toBufferGeometry | 同帧一次转换；缓存按布局身份+实际buffer尺寸，不能仅按revision |
| 5 | 若读取后发生失效则交null/UNREADY，不同帧再次measure；render(view, identity, hud) | 无论布局是否可用仍交完整事实/实体；调用前生命周期变化则整帧作废，cursor未消费留待下一次有效交付 |
| 6 | renderer再核实际buffer/页面；构造currentCameraInput，既有角色/追逐者更新、同帧bounds、相机、最终投影、实体和scene.render | MotionReceipt照旧；布局拒绝不能变成MotionReceipt.REJECTED或fake COMPLETE |
| 7 | main按原规则处理COMPLETE/REJECTED/RENDER_EXCEPTION；finally退出帧作用域和屏障 | audioCursor完全独立；UI/量测异常不走render异常记账 |

实际buffer在步骤4与6间变化，布局诊断置UNREADY/BUFFER_SIZE_CHANGED，本帧不再换算或读DOM，下一帧重读。正确的缓存READY样本可具有较早sampleFrame：其basis/租约仍有效即可，不将暂停tick不变误认成旧帧。

ui.update/measure/normalize的异常单独捕获，生成不可用HUD并继续render。只有render实际尝试失败才沿18原异常receipt/cursor处理。事实多tick、重复eventId、暂停重开与迟到读无一由布局通道重解释。

## 4. 单位、现有选项和诊断

CSS client 坐标减canvas原点一次；visualViewport已经用client空间矩形表达，不再减offset或乘zoom。normalizeOcclusion 按设备/视觉可见交集取边界，top登记组才形成顶部保守包络。toBufferGeometry 对 x/width 乘 renderWidth/cssWidth，y/height 乘 renderHeight/cssHeight。禁止乘 devicePixelRatio；非等比例差超原函数阈值为 BUFFER_ASPECT_MISMATCH。原4 CSS px扩张仅在该函数发生一次，rawReservedRects供审计。

currentCameraInput 为 Babylon 每次调用局部构造的最终值，不是主机新schema：
- 始终使用实际 engine width/height；保留 presentationOptions.reducedMotion 和既有非几何参数。
- READY gameplay 仅覆盖 safeArea/reservedRects；不能将整个BufferGeometry spread进CameraInput。
- 旧二参路径沿原 presentationOptions 和明确legacyHudProfile。
- 新桥不可用时不重用旧READY或旧UI profile作可用几何。调用原rig所需临时输入可为实际buffer+零insets/空rects，但这一占位不得发布safe；局部pose保护保证不会因撤销约束突然重新构图。
- MENU/SHOP 不把全屏dimmer/卡片传入solver；只对既有展台最终姿态计算真实遮挡。PAUSED/GAMEOVER不重新求解。
- 清理布局消费不调用 setPresentationOptions({})；UI CSS prefers-reduced-motion 与renderer局部reducedMotion保持各自既有输入，不新增设置页/存储/UI桥。

renderer 新增只读诊断候选入口为其 hudDiagnostics getter；main 可在既有只读QA传感器转发深复制值，不引入生产业务写口。最小字段：frameId/page/runId、producerId/epoch/layoutRevision/sampleFrame（有则记）、consumerGeneration、status/reason、实际buffer、raw/expanded rects、最终CameraInput、frozen/holding、最终三实体投影和冲突。测量状态与projection结果分别记录；无READY时总safe=false/unavailable，即使空矩形投影数学上通过。

finalProjection 复用 projectActors(camera, actors, input) 在最终camera/poseguard后计算，不能直接读 modal 早退的旧CameraRig.status.projection。三实体必须取同帧实际可见几何bounds，骨骼姿态后计算；缺实体/未加载状态如实标注，不能把空列表.every=true签收全体可见。raw和间隙投影、几何合法性、frozen三种结果分开。

## 5. 状态和失效行为表

| 状态/触发 | 采样/租约 | 相机/动画/事实 |
| --- | --- | --- |
| PLAYING + READY gameplay | 当帧写后测，或有效cache；实际尺寸匹配 | 原solver消费动态safeArea/rects；最终同帧三实体投影。事实/动画仍由18原通道决定 |
| dirty/UNREADY/首样本缺失 | 立即撤销旧READY，不可用不是空HUD | 当帧仍交事实/同步实体；不发布safe。已呈现camera pose在本帧末保持，不退回固定旧profile重新构图 |
| 首次renderer/新局尚无已呈现pose | 仍UNREADY，不能借旧局camera当新局保证 | 允许原18初始化建立本局基线，无额外布局求解承诺；之后不可用帧保持最近本局已呈现pose |
| MENU/SHOP | 当前卡片/实际可见面，dimmer排除，profile=menu/modal | 既有展台/环视，保留reducedMotion；只诊断遮挡，不要求当前solver已有菜单避让 |
| PAUSED/GAMEOVER | 主循环展示帧仍可写读和更新diagnostic；页面布局换代与事实epoch分开 | 实际AnimationGroup暂停，camera position/target/rotation/FOV不因HUD变化移动；不追跑dt/clip，不重播事实音频 |
| resize/旋转/visualViewport scroll/resize | main invalidate；下一批基准+buffer重校验 | 模态只更新aspect/最终投影诊断，姿态不变；非模态恢复READY才用新布局 |
| measure后同帧晚dirty | 该帧UNREADY，最多一次DOM测量 | 不重试量测；保持pose/继续事实，下一展示frame重采 |
| hidden→visible | 隐藏不量测，恢复先invalidate；沿原resetClock | 不补跑表现/模拟，使用新基准 |
| reset/new run/producer替换 | 撤销旧订阅/epoch预期，resetLayout或换实例，清布局缓存；迟到值拒绝 | 不清另一通道事实序号；原18成功生命周期重置由其已有入口执行 |
| RELEASED/dispose | 退订host事件/lease，disposeLayout幂等；迟到font/observer无权激活 | 沿18dispose真实资源；不为RELEASED再render；旧二参兼容仅由显式未启用新UI的host选择 |

局部pose保护只在babylon门面：在CameraRig更新前保留最近本局已呈现position/target/rotation/FOV；UNREADY时仍执行既有事实消费/时间推进，再恢复可见camera pose并重算finalProjection。不能将 CameraRig.sync 直接跳过而吞掉落地；不能回滚真实动画/内部事实序号或日后重放事件。PAUSED/GAMEOVER沿已有冻结优先，布局不能解除冻结。此行为必须由下列RED验证；若不能在门面实现，提出最小例外请求，不改solver碰绿。

## 6. 命令UI兼容，不改业务规则

19 UI intent 自带commandId/runId，notifyCommandPending/Result有实装；18 main 尚未调用它们，TOGGLE_AUDIO尚未透传身份。直接替换UI无法满足19反馈/未知提交回归。未来main按设计第4节逐项接入，保留18 inDelivery/streamEpoch/faulted/pauseBarrier 和完整summary封存。

同一完整意图的重复pending通知/回执只处理一次；失败后未改意图用原commandId和已封存summary；改音量字段值、回访菜单/新局等沿19InteractionScope生成新身份。失败回执不能覆盖其他run；旧请求不能改变新局页面。服务幂等/余额/奖励/存档规则仍归application。不能通过几何reset清掉业务未知提交状态。若需改application或交易规则，则本白名单不足，停止请求。

## 7. 剩余接线 RED 矩阵（尚未运行）

| 编号/来源缺口 | 层级及输入 | 失败传感器/期望 |
| --- | --- | --- |
| I01 同帧顺序 | 新unit spy及F真实DOM；score变长、4buff/Toast同一帧写入 | 唯一update→measure→render顺序；UI与角色使用同一view/app，stamp匹配，不能下一帧才避开 |
| I02 H13真实投影 | 390×844、桌面1440×900，当前加载/回退三实体 | 对最终实际bounds逐实体检查front、视口/安全边界、raw/expanded rect相交；不得只断言传参；conflict如实失败分类 |
| I03 H13复杂占区 | 15位数字、四buff侧列、Toast/反馈、滚动变化 | 实测DOM与snapshot对应；现有solver能解才safe，不能解报conflict；不改actors/模拟位置/追逐距离 |
| I04 H14模态 | N暂停/结束/菜单/商店；F暂停旋转、字体/viewport失效 | 实际AnimationGroup保持paused；camera pose/FOV冻结，aspect/最终投影可变；dimmer不驱动镜头；无新事件/音频重播 |
| I05 H16失效首帧 | READY→dirty、读异常、measure后晚失效 | 同步撤销旧几何；当帧继续事实/实体，camera pose保护；unavailable不能safe，下一frame可恢复，无重复DOM读 |
| I06 实际buffer | DPR1/2、偏移canvas、非1倍buffer、visualViewport、尺寸中途变化 | 一次CSS→buffer；原4px只扩一次；aspect mismatch/变化拒用，不把DPR当尺寸 |
| I07 H16生命周期 | reset/新局同ID、换producer、晚旧epoch/observer/font、重复dispose | 旧lease不复活；host监听退订；无跨局几何，原MotionCursor跨局规则和资源释放仍成立 |
| I08 事实不中断 | 多tick含落地/跳滚/换道，布局UNREADY/异常/重入暂停重开 | producer→render receipt无漏/重复；audio独立且旧音效不双播；换道不覆盖垂直锚点、新局floorTick正确，UI错误不伪记RENDER_EXCEPTION |
| I09 兼容options | 原二参旧UI、三参新UI未ready/撤销、reducedMotion开关 | 仅旧路径legacy profile；非布局options保留，width/height不能覆盖实际buffer；冻结/低动态不变 |
| I10 命令回执 | N键盘/触摸和F pending重入、丢ack/迟到结果、终局重试、改音量 | 同一commandId完整summary与字段意图；pending结清、错误不双报；旧18故障局保护不回退 |
| I11 释放与资源 | 暖机后20轮布局失效/页型切换、10reset及dispose | 监听/observer/probe/帧任务不累计；19producer自身矩阵不重写，只验证host额外资源和renderer释放衔接 |
| I12 UI宿主保护 | 390/桌面N交互及F布局，raw/HTTP请求 | main/style/index选择性迁入；无Google外链字体，旧同源字体可取/PWA配置保留；Canvas/UI层级/触摸/焦点可达 |

建议新增 tests/unit/pao19-hud-camera-integration.test.ts 与 tests/e2e/pao19-hud-camera-integration.spec.ts；原19测试仅迁入其固定断言，不重写整套producer RED。N必须真实新上下文键盘/390 CDP触摸无QA业务写；F注明合成业务/布局输入、故障和只读观测。真实DOM与最终投影结果分报，图像不替代数值，静图不证明跳滑自然。

## 8. 原测试保护与未来门禁

18 tests/e2e 全目录及既有unit保持原字节。重点保护 pao18-controller-camera / pao18-fact-bridge、font-resources、pao17-*、pao14-* 以及 pao6-baseline 的断言/等待条件。B19 的 pao6-baseline 相比18在roof-jump前多了 await reach(page,31)，本次不能带入；这不是UI迁入的一部分，也不推断能解决当前失败。

已知语义冲突须单列而非声称兼容：18 pao18-controller-camera.spec.ts:149–150 强制speedometer/buffs在底部112px，227–238强制旧五行buff在底部240px；B19速度表在top readings、手机buff是侧列。不能在不改变装配/护栏归属的情况下承诺这些旧常数检查适用于新UI。最小例外请求见设计第7节：仅该文件两段页面装配/证据分类和新 tests/fixtures/pao18-legacy-hud.ts，保留原旧布局断言于明确兼容夹具；生产N输入/冻结/重开护栏与新UI真实投影继续覆盖。尚未批准，当前不改旧文件、不跳过用例，不因此放宽任何运行失败。

B19 专属来源：tests/unit/pao19-ui.test.ts、pao19-hud-safe-area.test.ts；tests/e2e/rebuild-ui.spec.ts、pao19-hud-safe-area.spec.ts。它们在18目标尚不存在，需编目和显式类型检查；不假设两树测试数直接相加。19 HUD测试自行调用measureOcclusion，并在部分F用例dispose主机后创建隔离UI，不能直接把其成绩当生产接线成绩。

已确认的新迁入测试最小适配点如下，均须保留B19原断言/故障注入和预算，并记录原blob及补丁：

- pao19-hud-safe-area.spec.ts 的 sample 助手在生产主机运行时改读当前UI实例 readOcclusion()，由main唯一调度量测，不再用测试自己的 frame=0 序列采同一个producer；必要同步只等待主机发布本次布局，沿原预算，不增加retries。dispose主机后的隔离F实例仍用原measureOcclusion(++frame)；两者分报。这样保留原几何断言并避免重复read/倒退frame人为制造UNREADY。
- pao19-ui.test.ts 的 main集成段使用旧Babylon/UIManager测试替身，尚无布局门面。仅在新迁入文件的替身补齐中立尺寸、不可用布局和幂等订阅/释放接口；保持 pending-before-dispatch、commandId/result/无重复Toast 断言原样，不为替身缺能力改生产保护规则。
- rebuild-ui.spec.ts 的 dir 默认写 docs/evidence/PAO-19，HUD E2E 的默认 out 也在项目根内。未来将这两份新迁入测试的产物出口统一参数化并指向主Agent批准的根外QA目录，或使用能等价隔离其输出的专属配置；仅设置Playwright outputDir不会改写这些显式mkdir/writeFile/screenshot路径。不得写回19历史证据。新增专属配置需主审明确另列路径，本候选优先只改新迁入测试的输出变量。

若实测必须改变原断言、旧18测试、load/预算/retries或producer语义，先列最小例外交主审，不擅改。

未来先记录目标/来源/旧测试与固定blob哈希，再RED→GREEN、build/unit/新测试types、一次完整旧+迁入+新增E2E。正常hooks必须通过；5188 strictPort不复用服务，D3D11、DEBUG、原load/60秒/retries0，QA产物根外隔离。原始HTTP/raw、服务日志、首失败trace及阶段版本保留，不循环重跑换绿。2～3张实际查看截图，短录屏覆盖跳滑/布局失效及暂停旋转；提交固定SHA后独立验收，不自动合并。

18已知71/72失败仍未解决。未来验收基线和集成窗口必须由主Agent裁定；本契约不豁免任何失败，也不恢复车尾调查。本批不跑上述矩阵、不创建测试/代码、不推送未同步历史链。
