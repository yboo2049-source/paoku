# PAO-18 事实桥候选合同与RED矩阵

2026-11-04，候选 v0.1，未冻结、未实现。依据[设计](../superpowers/specs/2026-11-04-pao18-fact-bridge-design.md)；本轮只写文档，不新增export/schema/测试或运行实验。

## 1. 身份和封套候选

| 字段 | 来源及约束 |
| --- | --- |
| profile / contractVersion | 候选`pao18-motion-v1` / `1`；是PAO-9共同封套的限定子集，不冒充完整PresentationEvent合同 |
| runId | Simulation持有的实际局身份；不得取未来应用局、render回调或资产ID |
| tick | producer所属权威step递增后的tick；只在该步成功commit后可见 |
| sequence | Simulation事件序号，按producerOrdinal于提交时分配；实例一生不复用，restart/QA也不回绕，局内单调。不是InputCommand.sequence |
| eventId | `runId:tick:sequence`；重读/重投完全稳定；禁止字符串词典序排序 |
| timeSec | `tick*stepSec`，提交步时间锚点，不是墙钟或碰撞TOI |
| type / payload | 下表两种判别联合；所有对象/数组/嵌套position为只读副本 |
| streamEpoch（交付上下文） | Simulation分配的世界连续性代际，放在batch/stamp；暂停不变，world edit/restart/abandon改变。消费者键至少校验runId+epoch+sequence |

`actionInstanceId`候选取`runId/streamEpoch/action/inputTick/inputSequence`，包含来源成功命令身份。输入队列accepted/consumed但动作无效时无ACTION_STARTED、无新action实例，命令日志仍按既有规则记录。event.sequence与command.sequence分开，不能以最后一条input覆盖同tick其他成功动作。

| 类型 | 候选payload | 唯一producer / 缺项策略 |
| --- | --- | --- |
| ACTION_STARTED | action=`JUMP/ROLL/CHANGE_LANE`；actionInstanceId；inputTick/inputSequence/source；fromLane/toLane；position | systems/input成功修改分支→Simulation显式结果接缝；lane钳制无变化、重复jump/roll不产生事实；非换道from=to |
| PLAYER_LANDED | surfaceId:string或null；surfaceKind=`GROUND/RAMP/ROOF`或null；position；relativeImpactSpeedMps:null；impactStatus=`NOT_EXPOSED_BY_CURRENT_SOLVER`；supportStatus=`KNOWN/MISSING` | physics既有didLand点，读该点support及surfacesAfter映射；缺失显式诊断。准确冲击速度须另审solver观测出口，不用before/final vy近似充真值 |

LAND不强制关联最近一次JUMP：走落/初始支撑也可能没有成功JUMP来源；消费者以序号顺序处理，不从clip结束或无敌计时捏造动作关联。HURT/FAIL、SUPPORT_CHANGED及其他PAO-9类型全部不在本候选union；终局姿态/持续contact仍读snapshot。

## 2. 批次、stamp、读/ack

| 对象 | 候选字段和语义 |
| --- | --- |
| MotionStamp | streamEpoch、throughTick、throughSequence；由Simulation随同一SimSnapshot提交，不由main事后追补 |
| CommittedTick | profile/version、runId、streamEpoch、tick、timeSec、stepSec、previousSequence、throughSequence、complete、events；空tick events=[]、complete=true，水位不凭空加一 |
| MotionCursor | runId、streamEpoch、throughTick、throughSequence；消费者私有的最后完整确认点 |
| MotionRead | `OK`（只读完整批/空区间及throughStamp）、`GAP`（丢失序号/批区间、原因/计数和当前stamp）、`REBASE`（epoch/局改变及原因）、`FAULT`（失败步及最后提交stamp）；不能混为[] |
| ConsumerReceipt | consumer、packet范围、每ID的handled/suppressed/attempt-failed与原因、是否complete；pause返回DEFERRED，不推进确认点 |

候选读取调用语义为`readMotionFacts(afterCursor, throughStampFromPresentation)`，纯读、不删数据。main同次presentation提供ctx、runId/tick、timeSec/stepSec和stamp；validate stamp属于该局/代际且非未来水位。read只能交付已提交完整tick，不能将正在写的draft数组透传。main持有audio与render两个独立cursor；audio每步后确认，render每帧后确认，不能由一个drain让另一个漏事件。

消费者先验证版本、局、代际和顺序，再逐项处理；完成一条时记录其ID/高水位，整个packet完成才确认最后完整批。副作用在调用前标attempted，重复packet/同tick多render不能再次触发；消费者异常记录并隔离，不能回滚模拟或拦住另一消费者。乱序/冲突ID的packet拒绝并诊断，不用最大已见ID吞掉尚未收到的同tick项目；本地生产交付应按数值sequence有序。

