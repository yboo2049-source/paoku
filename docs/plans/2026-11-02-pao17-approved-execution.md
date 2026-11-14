# PAO-17 首批结构与生命周期实施计划

> 执行结果：536f54b的[首批A→B已独立验收通过](../reviews/2026-11-02-pao17-structure-implementation-review.md)。本计划第5节已执行，不重复派发；后续生产接入/主题/动作与父任务Done仍未放行。

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 保留现有渲染公开门面，拆分资源/环境/实体表现，修整异步与资源生命周期，并串行接入只读帧身份和释放桥。

**Architecture:** main只提供已插值context及同次采样身份，BabylonRenderEngine委派assets/environment/entityViews；模拟/应用继续唯一权威。原PAO-17聊天在同一独立树按A→B执行，主Agent只规划和验收。

**Tech Stack:** TypeScript、现有Babylon.js、Vite、Vitest、Playwright；沿用锁文件，无新增依赖。

2026-11-02（Asia/Shanghai）。用户在主Agent对[准备主审](../reviews/2026-11-02-pao17-preparation-review.md)列明方案A、I-01/I-02及首批限制后明确回复“批准”。这是本范围的具体批准，不重复索取相同审批。

## 1. 固定输入与本次批准

- 目录 `D:/worker/paoku-sessions/pao-17`；分支 `codex/pao-17-render`；**本批接续提交fcddba1495a27436de64971720aad67624bc4420**。已核对本地/远程一致、树干净，含M1 19aa314及三份准备文档。该SHA现在是本批结构实现基线，不再只是分析起点。
- 设计与R01～R11/I-01～I-05按该提交的任务文档读取；主审补充的Map防护、discontinuity一次消费、资源计数基线及输入溯源均纳入本计划。开始执行时重新记录主仓当前HEAD/文件状态/字节hash，不沿用旧692bf24为所有输入的固定提交。
- 允许保留门面渐进拆分、加载/实例归属、失败回退、reset/dispose；第一批维持既有场景/角色/镜头的兼容表现。A内部模块与释放门面完成后，同一实现方在B独占main做I-01/I-02最小接线。
- 不合入15/16/19；四件新GLB和所有生产标定配置不接入，不做程序主题资产、新色板/灯光重设计、正式动作/13clip、镜头重设计、玩法/物理/存档变化。已有程序几何可迁移，不新做轨道/站台替代套件。
- 仅按条目放行本批结构工作，不解除Linear中PAO-16/9的整体依赖、不把PAO-17标Done。PAO-16仍可在其树独立自动标定，不影响本批固定输入。

## 2. 写权与串行检查点

| 阶段 | 独占可写 | 限制 |
| --- | --- | --- |
| A：结构/内部生命周期 | src/render/babylon.ts；新建src/render/assets.ts、environment.ts、entityViews.ts；tests/unit/pao17-*.test.ts、tests/e2e/pao17-*.spec.ts；任务文档/证据 | main保持只读；保留constructor/render/reset/applySkin/triggerShatterFX门面，新增幂等dispose；不提前建立18角色/相机新模块 |
| B：I-01/I-02接线 | A文件及src/main.ts的render回调、legacyView必要同帧取样参数、disposeGame最小调用；同前缀专属测试 | 同一个实现方串行写main；只改变数据传递/释放，不改dispatch、application、结算、存档、输入或游戏循环算法 |
| 文档/证据 | 本树任务设计/接口文档的实施状态、docs/plans/2026-11-02-pao17-structure-implementation.md、docs/evidence/PAO-17/structure-lifecycle/ | 不改原preparation证据；共享总纲/PROGRESS只提交建议，由Dispatcher整合 |

共享types/contracts、modelBindings、core/systems/application、DOM/HTML/CSS/public、依赖/锁文件及默认Vite/Vitest/Playwright配置只读。帧身份类型在src/render/babylon.ts内导出并复用既有类型，不开放共享types写权；如发现无法在此范围实现，提交具体缺口，不自行扩大范围。

