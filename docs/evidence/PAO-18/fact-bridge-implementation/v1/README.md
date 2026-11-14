# PAO-18 事实桥实施与验证

最新状态以[主审两项修复回执](review-fixes/README.md)为准：锚点和新局floorTick已修，build/320单测/类型检查通过；新版本一次完整E2E仍为71/72，旧HUD导航超时，未提交/推送。下文原ECONNRESET及floorTick待办为修订前历史现场，保留不覆盖。

任务日期2026-11-04，接续收尾2026-11-05（Asia/Shanghai）。本树从`c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85`开始，`codex/pao18-font-diagnosis`，初始status干净；顶层与cwd均为`D:/worker/paoku-sessions/pao-18-font-diagnosis`，common-dir=`D:/worker/paoku/.git`。未创建Agent、工作树，未reset/merge/cherry-pick，未读写19活动树或改Linear。

授权依据为主仓`docs/plans/2026-11-04-pao18-pao19-approved-bridge-execution.md`第1/2/4节及已批准本树fact-bridge spec/contract；[本树实施计划](../../../../plans/2026-11-04-pao18-fact-bridge-execution.md)。应用writing-plans / executing-plans / test-driven-development / systematic-debugging / verification-before-completion；原设计的仅设计阶段限制由这次明确实施批准覆盖，非本批边界仍保留。

## 实际实现

- Simulation新生产模式`committed-motion-v1`拥有步内draft、run/tick/单调sequence、action实例身份、epoch、只读完整提交批及同次snapshot stamp。输入成功分支与physics既有didLand点显式观测，默认独立调用仍legacy；没有从render tick或raw bus补事实。
- 空tick完整批、非破坏读取、独立audio/render游标；256批/1024事件/64draft预算，整批淘汰或整步GAP，计数及丢失区间显式诊断。timeSec为提交tick×stepSec；impact保持null及缺失原因。
- main唯一接线。任务在成功输入owned-context hook计数，仍早于原afterStep奖励检查；旧运动业务监听退出，提交后直接调用旧音频方法并只发一次兼容通知。步内音频256调用暂存保持原顺序；audio实例自带chase/collision监听所调用的两个方法由main局部适配进入同一暂存，dispose恢复原方法，audio.ts未改。
- 音频ID只取已提交封套；GAP时原cue仍可attempt，但记录factGaps，不制造已发布eventId。副作用先记attempted，失败不重播。交付重入的暂停/世界命令延至receipt边界，经原应用门禁执行；旧epoch/generation不得推进新游标。
- 角色按实例/序号与模拟秒数消费；重复包不重启，同clip新动作可区分，最新快照协调姿态，不排长历史播放队列。镜头消费已去重落地且反馈有界，停用同epoch接触边沿双路；root只复制presentation。实际AnimationGroup暂停，pause不换epoch，重开/QA世界编辑换epoch。
- 异常步不发布半步snapshot/事实/运动音频，保留最后提交世界并fault停推进，RESUME不能解除；原应用门禁批准重开后由main传fresh context恢复。render单消费者异常逐ID记attempt-failed，音频不受其游标影响。只读旧门面缺少一致元数据时保留原四字段路径，生产事实桥必须使用一致stamp/时间。

## RED、首失败及修正

所有本地原始日志/trace留`.pao18.local/fact-bridge/`，阶段文件名独立，未将失败现场覆盖成成功。

