# PAO-18 / PAO-19 限定集成准备设计

日期：2026-11-06（Asia/Shanghai）。状态：供联合主审的准备稿，尚未实现或获准合并。依据：[主仓限定任务书](D:/worker/paoku/docs/plans/2026-11-06-pao18-pao19-integration-preparation.md)。仅新增本设计、[接线契约](../../presentation/pao18-pao19-integration-contract.md)、[准备回执](../../evidence/PAO-19/integration-preparation/v1/README.md)。

## 1. 固定来源和能力边界

目标为 D:/worker/paoku-sessions/pao-18-font-diagnosis，codex/pao18-font-diagnosis；准备起点 c5a9edd103eaf3677a058b432c67ad9260450e4e，干净，代码检查点 3aa62fb81634702fb0d253228877a075eff843a0。19 只读 Git 对象 b474845a972005b83f1278884b7dbe02c8af9615（下称 B19）；不使用其活动目录。共同祖先实测 19aa31492ddce4c1c5e74ef1e49312ad41ec2dd6。

18 已有 committed-motion-v1 producer、跨 tick 完整批读取、独立音频/render cursor 和 receipt、重入屏障、异常局保护、CharacterView / CameraRig、同源字体及17明亮场景。两项已复核修复继续保留：换道不覆盖垂直动作锚点，新局 floorTick 从新局 tick=0 建立，sequence 跨局延续。本次不重复修改它们。

B19 已有中文界面、交互/命令回执模型、UIManager 布局 producer 以及纯函数 normalizeOcclusion / toBufferGeometry；其 producer 交付明确 main/render 尚未接线。可用几何不等于相机已经避开 UI。新 runner、正式动作、车尾/预览均非本批能力；旧角色及合成夹具不替代正式资产验收。

18 最近完整 E2E 是 71/72，当前失败为 PAO-6 roof-exit-land 预期 PLAYING、实际 GAMEOVER，根因未知。历史 ECONNRESET 和第三次 goto/load 超时在该次运行中通过，不能据此宣称已定位或修复。见[原始失败索引](../../evidence/PAO-18/fact-bridge-implementation/FAILURES.md)。这些是来源成绩，均非集成成绩。

## 2. 最小方案与替代路线

| 路线 | 改动和代价 | 结论 |
| --- | --- | --- |
| A：按文件迁入固定 UI，main 单帧编排，纯值几何随 render 调用交付 | 保留18主循环/事实桥和19 producer；main/babylon 有限接线，新增纯值适配与剩余集成测试 | 推荐，符合现有两方边界 |
| B：整树合并或用19 main/style/index整份覆盖 | 会回退18 MotionRead/重入/故障保护，重新引入外链字体；还夹带旧测试差异 | 不采用；超出本批及未来最小白名单 |
| C：render 查询 HUD 或继续用固定旧边距代表新 UI | 选择器和租约归属错误；长数值、侧列和 Toast 不能由旧 profile 证明 | 不采用；旧 profile 仅旧入口兼容 |

推荐 A 的精确消费入口为 BabylonRenderEngine.render 的第三个纯值参数，替代有跨帧缓存的 setHudSafeArea；签名、字段、不可用策略见接线契约。它避免把布局租约写入事实类型，也避免 renderer.reset() 在新局首帧清掉预先 setter 暂存的几何。原二参调用保留18兼容路径。

## 3. 固定文件迁入判断

完整 blob 标识及引用见准备回执。下表是未来实施候选，当前均只读。

