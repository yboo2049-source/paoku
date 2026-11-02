# PAO-18 候选接口与后续验证矩阵

2026-11-03，候选 v0.1。配套[设计草案](../superpowers/specs/2026-11-03-pao18-motion-camera-design.md)。本轮纯文档，以下接口均非新实现，矩阵全部**待执行**。

## 1. 接口登记与写入边界

| 编号 | 实际状态与候选请求 | 权威/入口与写权 |
| --- | --- | --- |
| I-01 帧身份 | 已有 render(ctx, frame?)，frame={runId,tick,discontinuity,appState}；main 同次 presentation(alpha)+app snapshot 采样 | 沿用 17；ctx 深只读、空间已插值，只复制位置；本轮不改 main/types |
| I-02 生命周期 | 已有 reset/dispose、epoch、boundaryPrepared、租约与缓存 | 18 保留门面，内部委派角色/相机清理，必须回归 17 幂等/晚到语义 |
| I-03 事实桥 | 递延。当前 physics PLAYER_LANDED={y}，main 仅落地音效；缺 run/tick/序号 | 主 Agent 另定单一入口写入者，权威提交后一次读取事实副本，18 不自行包装当前 render tick 或订阅双路 |
| I-18M 角色帧 | 候选只读 Player 已有字段+同帧身份+事实批次；visual root/骨架组属角色实例 | 可在 render 局部定义 view 类型，不复制可写 Player；不增加 shared motionPhase |
| I-18C 相机输入 | 候选只读 frame、player/support/chase、同帧角色/警官/犬视觉 bounds、viewport、safe-area profile、局部 reducedMotion | 相机只写自身 transform/FOV；角色可提供 bounds，不回写模拟或通过 DOM 找对象 |
| I-18U UI 安全区 | 候选 viewport CSS px、canvasRect、insets、reservedRects、layoutRevision、游玩/菜单/模态 profile | 旧 UI 用固定版本适配；19 将来传动态矩形。DOM 测量由 UI/应用负责，main/UI 接线另串行审批 |
| I-18R 低动态 | render 局部参数可先设定；UI 开关、持久化、系统偏好适配另请求 | 不自加 localStorage schema、设置页或输入监听；真实 UI 入口未交付前只验局部参数 |

时间缺口：SimSnapshot 已有 timeSec/stepSec，但 RenderFrameIdentity 尚未透传。若要按 tick 精确采样动作相位/去重时间窗口，请求由唯一入口从同次 presentation 传递二者，不假设固定 60Hz 或用墙钟推进模拟。未接入时可先以冻结的表现游标验证控制器，不能报成权威相位同步。

I-03 最小候选语义（不是已冻结 TS schema）：

- `runId`、`tick`、同 tick 稳定 `sequence`，以及可由这些字段+来源确定的稳定 `eventId`；复投身份必须不变。若只采用复合键，也须证明同 tick 多同类事件不会碰撞。
- `kind` 与必要 payload：LANDED 请求 supportSurfaceId、surfaceKind（GROUND/RAMP/ROOF）及可选 y/impactVy；ACTION 请求 JUMP/ROLL 与 action instance identity；HURT/FAIL 请求一次性事实身份及类型。没有字段就标未知，不从无敌计时或 clip 名反推。
- 事件与**提交快照**关联；一次渲染可能跨多个模拟 tick，要保留期间每个事实，按 tick/sequence 排序，而不是只看最后一个状态边沿。暂停不排空未确认新事实，已消费不重播。
- 入口建议为门面接收只读事实批次后分发角色/镜头；具体独立方法或参数由主 Agent 审定。既有音频是否仍走旧桥由主 Agent 维护一次性路由，18 不兼领音频改造。
- 去重键含 runId/代际；设置候选有界窗口 256 条/2秒（以模拟时间或 tick 表达），但淘汰后不能让旧事实再播：需单调消费水位并拒绝低于水位的迟到项。同 tick 批次完整性/乱序窗口由入口合同固定；不能边收到第一个就将整 tick 关闭。
- 新 run/reset/discontinuity 清待播和姿态过渡，提升本地代际；dispose 后拒绝全部。相同实体/资产 ID 在新局合法复用，不是旧请求挂载资格。
- 若入口不具备这些身份和排序保证，报告契约缺口，不自行加总线协议、shared types、main 或物理事件字段；完整 PAO-9 envelope 仍是独立迁移。

## 2. PAO-15 候选 manifest 交接表

