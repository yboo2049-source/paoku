# PAO-18 真实运动 / 接触事实桥设计

2026-11-04（Asia/Shanghai），候选 v0.1，Architectural 路径，待 Dispatcher 独立审查及用户批准；本轮仅文档，不是实施计划或生产写权。

## 1. 输入、范围与现状

固定输入为 `codex/pao18-font-diagnosis@826b10fd8c6200fbaec02a76f4ec9d5482d5bb12`，目录 `D:/worker/paoku-sessions/pao-18-font-diagnosis`。本地/远端一致，开始时工作树及暂存区干净，common-dir 为 `D:/worker/paoku/.git`；包含工程基线 `5bd31cc`，沿用历史分支名。字体与17主题不重做；车尾及KI-001/002继续延期，不复现、不读取移植候选；新runner、19 UI、音频系统重构和20/21另批。PAO-18及15/11/17依赖保留。

本稿依据主仓AGENTS及 [任务书](../../../../../paoku/docs/plans/2026-11-04-pao18-fact-bridge-design-brief.md)，配套[候选合同](../../render/pao18-fact-bridge-contract.md)和[读取/检查记录](../../evidence/PAO-18/fact-bridge-preparation/v1/README.md)。跨树链接仅用于本机审查，不表示主仓任务书已被移植。

当前已核事实：

- `Simulation.step()`递增tick、消费排好序的输入、前进/积分、physics、afterStep，然后syncPhase/commit。同步旧监听可在步内通过`simulation.change`借用context；异常时finally只解除stepping，后续commit不会执行，但mutable context/tick/RNG不自动回滚。
- `applyInputAction`只在实际改状态后emit PLAYER_ACTION；队列接受/消费命令不等于动作成功。换道边界、重复跳、重复滚不emit；JUMP/ROLL合法条件沿现有布尔，不增加接触或clip门禁。
- physics调用`resolveSupport`得到didLand后，旧PLAYER_LANDED仅`{y}`；此时supportSurfaceId/contact已更新，Surface的GROUND/RAMP/ROOF可定位。resolver将vy归零，只返回boolean，未公开准确相对冲击速度。
- main旧PLAYER_ACTION监听同时播放声音并增加跳/滚任务；afterStep的mission.update同tick检查奖励。落地监听播放旧落地音效。不能将任务计数移到提交后表现消费，否则奖励可能晚一tick并受帧率影响。
- snapshot有runId/tick/timeSec/stepSec；presentation继承最新元数据，仅插值空间位置。RenderFrameIdentity缺秒数与事实游标；CharacterView仍是CONTACT_EDGE_ONLY，单靠最终contact边沿会漏掉两次render之间完整发生的过程。
- GameLoop一次advance最多执行既有maxSteps（默认5），也可能丢弃超额墙钟补步。新桥只能保留**实际执行并提交**的模拟步事实，不能虚构丢弃步骤或声称复原未模拟历史。

采用using-superpowers / brainstorming的上下文核对、路线比较与设计送审。本轮按用户任务书提交完整草案，未知项明列，不逐参数等待确认，不进入writing-plans/实现。

## 2. 路线比较

| 路线 | 做法 | 结论 |
| --- | --- | --- |
| A（推荐） | 输入/physics在权威步内给Simulation显式结果，成功提交时原子发布快照和完整tick批；main唯一入口交付只读批次 | 来源可证、动作成功可辨，跨tick不依赖渲染取样；需明确小范围producer、提交、时间、兼容副作用接缝 |
| B | main临时监听全局旧总线并补当前tick/run | 全局同步、无类型、可重入/步外emit，监听时并不证明已提交或来源属于该步；除非额外建立来源隔离和提交暂存，不能作捷径。本稿不采用它生成权威事实 |
| C | 继续只比较最终snapshot contact/jumping/rolling | 保持现有降级简单，但中间落地/新跳已被最终状态覆盖，不满足多tick目标 |

选择A不等于完整PAO-9迁移。PAO-9固定参考 `59fc682c33623150343f414b706e9771b8b6cbb4` 的[合同](../../../../pao-9/docs/architecture/rebuild-contracts.md)§6：共同封套和数值排序沿用；本批只有运动子集，缺失冲击速度明确nullable，不能宣称满足其完整严格payload。

## 3. 最小事实与producer