| B19 路径 | 未来处理 | 理由及保护 |
| --- | --- | --- |
| src/ui/dom.ts | 可按 B19 原字节迁入，接线放 main | 构造器仍接 readApp 回调，update(ctx) 未变；measure/read/invalidate/subscribe/reset/dispose 门面已有。须同时接命令回执，不能只换外观 |
| src/ui/views/models.ts | 原字节新增 | speedLabel、powerUps、Receipts、ToastQueue、InteractionScope，依赖现有 application/types，不另立业务权威 |
| src/ui/views/screens.ts | 原字节新增 | 保留稳定控件 id、可访问性和触摸语义 |
| src/presentation/hudSafeArea.ts | 原字节新增 | 深冻结、租约、归一化/换算、4 CSS px 保守间隙已有；不重写 producer |
| src/style.css | 选择性组合，不能整份覆盖 | 使用19布局/断点/层级/触摸/CSS低动态；保留18两个同源 @font-face。宿主采用19 100dvh/100%/inset 与既有 Canvas 层级，须验证实际内容框；不并存两套冲突 UI 规则 |
| index.html | 只改 lang=zh-CN 和 viewport-fit=cover | 两版差异还含19 Google Fonts 外链，禁止带入；保留18入口/其余结构及现有 PWA 构建能力 |

19 UI 根字体为 system-ui / Segoe UI / Microsoft YaHei，保留该已验收排版；18的 Outfit/Orbitron 本地字体声明与 public/fonts 资产继续保留，不要求改成 UI 强制字体，也不新增字体下载。字体加载回调继续由 producer 失效，不重做字体诊断。17主题的 scene/materials/environment/public 资源不迁移。

## 4. main 接线范围

18 main 是唯一权威基线。保持 stepSimulation → committed batch → 最小音频暂存/flush → terminal observation 顺序，及 render read/COMPLETE receipt 的 cursor 规则。不能把19旧 main 中移除 motionMode、RenderFrameIdentity、inDelivery、streamEpoch 检查、faulted 守卫的版本带入。

同帧改为：捕获一次 presentation 和 AppSnapshot → 同一只读 view 更新 UI → 批量量测 → 纯值适配 → render(view, identity, hud)。不再尾部第二次 update，也不再用 simulation.snapshot.context 另拼一份 UI 视图。布局 frameId 为独立单调展示序号，不是 simulation.tick，也不是秒；暂停期间仍增长。

为沿用19原字节 dom，main 提供 readApp=“帧作用域 app 存在则读该对象，否则读 application.snapshot”的回调，作用域在 finally 清除。inDelivery 屏障覆盖 UI 写/读/render，同步生命周期重入沿18已有排队/epoch检查处理，不新增循环或事件总线。写/读异常单独报告布局失败，仍调用原 render；不能套用 RENDER_EXCEPTION 把未尝试的事实当已消费。

19 新 UI 所需 main 接缝也须列入同一次串行窗口：

- dispatchIntent 在实际受理时通知 notifyCommandPending，完成时 reportResult → notifyCommandResult；关联原 commandId/type/runId。18异常局拒绝也必须终结对应 UI 回执，不能遗留假 pending。
- 保留19相同请求在 pending 时合并、失败重试保持 commandId/完整已封存 command.summary 的行为；主机局部 commandAttempts 仅关联原请求，不能成为钱包/结算/奖励权威。先经过18重入屏障，再登记一次 pending；不得因重复调用重复做 pause 隔离或 abandon。
- TOGGLE_AUDIO 透传原 payload 的 commandId/runId，再规范 kind/field；不能像18旧适配丢弃身份。
- 这些是 main 对已有 application.dispatch 的兼容接线，application、存档、交易和音频模块保持原字节。新旧命令身份/summary 不同须按现有服务校验，禁止将不同请求误并。
- initialize、finish 等无对应 UI pending 的结果继续刷新投影/状态；旧 UI 的失败 Toast 不能与19错误反馈双报。
- 不能照搬19旧 main 的 terminal/restart 实现：18的 faulted、pauseBarrier、generation、封存及只读 presentation 约束优先。若新增 RED 显示兼容接缝需修改业务规则，停止并提交最小请求。

## 5. UI 布局和相机边界

main 只读 canvas/viewport 基准，不查 HUD 选择器；UIManager 登记并测量其拥有的绘制面。布局键 producerId/epoch/layoutRevision 与事实 streamEpoch/eventId 无对应关系；MENU/SHOP 的 UI runId 可为 null，不能伪造成事实 runId='podium'。