main局部delivery屏障覆盖副作用、旧通知及receipt/cursor完成；observer重入的生命周期命令先排队，交付边界再经应用门禁执行，不递归flush。输入可先隔离，phase/世界不得在packet中途替换。交付和确认都校验run/epoch/消费者generation，迟到回执不能确认新局；不改全局eventBus协议。

一次render可收K+1…K+5：即使最终contact与K相同，所有中间事实仍在events。字段timeSec/tick仍是最新提交步；空间位置可以插值，离散fact不再插值或迟延到alpha=1。角色root只同步presentation，事件position不得再加位移。新动作同clip也以actionInstanceId区别，历史事件消费不等于按历史顺序强制播完所有clip。

候选内部接缝：input追加可选observation并回传成功AppliedAction；SimulationOptions.physics向既有updatePhysics的第五个可选观测参数转接。Simulation拥有step限定sink，main仅接`onAppliedAction(ownedContext, outcome)`任务hook和`onMotionDraft(stepToken, ordinal)`音频顺序hook。两者均非公开事实订阅，不分配已提交event.sequence，不在步外使用；具体命名待实施计划固定。

## 3. 有界策略（参数待批准）

- journal：256个完整tick批、1024条事件；draft：单tick最多64个事件payload。无墙钟TTL，暂停数小时不会因时间经过而丢pending。事件/position字段长度有限，诊断采用计数+有界最近记录，不累计无界ID集合。
- 空tick可压缩为已证无事件区间；若压缩仅空tick且cursor.sequence等于floorSequence，可确认空区间，不假报丢事件。淘汰含未读事件的完整批时，记录floorSequence/floorTick；cursor低于floorSequence返回GAP。
- 单tick超64：不保留部分“complete=true”批；丢其部分draft、保留实际事实计数与完整序号跨度，commit snapshot及显式GAP。输入/physics/任务仍按原规则运行，不为日志容量拒绝合法动作。安全整数溢出则fail-stop，不回绕身份。
- audio暂存候选256条调用描述/step，超限记录明确音频gap且不重播历史；它不是新的权威事实日志。常规预算内必须完整，超限验收验证的是可诊断/内存有界，不能写成“无限不漏”。
- GAP恢复：消费者清一次性缓存，从最新snapshot恢复持续姿态、显式rebase receipt；audio不补播丢失历史声音，任务/奖励不受消费成功与否影响。生命周期抑制单列reason，不混入普通遗漏。

## 4. 生命周期矩阵

| 边界 | Simulation/journal | render/audio |
| --- | --- | --- |
| 正常tick | 完整发布snapshot+批次，序号推进 | 按独立cursor消费/确认；重复渲染不重播 |
| pause/resume | phase-only commit，epoch不变，不产生运动事实、不推进tick | 待播保留、已播水位保留；实际组/混合/镜头冻结，恢复不追墙钟 |
| QA/change世界编辑 | 明确WORLD_EDIT原因，新epoch/rebase，零运动事件 | 清旧代际；首帧姿态读snapshot，不能伪造jump/land |
| restart | 新局及新epoch，事件sequence不复用，旧批释放 | 旧局/旧代际packet/异步资源无挂载资格，初始化当前基线，不补历史 |
| ENDED最终tick | 正常完整commit，不增加本批FAIL事件 | 音频按发生序尝试一次，最终失败姿态优先；中间动作可抑制但每ID有receipt |
| abandon/menu/dispose | 明确屏障，停止读取/保留有界诊断后释放引用 | 尚未播出的瞬态显式抑制，不恢复播旧局声音；取消订阅/待播引用 |
| step异常 | draft/步内音频取消；不发布半步水位；旧snapshot保持，FAULT读取、阻止继续/污染结算 | 停loop/输入；已有应用暂停可显示，但不提交污染context；不能RESUME恢复，只有经应用批准并提供fresh context的新局恢复 |
| 重放seek/新消费者挂载 | 显式当前基线或新epoch，不合成运动事实 | 默认无历史声音；未关联动作身份标限制，不编造actionId |

现有discontinuity=true同时覆盖setPhase和QA，不能直接作上述epoch开关。未来setPhase应显式STATE_ONLY，普通QA默认WORLD_EDIT；严格新模式下回调内任意change/restart禁止，既有legacy borrowed-context模式不偷偷改语义。新meta齐全的renderer按epoch屏障处理；无新meta仍保留旧门面兼容路径。

## 5. 旧副作用的唯一写入表

