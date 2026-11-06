# PAO-18 Fact Bridge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将真实成功动作与既有didLand事实按完整提交步交给音频、角色及镜头，跨多个模拟tick不漏事件。

**Architecture:** Simulation独占draft、身份、epoch及有界journal，snapshot携带同次stamp；main独占生产切换、任务hook、音频暂存及交付屏障。角色/镜头只消费只读批次，以模拟秒数推进，不回写root或玩法。原独立调用保持legacy。

**Tech Stack:** TypeScript、Babylon.js、Vitest、Playwright、Vite；Windows ANGLE D3D11。

## 固定输入和范围

工作树`D:/worker/paoku-sessions/pao-18-font-diagnosis`，分支`codex/pao18-font-diagnosis`，起点`c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85`，status干净，common-dir=`D:/worker/paoku/.git`。主仓`2026-11-04-pao18-pao19-approved-bridge-execution.md`第1/2/4节覆盖原候选稿仅设计限制；本树fact-bridge spec/contract及FB01–17为行为合同。

只改`src/types/contracts.ts`、`src/core/simulation.ts`、`src/systems/input.ts`、`src/systems/physics.ts`观测段、`src/main.ts`、`src/render/{babylon,characterView,cameraRig}.ts`；新增三个`pao18-fact-{journal,producers,lifecycle}.test.ts`及`tests/e2e/pao18-fact-bridge.spec.ts`。计划及`docs/evidence/PAO-18/fact-bridge-implementation/v1/`用于交付。其余代码、旧测试、资产与历史证据SHA-256保护清单存`.pao18.local/fact-bridge/protection-before.json`；本地输出仅该忽略目录。不同活动树不读写、不启动Agent、不接19。

## Task 1：基线与保护

1. 核对Git/授权/合同、记录保护清单；显式旧文件hash。
2. `npm run build`和`npm run test`输出保存`baseline-{build,unit}.log`，要求exit0；失败分类保留，不借历史成绩。
3. 首次结果不可覆盖，后续以阶段名保存。

## Task 2：日志/生命周期 RED → GREEN

1. 新journal/lifecycle测试通过实际Simulation调用，以可选新API断言缺少motionStamp/日志（不是导入错误）；覆盖空步、同tick身份、多步读取、重复读/独立游标、freeze、未来/旧游标、pause与WORLD_EDIT、异常保留上张snapshot。
2. `npm run test -- tests/unit/pao18-fact-journal.test.ts tests/unit/pao18-fact-lifecycle.test.ts`保存首RED。
3. contracts定义MotionFact/Stamp/Batch/Cursor/Read/Receipt、可选producer能力；Simulation仅新模式启用。提交先准备深只读snapshot和完整批后原子替换。256批/1024事件/64draft；整批GAP，空tick不增sequence。fault只允许fresh-context恢复。
4. `npx tsc --noEmit`及上述目标单测到GREEN，legacy仍为生产默认。

## Task 3：真实producer RED → GREEN

1. 新producers测试调用真实input/physics：false/false开始，JUMP→ROLL→JUMP两次成功；ROLL→JUMP→ROLL三次成功；边界/无效输入、ground/ramp/roof发生点、impact=null、过期sink。
2. `npm run test -- tests/unit/pao18-fact-producers.test.ts`保存缺观测行为的首RED。
3. input成功点可选观测；physics第五可选参数只替换didLand通知接缝。Simulation同步owned-context任务hook早于afterStep；不改规则/solver/奖励。
4. tsc+三个新unit GREEN。

## Task 4：main与render RED → GREEN

1. 新E2E先写真实应用链路：N键盘/触摸/暂停重开；F多个真实step间LAND→新JUMP、重复交付、只读root、未知impact；首次缺少传递诊断应RED。unit增加NullEngine真实AnimationGroup、同clip实例、实际暂停、独立camera去重。
2. main启用committed模式；步内256音频描述暂存，运动draft与旧音频按发生顺序混排，提交成功才attempt。任务在owned hook处理；旧motion业务监听关闭，只发送一次兼容通知。交付中生命周期意图延至边界，run/epoch/generation检查，fault停loop、原应用暂停、fresh-context重开。
3. render同次presentation/stamp/秒数透传，epoch区别pause。角色处理实例身份及receipt，镜头仅接受已去重landing；保留legacy降级、固定旧HUD profile，正式资产不接入。
4. `npx tsc --noEmit`及三个目标unit到GREEN；新E2E GREEN后进入完整门禁。

## Task 5：完整门禁与证据

