# PAO-18 动作与镜头协同设计草案

2026-11-03（Asia/Shanghai），候选 v0.1，**待主 Agent 审查、待用户批准，非实施计划**。

## 1. 范围、证据和审批边界

本轮只设计。任务树 `D:/worker/paoku-sessions/pao-18`，分支 `codex/pao-18-motion-camera`，固定准备起点 `82d2d47b333de2cc0da778591f99df8fe98084ed`；开始时 HEAD 一致，暂存区及工作树干净。没有创建树、合并、reset、cherry-pick、启动其他 Agent 或任务。

依据主仓 [AGENTS](../../../../../paoku/AGENTS.md)、[准备交接](../../../../../paoku/docs/plans/2026-11-03-pao15-pao18-preparation-prompts.md)、[15 主审](../../../../../paoku/docs/reviews/2026-11-01-pao15-rig-spike-review.md)、[17 主审](../../../../../paoku/docs/reviews/2026-11-02-pao17-bright-theme-review.md)，以及主仓架构、流程、测试的当前生效段。跨树相对链接只用于本机审查，不表示这些主审文档已进入本分支。实际源码依据及读范围见[准备证据](../../evidence/PAO-18/preparation/read-audit.md)。

Linear [PAO-18](https://linear.app/paoku-v1/issue/PAO-18/m2-实现状态驱动的角色动作与镜头协同)只读结果：Backlog，父 PAO-5，blockedBy PAO-15/11/17，blocks PAO-20/21。保留全部依赖，尤其 15/17→18；工程样本或设计完成不代表父任务通过。未改状态、评论或发起后续任务。不重复审批 M1 坐标、I-01/I-02 或明亮主题。

采用本机 using-superpowers / brainstorming 的上下文核对、路线比较和设计送审方法。用户明确要求完整草案、未知列假设、本轮不分段追问、不进入 writing-plans；因此本稿不因未知参数等待，也不启动实现。后续必须先审查本稿、批准具体设计并固定实施提交，另发提示词。

## 2. 当前能力与缺口

| 类别 | 已有事实 | 边界或缺项 |
| --- | --- | --- |
| 渲染 | Babylon 门面、明亮轨道/楔形坡/程序车顶、独立环境和实体视图 | 本轮不重做主题；未整合 19 新 UI |
| 帧与生命周期 | `RenderFrameIdentity={runId,tick,discontinuity,appState}`；同次 presentation 取样；epoch/reset/dispose、共享缓存与租约 | 无完整事实 envelope；现行 reset 不等于所有动画/相机语义已经满足本稿 |
| 模拟 | Player 有 x/y/z、targetX、vy、isJumping/isRolling、rollTimer、contact、supportSurfaceId/supportSample、滑板和无敌计时 | contact/support 是过渡可选字段；无完整 motionPhase、动作开始身份、权威受击身份或支撑法线 |
| 角色 | 实际 `/models/player.glb` 是 legacy player；源码列七 clip：agree/headShake/idle/run/sad_pose/sneak_pose/walk | jump→run、slide→sneak_pose、stumble→sad_pose 都是占位别名，不能验收正式动作 |
| 15 | 已审 23 骨、真实 skin、单 `rig_diagnostic`，提交 64c4f31 | Idle/Run/Jump/Slide 四技术样本仍在并行设计；13 正式 clip、足接触品质和运行时接入均未通过 |
| 落地 | physics 在 resolveSupport 后 emit `PLAYER_LANDED {y}`；main 监听播放声音 | 不带 run/tick/eventId，I-03 递延；旧 y===0 震动不适用于多支撑面 |
| 当前表现 | 整模拉伸/压扁、停止其他组后切 clip，暂停切 idle；镜头直接加 player.y | 不是过渡/暂停/支撑缓冲的目标实现；390 追逐者裁边在 17 主审明确递延 |

15 准备稿在本次核对时尚不存在，本稿不等待、不读取其活动资产目录。未来若引用，必须记录“候选/未批准”、文档版本和固定提交，不能将它当生产 manifest。既有单诊断 clip 也不能补足四动作。

## 3. 路线比较与推荐

| 路线 | 做法 | 收益 | 成本与裁定 |
| --- | --- | --- | --- |
| A（推荐） | 保留 BabylonRenderEngine 门面和 17 生命周期；提取 characterView / cameraRig，只读消费已有快照及经批准的事实副本 | 写权集中，能先验证时序/资源/投影，资产和事实桥可按固定批次接入 | 需要定义表现状态、最小 I-03、HUD 输入；缺正式 clip 时只能工程降级 |
| B | 继续在 babylon.ts 堆叠状态、混合和镜头分支 | 首个演示改动少 | 所有权/暂停/打断容易耦合，重复事实难隔离；不能以更少文件代替生命周期验证，不推荐 |
| C | 同时重构大 main、全局事件总线及 shared types，完整迁移 PAO-9 envelope | 长期事实流可能统一 | 涉及模拟/音频/UI/应用入口及旧桥去重，越过 18 白名单；需独立架构请求、迁移测试和单一写入者，排除本批 |

本稿为 Bounded 表现设计，I-03 等跨边界请求单列；若选择 C 则升级 Architectural 另审。推荐 A 不代表已获实现许可。

## 4. 组件、位置与时间所有权

门面继续拥有 Engine/Scene/Canvas、共享材质/缓存、环境/实体视图、皮肤订阅与最终释放入口。characterView 拥有角色实例的骨架组/混合、visual child 的姿态与追逐者表现；cameraRig 拥有相机目标、支撑高度缓存、前视和反馈。缓存只存可复用资产，播放游标、皮肤和动作状态属于实例/局代际。主 Agent 后续可审定具体追逐者归属，但不得让两个组件重复释放同一资源。

数据流：同次 presentation 的只读 context+identity → 门面边界判定 → characterView 动作解析及视觉同步 → cameraRig 读取同帧角色/追逐者表现包围体与安全区 → scene.render。事实经唯一 I-03 入口进入有界队列，不让各组件各自订阅同一个总线事实。环境/实体继续沿 17 接口；不让渲染读取 DOM、监听键盘或推进模拟。

世界 root 每帧只复制 presentation 的脚底中心 x/y/z，不再次插值、不加 root motion、不做世界位置修正。骨架动画只作用 visual child 下的局部骨节点；资产朝向/尺度校正只在导入边界一次完成，root scaling 恒 1。禁用现行整模 1.25/0.72/0.55 缩放来伪装跳滑；正式路径以骨架姿态完成，缺 clip 保持稳定占位姿态并报告缺项。pelvis 可小幅局部变形，不能改变模拟脚底/碰撞。

表现连续时间可用非负受限 render dt；暂停将动作游标、混合、反馈、镜头动态冻结，恢复不追补隐藏时间。模拟计时、rollTimer 和道具时间始终只读。跨帧率过滤采用 `1-exp(-dt/tau)`；断点/新局直接初始化锚点，不缓慢拖到新局位置。Babylon AnimationGroup 也必须显式受暂停/播放游标控制，不能仅把本地 dt=0 当作已冻结。

现有 I-01 没有 timeSec/stepSec，不能直接把 tick 差当秒。若阶段采样要求模拟秒数，由主 Agent 另审从同次 presentation 只读透传现有 timeSec/stepSec 的最小扩展；未接前用暂停可冻结的表现游标与只读 rollTimer 选择工程姿态，不能声称 tick 精确相位同步。

## 5. 动作选择、过渡、打断

下表状态均是**派生表现状态**，不扩展 Player 或声称 motionPhase 已存在。离散字段取最新提交，位置沿 I-01 presentation。优先顺序：dispose/局切换 > 暂停冻结 > 失败锁定 > 已确认受击反应 > 空中主姿态 > 支撑滑铲 > 支撑跑/待机；滑板是姿态模式，切道是叠加，不替换模拟状态。

| 输入与派生状态 | 选择与过渡候选 | 打断与缺项 |
| --- | --- | --- |
| PLAYING、SUPPORTED、非滚动：Run | 正式循环跑；按已标定 stride 和 speed 有界调速，候选 0.8–1.4；跑循环换速保相位 | 不以调速保证脚不滑；需 15 clip/步幅证据。菜单待机单列 |
| SUPPORTED→AIRBORNE：离地 | 有关联动作事实时区分主动跳；无事实仅确定已离开支撑；起跳短段过渡到上升 | 走出车顶不能凭 isJumping 伪装主动跳；新局首帧不合成起跳 |
| AIRBORNE、vy>epsilon：上升 | jump ascent 段或可 hold 姿势；候选 epsilon=0.1m/s | 不能因 clip 到尾判落地；epsilon 是表现阈值 |
| AIRBORNE、vy≤epsilon：顶点/下降 | 在顶点短混合到 fall/hold；下降后不因数值抖动反复重启 | 真实运动仍由 vy/contact 决定；缺 fall 用技术段 hold、明确降级 |
| AIRBORNE→SUPPORTED：触地 | 地面/坡/车顶统一消费权威 landed，按支撑类别选择视觉落地及有限 pelvis 吸收 | support ID 改变但持续 SUPPORTED 不重复落地；不使用 y===0、clip 完成或高度下降猜权威 |
| isRolling 进入/维持/退出：Slide enter/hold/exit | rollTimer 只读，阶段可用进入后累计 tick 与剩余时间派生；候选进入 0.10s、退出末 0.12s，短动作裁切过渡 | rollTimer 到零/flag 退出立即随模拟恢复；clip 尾帧不得清 flag。起始时长未知则用有界进入+保持，不反写时长 |
| isJumping 与 isRolling 同时 true | 先依据 contact 选择空中 tuck，落地后若 rolling 仍 true 再进入地面滑铲 | 空中滚动不是地面滑铲；无对应 clip 需降级/缺项记录 |
| targetX−x：切道叠加 | visual child 上轻微 roll/yaw；左右可逆，以实际插值位置读趋势，不二次移动 root | 禁止骨 mask 未验证时做全身加法；先程序轻倾，候选 roll ≤4°，滑铲/滑板降低幅度 |
| 受击 | 只由关联 hurt/shield-break 事实触发单次上身反应；无敌计时只可用于既有保护显示 | invulnerableTimer>0 不等于每帧受击；不能循环 stumble 或推导新伤害。缺受击事实时不合成动作 |
| GAMEOVER | 失败姿态/短失败段后 hold，清常规叠加；首次进入触发一次 | 失败可立即中断跑跳滑；重复帧不重播。当前无 clip，sad_pose 仅兼容占位。若需失败段播放须另审有限表现时钟，默认冻结终态 |
| hoverboardActive/hasHoverboard | 沿现有显隐语义兼容，选择 board 模式的膝/躯干姿态与独立板 visual | 两字段语义待主 Agent 固定，不能发放/延长护盾；缺 board 姿态用中性工程姿态，不计正式通过 |

接触为空/缺失时：记录 unsupported-fact 诊断，允许兼容展示 run/air 占位，不宣称可靠 landed；不得用 y 或 clip 补权威。落地桥未接入前，可用同局连续 contact 边沿做有限工程比较，但跨多 tick 渲染缺帧可能漏多次事实，不能替代正式 I-03。

混合候选：跑↔空中 80–120ms，触地→跑 100–140ms，滑铲阶段 60–100ms，受击进入 ≤60ms；全部为待采样参数。高优先级中断从当前混合姿态切入，停止并清理旧 one-shot 回调；复用相同 clip 的新动作要有 action identity，不能只按 clip 名抑制重播。不同骨架/不兼容版本不交叉混合；优先级不允许“先播完”阻止失败或实际触地。没有 landed clip 可用小幅局部吸收工程反馈，但不计正式接触品质。

## 6. 15 动作交接与 I-03 最小事实请求

候选 manifest 和事实桥的字段、缺项/兼容规则详见[接口与验证](../../render/pao18-interface-and-validation.md)。manifest 至少需要来源/派生 hash、asset/skeleton/clip 版本、真实节点与 clip 名、fps/时长/区间、循环/hold 策略、根轨道、坐标/手性、相位/标记和质量分类。建议支持 tech_idle_v1 / tech_run_v1 / tech_jump_v1 / tech_slide_v1，但这仅来自准备交接的建议，尚无 15 已批准输出；不能把候选名字当实际可加载文件。

技术 Jump/Slide 单 clip 可分段/hold 验证控制器，不能冒充 ascent/fall/landing/slide-enter/hold/exit 等全套正式交付。未知 marker 必须 unknown，不猜语义；foot-down 等只用于表现/测量，不决定落地、无敌、伤害或 roll 时长。

I-03 最小请求：事实身份能关联 runId、tick、同 tick 序号/稳定 eventId、类型和必要 payload；landing 请求 supportSurfaceId/类别及可选 impactVy，action 请求动作实例身份，hurt 请求真实单次身份。当前 `{y}` 不足，不能由渲染收到事件时填“当前帧 tick”伪造来源。完整 PAO-9 envelope 不在本批实现。由主 Agent 指定单一入口写入者、权威采集位置及一次性队列排空规则；main/types/physics/总线改动均另行串行审批。

同事实重复投递不重启动作或震动；旧局、过期代际和已 dispose 的事实丢弃。同 tick 多事实按权威 sequence 排序；暂停期间保留游标/去重水位，恢复不重播已消费事实。队列必须有界；缺失/溢出记诊断并重同步当前姿态，不补造动作。若尚未提供身份，正式去重与跨缺帧接触验收明确待接入。

## 7. 镜头、支撑缓冲与 390 安全区

相机位置高度与瞄准高度使用独立缓存：supported 时支撑高度优先取 supportSample.y，缺失仅以已确认支撑的 player.y 兼容并诊断；airborne 时保持最近可靠支撑基线，再加有限的角色离地分量。二者分别过滤，候选位置 tau=0.18s、目标 tau=0.26s，上升/下降分量权重 0.25/0.35，不直接每帧跟完整 player.y。安全区约束优先于美化缓冲；跳高越界时有限跟随增加，落地后平滑归位，不能改玩家坐标。首帧空中无基线时以当前 y 初始化并标记，不虚构地面高度。

支撑 ID 切换、坡→车顶连续接缝：读取采样高度连续更新，不把换 ID 当落地或高度重置；移动列车只读支撑事实。坡度/法线尚未传入，不自行从渲染 mesh 推理物理法线；如需脚部贴坡，另请求只读支撑方向数据。地面/坡/车顶落地统一事实驱动，impactVy 未提供时先用固定低幅反馈，不用渲染差分速度当权威冲击。

前视候选 12–18m，随夹紧 speedRatio 平缓改变；FOV 候选 0.85–1.02rad，距后方约 9–13m、抬高约 4.5–6m 是工程求解范围，不是当前实测最优值。切道仅弱跟随和有界 roll（普通≤1.5°），落地竖直反馈≤0.06m/120ms，不能累计震荡。镜头支撑缓冲与瞄准缓冲分别测试，避免相机和目标同量抬升导致净效果不明。

重点修复 17 已知 390 近处裁边：对**角色、警官、犬各自实际视觉包围体角点**用真实 view/projection 投影，检查在相机前、未过近裁面、未出屏、未侵占 HUD 保留区；不能只看 root 或只看联合中心。包括 chase.distance=1.5/2.8、左右外道、犬外侧位置、高速、最高跳跃/坡顶与滑铲。先解构图，再叠加受安全余量限制的 roll/震动；所有反馈后再验投影。

相机可增后退/高度/有限横移、调目标/FOV；禁止为取景改模拟玩家或追逐距离，也不平移追逐者来掩盖问题。现有追逐者视觉位置按快照/原追逐规则形成后供相机读取。候选同时保留至少 8 CSS px 边距；player 与追逐者避免完全重叠遮挡，测试轮廓可辨认而不只包围盒合格。若给定视口/HUD 安全区不存在可行构图，记录冲突与投影值，提交 UI/构图取舍，不悄悄隐去犬或穿越 HUD。

旧 UI 无统一安全区接口：先由应用适配层显式提供经核对的保留矩形或固定版本布局 profile；19 新 UI 将来提供动态 HUD/触摸控制/刘海区矩形与 revision。两者单位统一为 viewport CSS px，并显式映射到 canvas，不假设等于 drawing-buffer px。render 不遍历 HUD、不绑定 DOM 输入。UI 弹层/暂停等非游玩屏可切独立构图 profile，不能把整屏 modal 当游玩可行区；19 未合入，分别验收。

低动态先作为 render 局部参数：roll=0、landing shake=0、速度 FOV 增量=0、关闭菜单自动环绕与速度线、切道轻倾=0；保留安全区跟随和必要高度缓冲，不能用低动态关闭可见性保障。UI 开关、持久化及系统偏好桥另提请求，不自加 schema/设置页。基线模式与低动态均需变帧率和屏幕投影验证。

## 8. 生命周期、失败与皮肤

reset 清局部动作实例/游标/混合/一次性回调、落地队列/去重集合、镜头缓存/冲量；沿用 17 的 boundaryPrepared 与 epoch 幂等语义，不因同一 discontinuity 连续多帧重复释放。已有可复用 lease 的重置与待加载旧请求分开：旧请求晚到不得挂载新局，同资产 ID 不能跨 epoch 混淆；新局用最新快照重建姿态。

皮肤最新值独立保存；异步实例成功挂载时应用最新皮肤，不让旧 skin 回调覆盖新实例。不得为换色克隆无限材质，缓存/实例的材质归属沿 17 策略。加载失败保留 primitive，中性姿态并诊断；不每帧自动重试。版本不符、缺节点/clip、混合失败均可退到稳定展示，分别上报技术缺项和美术瑕疵。

暂停不切 idle、不重启动作；显式重播只重置表现 clip 游标，不能重发事实/拾取/结算。dispose 必须幂等：取消订阅/回调、释放角色实例及组、清 caster 引用/反馈缓存；共享缓存由门面关闭一次，晚到 lease 自释放。环境和实体沿 17 dispose；只删除自建 canvas，不清其他页面资源。

## 9. 拟议后续批次与验收边界

以下仅供确定实施白名单/顺序，**不是 writing-plans 或实施授权**：

1. 批准方案、固定接续提交及事实/HUD/资产版本；characterView、cameraRig、babylon.ts 由同一 18 实现方串行接续，不与 17 并写。
2. 先 RED：只读输入、动作解析/优先级、暂停/边界、合成 clip 生命周期、相机过滤和投影。旧角色/合成 clip 可证明工程控制器，不要求先齐正式动作。
3. 主 Agent 另定唯一 main/types/事实入口写入者，串行接 I-03；UI 安全区和低动态 UI 入口另请求。未接前不得称真实落地事件去重已通过。
4. 15 固定已审样本可用于时长/阶段/暂停/混合链路；正式 clip、权重/脚底/坡接触、滑板/受击品质仍等正式资产及独立视觉验收。不得拿活动目录直接上线。
5. 经批准后才新增专属 unit/E2E 和新证据；build/test/完整 E2E、原件保护、真实截图/短录屏与资源稳定闭环后送主审。

未来拟议白名单：`src/render/characterView.ts`、`src/render/cameraRig.ts`、`src/render/babylon.ts`、`tests/unit/pao18-*.test.ts`、`tests/e2e/pao18-*.spec.ts` 及 PAO-18 新证据。现有 assets/environment/entityViews 默认只读，若需接缝另说明最小变更。main/types/UI/physics/总线/依赖/默认配置/HTML/public/15与17活动树不含写权，生产资产注册另请批准。

## 10. 待审决定与明确假设

- 建议选 A、局部低动态及显式安全区输入；参数是候选，需要后续 390/桌面与真实 clip 调校，未运行本轮 E2E 或截图。
- 15 manifest 版本/真实 clip、stride/骨 mask、标记、正式姿态未知；默认不混不兼容骨架、缺项稳定降级，未批准资产不接入。
- I-03 身份/入口/提交时序、受击事实、滑板两字段优先级、可选支撑法线/冲击速度，由主 Agent 裁定；本稿提出最小请求，不承诺公共协议已完成。
- 旧 UI 保留区尺寸与未来 19 输出仍待固定；当前已知 390 裁边是问题记录，本文没有宣称修复。
- 不把工程采样当父 15/17 验收，不标 18 Done、不解除依赖、不合并，不启动 20/21；批准后另发实施提示词。