采用19已有 client CSS → canvas CSS → buffer 管道：normalizeOcclusion 只减 canvas 原点并求可见交集；toBufferGeometry 按实际 renderWidth/cssWidth、renderHeight/cssHeight 换算一次。禁止额外乘 DPR 或 visualScale。保留 rawReservedRects、扩间隙后的 reservedRects、framingInsets 来源，不能重复扩4px。

Babylon 通过现有 Engine 数值 getter 提供 buffer 尺寸，main 经新只读 getPresentationSize() 门面读取；最终 render 内再次核对尺寸。CameraInput 的 width/height 必须为实际 buffer，不能被旧 presentationOptions 中同名数值覆盖。reducedMotion 及其他既有非布局参数保留，桥启用时只覆盖布局相关字段；不调用 setPresentationOptions 来清掉原选项。

PLAYING 且 READY 才用动态占区驱动原 solver。dirty/UNREADY 的旧 READY 同步作废；失效首帧保留已呈现相机姿态，不以旧 UI profile 伪称新界面 safe。Babylon 可在门面局部保护最终 camera pose，同时仍让既有 CameraRig 接收当前事实；不得为暂停相机而漏掉事实或重播音效。具体恢复/诊断规则见契约。

MENU/SHOP 沿18既有展台/环视行为，只报告真实卡片遮挡；PAUSED/GAMEOVER 保留实际 AnimationGroup 冻结、镜头 pose/FOV 和局身份。Resize 可更新投影矩阵/诊断，不触发重新构图。babylon 复用已导出的 projectActors 对同帧三实体 bounds 和最终相机重算只读诊断，不能将 CameraRig 早退前的旧 projection 冒充新布局结果。

任意侧列/Toast 可能令当前 solver 无解，报告 FRAMING_CONFLICT / NO_SAFE_REGION，不调 actor 尺度、追逐距离、模拟坐标、碰撞或隐藏警官/犬。不开放 cameraRig 求解器。

## 6. 失效、重开和释放

UI 自有文本/控件/滚动/字体/转场失效沿现有 producer；main 订阅只撤销租约，回调不读 DOM。main 所有 canvas 尺寸/宿主可观察布局变化、window resize、visualViewport resize/scroll、隐藏恢复监听只失效；外部位置变化另有显式 invalidate，不假称 ResizeObserver 能检测一切位移。

同帧最多一次 producer 测量；measure 后失效或 page/run/consumer generation 不匹配则本帧交不可用值，下一帧采样，不同帧重复量测碰绿。READY 缓存可沿用较早 sampleFrame，条件为租约未失效、basis和身份一致，不能强求 sampleFrame 等于当前 frameId。

成功新局/实际布局重建时 host 撤销旧租约并 resetLayout，更新订阅预期 epoch；暂停/恢复仅失效，不重置事实 cursor。disposeGame 先停止循环/撤销消费并退订 host 监听，再 disposeLayout 和 renderer；重复调用幂等。只清本桥新增资源，不把 disposeLayout 称为 UIManager 全部旧监听的完整 dispose。

## 7. 拟议实施文件白名单和顺序

本表是待主审的未来授权范围，本批无代码写权。

| 类别 | 精确路径 | 可做事项 |
| --- | --- | --- |
| 独占接线 | src/main.ts、src/render/babylon.ts | 本设计的同帧编排、现有命令回执适配、纯值参数、数值尺寸门面、局部冻结和只读最终诊断、租约清理 |
| 固定 UI 迁入 | src/ui/dom.ts、src/ui/views/models.ts、src/ui/views/screens.ts、src/presentation/hudSafeArea.ts | 上述 B19 原字节内容，来源 hash 保护 |
| 必要适配 | src/style.css、index.html | 仅第3节选择性迁入 |
| 新纯值适配 | src/presentation/hudCameraInput.ts | 本地展示类型/校验/CameraInput组合，不含DOM/业务/总线 |
| 原19专属测试迁入 | tests/unit/pao19-ui.test.ts、tests/unit/pao19-hud-safe-area.test.ts、tests/e2e/rebuild-ui.spec.ts、tests/e2e/pao19-hud-safe-area.spec.ts | 固定对象原断言保护；输出和观测冲突处理见契约 |
| 新集成测试 | tests/unit/pao19-hud-camera-integration.test.ts、tests/e2e/pao19-hud-camera-integration.spec.ts | 仅未完成的接线 RED 和新只读诊断 |
| 计划/证据 | 待批准后单列本树执行计划及 PAO-19/integration 专属证据路径 | 先 writing-plans，再 RED→GREEN；不覆盖历史证据 |

