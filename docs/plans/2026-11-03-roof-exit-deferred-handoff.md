# 车尾与派生预览调查：用户延期后的收口提示词

2026-11-03（Asia/Shanghai）。用户明确要求将车尾问题记录下来，当前不继续修复，并重新给提示词。本文件是当前车尾任务入口，覆盖先前“继续车尾修复/ready超时调查”的执行安排；不取消独立字体任务。

## 实际工作树与现场保留

已复用并核验D:/worker/paoku-sessions/pao-15-roof-diagnosis，codex/pao15-roof-diagnosis，common-dir=D:/worker/paoku/.git，主仓登记匹配。本地/远端HEAD=8af24af083b369f3f8dc8bb883a861975b9972af，基线祖先exit0。暂存区空；2个跟踪修改及43个未跟踪文件是已有候选修复/测试/计划/证据，保留为脏树，不再创建目录或分支。

本轮重新核对physics.ts、sweptCollision.test.ts、roof-exit-continuity.spec.ts的原字节SHA，均与[本地预审](../reviews/2026-11-03-roof-remediation-local-review.md)相同。主Agent不代提交这些文件，不改写任务树。此前72目标单测和完整49/50都是已保留结果，本轮不再运行游戏检查。

原浏览器场景未再次失败与固定步反例已复现同时成立；[已知问题入口](../KNOWN_ISSUES.md)按KI-001/002分别记录车尾接触和独立预览超时，不把延期写成修复完成。源15/18树、已有资产和旧证据不变。

## 粘贴到现有车尾聊天

```text
用户决定：车尾碰撞先登记为已知问题，当前停止继续修复和复验；连带的四动作预览ready超时调查也暂停，不再追查这条失败链。

继续使用原目录D:/worker/paoku-sessions/pao-15-roof-diagnosis，分支codex/pao15-roof-diagnosis。Dispatcher已核验本地/远端HEAD仍为8af24af083b369f3f8dc8bb883a861975b9972af、暂存区为空，已有2个跟踪修改与43个未跟踪文件。这是未提交候选修复的保留现场，不是已验收交付。

先读D:/worker/paoku/docs/KNOWN_ISSUES.md的KI-001/002和D:/worker/paoku/docs/plans/2026-11-03-roof-exit-deferred-handoff.md。本次用户指令覆盖此前继续修复、ready阶段诊断和重复复验安排。

停止新增修复/实验和重复build、单测、定向/完整E2E。不修改physics、preview、模型、旧测试/断言、超时、错误过滤或默认配置，不再另开Agent/任务/工作树。

保留当前所有源码/测试改动、报告、trace、截图和日志。不reset/clean/stash、checkout覆盖、删除、合并或移植；不暂存/提交/推送尚未通过完整门禁的候选生产改动，不为暂停制造空提交。

只做结束前必要的只读Git核对，简短回复实际HEAD/暂存区/保留改动状态及本任务是否有自己仍在运行的验证进程；只结束你能核实属于本任务且不再需要的进程，不操作其他任务服务。没有自己的进程就直接结束，不再为收口启动任何检查或服务。

状态写为“用户延期，未验收、未提交、未推送；现场保留”。不要声称问题已解决或不存在，不改变PAO-15/18父状态或依赖。仅在用户明确要求恢复时再继续。字体修复属于独立任务，不受本次暂停指令影响。
```