| 字段组 | 候选要求 | 缺失处理 |
| --- | --- | --- |
| 来源 | 固定提交、source/derived SHA-256、派生工程/导出器版本、审查状态、质量分类（diagnostic/technical/production） | 不从活动目录取文件；无批准版本不得生产注册 |
| 结构 | assetVersion、skeletonVersion/hash、真实 root/pelvis/骨节点名、skin/IBM/权重校验引用 | 不同骨架不交叉混合；23 骨不等于所有形变品质合格 |
| clip | semantic intent 与真实 clip 名独立、clipVersion、存在/缺失、fps=30、N、秒数与 [0,N) 播放区间、t=N/fps 边界键 | 不用模糊子串匹配宣称正式命中；缺项列 unavailable |
| 播放 | loop/hold_last/one-shot、相位区间/顶点/进入保持退出、循环接缝和速度连续性、参考 stride | Jump/Slide 技术单 clip 允许分段测试，不等于正式分阶段 clip 齐全 |
| 变换 | root 平移/旋转固定绑定值、scale=1、move_delta=0、asset→logic/单位/朝向/loader 手性说明 | 只在边界校正一次；越界根轨道拒收或隔离工程诊断，不覆盖模拟 root |
| 表现标记 | 可选 foot-down/lift/apex/slide-phase、marker 时间/版本/unknown、重复/跨循环语义 | 标记只能表现/测量；伤害/无敌/落地/roll 时长权威为 N/A |
| 质量 | 脚底滑移、衣物/附件穿插、肩肘髋膝串权、斜坡/车顶接触限制和证据 | 已知人工延期照列 TODO，不用工程成功掩盖视觉瑕疵 |

当前可用性：legacy 七 clip 是游戏兼容输入；15@64c4f31 只有 rig_diagnostic 是已审隔离诊断输入，未进入本树生产。tech_idle_v1/run/jump/slide 仅建议名称，四技术样本未交付。正式 ascent/fall/landing、滑铲阶段、受击/失败、滑板和切道叠加等映射需逐项确认，不声称正式 13 clip 已齐。本次未引用不存在的 15 准备稿；未来引用须写候选/未批准及固定版本。

## 3. 后续 RED 矩阵：工程控制与动作

所有行都是拟议失败断言，**本轮未写测试、未运行、无通过计数**。unit 必须测行为/实际对象与游标，不能只搜源码字符串；browser 必须连真实门面/桥，不能只断言存储的目标数值。

| ID | 后续刺激 | 必须捕获的失败 / 观察点 | 可先用什么、等待什么 |
| --- | --- | --- | --- |
| M01 | run→主动跳→上升→下降→地面触地→run | 次序/混合不跳回起点；clip 尾帧不能结束跳跃；重复帧不重启 | 合成 clips 验控制；正式自然性等 15 |
| M02 | 坡中/坡顶/非零 Y 车顶落地，地面→坡→顶连续支撑 | 非 y=0 也反馈；连续 SUPPORTED 换 ID 不重复落地；采样缺失显式诊断 | 现有 support + F；完整不漏事实等 I-03 |
| M03 | 从车顶走出/跳出、vy 顶点抖动、渲染跨多个 tick | 不把走出误报主动跳，不反复播离地/下降；跨帧落地不丢 | 合成事实；真实批次等桥 |
| M04 | slide enter/hold/exit，短剩余时长、空中同时 jumping/rolling | 不能由 clip 改 rollTimer；空中 tuck/地面滑铲分开，退出随模拟 | 当前字段+合成分段；姿态等样本 |
| M05 | 跳/滑/受击互断，任意阶段 GAMEOVER | 高优先级立即接管、旧回调无副作用；不等 clip 完成 | 合成 clips；真实受击身份等桥 |
| M06 | 连续左右切道、滑板中跳/滑、无敌计时持续 | 叠加不移动 root；计时持续不反复 hurt；板不改变护盾 | 合成/旧角色工程；正式板姿等 15 |
| M07 | 同 eventId 复投、同 tick 不同事实、乱序/过期/窗口溢出 | 每事实至多一次且合法同 tick 不丢，旧 tick 不重播；有界内存与诊断 | 合成身份可先；真实权威等 I-03 |
| M08 | 冻结深只读快照及 Map，root 轨道企图平移 | 写入抛错或无效且快照条目不变；root==presentation，无双位移/二次插值 | unit+真实实例；正式资产轨道另验 |
| M09 | 暂停于混合中/顶点/slide，恢复/重播 | 骨姿/游标/镜头冻结；不切 idle、不追补墙钟、不重复事实 | Babylon 真组与模拟时钟；不能只测 dt 变量 |
| M10 | A 局请求迟到、B 局同资产/实体 ID，新 skin 到达 | A 不覆盖 B；最新 skin 生效；错误/缺 clip 保留 fallback 且无每帧重试 | 可控延迟 loader+真实 GLB |
| M11 | 新 run、同 tick discontinuity 重复帧、10 次 reset | 首帧锚点直置无旧混合/镜头拖影；幂等不重复清/建 | 沿 17 实例/租约行为回归 |
| M12 | dispose 两次、播放回调/请求在释放后完成 | 无重挂载/订阅/caster/动画残留，外来 canvas 留存 | 可控故障+真实 Babylon 资源枚举 |