以上由同一接线方接续，main/render 串行独占。src/render/cameraRig.ts、characterView.ts、simulation/input/physics、core/eventBus、types/contracts、application、audio、environment/entityViews、public/资产/动作/关卡、旧测试与默认测试配置/依赖不开放。不和19并写，不启动其他Agent。

顺序：Dispatcher 先解决18未同步检查点的发布与集成验收基线 → 冻结本契约/白名单 → 迁入固定 UI 与专属测试、先补剩余 RED → 纯值适配/main/babylon 单路接线 → 分阶段检查/失败留存 → 真实投影/视觉验收 → 独立主审。此处仅列依赖顺序，不是可执行实施计划。

### 必须先裁定的旧HUD测试例外请求

已确认 tests/e2e/pao18-controller-camera.spec.ts:149–150 在N键盘/触摸段硬编码top≤140、所有非top HUD（包括speedometer）y≥viewport.height−112；第227–238行的五行旧HUD夹具断言top≥height−240。B19速度表迁到顶部readings，390 buff为侧列，语义与这些旧CSS断言不同。此为源码可见冲突，尚未实际执行，不归因于当前车尾失败。

默认仍保持旧文件原字节。最小例外候选仅为该文件两段的“页面装配/证据分类”，以及新 tests/fixtures/pao18-legacy-hud.ts：把旧CSS@f2680f4的布局断言原样保留在明确旧UI兼容夹具，N输入/真实动画暂停/重开断言继续覆盖生产新UI，由新I02/I03补真实新布局/最终投影；若旧UI夹具参与该段必须改标F，不冒充生产N。主审须决定是否接受拆分归属及最小触碰该文件的权限；未批不得修改/跳过/过滤旧用例，也不得为了旧常数回退19布局。新夹具不写生产开关或在旧页面上悄悄换CSS。本请求不涉及PAO-6或碰撞规则。

因此当前候选白名单不能据以保证未来完整旧suite通过；此例外与18已知失败的验收基线均应在实施窗口前明确。

## 8. 剩余验收与阻塞处理

[契约 RED 矩阵](../../presentation/pao18-pao19-integration-contract.md)只补 H13/H14/H16 等生产接线缺口，producer 原验收不重做。未来须实际 DOM+最终三实体投影、帧内顺序、冻结和释放、事实不漏投共同成立；仅证明参数传入或静态截图均不足。

未来正常 build/unit、新测试显式类型检查、完整旧+迁入+新增 E2E、5188 strictPort 独占真实浏览器/D3D11，保留原 load/60秒/retries0/DEBUG 等批准条件；QA 输出在项目根外，保留首失败、HTTP/raw/hash/服务日志/trace。N真实键盘/触摸与F夹具/只读诊断分报，2～3关键截图实际查看及跳滑/暂停旋转短录屏。先编目再报实际总数，不将两树成绩相加。

18的已知失败仍是未过门禁。主Agent须裁定其单独处理范围与未来可验收基线；若未来完整门禁复现，保存阶段、版本、请求/trace/服务日志后停止，不改断言、不追加重跑、不借19等待行修车尾。本准备不授予“允许带失败合并”或任何新失败豁免。

当前本批仅内容/固定引用/diff检查、正常hooks本地提交三份文档；不启动服务/浏览器或安装环境，不推送未同步的18历史链。等待本设计主审和单独实施窗口，不标18/19 Done，不解除15/17父依赖，不合并。
