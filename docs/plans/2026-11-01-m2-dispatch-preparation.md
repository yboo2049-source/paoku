# M2 下一批调度准备与执行提示词

> PAO-16最新：自动细化c7b09e6已[通过技术阶段主审](../reviews/2026-11-02-pao16-calibration-refinement-review.md)，四件仍待正式测点/接入复核，不再重复首批/细化提示词或追加相同采样。原始DCC已确认不存在，手工美术延期；17可继续已批准结构批次，不因此获得生产GLB接入资格。

> PAO-17最新：用户已批准路线A、I-01/I-02与第一批结构/生命周期范围，接续fcddba1，执行使用[新计划第5节提示词](2026-11-02-pao17-approved-execution.md)。本批A→B独占写权优先于旧“17仅准备/main只读”说明；未放行生产GLB、主题资产或18。主Agent不自动启动实现。

> 11-02最新可复制入口：[PAO-16自动细化＋PAO-17设计准备，两份并行提示词](2026-11-01-pao16-pao17-parallel-prompts.md)。PAO-17目录已从M1 19aa314建立，仅解锁文档准备；本文旧17“仅预留”及正式实现提示词不适用于本次准备，正式接入门禁仍保留。未启动任务或合并。

> PAO-16接续：3de6e54的首批技术探针已[独立验收](../reviews/2026-11-01-pao16-calibration-spike-review.md)，四件资产均未取得正式接入资格。此前[标定提示词](2026-11-01-pao16-calibration-spike.md)已执行，不重复派发；17正式实现门禁保留，只读准备需另行准备独立目录与专用提示词。

> PAO-15后续更新：用户已同意现有runner局部绑定/变形探针，执行改用[试样交接与提示词](2026-11-01-pao15-rig-spike.md)。仅解锁探针白名单，不解锁正式13动作、整批资产制作或PAO-18。

> 2026-11-01接续更新：PAO-19准备943aad1已审，用户已批准UI三点具体范围，执行时改用[已批准实现提示词](2026-11-01-pao19-approved-execution.md)。本文PAO-19“仅准备/未批准/main与HTML只读”保留为历史状态，受新交接的A→B串行白名单替代。15/16及17/18门禁不变，不自动启动任务。

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在已验收 M1 上准备 M2 职责、工作树和人工粘贴提示词，不启动实现。

**Architecture:** 模拟/应用保持唯一权威，资产、渲染、动作镜头、DOM 展示分别交付；共享入口串行接线。本文件是调度与准备计划，任务级设计批准后再细化 RED/GREEN 实现步骤。

**Tech Stack:** Vite + TypeScript + Babylon.js；Vitest + Playwright；Linear。

日期：2026-11-01（Asia/Shanghai）。Dispatcher 只规划、调度、审查；用户手动在任务聊天粘贴提示词。不创建聊天、不启动子 Agent、不自动合并，不改机器派发器的 dispatch-plan.json。

## 1. 本轮核验与有效基线

- 已读 AGENTS、M2 交接、已批准总设计、任务索引及相关契约入口；按需读取 M1 的 application/types.ts、modelBindings.ts 与 DOM/main 接口索引，无全库源码扫描。
- fetch origin 成功。主规划树 `D:/worker/paoku` 为 `docs/pao-6-playtest-baseline@1e2b859`，核验时干净，与远端 0/0；此处的运行时代码不等于 M1。
- 实现树 `D:/worker/paoku-sessions/pao-14` 为 `codex/pao-14-application@19aa31492ddce4c1c5e74ef1e49312ad41ec2dd6`，干净，与远端 0/0。PAO-10→14 链保留，不从 main 重建或用 main 覆盖。
- `origin/main@7a2fb29` 未新增提交；只读资产树 `D:/worker/paoku-sessions/glb-review` 仍为该版本。资产本体提交 `622e7da` 与清单修订 `7a2fb29` 分开记录。既有统计复用，本轮不重算全体 GLB 或重复验图。
- Linear PAO-14=Done；PAO-15/16/17/18/19=Backlog；PAO-7/8/9=In Review。已核对正文、原生 relations，以及 PAO-7/8/9/15/16/19 相关评论。本轮不改状态、不发评论。
- get_agent_context 返回 Tool not found，已使用正常可读的 Issue 正文、依赖和交接记录核验，不把缺失笔记当已读取。
- PAO-14 的 build、244 单测、43 E2E 为已验收历史证据，本轮不重复运行，不把规划树 56 单测混作 M1 结果。

## 2. 放行边界与顺序

