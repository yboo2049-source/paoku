# PAO-18 下一批：真实运动事实桥设计与手动提示词

2026-11-04，Dispatcher准备。当前仅设计，未批准实现；不重做字体、主题或控制器，不恢复KI-001/002。

## 目标与顺序

把模拟中真实发生的起跳、翻滚、落地等事实可靠地交给现有动作/镜头消费者。解决“一个渲染帧跨多个模拟tick时，中间发生的落地可能漏掉”及动作身份/秒数缺口。现有工程边沿降级不是完整事实桥。先完成该窄范围设计并审查，再限定实现；动态19 UI、新runner、正式资产、音频重构仍分批，PAO-20/21不提前启动。

已回读Linear的PAO-18/16/20/5：18仍依赖15/11/17，20依赖9/18/19。不修改Linear状态或依赖，不把本次子集设计说成完整PAO-9迁移或父18完成。

## 工作树就绪回执

- **复用** `D:/worker/paoku-sessions/pao-18-font-diagnosis`，沿用历史分支 `codex/pao18-font-diagnosis`；当前成为18后续设计接续树，不另建树或改分支名。
- 实际HEAD及远端均为 `826b10fd8c6200fbaec02a76f4ec9d5482d5bb12`；status含未跟踪项为空。顶层/分支/common-dir/主仓worktree登记一致，common-dir为 `D:/worker/paoku/.git`。
- 18工程基线 `5bd31cc06a44c1a2ac382809ea8eadb69df76984` 与字体826b10f均为HEAD祖先，exit0。该树已经同时包含控制器/镜头与获审字体，无需先移植到原18树。
- 本树上一批主Agent独立build/293 unit/65 E2E/生产字体离线验证通过；本次为设计准备，不重复跑游戏验证，不把这些成绩当未来事实桥成绩。
- 主Agent未启动任务/Agent/聊天、服务或依赖安装；用户在现有18或字体聊天手动接续，聊天目录仍须自行核对。

## 已核对的真实接缝

本树 `src/core/simulation.ts` 在step内先递增tick，消费输入、调用physics/afterStep，随后syncPhase/commit；snapshot已有runId/tick/timeSec/stepSec。`src/main.ts`同次presentation构造RenderFrameIdentity，目前只传runId/tick/discontinuity/appState，没有timeSec/stepSec。`src/systems/physics.ts`的PLAYER_LANDED目前只含y；main只据它播放落地音效。总线是同步且无类型的旧全局EventBus。不能在render接到回调时补上当前tick，冒充事实发生tick。

正确类型路径是 `src/types/index.ts`、`src/types/contracts.ts`；模拟文件为小写 `src/core/simulation.ts`。PAO-9文档路径是 `D:/worker/paoku-sessions/pao-9/docs/architecture/rebuild-contracts.md`，仅作固定合同只读参考，不复制整套未实现schema。

## 三种候选与推荐

| 路线 | 做法 | 取舍 |
| --- | --- | --- |
| A（推荐） | 在权威模拟步内取得事实、与该步提交关联，再由唯一应用入口向render交只读批次及正确时间 | 能保留跨tick事实及稳定身份；需设计最小producer接缝、提交边界与有界保留策略 |
| B | main临时收集全局旧总线事件，按当前模拟tick补身份 | 改动看似少，但全局来源/重入/步外事件与未提交状态难辨；必须先证明隔离，不能作为无条件捷径 |
| C | 继续比较最终snapshot的contact/jumping/rolling边沿 | 生产改动最少，但无法找回两个render之间已经开始又结束的事实，不满足本批目标 |

按Architectural路径处理这项限定契约变更；以上是设计方向，不是冻结schema或生产写权。

## 设计必须回答

