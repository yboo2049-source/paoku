# PROGRESS.md — 开发进度与反馈追踪

本项目基于 Harness Engineering 范式，通过此文件追踪开发迭代（Iterative Progress）、失败教训（Lessons Learned）以及架构重构的演进。

## [2026-11-01] PAO-15改为本地自动流程，人工精修延期

- 用户选择先本地自动绑定/权重/批量试姿/导出/Babylon检查，本轮跳过手工调权、拓扑和动作精修，不执行Tripo云端。
- 已更新[执行提示词](docs/plans/2026-11-01-pao15-rig-spike.md)和设计/PRD/测试口径，新增[人工TODO](docs/art/pao15-rigging-manual-todo.md)，按真实试样证据填项；目前仅列待检查内容，不冒称已发现缺陷或已修复。
- 自动工具流程与资产质量分开报告，可带瑕疵/TODO交诊断结果；程序与结构错误仍自主修复，正式PAO-15/18不提前Done。未启动实现、云调用、自动提醒或其他任务。

## [2026-11-01] 用户同意PAO-15局部骨骼绑定试样

- 已记录一个runner的派生DCC/真实蒙皮/肩肘髋膝试姿与Babylon验证范围，[设计](docs/superpowers/specs/2026-11-01-pao15-rig-spike-design.md)与[执行提示词](docs/plans/2026-11-01-pao15-rig-spike.md)已准备并同步共享文档；原pao-15树8b26bdf，未自动启动。
- 原始DCC已确认不存在，不重复索取；本轮建立的是派生重建工程。正式13动作、角色替换/大规模重拓扑及运行时接入未放行。
- 已核对Tripo官方Rig Check/Auto Rig/动画与GLB导出能力，加入可选样本路线；用户的能力询问不当云上传/付费调用授权，主Agent未上传/调用。本机有限探测未找到Blender，执行者可在隔离目录用官方便携工具，不能伪造模型不可绑定结论。

## [2026-11-01] PAO-19修订验收Done

- ed39cb9独立复审通过，[主审末节](docs/reviews/2026-11-01-pao19-implementation-review.md)：旧菜单重试不再复活，两个独立故障脚本均为新ID/音乐开/revision3；加载后390竖屏角色完整可见，卡片与开始按钮布局通过，两项P2关闭。
- 主Agent独立build、252/252单测、60/60完整E2E通过，351.930秒、0重试；29raw源码与1178路径hash稳定，抽看3张本轮关键图。原任务分支干净且已推，Linear已设Done并回读确认。
- 实现基线可引用codex/pao-19-ui@ed39cb9，包含M1；未自动合并或启动下游。M2仍缺正式角色/场景/渲染/动作镜头/音频与整体样板集成，真机仍未签收。

## [2026-11-01] PAO-19实现主审发现两项P2

- [cf9f965主审与修复提示词](docs/reviews/2026-11-01-pao19-implementation-review.md)：原提交已推且干净、Linear In Review；独立build、251单测、56完整E2E均通过，无重试，29raw源码身份与1170路径稳定性核对通过。
- 新增F真实存储复现：菜单音频未知提交后开始/暂停/返回菜单，旧null-runId重试记录复活；再次点击音乐沿用旧ID，关/revision2未变，预期开/revision3。主Agent另以UI回执丢失例确认，不能用原绿灯覆盖新边界。
- 抽看三张关键图后发现竖屏开始底卡遮住主角躯干/腿，等待加载和隐藏UI对照确认；追加两图诊断，要求UI布局内修复或先提最小取景接口需求。未擅改游戏实现。
- 保持In Review、不设Done；修复仍交原PAO-19聊天，未自动启动任务/合并。仅提交精简故障证据及两张必要诊断图，完整审查输出留本机忽略目录。

## [2026-11-01] 原GLB制作方答复已复核