| 任务 | 原生 blockedBy | 本批安排 | 完整交付门禁 |
|---|---|---|---|
| PAO-15 角色资产 | 7、8、9 | 可手动启动交付缺口/绑定动作规格准备 | 造型与预算适用项明确批准、源文件/许可可用、任务级设计批准后才正式制作 |
| PAO-16 场景资产 | 7、8、9 | 可手动启动标定/优化方案准备 | 同上；真实坡面/代理/车顶及组合模型可对齐 |
| PAO-19 DOM UI | 7、14 | 可手动启动 UI 设计与应用桥接方案准备 | UI 风格适用项获批准、任务级设计批准、共享文档由 Dispatcher 先同步 |
| PAO-17 渲染 | 16、9 | 暂缓实现，只保留提示词与目录方案 | PAO-16 标定交付验收及依赖放行，使用接续后的固定提交 |
| PAO-18 动作/镜头 | 15、11、17 | 暂缓实现，只保留提示词与目录方案 | PAO-15 正式动作和 PAO-17 接口验收，PAO-11 已通过 |

PAO-7 最新评论仍明确“具体美术参数、真机与实机品质仍未批准”；PAO-8 是候选预算。PAO-9 的修订技术契约已接受作 M1 输入，但 In Review 不冒称 Done。总体明亮城市轨道方向已批准，不重新要求批准 M1 或总体路线；仅待决细节/新增任务级设计保留门禁。

推荐分阶段并行：15/16/19 的准备互不写共享文件；依赖放行后可各自实现；16→17→18 串行处理渲染入口，15 的资产交付汇入18。19 与17 可在白名单互斥时并行；main/types 若确有接线需求，由 Dispatcher 另派单一实现方按提交串行处理，主 Agent 自身不写游戏代码。20/21 后续再调度，不随本批启动。

不推荐“15～19 全开实现”（依赖/写权冲突），也不推荐“先整分支合并 main”（会混入未经验收内容）。沿用逐段接续已验收基线方案。

## 3. 独立工作树与资源

| 任务 | 目录 | 分支 | 起点/状态 | 浏览器端口建议 |
|---|---|---|---|---|
| 15 | `D:/worker/paoku-sessions/pao-15` | `codex/pao-15-character-assets` | 已创建，19aa314 | 5185 |
| 16 | `D:/worker/paoku-sessions/pao-16` | `codex/pao-16-world-assets` | 已创建，19aa314 | 5186 |
| 19 | `D:/worker/paoku-sessions/pao-19` | `codex/pao-19-ui` | 已创建，19aa314 | 5189 |
| 17 | `D:/worker/paoku-sessions/pao-17` | `codex/pao-17-render` | 仅预留，待16验收后建树 | 5187 |
| 18 | `D:/worker/paoku-sessions/pao-18` | `codex/pao-18-motion-camera` | 仅预留，待15/17验收后建树 | 5188 |

三个新树只检出文件，未 npm ci、未跑基线测试、未启动服务、未推新分支；不宣称实现环境已全验证。准备启动时按需 npm ci，正式实现前验证本树基线。端口是建议值，实际占用须先核对，strictPort，不终止不属于自己的服务。

本文件与后续主规划文档可能不在19aa314中：任务聊天使用下文绝对路径只读。M0独立交付也以固定树只读：

- `D:/worker/paoku-sessions/pao-7/docs/art/rebuild-style-guide.md`（c66b59e）；候选风格/预算，非最终批准。
- `D:/worker/paoku-sessions/pao-8/docs/performance/target-device-budget.md`（be6c7d5）；候选设备/预算，非真机签收。
- `D:/worker/paoku-sessions/pao-9/docs/architecture/rebuild-contracts.md`（59fc682）；技术契约及一次坐标转换。
- `D:/worker/paoku-sessions/glb-review/docs/assets/glb-manifest.json`、`glb-visual-notes.md`（7a2fb29）；按需查单资产，不整批复制源码或资产进任务树。

17从包含已验收16交付的接续提交创建；18从包含已验收17与15资产的接续提交创建。具体整合策略/提交号届时由 Dispatcher 核验后派发，不在预留提示词内自动 merge/cherry-pick。19若并行完成，同样由专门集成实现任务汇合，主 Agent 负责审查。

## 4. 写权与验收职责

共享 `PROGRESS.md`、PRD、ARCHITECTURE、SYSTEM_WORKFLOW、TEST_PLAN 由 Dispatcher 文档先行同步。准备阶段各聊天仅写自己规格/设计/证据和共享文档建议，不直接改共享总纲；批准后 Dispatcher 先整合，再解锁游戏实现白名单。

