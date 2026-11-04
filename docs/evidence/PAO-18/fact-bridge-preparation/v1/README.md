# PAO-18 事实桥设计准备与交付记录

2026-11-04（Asia/Shanghai）。本轮仅三份新文档，未实现桥、写测试或运行实验/浏览器。

## Git核对

- 显式目录/顶层：`D:/worker/paoku-sessions/pao-18-font-diagnosis`。
- 分支：`codex/pao18-font-diagnosis`，沿用历史名称，未另建树或切分支。
- 开始HEAD：`826b10fd8c6200fbaec02a76f4ec9d5482d5bb12`；`git ls-remote --heads origin refs/heads/codex/pao18-font-diagnosis`同SHA。
- 初始`git status --short`无输出；common-dir=`D:/worker/paoku/.git`；`git merge-base --is-ancestor 5bd31cc06a44c1a2ac382809ea8eadb69df76984 HEAD` exit0。
- 最近沿革：5bd31cc工程→e6a52b1字体诊断→826b10f同源字体；不从原18树移植或合并。
- origin=`https://github.com/yboo2049-source/paoku.git`；未reset/merge/cherry-pick，未创建Agent/聊天，未修改其他树或Linear。

## 读取依据与实际发现

主仓只读：`AGENTS.md`、`docs/plans/2026-11-04-pao18-fact-bridge-design-brief.md`及架构/流程/测试顶部当前生效段。当前任务书限定新设计写权，不沿用历史车尾修复许可。using-superpowers / brainstorming按已读本机安装副本应用；brainstorming副本位于`C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/brainstorming/SKILL.md`，本轮重读比较路线，不进入writing-plans/实现。

| 本树按需读取 | 已核结论 |
| --- | --- |
| src/core/simulation.ts | step内递增tick和应用输入，physics/afterStep后commit；当前异常不回滚mutable context，change可借用步内context；需提交屏障而非render补身份 |
| src/core/inputQueue.ts | 同tick按command.sequence；队列接收不等于动作成功，暂停/旧局/迟到/重复有既有拒绝规则 |
| src/systems/input.ts:140–157 | 成功换道/JUMP/ROLL才emitPLAYER_ACTION；默认调用只用于legacy隔离兼容，不改变合法性 |
| src/systems/physics.ts:135–190 | didLand点旧事件仅y，可读取当点support/surfacesAfter；没有相对冲击速度导出 |
| src/systems/surfaces.ts:5–36、62–104、返回didLand处 | Surface的GROUND/RAMP/ROOF/id，resolver确认后vy归零；只为producer观测读取，不排查车尾、不修改支撑算法 |
| src/main.ts:59–68、112–152、155–211、249–318、334–371 | 唯一Simulation/producer桥、旧音频/任务同监听、任务更新顺序、terminal微任务隔离、同次presentation、dispose |
| src/systems/mission.ts:65–117 | trackAction只增加有效动作任务；update检查奖励在afterStep；不能把计数挪到journal消费 |
| src/core/snapshot.ts、gameLoop.ts | 元数据继承当前，仅空间插值；默认最多5次实际补步，丢弃墙钟不等于模拟过的tick |
| src/types/index.ts:25–48、types/contracts.ts | 实际Player contact/support/计时与SimSnapshot秒数字段；没有新运动事实封套或完整motionPhase |
| src/render/babylon.ts帧/同步/边界处、characterView.ts、cameraRig.ts接口/同步入口 | CONTACT_EDGE_ONLY、实际动画暂停与已存在镜头工程；epoch/时间/事实接线仍缺；字体/主题不重做 |
| docs/render/pao18-interface-and-validation.md当前I-01/I-03段 | 原接口缺口是历史设计输入，不把待实现候选当当前能力 |
| tests/unit/simulation.test.ts与pao18专属测试定向引用 | 旧legacy同步监听/借用context需保留兼容，新增严格模式用新RED，不放宽旧断言 |

初次尝试`src/systems/missions.ts`和`tests/unit/input.test.ts`不存在；按main实际import/定向文件名定位到`src/systems/mission.ts`，未借机扫全部系统。没有阅读15/19活动产物、车尾候选或全部GLB。

PAO-9只读固定参考：`D:/worker/paoku-sessions/pao-9/docs/architecture/rebuild-contracts.md`，§5–7及对应窄范围类型/白名单引用；该文件最后提交及树HEAD为`59fc682c33623150343f414b706e9771b8b6cbb4`，限定文件status无输出，SHA-256=`899bbad1c07ccb756c6c4155a181c4bd1e880c82909efe6e8b8ead549f61decf`。共同封套/事件排序是目标参考；其完整严格payload、所有事件和UI/音频体系均未实现，不复制成现状。

## 设计结论和范围

推荐权威步内显式producer→成功提交完整tick批+snapshot stamp→main单入口独立render/audio游标。ACTION_STARTED三动作及PLAYER_LANDED是最小子集；冲击速度null，HURT/FAIL不扩围。任务保持原输入成功点计数，音频提交后单路交付且保持同tick相对次序；暂停不换epoch，QA/重开等明确rebase；有限预算溢出必须报GAP，不能说无限不漏。

三份文档：

- [设计](../../../../superpowers/specs/2026-11-04-pao18-fact-bridge-design.md)
- [候选合同/未来白名单/RED矩阵](../../../../render/pao18-fact-bridge-contract.md)
- 本README。

新模式需要main/simulation/contracts/input/physics的明确串行扩围及三个render消费者路径；其他核心/应用/音频模块默认只读。具体字段、预算、异常保护、main最小音频适配均待审，不自动实施，不标18 Done，不解除父依赖。

## 文档检查与提交门禁

内容审查逐项核对任务书7个问题：成功动作/producer、身份/提交异常、多tick/有界读取、只读秒数/暂停、旧副作用单路、唯一写入者白名单、未来RED与N/F。引用/相对链接、跨树固定来源及git diff检查在提交前执行；未来矩阵全部未运行。

本树已有依赖和正常hook入口，`.husky/pre-commit`要求build+unit；仅为提交执行现有hook，不安装依赖、不起服务/E2E或浏览器。保留正常hook，不绕过；若需已有PortableGit修正进程PATH，仅限本次提交环境，不修改仓库配置。hook通过只说明本树现有代码检查通过，不能当事实桥已接入成绩。

内容审查已补充提交后交付重入屏障：旧observer触发的暂停/重开在packet确认边界串行执行，旧generation回执不得确认新局。未来FB01–FB17均未执行。

实际提交/推送回执在首次正常提交推送后追加；最终回执提交自身SHA及远端一致性由最终交付提供，避免自引用或预填成功。