- 新提交0f96ee7在主规划分支，只有34行作者交付条件追加，无新资产；已同步同一分支。作者确认无原始DCC/骨架动作工程、无源标记、轨道/站台/街区源未交；不再反复索取不存在的原始源。
- [答复主审](docs/reviews/2026-11-01-glb-author-response-review.md)：9引用路径存在、diff检查通过；默认原型使用权限未附依据、统一Y+90°/金币固定−0.5/自动13clip等不能当已验证契约，未重渲染或改资产。
- PAO-15原路径A源前提不成立；建议下一候选B为条件明确后重建派生工程的小范围绑定/变形试样，尚未批准或启动。16仍需标定与补环境缺口，17/18等待；19已获批UI范围不受此源缺口影响。

## [2026-11-01] 用户批准PAO-19三点范围

- 用户明确批准UI方案A/规格v0.1、PAO-7适用UI风格及I-01/I-02最小接线；不重复请求相同批准，不将角色/场景/真机预算整体冻结。
- [执行交接与新提示词](docs/plans/2026-11-01-pao19-approved-execution.md)明确原pao-19树943aad1接续、同一实现聊天A→B串行、UI/HTML与main阶段写权、R01～R09及完整门禁；已同步PRD/架构/系统流程/测试总纲。
- 本Dispatcher仅记录批准与准备交接，未写游戏代码、未启动服务/Agent/新聊天或任务，未改Linear状态/合并。用户手动粘贴后实施，完整交付主审后才Done。

## [2026-11-01] PAO-19准备阶段主审

- [PAO-19主审](docs/reviews/2026-11-01-pao19-preparation-review.md)：943aad1已同步远端且干净；4文件纯文档，相对19aa314源码/HTML/资产/依赖未改，独立diff检查通过。准备范围可接收，UI设计和正式实现仍待批准。
- I-01通用命令回执与I-02 viewport-fit/语言请求经现有接口只读核实；建议与UI方案A及适用UI风格一起明确审批，后续main/HTML接线按互斥白名单串行派发。原事务与schema不变，主Agent不写游戏实现。
- 未启动新任务、不改Linear状态、不合并；PAO-19保持Backlog，17/18继续等待正式资产/渲染前置。主审未重跑新UI浏览器或以旧证据冒充验收。

## [2026-11-01] PAO-15/16准备交付主审

- [准备阶段主审](docs/reviews/2026-11-01-pao15-pao16-preparation-review.md)：8b26bdf/dd82d22与远端一致、两树干净；仅任务文档/证据，src/public/依赖无变更，diff检查通过。独立复核15的文件与源哈希/13动作时长/23节点，16的8源哈希与当前6m坡/12m车接缝目标。
- 两份准备材料可作后续输入，未发现准备范围阻塞；不等于具体设计/预算冻结或正式资产完成。Linear仍Backlog，17/18继续等待，19可独立设计准备；未启动实现/自动合并/发评论。
- 下一步建议由用户向原GLB制作聊天索取已有源/权利/绑定条件与端点/净空/环境源交付表，主审附可粘贴文本。原作者未取得材料与实际不存在须区分，暂不重新制作模型。

## [2026-11-01] M2 分工与手动派发准备

- 已核对Git/Linear/交接：M1基线19aa314与远端一致，PAO-14 Done；15～19 Backlog，7/8/9仍In Review。origin/main仍7a2fb29，无新资产提交，不重复全量验图。
- [M2调度准备及五份可粘贴提示词](docs/plans/2026-11-01-m2-dispatch-preparation.md)：15/16/19可分别进行规格/设计准备，正式制作和UI实现须满足适用冻结与设计门禁；17待16，18待15/17，不伪称原生依赖已解除。
- 已从19aa314建立pao-15/pao-16/pao-19独立工作树与codex任务分支；只检出文件，未装依赖/跑基线/启动服务。17/18目录仅预留，未来从验收后的接续提交建立。共享main/types串行接线，主Agent不写游戏实现。
- 本轮只准备文档与工作树，不启动子Agent/聊天/派发器、不改Linear状态、不合并；纯文档内容/引用与diff检查，正常hooks保留。新工作树未验证运行环境，不以旧244/43结果冒充本轮测试。