| 路径 | 新production模式 | legacy独立模式 |
| --- | --- | --- |
| input原PLAYER_ACTION emit | 当前调用关闭；只给Simulation显式AppliedAction结果 | 原成功分支emit保持 |
| physics原PLAYER_LANDED emit | 当前调用关闭；只给Simulation landed draft | 原emit保持 |
| JUMP/ROLL任务计数 | main的owned-context输入成功hook一次调用trackAction，仍在afterStep奖励检查前 | 旧PLAYER_ACTION监听一次更新 |
| motion音频 | main提交后唯一适配一次调用现有playJump/playRoll/playLaneChange/playLanding | 旧main监听按原路径 |
| 对外旧PLAYER_ACTION/LANDED通知 | main提交后通知旧观察者一次；main旧运动业务监听在新模式关闭，避免再次播音/计任务 | 原总线通知路径 |
| 同步旧coin/powerup/shield/collision/chase音频 | main仅步内暂存原方法调用，随成功提交按原ordinal混排；不新增这些权威类型 | 原即时方法调用 |
| mission.update /奖励/账本 | 原afterStep及既有算法，不能消费presentation event发奖励 | 保持 |

旧observer通知异常不阻断新render批次；旧总线自身仍同步、无类型，未承诺重构其所有任意listener异常传播。motion副作用由main适配直接负责并先标attempted，不能依赖某个任意listener不抛错才播音；旧通知不作为业务权威。失败/静音记录处理完成，不自动重试音频；重投事实、renderer失败和消费游标回放不再计任务。

## 6. 准确未来白名单与唯一写入者请求

以下均**未授权实施**，由Dispatcher批准后指定同一实现方串行接入；不存在main和render各自独立补协议的并写许可。

| 阶段 / 路径 | 必要变更 | 默认只读边界 |
| --- | --- | --- |
| P1 `src/types/contracts.ts` | 最小MotionFact/Stamp/Batch/Cursor/Read/Receipt类型及SimSnapshot可选motionStamp；不复制全PAO-9模型 | `src/types/index.ts`默认无需修改，无完整motionPhase或新伤害/支撑数据 |
| P1 `src/core/simulation.ts` | draft与journal/原子commit/序号/epoch、纯读、fault保护及成功动作hook；显式步外原因 | 不改RNG/前进/积分公式；`snapshot.ts`元数据spread可沿用，无需先扩围 |
| P2 `src/systems/input.ts` | 可选typed结果观测、production关闭对应旧emit；合法性和时长原样 | inputQueue/设备输入不改；无新DOM监听或动作规则 |
| P2 `src/systems/physics.ts` | didLand点复制观测及新模式关闭该emit；Surface映射只读 | `surfaces.ts/contacts.ts`及车尾算法只读；impact字段保持null |
| P2/P3 `src/main.ts` | 生产模式单一入口、owned任务hook、同次presentation/stamp/秒数、双cursor、步内最小音频暂存/旧通知、异常与生命周期原因 | 不改application交易/存档/结算规则，不新增UI或音频schema |
| P3 `src/render/babylon.ts` | 元数据/只读批次入口、receipt与新epoch边界、协调角色/镜头，切断同epoch边沿双路 | 17 assets/environment/entityViews只读，字体/主题不动 |
| P3 `src/render/characterView.ts` | action身份/次序/相位秒数及receipt，瞬态与最新快照协调 | 不获得模拟写权，不接新runner/GLB |
| P3 `src/render/cameraRig.ts` | 消费已去重落地输入，多个反馈有界合成，不虚构impact | 不改模拟或追逐者位置，HUD/低动态UI桥不接 |
| QA 新 `tests/unit/pao18-fact-*.test.ts`、`tests/e2e/pao18-fact-*.spec.ts` | 新旧模式/来源/提交/副作用/真实链路RED，旧测试只读 | 批准后才写；端口/证据另定，不覆盖旧结果 |

不开放`core/eventBus.ts`、gameLoop、snapshot、inputQueue、mission.ts、audio.ts及application服务；现有方法由main调用适配。若实际实现发现这些路径必须修改，先交具体最小请求。不是用“公共types都可写”或“物理重构”笼统授权。发布检查点必须producer/main/render模式同组切换，不能上线半开桥；回退也同组，避免旧emit+新relay双发。

## 7. 未来行为RED矩阵（全部待执行）

