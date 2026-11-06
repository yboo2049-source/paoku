# PAO-18 检查点与当前失败记录

2026-11-06。用户明确要求“先提交未提交的代码，然后记录失败”，据此保存未验收检查点；这次授权允许在完整E2E尚未通过时提交，不能理解为验收通过或父PAO-18 Done。

代码检查点：`3aa62fb81634702fb0d253228877a075eff843a0`，分支`codex/pao18-font-diagnosis`。包含真实运动事实桥、动作/镜头消费、两项已复核修复及专属测试。正常pre-commit执行build与完整unit：31文件/320条通过，未跳过hooks。两项修复（换道不覆盖垂直动作锚点、新局floorTick归零）已通过主Agent复核，本次不继续追改。

## 当前唯一阻塞：PAO-6 落地后意外终局

最近一次完整门禁使用主Agent已准备的项目根外输出配置`.pao18.local/main-watch-output-20261106/full/playwright.config.ts`，DEBUG开启、load条件、60000ms预算、workers1/retries0/D3D11不变。只执行一次，退出码1；**72项中71通过、1失败**，668.002秒，skip/retry/flaky均0，新增7项事实桥用例通过。

- 原测试：`tests/e2e/pao6-baseline.spec.ts`，`ramp-roof-jump-land`，第71行。
- 原断言阶段：`roof-exit-land`；`reach(page, 60)`后检查落地状态。
- 预期：`landed.state === 'PLAYING'`。
- 实际：`landed.state === 'GAMEOVER'`。
- 该状态断言失败，不能把其后的`position.y === 0`断言记为通过。
- 原因未定位；未因此修改旧断言、碰撞/支撑规则或恢复车尾/预览调查，也未重复运行该用例碰绿。

仓内证据：[完整回执与版本/hash保护](fixed-output-gate-20261106/handoff-summary.json)、[终端原始记录](fixed-output-gate-20261106/session.txt)、[Vite服务日志](fixed-output-gate-20261106/service.txt)、[首失败trace](fixed-output-gate-20261106/ramp-roof-jump-land-trace.zip)、[代码检查点hooks](fixed-output-gate-20261106/checkpoint-hooks.txt)。原始本机全部输出仍在`D:/worker/paoku-diagnostics/pao18-navigation-20261106/main-review/full/`，没有覆盖或移动。

## 同为71/72，但此前失败不同

| 历史失败 | 这次固定配置完整运行 | 根因状态 |
| --- | --- | --- |
| PAO-11 beforeEach raw请求ECONNRESET | 通过 | 历史断连根因仍未知，不宣称修复 |
| 旧HUD五行占区第三次goto等待load超时 | 通过 | QA输出已隔离到watch根外；未证明历史超时因果 |
| PAO-6 roof-exit-land实际GAMEOVER | 失败 | 当前未解决项 |

此前[实现与失败历史](v1/README.md)、[两项代码修复回执](v1/review-fixes/README.md)保留原样；其中“尚未提交”等是当时现场，当前检查点状态以本文件和最终Git回执为准。原始终端捕获保留包括尾空白在内的文本，不改写错误或测试结果。

当前提交是保存代码以供审查，**不是完整门禁通过**。接19、新runner、正式动作、车尾/预览、自动合并及父状态/依赖调整均未执行。下一步应由主Agent裁定当前PAO-6失败的单独定位范围，不用再次整套重跑代替定位。