## [2026-11-01] PAO-14最终验收与主Agent会话交接

- 19aa314最终复审通过：独立build、244/244单测、43/43 E2E通过，273.236秒；源码稳定、731历史路径恢复通过，抽看2张稳定图。原三项P2均关闭，PAO-14已设Done；实现保持同实例进程内确认范围，未扩展异常退出恢复或GLB/美术。
- [新主Agent交接](docs/handoffs/2026-11-01-main-agent-m2.md)保存最新基线、任务状态、资产清单版本、手动派发偏好和节省上下文约定；建议在M1收尾后新开主会话接续M2规划，不复制完整旧聊天。

- 74a5b14原两项P2已修复；复审发现新增TOGGLE命令在写后抛异常且确认读取也失败时，同commandId重试会再次取反。专项审查与主Agent独立复现，精简证据已保存；PAO-14继续In Review，不设Done，详见下方主审报告末节。
- 修订版独立build、236/236单测、41/41 E2E通过，源文件稳定、历史恢复通过；只抽看2张关键图。已有测试绿灯不覆盖未知提交结果重试，需原任务Agent追加RED/GREEN并最小修复。

- 独立检查3d0efe8：build、220/220单测、完整37/37 E2E通过，抽看3张稳定桌面/竖屏图未见新增明显布局异常；已有绿灯仍未覆盖两项事务边界缺陷。
- [主审报告](docs/reviews/2026-11-01-pao-14-review.md)：跨标签页新增余额/权利后商店缓存提前拒绝，显式重试不刷新；持锁期间连续修改MUSIC/SFX会由旧整份audio快照互相覆盖。均已独立复现并回写Linear，PAO-14保持In Review，不设Done。
- 原任务Agent需补RED、最小修复并重新完整验收；本Dispatcher不修改游戏实现，也不接续新实现任务。精简对抗证据提交主规划分支，完整回归镜像保留本机忽略目录。

## [2026-11-01] GLB结构化清单复核

- 修订7a2fb29已通过技术文档复核：22个哈希一致、21个静态场景包围盒匹配、预览链接有效，runner和重复旋转建议已修正；清单区分概念/实际预览/未验证，8个资产有引擎图、14个没有。仅查看新增一张合影；仍不代表正式动作、米制标定或游戏美术验收。
- 独立资产审查工作树更新至远程173fbf4；22个GLB的清单哈希全部匹配，未合并到PAO-14。优先读结构化记录，仅查看一张新增检查图。
- [复核报告](docs/reviews/2026-11-01-glb-manifest-review.md)：场景节点变换重算发现runner尺寸/原点推断和五个FBX来源模型的重复90度旋转建议有误，另有预览缺文件、概念图与实际GLB证据混用及欠曝图问题。清单可检索，导入参数暂不认可，修正交原资产Agent；不修改游戏实现或GLB。
- PAO-14既定范围不变；正式动作、导入标定及碰撞接入仍按对应任务验收，不由资产文字建议自动扩展玩法。

## [2026-11-01] PAO-13验收与PAO-14派发准备

- 独立验收a4486a2：build、178/178单测、完整28/28 E2E通过；已查看真实桌面/竖屏截图并复核代码边界、服务源码身份与历史证据恢复，未发现本批阻塞问题。有限关卡目录验收通过，GLB仍为未标定数据绑定，不代表新美术已接入。
- [验收与交接记录](docs/reviews/2026-11-01-pao-13-review.md)说明物理抽样盲区及旧视觉限制；PAO-13可设Done。
- 已从a4486a2准备PAO-14工作树及codex/pao-14-application分支，npm ci成功；仅准备，保持Backlog，由用户在该目录聊天触发实施。范围为应用状态、幂等结算、商店/存档服务及最小适配，完整约束回写Linear，不重做美术/渲染。

## [2026-11-01] 远程GLB交付检查与关卡任务交接