临时配置、完整回归镜像/旧图、故障输入放本机忽略目录`.pao17-local/`。Vitest默认可能收集忽略目录中的*.test.ts/Playwright文件，镜像使用.pw.ts且放入适当测试排除位置；用实际完整单测验证未误收。不得更改共享ignore或旧测试绕过。

## 3. 帧身份、异步与资源契约

I-01保留render(ctx)兼容能力，可选第二参为只读`{runId,tick,discontinuity,appState}`。main每次render回调只调用一次simulation.presentation(alpha)，context与前三项均来自该返回值；appState从同一同步调用内的应用快照投影，必要时将这份快照传入legacyView。不得将已插值context与另一次simulation.snapshot的身份拼接，不再次插值位移，不写模拟/应用状态。

本树src/core/snapshot.ts已有immutableCopy，Map包装拒绝set/delete/clear。R01优先复用现有只读机制，另以对抗性Map写入和前后条目比较证明传感器有效；不更改该模块，不以Object.freeze(Map)代替保护。

同runId/tick的discontinuity标记按身份只消费一次，多渲染帧不能反复清理。reset与新run身份均使旧局实例申请失效，但应合并同次边界清理，保留renderer级有效缓存；没有第二参的兼容调用只证明内部epoch隔离。局内时钟/暂停恢复不能推进模拟，道具/接触/账本等离散值不插值。

assets负责renderer级加载/容器/共享资源；实体/环境只持租约，release幂等。区分缓存加载与消费者资格：相同源可共享in-flight，旧消费者失效不能破坏新消费者；renderer销毁后晚到容器必须释放，失败不逐帧重试。当前已有legacy player GLB加载仍属兼容范围，要保留最新皮肤，不能用旧请求/旧皮肤复活旧局。没有正式绑定的车仍使用现有fallback；合成资源/假manifest仅供专属夹具，不写生产MODEL_BINDINGS。

env与entityViews先迁移现有几何/差分/材质/阴影所有权，保持单调用路径；本轮不新做主题段池/近中远景或升级生产组合绑定。可用合成RAMP/ROOF夹具验证单视觉根、非零基准和一次转换机制，不能据此宣布真实资产接入。现有环境循环若发现独立算法缺陷，登记证据/后续范围，不借结构任务重写主题系统。

dispose先失效请求/注销自己持有的resize及SKIN_CHANGED回调，再释放实例/阴影引用、角色/特效和共享缓存，最后Scene/Engine；eventBus.on返回void，应保存同一个回调并用off注销，不能假设它返回unsubscribe。只删除自己创建的Canvas，宿主原Canvas保留；重复dispose、dispose后reset/render/晚到Promise需有明确安全行为。

I-02在既有disposeGame中加入renderer.dispose，不重排业务释放和事务。测试仅可使用专属夹具或QA门控的只读计数接线，不向生产全局暴露可写Scene/renderer、添加模拟写控制或改变应用生命周期来掩盖失败。

## 4. 逐项执行与验证

每个任务按以下顺序：先补有意义失败测试→运行并保留RED→最小实现→运行目标测试和build→核对改动边界。程序错误自主修复。每个对外提交前再完成适用的完整单测/E2E/真实截图检查和正常hooks，禁止把未通过的阶段提交推送。

### Task 0：锁定输入与任务计划

- 只读本计划、主审、任务设计和接口文档，按需核对相关单文件；不读PAO-16活动树、不全库扫描。
- 记录基线/原有改动、保护文件及历史证据hash，排除gitlink目录但保留其提交身份；锁定本轮实际读取文件。使用精确HEAD，不reset或覆盖用户改动。
- 写本树structure-implementation计划，列每个测试文件、断言、证据和A/B检查点；在批准范围内细化，不重复询问相同许可。目标单测示例命令：`npm run test -- tests/unit/pao17-assets.test.ts`；旧244/43只是历史基线，不当本次结果。