| 职责 | 准备阶段独占写入 | 批准后拟开放（不是本轮实现授权） | 只读/禁止越界 |
|---|---|---|---|
| 15 角色/动画 | docs/art/character-spec.md；docs/superpowers/specs/2026-11-01-pao15-character-design.md；docs/evidence/PAO-15/ | public/assets/characters/、对应源文件及许可目录，路径需设计确认 | 不写render/main/types/物理；不自行重做原GLB Agent资产 |
| 16 场景/资产 | docs/art/world-assets.md；docs/superpowers/specs/2026-11-01-pao16-world-design.md；docs/evidence/PAO-16/ | public/assets/world/ 与 docs/assets/pao16-calibration.json，路径需设计确认 | modelBindings/trackSegments/Surface只读；不改物理让模型“碰巧对齐” |
| 17 渲染 | 届时专属设计/计划/证据 | src/render/babylon.ts、assets.ts、environment.ts、entityViews.ts；专属单测/E2E | 不写DOM/物理/应用；不与18同时写babylon.ts |
| 18 动作/镜头 | 届时专属设计/计划/证据 | src/render/characterView.ts、cameraRig.ts、babylon.ts最小接线；专属单测/E2E | 动画不拥有位移/无敌权威；不得自行加存档字段 |
| 19 DOM UI | docs/ui/pao19-ui-spec.md；docs/superpowers/specs/2026-11-01-pao19-ui-design.md；docs/evidence/PAO-19/ | src/ui/dom.ts、src/ui/views/、src/style.css；tests/unit/pao19-ui.test.ts、tests/e2e/rebuild-ui.spec.ts | application/types、AppService、main、types、render只读；index.html如必需另申请白名单 |

QA 为各任务验证职责；需要独立测试 Agent 时由用户/Dispatcher 另行明确派发，本轮不自动启动。不得为通过测试删断言或放松物理与事务契约。

### 必须保留的事实

- 新21 GLB无skins/animations，旧player有骨架及7动画也不等于完整动作。15先核对原作者可编辑源、绑定条件与许可，缺失就交缺口，不用整模摆动冒充正式跑跳滑。
- runner静态高约0.9791；五个FBX来源模型节点已含X+90°，禁止统一再转。原始scene bounds不直接作为米制碰撞参数。
- train_metro=带坡工程车；train_ramp_or_car=普通车厢。PAO-13已有显式绑定/唯一组合视觉根。16须记录变换、坡脚/坡顶/车顶、代理与逻辑空间的一次转换；不可重复渲染工程车自带坡体。
- 原149.45MiB/41张4K/143万面为总资源统计，不是同屏GPU实测；预算仍为候选。不要全量加入首屏。
- 19沿用AppSnapshot、只读GameContext及现有命令意图桥；SET_AUDIO不能重新引入旧整份快照覆盖，保留UPDATE_AUDIO字段意图和显式失败重试。不得把页面文本当钱包/结算权威；速度显示按m/s或明确换算km/h。
- jetpack/shield/mystery_box文件不授权新玩法。旧坡体遮挡、追捕者出框、霓虹风格分别归16/17/18/19相关表现验收，不宣称本轮已修复。

## 5. 每项交付步骤与主审门禁

1. 核对本树cwd/分支/HEAD/未提交改动；读本任务和对应专业文档，限制到单模块白名单，不全库扫描。
2. 准备阶段写设计和缺口：已有批准、待决参数、可行方案、接口、数据结构、失败/回退、具体测试矩阵和共享总纲建议；不写游戏代码。适用brainstorming门禁，提交具体设计供审，不要求重新批准已完成M1。
3. 任务级设计及适用冻结门禁通过后，由主Agent先同步共享文档/PROGRESS并给出明确实现白名单；实现方再细化writing-plans可执行计划。
4. 逻辑实现先RED，记录失败原因，再GREEN和必要重构；资产检查覆盖哈希、骨架/动作、米制端点/代理与许可。发现白名单外问题仅给最小接口需求，不自行跨层修复。
5. 代码交付在本树运行 `npm run build`、`npm run test`、完整 `npm run test:e2e`；先确认端口/源码身份。默认Playwright配置仍有5174/reuseExistingServer及Metal参数，不可原样误连其他树；用本机忽略的专属配置/完整回归镜像改本任务端口、strictPort、reuseExistingServer=false及Windows ANGLE D3D11，不删任何原用例。
6. 模拟跑一次真实输入完整流程，N自然输入与F夹具分报。截图等弹窗opacity和有限动画完成；主审默认抽看2–3张关键桌面/竖屏图，异常才扩看，动作交付补关键录屏。验证前后src hash，恢复旧证据并校验，不反复提交历史图。
7. 纯文档交付做内容/引用审查与git diff --check，无需专门运行浏览器测试；正常hooks额外build/test照常通过。只暂存本任务路径，普通commit/push（首次git push -u origin HEAD），核对远端，不跳hooks/不强推。
8. 报告提交、分支、检查数量/exitCode、截图/录屏索引、N/F范围及未验证项。准备阶段交付不等于父Issue完成；完整实现送In Review，主Agent独立验收后才Done。不得自动执行下一任务。