- 已fetch origin/main至622e7da，在独立glb-review工作树检查新增21个GLB，未合并或覆盖PAO-13的M1代码。
- 完成GLB元数据/静态尺寸统计及关键火车、角色的真实Babylon浏览器导入和截图查看。文件名train_metro实为带坡工程车，train_ramp_or_car实为普通车厢；21个新模型均无skins/animations，新增文件未接入当前渲染加载器。
- [检查报告](docs/assets/2026-11-01-glb-handoff-review.md)记录PAO-13所需的数据绑定/组合段调整，以及PAO-15/16/17的动画、标定和优化边界。本轮不修改游戏实现或资产。

## [2026-10-31] PAO-7/8/9 一致性审查与下一批派发规划

- 已读取三个独立工作树的固定提交ea6867d/be6c7d5/2eac04b、Linear正文/送审评论和PAO-6至26的原生依赖。PAO-6为Done，PAO-7/8/9保持In Review；交付完成不等于最终人工冻结。
- [审查报告](docs/reviews/2026-10-31-pao-7-8-9-consistency.md)：限定PAO-10技术工作go；4条预算/原点/写权差异按职责裁定。贴图预算归PAO-8、Q0另配LOD、坡道边界转换一次、PAO-10/14入口串行；色板、机型和玩法假设不代替用户决定。
- 文档先行：已同步主架构和系统工作流的M1有效口径与权威来源，旧示例不再作为本批实现契约。目标为固定步长、输入tick/sequence、模拟单写与深只读插值快照；步长/补步上限需任务测试验证，保持兼容玩法。
- 机器计划输出至`D:/worker/paoku-sessions/harness/dispatch-plan.json`；仅安排PAO-10在`D:/worker/paoku-sessions/pao-10`独立工作树执行，max_parallel=2但本批只有一个入口写方。PAO-14因main.ts/types共享延期；11/12/13按前置等待，正式资产待人工冻结。
- 派发基线使用本轮文档固定提交，避免main缺少PAO-6及审查材料；不合并三个送审分支。只生成计划，本Dispatcher未启动实现、未修改游戏代码，也不宣称PAO-10已完成。
- 验证：纯文档内容/引用审查、git diff --check及JSON解析与约束校验；提交正常hooks，构建/测试及推送结果以本轮交付日志与JSON notes为准。执行者仍须先失败测试，再通过build/test/e2e并查看真实截图，最后提交push并送In Review。

## [2026-10-31] 全面重构规划

- 已确认用户要求整体改造，覆盖场景、角色动作、渲染、全 UI、斜坡、火车和道具。
- 已完成渲染、物理/生成、UI 三个职责域的只读初查；采用 brainstorming、art-direction、game-designer、game-ui-support，并结合 art-3d-production、art-animation-vfx 的交付规范。
- 已产出 [整体重构设计稿 v0.1](docs/superpowers/specs/2026-10-31-paoku-complete-rebuild-design.md)：现状证据、三种改造路线、三种风格候选、动作/镜头/资产目标、数据契约、M0–M4 路线图和验收矩阵。
- 状态：用户已批准总体方案和明亮风格化城市轨道方向；本轮仅方案和任务管理，未修改游戏代码。浏览器试玩基线、目标设备性能、GLB 质量仍待 M0 验证，本文不宣称已完成视觉验收。
- 建议：整体设计逐段替换，先完成含角色、坡道、火车、道具、HUD 与结算的完整可玩样板，再扩大内容。
- 本轮为纯文档交付，按项目规则进行内容审查及 git diff --check；不为文档修改运行游戏测试。提交推送结果以本轮交付说明为准。
- Linear：已创建“paoku 全面重构”项目、M0–M4 五个里程碑、总纲 PAO-5 及 PAO-6 至 PAO-26 共21个子任务；均为 Backlog，含职责、文件、交付、验收及前置关系。详见 [任务计划与链接](docs/plans/2026-10-31-paoku-rebuild-linear-plan.md)。开发未启动，不擅自分配负责人或工期。