## 4. 后续 RED 矩阵：相机与视觉

| ID | 后续刺激 | 必须捕获的失败 / 量测 |
| --- | --- | --- |
| C01 | 支撑高度阶跃/连续坡、player 相对支撑跳跃、首帧空中 | 位置/目标缓存分别检查；有界过冲、有限跳跃跟随、不直接跟满 player.y；无样本不假造地面 |
| C02 | 相同事实/轨迹按 30/60/120fps、突发长帧、暂停恢复 | 同时刻镜头误差候选≤0.03m/0.3°，无 overshoot/NaN；断点直接初始化。数值待实施固定 |
| C03 | 高速 18→45、换道反向、落地重复事实 | FOV 有界且平滑；roll/反馈不累计；重复 landed 只一个冲量 |
| C04 | 390×844、390×667、桌面 1440×900，chase 1.5/2.8，三车道、跳滑/坡顶 | 每个角色/警官/犬 bounds 角点真实投影，正深度、近裁面、屏幕边距≥8 CSS px；与 HUD rect 无交叠；警官犬不能被完全遮住 |
| C05 | DPR 1/2、canvas 与 viewport 不同尺寸/偏移、安全区 revision 更新/旋转 | CSS px→canvas→NDC 正确，旧 rect 不滞留；触摸按钮/顶部 HUD 保留区实际对照截图 |
| C06 | 普通/低动态，同一高速/切道/落地轨迹 | 低动态 roll/shake/FOV 动态/环绕/速度线关闭，仍保持目标可见和必要缓冲；不写模拟或持久化 |
| C07 | HUD 区域过大或极端长宽比导致无解 | 返回诊断和受限构图，不隐去犬/挪模拟坐标/穿 HUD；单独提交 UI 取舍 |

截图只证明该帧。动作自然、脚底滑移、混合打断和镜头舒适度须看短录屏，不用静图替代。投影数值通过也不能证明遮挡/自然性合格，需人工抽看真实页面。

## 5. 资源、回归与证据执行约束（未来）

- 充分暖机真实 legacy/已批准新 GLB、阴影、动画和主题池后记基线；20 轮创建/回收（含换动作/皮肤/跨段）、10 次 reset，逐轮枚举 mesh/node/skeleton/AnimationGroup/material/texture、caster、订阅、实例/缓存引用。共享缓存/池和动态实例分别计数，稳态不得逐轮增长；dispose 可枚举自有资源/引用归零，不外推任意 Promise 或浏览器堆。
- 每批实现先保存失败 RED 与版本，修复后运行 `npm run build`、`npm run test`、`npm run test:e2e` **完整既有套件+新增传感器**；不能用目标子集或旧 17 的 273/53 成绩充本批成绩。保留首失败、修复日志、最终计数、时长、skip/retry/flaky 和新证据。
- PAO-18 未来独占端口 **5188**，strictPort，`reuseExistingServer=false`；启动前核对端口/进程，冲突停并报告，不复用其他任务服务器或杀无关进程。Windows Chromium ANGLE D3D11，固定浏览器/依赖版本；本轮不为此安装或启动环境。
- N 与 F 分报：N 为真实键盘/390 触摸开始、切道、跳滑、暂停/恢复、失败重开；F 为固定支撑/高速/重复事实/延迟加载/缺 clip/故障。F 不冒充自然输入，脚本直设快照不证明 N 端到端可用。
- 2～3 张关键新图：桌面高速、390 近追逐者安全区、坡顶/车顶接触；短录屏覆盖高速/反向切道、跳→滑/中断、坡→顶触地及暂停重开。标注 N/F、viewport/DPR、run/tick/版本；异常时扩大审查。每张图须实际打开检查。
- 源码 raw 响应与运行模块身份、GLB HTTP 字节 hash 对磁盘/固定交付，记录端口/版本，防误用旧服务。源码/原测试/历史证据/资产在实施前后按保护清单核 hash；新输出只写 PAO-18 专属新目录，旧 E2E 镜像仅改输出路径、不改断言，不能误收 Vitest。
- 正式动作接入后重新验证脚底/衣物/附件、骨架变形、坡顶接触和录屏；工程样本通过不解除 PAO-15/17 依赖，不代表 18 Done 或允许启动 20/21。

## 6. 本轮文档门禁

本轮只写本设计配套两文档和 `docs/evidence/PAO-18/preparation/` 纯文本证据；内容/引用审查、`git diff --check`，检查暂存范围后正常 hooks 提交。若 hooks 需要依赖，仅按 package-lock 安装、不改依赖、不绕过 hooks。无需为文档跑 E2E/截图，不把 hook build/unit 当动作运行时验收。首次 push 使用 `git push -u origin HEAD` 并核对远程 SHA；结果另记证据/最终交付，不标任务 Done。