## 6. 可粘贴提示词

每个代码块可单独复制。前三项只进入准备阶段；后两项包含先决检查，当前不得用于启动实现。

### PAO-15：角色绑定与动作交付准备

```text
只执行PAO-15准备阶段。工作目录D:/worker/paoku-sessions/pao-15，分支codex/pao-15-character-assets，预期HEAD=19aa314；先核对Git，保留用户改动。
先读D:/worker/paoku/AGENTS.md及D:/worker/paoku/docs/plans/2026-11-01-m2-dispatch-preparation.md第1～5节，再读Linear PAO-15正文/最新评论/原生依赖。按计划第3节只读PAO-7/8/9对应规格和glb-review结构化清单，按需读取总设计第5节；不扫全库/全图集。
职责仅角色资产与动作规格。当前只写本任务character-spec、pao15-character-design及PAO-15证据目录（计划第4节）。确认原GLB Agent可编辑源、许可、绑定/蒙皮条件；新runner是静态模型，不直接套旧player动画。交付骨架、脚底/朝向、原地动作、待机/跑/跳三段/滑铲三段/换道/受击/失败/滑板姿态、挂点/中断/循环与导出验收表，明确资产缺口和制作路径。
PAO-7/8/9仍In Review，本次没有完整制作放行。沿用已批准明亮城市轨道方向，采用brainstorming提交具体设计；仅对尚未批准的任务细节列门禁。不要生图/建模/重绑定或改游戏代码，不碰main/types/render/物理/共享PROGRESS，不覆盖原GLB资产。缺源文件或工具则如实交缺口，不用程序颠簸代替正式动作。
提交可评审方案及共享文档建议；纯文档内容审查、diff --check，正常hooks提交并首次push -u origin HEAD，核对远端。向主Agent报告提交/分支/证据与门禁；准备交付不把PAO-15标Done，不自动执行PAO-18或其他任务。
```

### PAO-16：场景资产标定与优化准备

```text
只执行PAO-16准备阶段。工作目录D:/worker/paoku-sessions/pao-16，分支codex/pao-16-world-assets，预期HEAD=19aa314；先核对Git，保留用户改动。
先读D:/worker/paoku/AGENTS.md和D:/worker/paoku/docs/plans/2026-11-01-m2-dispatch-preparation.md第1～5节，再读Linear PAO-16正文/最新评论/原生依赖。按计划第3节只读M0对应规格、glb-review的glb-manifest.json/notes；需要时只读本树src/data/modelBindings.ts和相关Surface定义。
只写本任务world-assets、pao16-world-design及PAO-16证据目录（计划第4节）。基于已交付GLB形成一个主题段/完整列车/真实坡/低高障碍/金币/代表道具的标定表与优化方案：源哈希、scene到game变换、单位/朝向/原点、脚坡顶车顶端点、简化代理、组合视觉归属、LOD/贴图分档和失败回退。将实测、候选与未验证分开。
train_metro是带坡工程车，train_ramp_or_car是普通车厢；已有组合只设一个视觉根。不得把raw bounds当物理尺寸、重复转换节点旋转或让物理迁就模型；新道具文件不授权玩法。总体风格已批准，具体美术与设备预算仍待适用项确认。
本次用brainstorming交具体设计/缺口和共享文档建议，不改GLB/贴图/src/共享总纲，不重做原作者资产，不启动PAO-17；不全量重渲染，必要预览默认只看2～3张且标为技术预览。正式优化/制作需门禁放行后另行执行。
纯文档完成内容审查和diff --check，正常hooks提交、首次push -u origin HEAD并核对远端；报告方案/提交/分支/未验证项，准备交付不标父任务Done，不自动启动其他任务。
```

### PAO-19：DOM UI 设计与接线准备