| ID | 刺激 / 层级 | 失败断言和必须证明的行为 |
| --- | --- | --- |
| FB01 | unit：合法JUMP/ROLL/左右换道；边界、重复、队列拒绝 | 只有实际成功分支有action实例/事实；无效动作无声/不加任务，命令日志不等于动作日志 |
| FB02 | unit：一个tick内JUMP→ROLL→JUMP和左右相反换道 | 全部真实成功按command顺序保留，不用最终flag覆盖；eventSequence/commandSequence分离且ID唯一 |
| FB03 | unit+F：30/60/120fps与不规则补步，相同固定输入 | 相同模拟tick事件清单/身份/时间及任务/账本一致；最大5补步的每个提交批可见，丢弃未模拟墙钟不造事件 |
| FB04 | unit+browser F：两个render之间下降落地又起跳，最终contact仍AIRBORNE | 新桥仍读到LAND及后续ACTION，顺序/receipt无漏，旧最终边沿法应失败；不能只测试手造数组 |
| FB05 | unit+F：GROUND/RAMP/ROOF中心及非零高度落地、连续换面 | 实际didLand及发生点surfaceId/kind/position正确；持续贴面不重复，未知impact是null；不涉及车尾延期诊断 |
| FB06 | unit：同tick多事实、多次read/render、复投/乱序/冲突ID | 重读ID不变，完整批确认；重复至多一次、乱序不吞中间项，按数值sequence非字符串排序 |
| FB07 | unit：input后physics/afterStep/freeze抛错、reentrant step/change | 不发布半步snapshot/事实/运动音频，fault停推进；不得下一step混入旧draft；fresh context恢复，不拿半步结算 |
| FB08 | unit+N：成功跳/滚刚好达到任务目标，同tick终局/奖励 | 输入成功计数仍先于mission.update，奖励/账本值不因render消费延迟或复投改变；任务不从事实回放再加一次 |
| FB09 | unit+browser：旧emit/relay计数及jump/land→pickup/crash顺序 | 两种模式各自单路；新模式运动音频API及旧观察通知各一次，副作用不双路；异常/静音不自动重播 |
| FB10 | unit+browser：一个消费者/旧observer抛错、重试相同packet | 模拟不回滚；另一消费者继续；已attempted副作用不重播；旧全局bus局限明确，不伪称所有listener已改造 |
| FB11 | unit+N：有待播事实时暂停、同tick重复pause commit、长墙钟恢复 | epoch不变、待播不被清、已播不重播、tick不推进，实际动画/镜头冻结；resume无墙钟追赶 |
| FB12 | unit+browser：QA世界编辑、新局同实体ID、旧packet/旧异步回调晚到 | 新epoch/rebase零假动作，旧局/旧epoch拒绝；reset一次；没有以当前render tick补造历史 |
| FB13 | unit+browser：ENDED末tick、abandon/menu/dispose、重放seek/首次挂载 | 末tick提交完整；按边界明确抑制与确认，退出后无旧音频，首次挂载不补历史；清订阅/队列/receipt引用 |
| FB14 | unit：超256批/1024事件/单tick64 draft/音频队列预算 | 内存有界、完整批淘汰，GAP区间与计数精确；不静默覆盖或部分批冒充complete；恢复不补历史音效 |
| FB15 | unit：暂停前retention压力、无事件空tick、未来水位/旧cursor | 暂停无TTL淘汰；空区间压缩有证明，读确认仅合法范围；独立audio/render游标不会互相drain |
| FB16 | unit+browser：只读嵌套payload/snapshot/Map、事件position与插值root不同 | 对抗性写不污染producer；root只复制presentation，不再次位移；stepSec/timeSec来自同次snapshot，无tick当秒 |
| FB17 | unit：步外raw bus伪事件、过期producer sink、旧observer交付中触发pause/restart/menu | raw bus不生成权威事实，过期sink拒绝；生命周期命令在receipt边界串行执行，旧回执不推进新局；legacy独立调用仍保留旧通知 |

未来浏览器验收须在批准固定提交/端口后运行完整build/test/E2E、真实服务独占strictPort/不复用/D3D11、raw/HTTP/前后保护；保留所有旧错误传感器/断言。N键盘/触摸真实有效动作和暂停重开分报；F固定多tick/支撑面/重复投递/异常/溢出分报。F合成消费者清单不能替代真实Simulation→main→render/audio链路；工程clip不能代表正式动作自然性。

未来仅看2～3关键新图并配多tick落地/跳滚/暂停短录屏；截图不证明事件不漏，要记录权威已提交清单与消费者receipt逐ID比对。车尾KI-001/002继续延期：不为该设计复现实验、不复制候选；未来完整旧suite若出现继承失败，原样报告并由Dispatcher处理，不改断言或扩到车尾修复。本轮未运行上述矩阵或浏览器，正常文档hook不计为其通过。