候选仅两类：ACTION_STARTED覆盖JUMP、ROLL、CHANGE_LANE；PLAYER_LANDED覆盖地面、坡和车顶。纳入换道是为了迁移旧PLAYER_ACTION三种语义时不漏掉既有换道音效。HURT/FAIL、SUPPORT_CHANGED、拾取、护盾、任务完成和追逐变化不新增权威事件；终局/持续姿态继续读现有快照。无敌倒计时不产生受击事实，动画不决定动作成功、落地、roll时长或伤害。

输入接缝推荐`applyInputAction`可选的显式production观测上下文/结构化结果：只在当前实际成功分支产生AppliedAction，复制输入前后lane及发生点位置。新模式关闭该调用原PLAYER_ACTION emit；legacy独立调用默认保持旧接口/旧emit。Simulation将InputCommand.tick/sequence/source与结果关联，得到动作实例身份；不能把所有acceptedInputs或flag差分都视为成功动作。即使同tick JUMP→ROLL→JUMP最后只剩jumping，也记录三次真实成功。

physics接缝推荐可选的步内结果sink：在既有`didLand`分支采样位置、supportSurfaceId及对应Surface.kind，关闭该调用原PLAYER_LANDED emit。不改resolveSupport、碰撞、支撑选择、重力、积分或时长算法，不读车尾分支。当前solver给什么didLand就忠实记录；初始放置若现行solver报告didLand，不擅自改成不同玩法规则，也不从“首张snapshot”额外造一个landed。

producer sink是Simulation在本次step调用期间授予的局部能力，只同步复制结果，退出step后失效。候选`onAppliedAction(ownedContext, outcome)`给main更新任务；`onMotionDraft(stepToken, draftOrdinal)`只给main暂存音频cue的顺序，不发布封套、不交给render。stepToken来自该Simulation的实际调用，不监听全局旧bus补事实。input旧参数保持，增加可选观测参数；physics在现有四个参数之后增加可选观测参数，main的SimulationOptions.physics转接明确传递，旧独立调用不改变。

`relativeImpactSpeedMps`候选为null、reason=`NOT_EXPOSED_BY_CURRENT_SOLVER`。pre-physics vy既不是接触瞬间vy，也不是坡/移动面相对速度，不能当真值；后续若要强度分级须另审solver只读观测出口，本批先用既有低幅落地反馈。找不到support映射时保存null+诊断，不能从render mesh或最终快照猜面名。

## 4. 身份、提交与异常

每步创建私有draft收集器，输入按InputCommand.sequence，随后physics按既有producer发生顺序写入。draft中的producerOrdinal只在当前步有效，不是发布的event.sequence。动作实例key候选为`runId/streamEpoch/action/inputTick/inputSequence`，由Simulation构造，拒绝render或全局回调补身份。

提交时才按draft顺序分配单调整数event.sequence，eventId采用PAO-9形式`runId:tick:sequence`。序号在同一Simulation实例生命周期内不回退，restart也不复用，因而局内自然单调，同runId/tick的QA重置不能造成ID复用。消费者只比较数值sequence，不按ID字符串排序；安全整数耗尽必须报错并停止，不回绕。

事件timeSec明确是该提交tick的`tick*stepSec`，不是墙钟、render时间或精确碰撞TOI。ACTION的位置是输入成功点，LAND的位置是resolver确认点，均在producer时复制，而非整步结束时补取。动作相位时间以这个约定锚点计算，允许一个固定步的量化误差，不承诺亚tick精度。

事务发布顺序：检查容量/生成候选封套和只读tick批 → 构造含同一motionStamp的下一张深只读snapshot → 同步无回调地替换current/previous并将批次加入journal → 返回CommittedTick给main。发布后才运行表现/音频交付。读者不可能见到新snapshot配半批旧事件；空事件tick也有完整批头/提交水位。freeze或step失败时不发布该步任何新事实、不递增已提交事件水位。

当前Simulation没有整步回滚，故异常采用**停止该局推进**：丢弃draft及main本步待播音频、保留最后提交快照，标记fault、清/拒绝后续运动输入；不可重试同一步或通过普通change/abandon发布受污染context。正常restart不变；故障恢复必须用显式fresh context建立新局，不能复用失败的mutable context。main在入口捕获并停loop，不用半步生成结算。此为需要审查的最小异常保护扩围，不宣称原所有legacy副作用具备事务性；其他旧事件的UI等未迁移副作用仍是已有边界。