1. build、完整unit、新测试显式tsc。命令输出、版本、时间、skip/retry/flaky、首失败保留。
2. 端口5198检查无占用；本地Playwright配置strictPort、reuseExistingServer=false、workers1、retries0、D3D11，`npm run test:e2e -- --config ...`完整旧+新增。旧suite镜像只改输出位置及获准旧18录屏5188→5198，反向还原必须逐字一致，旧源码/断言/时钟/超时/证据不改。
3. 保存raw/HTTP身份与前后hash保护；N/F分报、逐ID已提交/receipt比对、地面坡顶、重复/异常/overflow、warmup后20轮10reset资源稳定/延迟/幂等dispose。实际查看2–3张新图及短录屏，工程clip不能当正式动作自然验收。
4. 继承失败：保留首次现场，不skip/改旧断言/反复跑绿/修车尾。未过完整门禁不提交生产批次，保留本地交主审。
5. 全过后白名单暂存、diff检查、正常hooks提交/push/ls-remote。返回固定SHA及边界，等待独立验收，不标父18 Done、不合并或继续19/正式资产。

## 执行记录

- Task 1完成：Git基线一致，原build/293单测通过，1221个只读源/资产/历史证据保护hash已记录。
- Task 2–4已实现：journal、真实producer、main单路交付/音频暂存/重入屏障、角色/镜头消费与异常保护；RED现场保留。原三份设计文档未改，新测试显式类型检查通过。
- 当前build及31文件/313条unit通过，新增7项E2E定向通过。首完整suite 70/71（65旧全过），新增触摸测试未等固定步消费就暂停；按trace修正等待真实TOUCH/ROLL消费，不改玩法/旧断言。
- Task 5门禁未过：第二次完整suite在旧PAO-11 beforeEach的`GET /src/main.ts?raw`收到`ECONNRESET`；未进入该用例玩法。保留该轮日志/trace，当前轮继续收集剩余结果，不重试或改断言，不提交/推送生产批次，完整计数由证据最终回执补记。
- 最终回执：本轮完整72项为71通过/1失败（新增7全过，旧64/65），0 skip/retry/flaky；8文件disk/HTTP身份一致、1221受保护文件0变化、实际图/录屏及资源结果已整理。5198服务已关闭，暂存为空、未提交/推送，交主Agent裁定raw请求失败及重开floorTick诊断复核。详见`docs/evidence/PAO-18/fact-bridge-implementation/v1/README.md`。

## 2026-11-05 主审两项修复接续

依据主仓`docs/reviews/2026-11-05-pao18-fact-bridge-local-review.md`及用户明确授权，保留现有全部WIP，只修characterView动作锚点和simulation新局floorTick，既有范围不变。新记录隔离至`.pao18.local/fact-bridge/review-fixes/`及本批证据`v1/review-fixes/`，原71/72现场不覆盖。

1. 在原专属lifecycle单测中补真实Simulation/updatePhysics/AnimationGroup对照RED：JUMP/ROLL后同tick或多tick换道（含同tick反向顺序），clip playhead与无换道对照相等；垂直/换道各保留独立身份，所有receipt恰一次、重复包不重启、root只复制presentation。
2. 在原专属journal单测补restart RED：旧局3步后新局立即floorTick/throughTick=0；保留全局eventSequence、拒绝旧cursor，新局首批可读、正常淘汰floor按新tick推进。
3. 保存一次目标RED；只在`src/render/characterView.ts`分开垂直动作与换道诊断身份/时间，在`src/core/simulation.ts`校正新局boundary初始化次序。目标GREEN及源/新测试显式tsc后执行完整unit/build。
4. 新源码只执行一次完整72项旧+新增E2E，仍5198独占/strictPort/不复用/1worker/retries0/D3D11，旧镜像仅可逆输出重定向及既准5188→5198。记录请求/响应和服务日志，保留原trace；若再次断连或继承失败，停止重跑并交主审。
5. 查看本版本3张关键截图和录屏抽帧，核对事实receipt/资源/保护hash。仅全门禁通过后正常hooks提交全部本批白名单成果、push核SHA，等待独立验收，不合并、不标18 Done。

实际收尾（2026-11-06）：两项修复先RED（7失败）后GREEN（专属27项），完整unit320项、build与类型检查通过。新版本仅执行一次完整E2E，71/72；旧HUD五行占区用例在第三次导航等待load时耗尽60000ms，新增7项全通过。请求/响应、服务日志及trace已留在`v1/review-fixes/`，没有重跑/改旧断言或超时；8文件raw/HTTP一致、1221原保护文件及52旧证据0变化。5198无监听，暂存为空、未提交/推送，原树交主审裁定。