| 记录 | 实际结果及原因 |
| --- | --- |
| baseline-build/unit | build通过，28文件/293条原单测通过 |
| journal-red-first | 新行为断言失败：motionStamp缺失、异常未fault；不是导入/语法错误 |
| producers-red-first | 真实input/physics缺少显式观测，成功动作、任务、落地断言失败 |
| consumer-red-first / main-red-first / qa-red-first | 缺提交消费/生产交付与多步夹具入口，分别明确RED |
| producers-green-attempt1 | 新夹具问题：Reflect.set冻结对象返回false、任务实际类型JUMP_TIMES、坡面发生点高度；修正夹具，不改原算法 |
| target-all1 | 新桥真实缺陷：QA编辑后先step后render，旧epoch游标rebase吞掉新事实；在下一step开始前同步本次世界基线后，逐ID回执通过 |
| final-unit（首完整unit） | 本地`.spec.ts`镜像被Vitest误收，另有旧PAO-17夹具不一致时间戳时额外字段回归；镜像改`.pw.ts`并保持逐字逆变换校验；main保留缺一致meta的旧四字段门面。旧测试不改 |
| full-first（首完整E2E） | 70/71通过，65项旧suite全部通过；新增N触摸只见两动作。trace显示仍ASCEND、音频/渲染回执一致；测试触摸结束即暂停，未等待固定步消费ROLL，而暂停清未消费命令是原规则。补等待真实TOUCH/ROLL消费，不放宽3动作断言，定向用例通过 |
| packet-order-red-first | 缺乱序/冲突封套拒绝检查；补消费前校验，目标unit到GREEN |
| target-fix2 | 7项新增E2E通过，包含音频256上限与单消费者异常逐ID记录 |

独立新测试类型检查最初遇TypeScript6要求`--ignoreConfig`及本树未安装`@types/node`。新E2E改用Playwright原生附件/输出API，不加依赖或伪造Node声明；实际通过命令见后续回执。

## 门禁与证据读取方式

完整E2E使用本树忽略目录中的可逆镜像、5198独占、Vite strictPort、reuseExistingServer=false、1worker、retries=0、ANGLE D3D11。镜像仅改输出路径及获准旧18录屏5188→5198，逆变换与旧文件逐字比较；`.pw.ts`后缀防止Vitest误收，未改旧断言/时钟/超时/错误收集。最终FONT_EVIDENCE显式隔离至任务目录；首次镜像font套件仍使用原忽略目录默认输出，最终不再复用它，受保护历史docs证据未改变。

新增测试显式类型检查：

```text
npx tsc --ignoreConfig --noEmit --target es2023 --module esnext --moduleResolution bundler --lib ES2023,DOM --types vite/client --skipLibCheck --allowImportingTsExtensions tests/unit/pao18-fact-journal.test.ts tests/unit/pao18-fact-producers.test.ts tests/unit/pao18-fact-lifecycle.test.ts tests/e2e/pao18-fact-bridge.spec.ts
```

提交前重新核对内容、引用、diff和保护清单，仅暂存批准8个生产路径、4个新测试、本计划与本证据目录。最终完整suite、raw/HTTP磁盘逐字比较、保护hash、实际图片/录屏查看和提交/远端回执尚在收尾，以下不预填通过；以最终追加的实际回执为准。

## 能力边界

工程角色仍为既有legacy GLB/别名；新runner、正式动作自然性、精确冲击速度、HURT/FAIL全量PAO-9事件、19动态UI布局、音频重构及20/21均未接入。旧HUD固定profile保留，未让render遍历DOM或挪模拟追逐者。车尾/预览KI-001/002延期，不调查或修改其候选。字体及17主题不重做，任务/奖励/碰撞/支撑/动作合法性和roll时长不变。

F（固定世界/时钟/失败/合成音频通知）与N（自然键盘/触摸/原应用生命周期）分报；F的真实producer链路不等于自然输入验收，静图和工程clip不等于正式动作自然品质。父18未标Done、依赖未改，待Dispatcher独立验收，不自动合并或继续公共桥接。

## 本轮门禁阻断（2026-11-05）

当前生产源码build、31文件/313条unit、源tsc及4个新增测试文件显式tsc通过；7项新增E2E定向通过。最新完整suite发生旧PAO-11用例beforeEach的raw身份请求`GET http://127.0.0.1:5198/src/main.ts?raw`→`read ECONNRESET`，trace显示尚未进入该用例自然玩法。首失败位于本地`full-second-artifacts/pao11-surfaces.pw.ts-N-pro-04f00-nput-and-supported-snapshot/trace.zip`，禁止用首轮65项旧通过替代最新完整门禁。

