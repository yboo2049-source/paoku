# PAO-18/19 测试类型失败独立审查与接续说明

2026-11-06，Asia/Shanghai。**这是已批准实施中的测试类型适配，不是新的设计事项；原任务保留现场的处理符合上一版字面指令。Dispatcher此前把“新失败停止”写得过宽，现明确普通编译/静态检查错误应在原白名单内自主修正，不需要再请求同一设计批准。** 不豁免类型门禁、不宣称运行时通过。

## 实际Git与停止点

复用D:/worker/paoku-sessions/pao-18-font-diagnosis，codex/pao18-font-diagnosis。HEAD及指定远端仍d303633e2539a26ca595438b51216a02900df92f；暂存区空，6个已有文件修改及计划/证据、新迁入源/测试均保留，未提交推送。Git顶层/common-dir正确，本轮不建树、重置、暂存、代写游戏或启动其他Agent。

读本树docs/evidence/PAO-19/integration/v1/README.md、tests-tsc-initial.txt及对应源行，核对新测试tsc exit2。源tsc exit0、目标5文件37/37 unit通过是任务方中间结果，不是完整unit或集成验收。build、浏览器目标组、完整E2E、图/录屏及实际最终投影均未执行。本轮主Agent没有重跑这些检查或审查尚不存在的截图。

主Agent独立按B19 Git对象比较四份固定生产TS，当前字节全部相等。实际modified/new路径均落在已批准白名单；stop-status中87项保护为执行方报告，本轮未冒称全量独立复验。原始类型失败/RED/GREEN与WIP快照不得覆盖。没有证据将本次类型失败归因于游戏源码，也不能据此认定源码的运行时行为已正确。

## 三类错误及最小处理

| 文件/错误 | 已核对原因 | 接续动作 |
| --- | --- | --- |
| tests/e2e/rebuild-ui.spec.ts，多处TS2307 | 浏览器page.evaluate里的字面量绝对动态导入/src/main.ts、/src/ui/dom.ts等由Vite HTTP解析；独立Node tsc把它当文件系统模块路径 | 仅在原浏览器回调内部，将同一个URL字符串经局部变量/局部load函数传入动态import，保持URL字节、vite-ignore、调用次序和原测试语义。不要定义只存在于Node外层、序列化到浏览器后不存在的helper |
| 同文件40行，三处TS18047 | cdp由mobile?await newCDPSession(page):null构造；if(mobile)在当前类型流中不能关联cdp非空 | 在现有mobile分支按该构造关系进行类型收窄/非空标注，或缺CDP时明确抛错。不可改为无CDP就跳过触摸、改走键盘或返回通过；原事件序列及等待不变 |
| tests/unit/pao19-hud-camera-integration.test.ts:24，TS2345 | renderer宿主被写为any，spyOn据此推断unknown[]，与显式number参数的mockImplementation不兼容 | 为该局部engine/setSize恢复真实方法类型并让回调参数正确推断，保持size捕获、参数及返回行为。不要全局any/ts-ignore/ts-expect-error、删除断言或关闭严格检查 |

这些类型调整仅在已允许的新迁入rebuild-ui和新增integration unit两个文件内；此限制只针对本次类型修复，后续实现完善仍按原批准白名单继续。不新增业务/生产行为、不修改四份固定生产TS、旧PAO-6、其他旧测试或默认配置。它们属于测试迁入/替身的必要类型适配，原先列举三类迁入适配并非要求把类型修复再变成一次新功能审批。

## 编译闭环与停止边界

依AGENTS.md第4/5条，普通编译/lint/导入路径/类型推断/测试替身错误，在已批准文件和原语义内读取日志→最小修复→相应类型/目标unit复验。预定TDD RED和这些静态错误不视为最终完整回归的“新失败必须立即退出”。不让主Agent代写实现，不向用户反复请求普通类型修改许可。

仍必须停止交主审的情形：需要改未批准文件、原业务/断言/输入/预算/producer语义或屏蔽类型检查；最终完整suite出现新的运行时回归或不同继承失败；目标浏览器问题无法在批准范围内建立根因和修复。单项旧车尾例外只决定最后阶段发布资格，不表示其他失败可以忽略。

本次接续不是重复完整回归：该新集成版本尚未运行浏览器，修正类型后继续原计划剩余步骤。不得因类型失败重新设计UI/producer、复现车尾或再跑已审旧基线。

## 接续检查与提示词

先保留tests-tsc-initial原文件，修上述两份测试的类型后运行[批准计划](../plans/2026-11-06-pao18-pao19-approved-integration-execution.md)第3节的完整显式tsc命令，并复验新增/迁入目标unit；将新日志另命名types-followup/target-followup，不覆盖旧结果。都通过后继续build、完整unit、浏览器目标组及I01–I12、一次完整旧+迁入+新增E2E、本轮真实图/录屏/保护；按原规则交固定SHA独立验收。只有最终全部通过或唯一原车尾状态断言失败且其余全通过时，才可正常hooks提交推送。

```text
接续原18树的全部未提交集成WIP，不新建树、不reset/clean/stash，不重新申请18/19设计批准。
目录D:/worker/paoku-sessions/pao-18-font-diagnosis；codex/pao18-font-diagnosis，HEAD/远端仍d303633e2539a26ca595438b51216a02900df92f。先核Git，保持原失败与WIP。

先读D:/worker/paoku/docs/reviews/2026-11-06-pao18-pao19-integration-types-review.md及更新后的批准实施计划。
这次是普通测试类型适配，已在原实施范围内明确允许：
1. rebuild-ui的/src/...动态import改为浏览器回调内部的同URL变量动态导入；不能用浏览器不可见的Node外层helper。
2. mobile分支的CDP作有依据的非空收窄，不跳过触摸或改控制流程。
3. 新integration unit的engine/setSize spy恢复准确局部方法类型，保持原测试行为。

仅改这两份测试的类型适配，不改断言、URL、故障注入、load/60秒/retries、生产四blob或默认配置；不使用类型忽略/伪造模块声明/降检查掩盖错误。
保留首失败，另存新tsc和目标unit日志。类型通过后直接继续原计划剩余build/完整unit、浏览器目标组、I01–I12和一次完整E2E及真实图/录屏/保护，不重做设计/旧基线。
普通编译问题在批准范围内按日志自主修正；越界或最终新的运行时回归保留现场交主审，不把所有中间静态错误都停成一次审批。
最终只有全过或唯一原车尾同一状态失败且其余全过，才正常hooks提交推送；不合并、不标父Done、不恢复车尾/预览或启动其他Agent。
```