```text
只执行PAO-19准备阶段。工作目录D:/worker/paoku-sessions/pao-19，分支codex/pao-19-ui，预期HEAD=19aa314；先核对Git，保留用户改动。
先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-01-m2-dispatch-preparation.md第1～5节、Linear PAO-19正文/依赖；按需读本树src/ui/dom.ts、src/style.css、src/application/types.ts、main中的现有应用桥与对应PRD/架构/UI规范，PAO-7候选风格按计划第3节只读。
只写docs/ui/pao19-ui-spec.md、docs/superpowers/specs/2026-11-01-pao19-ui-design.md和docs/evidence/PAO-19/。用brainstorming提出开始/HUD/暂停/结算的桌面与390×844竖屏方案，包含字号/色板/间距/按钮四态、安全区/触摸尺寸、道具名称图标倒计时、Toast有限队列及错误/等待反馈，列真实流程和布局测试矩阵。
应用权威保持PAO-14：UI只消费AppSnapshot/只读模拟视图，通过现有命令桥表达意图；不从文本反读钱，不直接存档或发币，不改结算与音频事务；速度按m/s或显式换算km/h。列出与现有UIManager/readApp/update兼容的接口方案，main/types如需更改只提最小请求，不直接写。
PAO-7仍In Review，PAO-14已Done；不要重新要求批准M1或总体方向，只列待批准UI细节及任务级设计。当前不写游戏实现或HTML/CSS原型，不改共享总纲/PROGRESS。批准后由主Agent先同步文档并解锁dom/views/style及专属测试白名单，再实施。
完成纯文档审查、diff --check、正常hooks提交与首次push -u origin HEAD，核对远端；报告设计/提交/分支/后续RED矩阵与门禁。不把准备当PAO-19完成，不自动启动其他任务。
```

### PAO-17：依赖满足后使用，当前保留

```text
只接续PAO-17；当前不得从main或19aa314直接启动实现。先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-01-m2-dispatch-preparation.md及Linear PAO-17最新状态/依赖。
必须有主Agent提供的PAO-16验收记录、标定配置、依赖放行说明及接续固定提交；缺任何一项只报告缺口，不创建工作树/合并分支/写代码。满足后使用主Agent准备的D:/worker/paoku-sessions/pao-17，分支codex/pao-17-render，并核对该固定提交。
职责仅Babylon渲染拆分与主题场景。按需读架构/系统流程/测试规范及相关渲染单模块；先交任务设计与失败测试计划，获批准且共享文档同步后才实现。白名单限babylon.ts、assets.ts、environment.ts、entityViews.ts及本任务专属测试/文档；main/types/DOM/物理/应用只读，跨界接线请求由主Agent串行派发。
按状态快照建立资产注册、近中远景/循环、材质灯光与克制后处理；导入失败有回退，列车/坡道按16标定及13组合归属，不二次绘制坡体。不得绑定DOM输入，重开/销毁清理网格材质阴影引用，不同时启动18修改babylon.ts。
代码交付按调度计划第5节完整build/test/E2E、自然流程和真实截图，独占5187/strictPort/reuseExistingServer=false；核对本树源码，主审默认抽看2～3图。正常commit/push并核对远端，送In Review由主Agent验收，不自动Done/合并/启动18。
```

### PAO-18：依赖满足后使用，当前保留

```text
只接续PAO-18；先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-01-m2-dispatch-preparation.md和Linear PAO-18最新状态/原生依赖。
必须有主Agent提供的PAO-15正式绑定动作验收、PAO-17渲染验收、PAO-11支撑面契约和包含15/17交付的固定接续提交；依赖未满足只报告缺口，不创建工作树/合并/写代码。满足后使用D:/worker/paoku-sessions/pao-18、codex/pao-18-motion-camera并核对实际HEAD。
职责仅角色表现和镜头；先读对应架构/系统/动作镜头规范与任务级设计，按门禁先设计/失败测试后实现。白名单限characterView.ts、cameraRig.ts、babylon.ts最小接线及专属测试/文档；不改模拟/物理/存档/main/types/DOM，与17渲染入口写权串行。
动作由运动阶段/接触事实驱动，地面/坡面/车顶均有落地反馈；原地动作不重复位移，动画不决定无敌/伤害，整模缩放只作有限附加。镜头独立高度缓冲、前视、安全区/低动态反馈；低动态设置无持久化接口时先提交需求，不自行改schema。重点录屏验证高速、跳滑打断、暂停重开、坡车顶与追捕者裁切。
交付按调度计划第5节完整build/test/E2E和自然输入录屏/桌面竖屏截图，独占5188/strictPort/reuseExistingServer=false，主审默认抽看2～3图。只提交自己改动、正常push核对远端后送In Review，不自动Done/合并/启动20或21。
```