fault后的读取明确返回FAULT及最后已提交stamp，不伪装成空批。main可经已有应用暂停门禁显示暂停，但不得再调用会提交污染context的setPhase/abandon；RESUME不能解除fault。显式重开仍由既有应用门禁批准，必要结算只用最后提交snapshot；随后由main提供fresh context给Simulation.restart。此异常分支仅请求main/simulation适配，不新增AppCommand/存档/设置页；如实施证明需application/UI接口变化，须另行最小扩围。

新模式禁止嵌套step及producer回调中的任意change/restart；任务更新通过明确的owned-context hook完成，不再依赖旧监听重入。main已有步内terminal command微任务隔离须保留；暂停意图可先隔离输入/loop，但其phase提交必须在步后边界执行，不让reentrant setPhase改正在提交的世界。

提交后交付也设main局部屏障：从音频/旧通知开始到该packet的receipt与cursor完成期间，旧observer重入的pause/restart/menu只排队，不立即提交phase或替换世界。可以立即隔离后续输入，世界命令在交付边界按既有应用门禁执行，并校验捕获的run/epoch。每次交付及确认还校验消费者generation；旧回执不得推进新局cursor。屏障不递归flush，不扩为新全局总线。

## 5. journal、读取与确认

候选motionStamp为`{streamEpoch,throughTick,throughSequence}`，随SimSnapshot提交。main同次读取presentation(alpha)，从它取得runId、tick、stamp、timeSec、stepSec，再以该stamp读取journal；同步段不await、不重新拼另一张snapshot。插值位置仍由presentation提供；离散事件归最新已提交tick，不等alpha=1才交付，也不把事件position再次写到角色root。

journal只保存不可变的完整tick批，不靠每帧临时event数组或破坏性drain。候选预算为256个tick批、1024条事实、单tick64条draft；是待批准参数，不是现有能力。main持有独立render/audio游标，不把“render取走”当“audio已消费”。read是非破坏操作，重读同范围身份不变。

普通一次render跨K+1…K+5，返回该范围全部非空事件及完整through水位，包含同tick多事实；空tick可区间压缩但须证明无事件。消费者逐条按sequence分类完成/抑制/失败记录，最后确认完整批的through游标。重复render没有新事实，重复packet不能再次触发动作/声音。读/ack须同时验证runId、epoch及通过水位，不接受旧局游标或未来水位。

有限内存不能承诺无限停顿后绝不丢历史：预算内所有已提交事实不漏；超限按完整批淘汰并记录floor水位、丢失区间/计数。慢消费者读到GAP须明确诊断、清一次性待播、从当前snapshot重建持续姿态并显式rebased确认，不能把它当空批成功。单tick超过draft上限则整个该tick标GAP、丢弃其部分draft，保留实际事实总数/序号跨度；继续模拟规则和任务计数，不静默截尾、不伪造完整交付。音频队列也有独立候选上限及诊断。正常“不漏”验收不包括显式GAP路径。

## 6. 暂停、边界与消费者

streamEpoch由Simulation单一分配，WORLD_EDIT/QA传送、重置、新局、abandon切换；pause/resume仅phase提交，epoch不变。当前setPhase也会commit(discontinuity=true)，因此新消费者不能将旧boolean一概理解为世界重置。候选严格新模式用epoch判断清理；保留无新metadata调用的旧门面兼容行为，不重写17环境/资源模块。

- 暂停：tick不推进、journal不按墙钟过期；待播批保持，返回DEFERRED不确认，不清已消费水位。实际AnimationGroup/混合/镜头冻结，恢复按模拟秒数继续，不重放已播或追赶隐藏墙钟。
- 世界编辑/change：不产生动作或落地事实；发布新epoch的snapshot、记录REBASE而非假运动，清旧epoch待播。状态-only pause/resume要由显式原因区分，不能靠猜callback内容。
- restart：main清旧局交付引用并按新stamp初始化游标，renderer一次reset；异步旧packet/旧实例完成均拒绝。保留现有应用runId生成/结算权威，不从render建新局。
- ENDED：最后完整tick仍可交付并确认，失败姿态优先，不将刚消费的旧JUMP强行播完；abandon/menu/dispose明确抑制尚未交付瞬态并记录原因，旧局不得恢复播出。
- 首次挂载/重放seek：默认从当前水位建立基线，不补播历史；未关联动作身份用现有快照持续姿态并标示限制，不伪造actionId。仅视觉资源重载不改变Simulation epoch或audio游标。