---

## 📅 [2026-08-01] Harness 架构重构

### 🎯 目标 (Objective)
将现有零散的 Markdown 文档进行体系化收纳，使项目具备完整的 Harness 范式脚手架，以支持后续多 Agent 并行开发跑酷核心玩法。

### 🚧 进度 (Status)
- [x] 创建 `docs/` 目录并迁移现有的架构设计、测试计划与历代 PRD 文档。
- [x] 建立 `AGENTS.md`，定义 5 个职责明确的 Subagent。
- [x] 建立 `PROGRESS.md` 追踪表。
- [x] 建立 `CONTRIBUTING.md` 确定协作公约。
- [x] 创建 `scripts/` 目录用于存放自动化的 Sensor（传感器）脚本。

### 💡 教训与反思 (Failures & Refinements)
- **发现**：直接要求 AI 开发 3D 跑酷功能会导致严重的代码耦合（UI 与 WebGL 混杂）。
- **优化方案**：引入了严格的模块边界限制（详见 `AGENTS.md`），强迫 `subagent-3d-render` 只能专注渲染，不得触碰 DOM 事件。

---

## 📅 [2026-08-01] 第一阶段：视觉升级与物理机制严谨化

### 🎯 目标 (Objective)
- 将旧版 3D 纯色几何体替换为经典的 Subway Surfers 2.5D SVG 贴图风格（Jake 造型、跑鞋、路障）。
- 修复物理引擎的数值 Bug（防止平地直接跳跃上火车），强化碰撞宽容度的严格性。
- 解决 Vite PWA 带来的前端死缓存问题，确保每次持续集成或 HMR 能无缝触达用户。

### 🚧 进度 (Status)
- [x] 在 `textures.ts` 中完成所有核心道具的 SVG 绘制。
- [x] 将 `three.ts` 中的 `BoxGeometry` 渲染管线迁移为 `PlaneGeometry` (配合 `DoubleSide` 与 `alphaTest`)。
- [x] 修改 `movement.ts` 物理检测逻辑，将 `entityTop - 8` 的放纵阈值收紧至 `entityTop - 2`。
- [x] 在 `index.html` 中注入强制解除 ServiceWorker 缓存的 JS 脚本。
- [x] 将“自动化验收闭环”编入 `AGENTS.md`，强制 AI 每次修改后运行 `vitest`。

### 第二阶段：手感与核心循环强化 (Phase 2: Core Loop Polish)
- ✅ **侧面碰撞与跌倒系统 (Stumble Mechanics)**：实装了切道 0.2 秒内的侧碰弹回机制（允许 3 次容错，5秒无伤自动衰减），彻底消灭了切道暴毙的生硬感。
- ✅ **受击视觉反馈特效**：实装了侧碰时的摄像机震动、模型短暂挤压形变（Wobble）、红色 SVG 闪烁以及爆血粒子特效，极大增强了打击感。
- ✅ **地形生成器彻底重构 (Pattern-Based PCG)**：废弃了初版的“纯掷骰子”全随机机制。重构为“积木式拼接”算法。
  - **火车加长**：所有火车模型从 300 加长到 800。
  - **五大预设关卡阵型**：新增 `ZigZag_Trains`（Z字横跳）、`Under_Over`（高低钻跳）、`Moving_Rush`（死神移动列车）、`Slalom`（蛇形走位）、`Coin_Frenzy`（金币海）五种手工编排的高手感关卡模块。
  - **金币寻路 (Breadcrumbing)**：金币不再盲目铺设，而是沿着最优越行路线摆放，完美引导玩家跑酷心流。

