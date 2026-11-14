# PAO-18 两项修复复核与导航超时裁定

2026-11-06，Asia/Shanghai。**两项已报告缺陷的修复通过独立复核；事实桥整批仍未通过完整门禁。下一步只做验证环境的有界诊断，不继续修改游戏或重复完整回归。**

## Git与代码复核

继续复用D:/worker/paoku-sessions/pao-18-font-diagnosis，分支codex/pao18-font-diagnosis。主仓worktree登记、顶层、共同Git目录D:/worker/paoku/.git已核对；HEAD及指定远端仍为c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85，仅为设计基线。8个生产文件修改、4个新测试、计划及证据仍保存在原脏树，暂存区空。未建树、启动其他Agent、暂存、重置或代提交。

任务方回执位于本树docs/evidence/PAO-18/fact-bridge-implementation/v1/review-fixes/README.md。本次相对接续前仅simulation/characterView及两份专属unit变化；任务方保护结果为原1221文件和此前52份证据均未变。主Agent独立计算当前8个生产文件SHA，与该版本disk/HTTP身份记录全部一致，确认复核对象对应本次完整失败版本。

- CharacterView分别保存JUMP/ROLL的动作锚点与CHANGE_LANE身份，换道不再覆盖clip时间。新增6例覆盖两类动作的同tick前/后换道、多tick末换道、重复包及receipt/root。主Agent重新运行上轮实际Simulation/CharacterView的SSR/NullEngine对照，两组ASCEND playhead均为0.03333333333333334，垂直动作身份/时间相同，换道独立身份存在。原结果保留，新结果隔离保存。
- Simulation.restart先currentTick归零再建立boundary，不重置全局eventSequence。新增回归覆盖新局立即水位、旧cursor拒绝、sequence不复用与淘汰后GAP。主Agent复现脚本中tick/throughTick/floorTick均为0。

主Agent独立build（含源tsc）、31文件320/320完整unit、4个新测试文件显式tsc均exit0，git diff --check通过。任务方RED为7失败/13通过，GREEN为27/27专属unit；主Agent查阅其日志，未冒称重新制造RED。独立QA产物留本树忽略目录.pao18.local/main-fix-review-20261106/；生产和测试文件未由主Agent修改。

抽看该版本390、桌面高速、坡顶HUD三张真实新图，角色在画面内，旧模型/警官/犬外观边界保留；不把这些图作为正式runner或动作自然性验收，不重开PAO-17。主Agent本轮没有重跑浏览器suite或旧失败用例。

## 完整失败属于什么

任务方修复后只执行一轮完整suite：72项，71通过/1失败，954958.072ms，0 skip/retry/flaky；新增7项全部通过。旧PAO-11 raw请求本次通过，但上轮ECONNRESET根因仍未查明，不能写成已修复。

唯一失败是旧pao18-controller-camera的F五行HUD用例，在第三次page.goto('/')等待load时耗尽**整个用例**60000ms。主Agent直接读取zip内test.trace、0-trace.trace和network，而非只引用截图或任务方摘要：

| 导航 | viewport | goto耗时 | 主文档HTTP | 主文档TTFB |
| --- | --- | --- | --- | --- |
| 第一次 | 390×667 | 15444.851ms，完成 | 200 | 4002.202ms |
| 第二次 | 390×844 | 23266.493ms，完成 | 200 | 12388.740ms |
| 第三次 | 1440×900 | 约20294ms时全用例超时 | 200 | 12757.198ms |

第三次导航开始时，距第一次开始已39926.367ms；前两组HUD量测已执行，第三组尚未进入点击开始/测量。记录中前三组分别有277、277、263条资源响应，已记录响应无HTTP≥400或failure字段；后者不等于未记录/未完成请求不存在。问题首先表现为页面/本地请求加载慢，没有第三组HUD几何断言失败证据，也没有证据把它归咎于两项修复。

现有服务包装器启用DEBUG=vite:time,vite:transform，将大量日志tee到文件和Playwright管道；suite trace输出又位于Vite项目根下。服务日志明确存在.pao18.local/.../.playwright-artifacts-*/traces/resources/*.html触发的page reload。**诊断产物进入watch路径是已观察事实；它或日志/主机资源开销导致本次超时仍是待验证假设。**已看到的reload时间不直接证明第三次导航期间被重载。不能以HTTP200宣称load完成，也不能直接加timeout、改waitUntil或过滤错误。

## 下一步：同树有界诊断，不再完整重跑

本轮关闭两处代码审查项，整批交付仍保留未提交。允许原执行方在忽略目录做只读诊断，不新增游戏功能、改旧测试/生产配置或恢复车尾。沿用[已批准范围](../plans/2026-11-04-pao18-pao19-approved-bridge-execution.md)，本轮不开放19接线。

1. 先整理现有trace和服务日志的统一时间线，区分客户端排队、TTFB、资源完成、load与watch/reload；核对实际stdio/日志量、残留自有页面/进程及服务生命周期。不要把静态处理耗时直接等同HTTP总等待。
2. 必须有明确单变量假设才做新实验，最多两次短会话、每次不超过180秒。可在新的专属本机QA配置/脚本中比较输出watch边界或日志管道，保持原viewport序列、load条件、60000ms用例预算、原断言、错误收集、worker/retries和应用源码；每次只变一项，不同时关日志又搬输出。必要的trace/output副本可移至已核对位于项目根之外的本任务专属临时目录，原证据不可移动或覆盖。任何新日志均不写回被测试源码。
3. 若不能复现或不能建立因果，返回不确定结论和最小下一项取证请求；单用例通过不关闭原71/72。不得在本批启动第三次实验、完整suite或重跑到绿。若定位到验证配置问题，先交最小修改方案/影响，不直接修改跟踪配置、旧测试或生产源码。
4. 最终需固定验证条件并通过完整门禁，才能正常提交推送事实桥；当前仍未满足，不将本次320单测通过当整批放行。

## 给原PAO-18聊天的提示词

```text
两项代码修复已通过主Agent独立复核，不再追改这两处。接续同树做一次有界导航诊断，不跑完整suite。
目录D:/worker/paoku-sessions/pao-18-font-diagnosis，分支codex/pao18-font-diagnosis。
HEAD/远端仍c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85；先核对Git并保留全部WIP/证据，暂存区保持空。不新建树、不reset/clean/stash，不启动其他Agent。

先读D:/worker/paoku/docs/reviews/2026-11-06-pao18-fact-fixes-navigation-review.md。
本次只定位旧HUD第三次goto等待load耗尽全用例60秒的原因。现有trace显示前两次goto约15.4/23.3秒，第三次起步已用约40秒；主文档TTFB约4/12.4/12.8秒。已有测试产物触发Vite reload及DEBUG日志tee，二者均为待验证线索，不能直接宣布根因。

先用现有证据建统一时间线；有明确单变量假设才做最多两次、每次≤180秒的短诊断，具体约束按报告。保留原源码、旧用例内容/断言、load等待、60秒预算和错误收集，不加retry/timeout，不同时改变多个条件。
允许本机忽略目录中的QA脚本/临时配置和项目根外独立输出，不改跟踪源码/测试/配置，不覆盖原证据。失败或无法建立因果就停，返回证据和最小方案；单用例绿不算关闭71/72，不再完整重跑或提交推送。
车尾/预览仍延期，19仍只到producer；不合并/接线/改父状态。交诊断结论待主审裁定。
```