### Task 1：资源归属与失效请求（A）

- 新建tests/unit/pao17-assets.test.ts：可控deferred Promise覆盖同源共享加载、A局→reset→B局同ID→A完成、失败/空容器、旧皮肤、多个消费者及renderer销毁后晚到；先使旧挂载/共享资源早释放案例失败。
- 实现assets.ts最小加载与租约边界，babylon现有加载委派到单一入口，保留当前legacy资源/路径，不引入四件新GLB或新网络源。
- GREEN要求每个有效消费者一个handle，旧消费者不挂载、有效新消费者不受影响，共享材质不早释放、失败保留fallback、无逐帧重试。

### Task 2：环境与实体等行为迁移（A）

- 新建tests/unit/pao17-views.test.ts及必要tests/e2e/pao17-structure.spec.ts。RED覆盖乱序/重复同步、collected/删除后迟到、caster重复、释放共享材质、合成组合双根及只读快照写入。
- 提取environment.ts、entityViews.ts并由babylon委派现有构建/同步/清理；保持原legacy图形、角色/镜头及现有显式模型未标定状态，不给表现物理/拾取权威。
- GREEN要求稳定身份差分、幂等释放、单组合根合成夹具和Map护栏有效。真实车坡仍fallback，旧视觉已知缺口登记，不作为本轮新风格修复。

### Task 3：内部reset/dispose与资源传感器（A）

- 新建tests/unit/pao17-lifecycle.test.ts、必要专属浏览器F：回调订阅数、缓存/实例计数、skin/resize单响应、共享容器、重复dispose、宿主Canvas、晚到加载/特效资源。先捕获注销或资源遗漏。
- 实现可枚举资源归属及幂等释放；固定暖机后基线，20轮固定实体集创建/删除、10次reset，最后dispose并等待deferred完成。按meshes/transformNodes/materials/textures/animations/skeletons/粒子/caster及订阅分列，不允许固定正增长。
- GREEN要求reset回声明过的缓存基线、dispose清空本实例资源且保留外部资源；A完成后先做完整build/test/全旧E2E＋专属E2E、真实截图与保护核对。记录该检查点，再进入B，无需再索取已批准范围确认。

### Task 4：帧身份最小串行接线（B）

- 新建tests/unit/pao17-frame.test.ts和tests/unit/pao17-main.test.ts；保留旧测试。RED断言context/metadata同次采样、重复discontinuity不重复reset、run切换同实体ID、暂停/重开不沿用旧表现历史、无二次插值与无快照写入。
- 仅修改main的render回调及必要legacyView应用快照参数，向新可选门面参数传身份；类型从渲染模块导入，types/contracts、simulation/gameLoop/application均不改。
- GREEN分别证明兼容旧调用与新真实接线；测试不能只断言源码出现某字符串，也不能让构造出来的假身份代替main真实路径。

### Task 5：释放桥真实接线（B）

- 在pao17-main及tests/e2e/pao17-lifecycle.spec.ts补RED：disposeGame到renderer释放、HMR/重挂载或等效真实受控宿主路径、重复清理、旧skin/resize与旧Promise不再影响新实例。
- I-02只增加renderer.dispose调用及必要的幂等边界；原业务订阅/循环/输入释放保持。若旧UI/应用存在无关重挂载缺口，隔离证明本renderer的所有权并报告，不越界重做UI生命周期。
- GREEN需实际执行释放而非只数调用次数；新旧实例共享/独占归属清楚，外部Canvas保留。之后完整运行所有门禁，A/B最终成绩分别记录。

### Task 6：完整交付与主Agent验收