### 第三阶段：地铁轨旁多元环境视效重构 (Phase 3: Trackside Environment Richness)
- ✅ **轨旁多元组件实装 (Trackside Elements)**：
  - **跨轨龙门架与高压电缆**：轨顶立体桁架 + 绝缘子 + 3条高压接触线。
  - **轨旁信号灯杆与控制箱**：红黄绿三色 LED 信号灯 + 黑黄斜纹轨旁继电箱。
  - **通风大管与发光隔音墙**：两侧支撑钢立柱 + 巨型镀锌风管 + 霓虹边框隔音屏障。
  - **赛博弯弧路灯与配电箱**：弧形霓虹高杆灯 + 危险警示配电箱。

### 第四阶段：商业级手感与全套动效重塑 (Phase 4: Mobile-Grade Polish)
- ✅ **高阶视效与运动学系统**：
  - **镜头切道侧倾与落地震屏 (Camera Bank Tilt & Landing Shake)**
  - **极速风阻拉线粒子 (Speedline Particles)**
  - **果冻挤压拉伸与翻滚动画 (Squash & Stretch Mechanics)**
  - **经典警官与恶犬追赶实体 (Inspector & Dog Chase System)**
  - **DefaultRenderingPipeline 后处理 Bloom 辉光与抗锯齿**

### 第五阶段：全 3D 展台、金币轨迹与地铁隧道入口 (Phase 5: Full 3D Environment & Stage)
- ✅ **高阶 3D 场景与动效**：
  - **3D 发光展台与主菜单 360° 环绕镜头 (3D Stage & Menu Orbiting Camera)**
  - **3D 金币飞入 UI 轨迹动画 (3D Coin Attraction Bezier Trail)**
  - **3D 地铁拱形隧道入口与列车火花粒子 (3D Metro Tunnel Portals & Spark FX)**
  - **3D 喷气高空飞行模式与滑板爆裂碎片 (Jetpack Flight & Board Shatter)**
  - **弯曲世界 Shader (World Bending Curvature Shader)**

### 第六阶段：纯代码与 GLB 3D 骨骼动画状态机 (Phase 6: Code-Driven Skeletal Animation State Machine)
- ✅ **全套动作状态融合 (Full Action Blending)**：
  - **Idle (展台站立休闲动画)**
  - **Run (极速奔跑骨骼循环)**
  - **Jump (空中高跳帧过渡)**
  - **Slide/Roll (下蹲翻滚平滑插值)**
  - **Stumble (受击跌倒缓冲)**

---

## 📅 [2026-09-07] 确定性 Bug 全面排查与闭环修复 (Code Review Polish)

### 🎯 目标 (Objective)
全面审计核心循环、状态机流转、音频总线、渲染管线与输入层中的确定性 Bug，并通过单测与 Playwright E2E 实施机械化门禁验证。