1. 最小支持的事实类型、真实producer位置及payload；合法动作开始与无效输入区分，落地ground/ramp/roof来源、支撑面身份及impactVy缺失时如何显式处理。未知字段不得从clip、无敌倒计时或最终快照伪造；HURT/FAIL是否纳入本批须说明理由，不能默认扩到全部事件。
2. contractVersion/eventId/runId/tick/sequence/timeSec及action instance identity如何生成、何时提交；异常步、步外QA/change、reset/restart/abandon怎样处理，不能发布半步事实。
3. 多tick补步后的一次读取、重复render、同tick多事实、批次完整性、旧局/迟到项及有界内存；溢出必须可诊断，不能以静默覆盖宣称不漏。读取/确认时点与插值presentation的时间关系要明确。
4. 只读消费者接口、stepSec/timeSec透传；暂停时待播/已播事实、恢复不追墙钟、断点和dispose清理。动画不写模拟/支撑/伤害/位移。
5. 旧音频及任务监听仍只触发一次。此次不改音效、奖励或玩法规则；不得因新事实桥双路触发旧副作用。物理只讨论观测/事实输出接缝，不修改碰撞、积分或支撑算法，不读取或移植车尾候选。
6. 分阶段的未来生产白名单和唯一写入者：main、simulation、types及必要input/physics接缝集中串行；render消费者与测试另列。需明确哪些路径必须扩围，不在设计批次写实现。
7. 行为RED矩阵与真实浏览器验收：30/60/120fps、多tick落地、地面/坡/车顶、同tick多事件/复投、无效输入、暂停重开、跨局迟到、内存溢出及旧音频至多一次。F合成事实不能替代N自然输入；真实链路也不能把技术clip说成正式动作自然性。

## 本批写权与交付

仅新增本树：

- `docs/superpowers/specs/2026-11-04-pao18-fact-bridge-design.md`：推荐方案、替代方案、实际数据流、生命周期、迁移/回退与缺口。
- `docs/render/pao18-fact-bridge-contract.md`：候选字段/producer/consumer、逐项写权和RED矩阵，未冻结字段标明候选。
- `docs/evidence/PAO-18/fact-bridge-preparation/v1/README.md`：Git准备、按需读取依据、内容/引用/diff检查及实际提交推送回执。

src、public、tests、旧文档/证据/资产、配置、依赖及其他工作树均只读。不编写测试/生产代码，不运行新增实验或浏览器，不创建其他Agent。纯文档内容及引用审查、git diff --check通过后，按正常hooks提交推送当前分支并核对远端；不绕过hooks，hook构建/单测不当事实桥已实现成绩。交Dispatcher独立审查后才请求用户批准实现。

## 可直接发给现有18或字体聊天

```text
接续PAO-18下一批，仅做真实运动/接触事实桥设计。

使用现有工作树D:/worker/paoku-sessions/pao-18-font-diagnosis，分支codex/pao18-font-diagnosis，已核验HEAD/远端826b10fd8c6200fbaec02a76f4ec9d5482d5bb12、干净，含18工程5bd31cc及获审同源字体。沿用该树和历史分支名，不新建worktree、不合并原18。先显式核对cwd、顶层、分支、HEAD/status/common-dir；HEAD推进先检查，不reset。

先读D:/worker/paoku/AGENTS.md和D:/worker/paoku/docs/plans/2026-11-04-pao18-fact-bridge-design-brief.md，按其本批范围、设计问题及三个新文档白名单执行。应用brainstorming，推荐权威步内事实随提交保留，再由唯一应用入口传只读批次；比较替代路线，不从render tick补造事件身份。

本轮只设计，不进入writing-plans/实现，不改src/public/tests/配置/依赖或旧文档。按需读已列main/simulation/types/input/physics和现有render消费者；保留旧音频/任务副作用至多一次，明确多tick不漏事实、同tick排序、去重、溢出、暂停/reset及秒数来源。固定PAO-9合同仅作参考，不把未实现schema当现状。

车尾及预览KI-001/002继续延期，不修复、不复现或移植候选。字体与17主题已验收，不重做；新runner、19 UI、音频重构和20/21另批。本次不放宽任何旧测试，不启动Agent/聊天。

三份新文档完成内容/引用/diff审查后，正常hooks提交并推送当前分支、核对远端SHA；纯文档不需E2E。返回推荐方案、准确最小扩围文件、关键RED矩阵及commit，等待主Agent审查和用户批准后才实施，不标18 Done或解除依赖。
```