- `npm run build`、`npm run test`、`npm run test:e2e -- --config .pao17-local/acceptance.config.ts --retries=0`（本机配置为完整原测试镜像＋本任务专属测试；不是只跑pao17）。需要独立夹具配置时另报其结果，不漏原回归。
- 独占5187，strictPort、reuseExistingServer=false、Windows ANGLE D3D11；服务raw源与实际实现文件匹配，已使用legacy资产的source/HTTP hash一致。完整回归镜像仅重定向输出，可逆还原字节，保留所有原断言和首次失败。
- N桌面键盘/390竖屏触摸启动、运动、暂停/恢复、结束/重开；F异步失败/晚到/释放与资源计数分报。默认查看2～3张真实新图：桌面旧场景兼容、390竖屏旧UI兼容、重开或fallback关键帧；截图/短录屏不冒充明亮新主题或PAO-19已经合入。
- 核对保护文件前后hash并恢复测试对旧证据的非任务写入；只暂存白名单。正常hooks提交后push当前分支并核对远程SHA，报告本批阶段/测试计数/重试/时长/截图与剩余缺口，交主AgentIn Review，不自行标父任务Done/合并/启动18。

## 5. 复制到原PAO-17聊天

```text
继续PAO-17，用户已在主Agent明确批准路线A、I-01/I-02及首批结构/生命周期范围。沿用D:/worker/paoku-sessions/pao-17、codex/pao-17-render，固定接续fcddba1495a27436de64971720aad67624bc4420；先核对Git/用户改动，不reset/merge其他分支、不启动其他任务或Agent。
先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-02-pao17-approved-execution.md、其中主审链接及本树设计/接口矩阵。旧“只准备/尚未批准”文字是历史状态，本条与新计划是当前范围授权；共享PRD/架构/流程/测试/PROGRESS已由主Agent同步。重新记录主仓当前HEAD/文件状态/字节hash，修正旧输入溯源，不将HEAD当所有工作树文件的固定内容。
按writing-plans细化本树docs/plans/2026-11-02-pao17-structure-implementation.md，再按executing-plans及TDD执行新计划Task0～6。先RED，后最小实现；主Agent不写游戏代码，你是本批唯一实现方。
A写babylon/assets/environment/entityViews及pao17专属测试/证据，先等行为拆分和内部加载/实例/reset/dispose。A完整验证检查点后B由同一聊天独占main最小接线：I-01同一次presentation(alpha)返回context+runId/tick/discontinuity、同步应用appState投影；I-02在disposeGame释放renderer。可选帧类型放render模块，shared types保持只读；不再插值模拟位置或重排业务事务。
遵守计划中的Map真实只读护栏、同run/tick断点只消费一次、旧消费者与renderer缓存分开、eventBus.on不返回注销函数需保存回调off、共享材质/阴影/异步晚到及20轮/10次reset资源基线。使用现有immutableCopy只读机制，不修改core。公开门面兼容，18角色/镜头新模块不提前实现。
本批不合入15/16/19、不读16活动树、不接四件新生产GLB/标定、不做新主题程序资产/风格灯光/正式动作/镜头或玩法物理存档改造。仅已有legacy资产/几何兼容迁移与专属合成夹具；正式16/9依赖和17完整Done仍保留。
白名单、A/B写权、Task目标及实际检查命令以新计划为准。默认配置/依赖/旧测试/公共总纲只读；临时镜像/配置/批量旧图留.pao17-local，完整镜像可逆还原断言且不被Vitest误收。程序问题自主闭环，不用删断言/skip/改时钟换绿。
A检查点及最终B都完成build/test/全旧E2E和专属E2E，5187 strictPort/不复用服务、D3D11；raw身份、legacy资产HTTP和保护hash核对，保留首次失败。N自然输入和F故障分报，查看2～3本轮桌面/390竖屏关键图，有异常再扩看，不拿旧图冒充新验收或宣称PAO-19已整合。
验证通过后正常hooks、仅本任务commit并git push核对远端；报告阶段结果/计数/重试/时长/图索引/原件保护/剩余范围，送主Agent复审，不标父PAO-17 Done、不合并或启动18。批准范围内无需再次索取同样确认；确有跨界缺口只提交最小请求。
```