不调整旧错误采集、断言、超时或retry，不扩到车尾，不重跑该用例碰绿。当前完整轮继续收集剩余结果，结束后补实际计数。**未通过完整门禁，不创建本批提交或推送；HEAD仍是批准起点c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85。** 正常提交hooks尚未运行，因为没有提交动作。原树全部本地成果和首现场交Dispatcher裁定。

静态复核待办：`Simulation.restart`当前先boundary、后将currentTick归零，因此重开后的floorTick诊断初值可能沿用旧局tick，直到后续完整批淘汰更新。run/epoch隔离和事件序号不复用已有测试，但该诊断初值尚缺专属断言；本轮门禁失败后未继续修改生产代码，交主审一并裁定，不能称所有边界均已验收。

## 最终实际回执

- build通过；完整unit **31文件/313条通过**（原293＋新增20）。源tsc及4个新测试文件显式tsc通过。命令输出在`checks/final2-*.txt`，保留既有大chunk提示；未安装或修改依赖。
- [完整E2E结果](e2e-full-second-summary.json)：**71通过/1失败，共72项**，958.385秒，skip=0、retry=0、reporter flaky=0。新增7项全通过；旧suite为64/65通过。失败为PAO-11 beforeEach raw请求ECONNRESET，[原始trace](old-suite-ECONNRESET-trace.zip)及`checks/full-second.txt`完整保留。未再运行此用例或完整suite。
- 首完整轮70/71及新增触摸同步失败的解码/trace也保留；不是把两次不同提交现场的成功拼成完整通过。
- [8个运行时文件磁盘/HTTP逐字身份](disk-http-identity.json)通过。actual legacy GLB的HTTP/磁盘hash由`regression-identity.json`记录；[1221个受保护文件](protection.json)变化数0，完整前后manifest为`protected-before.json` / `protected-after.json`。旧测试、配置、依赖、public、历史docs证据不变。
- [资源/暂停回归](regression-F-lifecycle.json)验证暖机后20轮、10次reset计数稳定，实际组冻结；[延迟加载](regression-F-delayed.json)覆盖同资源ID、最新皮肤及dispose前完成竞争；[释放](regression-F-dispose.json)实际scene资源及cache全部归零。模拟日志的纯值保留有界诊断，不声称改造了所有legacy订阅。
- 实际查看本轮重新生成的三张关键图：[390三角色取景](F-390-near.png)、[桌面高速](F-desktop-high-speed.png)、[主入口坡顶/HUD](F-roof-HUD.png)。三角色在画面内；坡顶图捕获时仍为primitive fallback，另两图为实际legacy GLB，不能称新runner或正式动作质量。N暂停/触摸图及F多tick图亦保留。
- 短录屏：[真实主入口坡顶/跳滑/暂停](F-ramp-jump-slide-pause.webm)、[多tick跳滚/暂停](F-multitick-jump-roll-pause.webm)、[高速表现夹具](F-high-speed-presentation.webm)。已用本机Playwright自带ffmpeg抽帧检查当前坡顶录屏10/11.5/13/14.5秒（含加载、坡顶、暂停、恢复）；未把静图/抽帧当自然品质证明。逐ID事实与receipt对照见`F-multitick.json`，音频顺序、消费者故障及溢出分别见`F-audio-order.json`和`F-consumer-failure-overflow.json`。
- 服务已由Playwright收尾，5198无监听；未停止其他任务服务。暂无本批提交，暂存区为空，本地及远端HEAD仍为`c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85`。源码、测试、计划与证据留在原树，供主Agent审查；不标父18 Done、不改依赖、不自动重试、合并或接19。
