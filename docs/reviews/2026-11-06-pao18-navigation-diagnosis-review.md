# PAO-18 导航诊断主审与固定验证配置

2026-11-06，Asia/Shanghai。**接收有界诊断的停止结果，但未建立原导航超时根因；事实桥整批尚未结束。主Agent已准备项目根外输出的验证配置并独立跑通旧HUD用例。下一步只执行一次固定条件完整72项门禁，不继续短诊断或修改游戏。**

## 原树与诊断结果

实际复用D:/worker/paoku-sessions/pao-18-font-diagnosis，分支codex/pao18-font-diagnosis，顶层/common-dir与已登记worktree一致。HEAD及指定远端仍为c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85；8个生产修改、4个新测试和本批文档/证据仍为WIP，暂存区空。这个SHA没有包含事实桥实现或修复；主Agent未代提交、重置、清理或移植。

原执行方诊断留本树忽略目录.pao18.local/fact-bridge/navigation-diagnosis-20261106/，README、comparison、A/B配置/结果及保护记录已读：

- 已确认测试产物HTML进入Vite watch并触发reload；原失败60秒窗口内未找到对应reload日志，因此没有证明它导致原超时。
- A开启DEBUG，但筛选未选中测试，No tests found，没有导航行为；计入其两次会话预算且未补跑，停止符合约束。
- B关闭DEBUG后旧HUD用例8.7秒通过，不能当有效A/B对照。它与原完整suite还存在累计负载、缓存和进程历史差异；不得宣布DEBUG/管道是根因，也不能关闭原71/72。
- 诊断保护记录为1390文件未变、未完整重跑、未提交推送；本轮主Agent另保护实际相关30文件，不把原执行方清单成绩冒称独立全量校验。

[上一轮主审](2026-11-06-pao18-fact-fixes-navigation-review.md)关闭的动作锚点/floorTick两项继续保持关闭，不重派修复。原ECONNRESET及HUD超时原始证据均保留，父18与依赖未调整。

## 主Agent准备与一次独立验证

项目根外专属输出已实际创建并以绝对路径/relative检查确认：

`D:/worker/paoku-diagnostics/pao18-navigation-20261106/main-review/`

本树忽略目录中的生成脚本及两套配置：

- .pao18.local/main-watch-output-20261106/prepare.mjs
- .pao18.local/main-watch-output-20261106/smoke/playwright.config.ts
- .pao18.local/main-watch-output-20261106/full/playwright.config.ts

smoke/full的trace、reporter、镜像evidence、字体证据、录像和服务日志分别写至上述外部目录的smoke/full子目录。生产Vite配置、旧测试、请求/响应、错误传感器及源码未修改；镜像17文件仅重定向输出及此前批准的录像导航5188→5198，逆变换逐字节等于原测试。新事实桥测试使用原test.info输出机制。

使用原DEBUG-on tee包装器，仅更改日志输出目的地，保持DEBUG=vite:time,vite:transform；load、原60000ms用例预算、1worker/retries0、D3D11、strictPort、不复用均保持。trace开启用于取证。--list先确认smoke仅旧HUD1项、full完整72项/17文件；列举生成的JSON已另存list-result.json，不作为执行成绩。

主Agent仅运行一次smoke，exit0，1/1，0 skip/retry/flaky，整会话18197.210ms，用例约8.7秒。直接读其新trace：

| viewport | goto耗时 | 主文档TTFB | HTTP |
| --- | --- | --- | --- |
| 390×667 | 3490.451ms | 5.606ms | 200 |
| 390×844 | 1394.590ms | 4.706ms | 200 |
| 1440×900 | 1378.232ms | 3.637ms | 200 |

DEBUG开启且服务日志66062字节，未出现page reload；30项源码/测试/配置保护hash全部一致。5198收尾实际监听为0，没有停止其他进程。结果位于外部smoke/main-summary.json、result.json、service.log和artifacts/trace.zip（trace在测试对应子目录）。

这是移除已确认QA输出反馈路径后的独立可运行性检查；与原长suite不构成受控因果对照，未声称查明或修复历史超时。它同时说明不能将一次关闭DEBUG后通过视为DEBUG的因果证据。本次没有再跑build/unit，因为游戏代码未变且此前主Agent已独立build/320单测/类型检查通过；本次也未重跑完整suite或重验17美术。

## 裁定及一次完整门禁提示词

输出隔离属于本机验证配置纠正，不是玩法/架构扩围，无需重批同一设计。主Agent已完成目录和Git核验及配置准备，不要求原任务再建树或设计验证方案。允许原执行方在以下固定配置执行**一次**完整72项；这是更正验证输出条件后的正式门禁，不是宣称旧失败已解决。若失败，保存首现场及全部剩余成绩后停止，不追加实验/重试，不自动改代码或扩大范围。

```text
接续原PAO-18树，做固定条件的最终门禁，不再修两项已关闭缺陷或继续短诊断。
目录D:/worker/paoku-sessions/pao-18-font-diagnosis，分支codex/pao18-font-diagnosis。
HEAD/远端仍c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85；先核对Git和保留全部WIP，暂存区空，不reset/clean/stash/新建树。

先读D:/worker/paoku/docs/reviews/2026-11-06-pao18-navigation-diagnosis-review.md。
主Agent已准备full配置，列举为72项/17文件；独立smoke在DEBUG开启、项目根外输出时通过。不要执行prepare.mjs重建或覆盖smoke证据，不再运行smoke。

确认相关源码与外部source-before.json记录一致，确认5198无其他服务；若HEAD/源码推进或full/result.json已存在实际执行结果，先报告，不覆盖或重跑。
使用本树现成配置：
.pao18.local/main-watch-output-20261106/full/playwright.config.ts
保留DEBUG、load、60秒、1worker、retries0及全部旧断言/错误收集，不加grep/skip/timeout。配置已将全部QA输出放到项目根外，不改生产watch或旧测试。

显式在目标目录，确保Node目录在本进程PATH后执行一次：
node node_modules/@playwright/test/cli.js test --config .pao18.local/main-watch-output-20261106/full/playwright.config.ts
终端完整输出另存D:/worker/paoku-diagnostics/pao18-navigation-20261106/main-review/full/session.txt；记录真实退出码。不要重新--list覆盖result.json。

若完整失败，保留首trace、服务日志、版本/hash和最终计数，停止交主审，不再改/重跑到绿。
若72项全通过，再完成build、完整unit、源及新测试类型检查、源码/HTTP身份和保护核对；查看本轮2–3张真实图及已有要求的录屏。全部门禁通过后按正常hooks提交本批白名单、push并核远端SHA，不捎带本机QA配置/临时输出或其他任务改动。
返回固定提交、检查结果和本机/仓内证据入口待独立验收。历史失败根因仍未知，不自动合并、接19或标父18 Done，车尾/预览延期保持。
```