### 🚧 进度 (Status)
- [x] **Bug 1 (追逐音效残留与泄露)**：修复碰撞死亡或暂停时警笛与犬吠持续播放的 Bug。在 `AudioEngine` 中实装 `stopChase()`，并绑定 `COLLISION`、`TOGGLE_PAUSE`、`GO_MENU` 与 `START_GAME` 全生命周期。
- [x] **Bug 2 (菜单与商店展台空载)**：修复从 GameOver 或 Pause 返回主菜单/打开商店时角色留在跑道远端（z=450）导致 3D 展台为空的 Bug。在 `main.ts` 中补充 `resetToPodium()`，监听 `GO_MENU` 与 `OPEN_SHOP` 重置实体与摄像机锚点。
- [x] **Bug 3 (GameOver 状态下角色依然奔跑)**：在 `babylon.ts` 中修正骨骼动画状态机，`GAMEOVER` 状态下显式切换至 `stumble`（受击跌倒/失落）姿态，`PAUSED` 下切换至 `idle`。
- [x] **Bug 4 (滑板破裂 3D 碎片未触发)**：在 `main.ts` 的 `HOVERBOARD_SHIELD_SHATTER` 事件中补充调用 `renderEngine.triggerShatterFX(pos)`，恢复 12 块 3D 晶体爆破动效。
- [x] **Bug 5 (商店换肤 3D 材质未响应)**：在 `BabylonRenderEngine` 中接入 `SKIN_CHANGED` 事件与 `applySkin()` 方法，支持过程化材质与 GLB 蒙皮材质的实时换色与异步加载自动应用。
- [x] **Bug 6 (非游戏状态输入泄露)**：在 `InputSystem` 中增加 `canAct` 门禁，彻底杜绝在暂停、菜单、结算状态下切道、跳跃等污染玩家状态的静默操作。
- [x] **Bug 7 (警官与恶犬同道遮挡主角视角)**：修复警官在玩家正后方同道（`chaseX = player.x`）追逐时，因位于摄像机（z=-9）与角色（z=0）视线正中导致主角在奔跑中被完全遮挡的严重视角 Bug。在 `babylon.ts` 中优化为侧翼跟随（Flank）并加入恶犬摆头动效，菜单与商店展台置于侧后方，角色始终 100% 清晰居中。
- [x] **Bug 8 (跳跃与翻滚动作被受击状态强行覆盖)**：修正骨骼动画状态机优先级，优先响应主动动作（`isJumping` / `isRolling`），避免在无敌保护帧内起跳仍呈现跌倒垂头姿态。
- [x] **Bug 9 (单局奔跑里程未累加与重置)**：补齐 `ctx.distance` 在主更新循环中的里程累加以及 `resetToPodium()` 中的清零重置与 `renderEngine.reset()` 调用。
- [x] **传感器与测试网**：在 `tests/unit/powerups.test.ts` 与 `tests/unit/audio.test.ts` 中补充输入门禁与追逐音效单元测试（51 个用例全绿），Playwright 6 个 E2E 场景 100% 通过并完成全量视觉截图自验。

### 💡 教训与反思 (Failures & Refinements)
- **发现**：追逐物体的 3D 相对坐标若恰巧位于摄像机视锥中心线上，即使处于物理“后方”，在透视投影下也会完全遮挡位于前方的主体。
- **优化方案**：越肩跟随的动态实体（追捕者、僚机、宠物）必须采用侧翼 Flank 算法偏置，避开相机至主体的视线走廊。

---

## 📅 [2026-09-30] 红队对抗式深度代码审查与系统化工程修复

### 🎯 目标 (Objective)
针对代码库实施红队对抗审计，深度挖掘“单测全绿、但生产极端场景必挂”的并发竞争、生命周期泄漏、时序断裂与状态一致性盲区，并进行系统化闭环修复与双重门禁验证。