CharacterView记录已消费动作实例与序号，使同clip的下一次真实动作也能区分；同一批有旧落地又有新跳时，全部事实计入receipt，最终姿态以最新snapshot/最后有效动作协调，不排成落后于世界的长播放队列。CameraRig接事实派生的一次性落地输入，取消同epoch的CONTACT_EDGE_ONLY双路；同帧多个落地可合成有界视觉反馈，但消费清单不得漏ID。未知冲击速度保持低幅，不堆叠到无限震动。动画不回写模拟、root、支撑或计时。

## 7. 任务与旧音频兼容：只执行一次

任务计数保留在同一输入成功点：main提供同步owned-context回调，只对成功JUMP/ROLL调用现有missionSystem.trackAction，早于physics/afterStep。奖励算法和mission.update顺序不改。新模式下旧PLAYER_ACTION监听不再增加任务，journal重投/低帧率/暂停不能影响收益；legacy模式保留原行为。

新模式关闭输入/physics原两类emit，由main在成功提交后对外仅兼容通知一次。现有主监听的新模式运动音频分支关闭；main唯一兼容适配调用**原AudioEngine方法**一次，再通知旧观察者，不能既直接播放又经旧监听再播。旧观察者异常用try/catch隔离，不影响独立render消费者；未迁移任意第三方旧listener的完整异常隔离不作保证，实施前须定向核对两类事件引用。

为保留“跳/落地→同tick拾取/撞击声音”的相对顺序，请求main内的最小步内音频暂存：typed producer提供运动cue ordinal；现有coin/powerup/shield/collision/chase音频回调仅在正在模拟步时暂存原方法调用描述，其他时点沿旧路径。提交后按原发生ordinal逐项尝试一次，先标记attempted再调用；失败或静音也视为已处理，不自动重放，其他cue继续；异常步整组取消。这样不会把提交后的跳声插到已播放的crash之后，也不向本批扩出这些新的权威事件。

此扩围只涉及main已有音频调用的交付位置，不改audio.ts、音效素材/参数、任务奖励、道具规则或新BGM策略，不启动PAO-20。如果Dispatcher不接收这项最小兼容扩围，必须另审声音时序取舍；不能一面保留旧同步运动声、一面新增post-commit运动声。音频交付每步在observeTerminalTick前完成，render仍按独立游标按帧读取；静音不会清权威journal。

## 8. 未来写权、迁移与回退

本轮三份文档是全部写权。未来生产推荐由**同一实现方集中串行**拥有main、simulation、contracts及必要input/physics观测接缝：先新模式合同/测试和journal，再producer+同tick任务兼容，再唯一main交付/时间/音频暂存；每个可运行检查点保持来源模式一致，不能运行生产半开双路状态。具体实施计划和写权须批准后另发。

render接续涉及babylon/characterView/cameraRig及专属测试，入口检查点后串行接；main在完成这些接线前不启用生产committed模式。候选模式固定为bootstrap内部`legacy`或`committed-motion-v1`，不新增用户设置/存档schema。isolated旧调用保持legacy默认，新增测试显式选择新模式；旧测试断言不放宽。

回退以完整批次代码/入口模式为单位：同时关闭新producer/new consumer/新音频中继，清同局新交付游标后只开legacy原路径；不热切回一半、不新建持久化键、不靠git reset/合并其他树完成本轮。异常已发生的声音不能回滚，因此不承诺运行中双模式无缝切换。assets/environment/entityViews、字体和主题保持只读，完整PAO-9总线、application事务及19 UI不在该白名单。

## 9. 待审点与验收门槛

候选字段、预算、GAP/rebase策略、main最小音频暂存、异常局fail-stop/fresh-context恢复及唯一写入者须一起审查；不以批准路线A代替这些具体合同批准。准确扩围及RED矩阵见配套合同。所有未来行为测试/30/60/120fps/真实浏览器/N与F/截图录屏均未在本轮执行；正常文档提交hook成绩不证明桥已存在。具体设计批准后才允许writing-plans/实现，不标18 Done、不解除依赖、不自动推进其他任务。