### 🚧 进度 (Status)
- [x] **P0-1 (GameLoop 并发循环与负 dt)**：在 `src/core/gameLoop.ts` 中补齐 `cancelAnimationFrame(this.animId)` 消除多重循环并发，并增加 `Math.max(0, ...)` 防御时钟回拨。
- [x] **P0-2 (EventBus 迭代中重入与跳序)**：在 `src/core/eventBus.ts` 的 `emit()` 中使用浅拷贝解耦遍历，彻底杜绝回调中注销导致后续监听被漏执行。
- [x] **P0-3 (Web Audio 节点与定时器暴涨泄漏)**：在 `src/systems/audio.ts` 中对所有音效节点绑定 `osc.onended` 显式调用 `disconnect()`，实现 `stopChase()` 幂等停止警笛定时器与啸叫。
- [x] **P0-4 (Jump-Roll 互斥漏洞与空中免死)**：在 `src/systems/input.ts` 中实现起跳时强制重置 `isRolling = false; rollTimer = 0`，杜绝空中起跳继承滑铲免死包围盒穿透高空路障；触摸增加 `isTouching` 配对校验；增加 `dispose()` 销毁。
- [x] **P0-5 (RAMP 上冲列车车顶缝隙猝死)**：在 `src/systems/physics.ts` 中增加冲上车顶（`player.y >= trainTopY - 0.35`）的碰撞豁免，杜绝斜坡与车头交接缝处的误死判定。
- [x] **P0-6 (极速/掉帧物理隧道穿模)**：在 `src/main.ts` 与 `src/render/babylon.ts` 中实施 `dt = Math.min(dt, 0.05)` 硬封顶，消除卡顿或切后台切回时物理跳跃穿透障碍。
- [x] **P0-7 (1200m 跌落深渊与无尽赛道断层)**：在 `src/render/babylon.ts` 中将所有环境要素（枕木、龙门架、信号灯、隔音墙、路灯、拱门）按 600m 的公约数统一周期参数，静态网格合并挂载至 `this.envRoot`，在每帧 `player.z - envRoot.position.z > 600` 时无缝平移，实现真正的数学级无尽跑道。
- [x] **P0-8 (外部素材拉线网络断连/CORS 报错)**：将 `initSpeedlines()` 中硬编码的外部 GitHub Raw 图片链接彻底替换为本地纯代码生成的 `DynamicTexture` 渐变贴图，消除弱网与离线断连隐患。
- [x] **P1-1 (持久化脏数据 NPE 击穿 UI 线程)**：在 `src/ui/dom.ts` 的 `loadPersistence()` 中增加 `unlockedSkinIds` 数组有效性校验，损坏时安全重置，杜绝白屏卡死。
- [x] **P1-2 (按钮连点抖动与按键穿透)**：在 `src/ui/dom.ts` 中为关键按钮增加点击后 `blur()` 并增加防抖，避免按空格键重复触发激活按钮。
- [x] **P1-3 (返回主菜单金币未结算保存)**：在 `src/ui/dom.ts` 的 `backToMenu` 中补齐当局拾取金币入账结算并持久化。
- [x] **P1-4 (多成就同时触发 Toast 穿模)**：在 `src/ui/dom.ts` 中加入动态垂直偏移排队机制。
- [x] **P1-5 (Babylon.js 动态实体阴影与碎片引用残留)**：在 `src/render/babylon.ts` 中清理障碍物时同步调用 `removeShadowCaster`，并在 `reset()` 中全面清理活动碎片与实体网格。
- [x] **自动化测试与视觉全闭环**：
  - 新增 `tests/unit/redteam_fixes.test.ts` 专项单测用例；
  - 单元测试 56/56 全绿（`npm test`）；
  - TypeScript 类型检查 0 报错（`npx tsc --noEmit`）；
  - 生产构建完成（`npm run build`）；
  - Playwright E2E 测试全通过（6/6 passed）并完成最新视觉截图自验。

## 2026-10-31 PAO-6 真实试玩与旧功能迁移基线

- 已读取 AGENTS.md、PAO-6 和已批准整体重构设计；Linear 已进入 In Progress。
- 任务范围：记录真实浏览器核心流程、截图录像、console、旧功能与九项持久化键；不修改 src/ 或游戏实现。
- 验证计划见 docs/TEST_PLAN_AND_SENSORS.md 的 PAO-6 节；证据放在 docs/evidence/PAO-6。
- 自然试玩与 QA 夹具验证严格分开，旧问题只记录；仅处理 PAO-6。

### PAO-6 本地验证完成

- N自然输入：菜单/商店/开始、换道、跳跃、空中滚动、暂停恢复、失败、重开、回菜单、九键存档刷新；自然录像75.72秒。
- F固定夹具：坡到车顶再跳离落地、低高障碍、四道具、磁吸/任务/护盾、390×844 CDP触摸；最终4/4通过，截图与四段录像归档。
- 独立只读QA复核功能与九键存档盘点；报告明确N/F/S/H以及未测范围。复现坡体遮挡角色的视觉问题，只登记不修实现。
- build通过（chunk体积提示）；56/56单测；原有6/6 E2E；专用4/4 E2E；真实截图和录像抽帧已查看。提交前检查diff与证据hash。
- 默认E2E生成的历史截图已恢复；新增仅文档、QA脚本和证据。Linear开始时已设In Progress；连接中断后已恢复，提交推送后回写报告、证据、提交号和分支，再设In Review等待审查。
