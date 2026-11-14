# PAO-18 固定配置完整回归收口与阶段例外裁定稿

2026-11-06，Asia/Shanghai。用户截图虽标为pao-8，实际分支、SHA、工作树与测试均属于PAO-18事实桥。本轮没有审查或变更PAO-8。

**结论：本轮一次完整验证已结束；71/72、退出码1，事实桥整批门禁仍未通过。唯一失败落在用户已延期的车尾旧场景，补记证据后停止，不继续修复或重跑。没有将其自动认定为既有固定步反例的同一根因。**

## 实际Git与完整结果

目录D:/worker/paoku-sessions/pao-18-font-diagnosis，分支codex/pao18-font-diagnosis。顶层/common-dir正确，HEAD及指定远端均为c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85，仅含设计基线；8个生产文件WIP、4个新测试及本批文档/证据仍未提交，暂存区空。主Agent未代提交、清理、移植或启动Agent。

使用[上轮准备的固定配置](2026-11-06-pao18-navigation-diagnosis-review.md)，完整72项/17文件，一次执行，668002.209ms，71通过/1失败、0 skip/retry/flaky，exit-code.txt为1。主Agent直接解析result.json核对，成绩属于执行方本轮，未冒称主Agent重跑。全部新7项事实桥用例及旧五行HUD用例通过（后者6846ms）；DEBUG开启，服务日志没有page reload。历史ECONNRESET/导航超时根因仍不宣称关闭。

唯一失败：pao6-baseline.pw.ts的ramp-roof-jump-land，6148ms。roof-exit-land位置检查首先断言state应为PLAYING，实际GAMEOVER，止于原测试71行。旧测试场景为坡中心z18/depth12与列车中心z33/depth18，真实输入、godMode=false。它属于KI-001已记录旧场景；本轮不重建tick、不分析碰撞细节、不运行固定步或自然复现，不把场景一致升级为根因相同的证明。

完整证据根：D:/worker/paoku-diagnostics/pao18-navigation-20261106/main-review/full/。保留result.json、session.txt、service.log、handoff-summary.json、exit-code.txt、evidence/PAO-6/fixture-ramp-roof-jump-land.json及artifacts/pao6-baseline.pw.ts-ramp-roof-jump-land/trace.zip。主Agent另写main-review-summary.json，未覆盖原证据。

主Agent重新计算source-before.json的30个实际源码/测试/配置hash，全部一致；diff检查通过、暂存为空、5198无实际监听。抽看本轮N-390-touch-paused与F-390-multitick两张真实新图，旧角色与暂停界面可见，未据此验收正式动作、19 UI或重验17主题。因没有游戏修改且失败属于延期场景，本轮未再运行build/unit/浏览器；此前独立build/320单测/类型检查及两项缺陷关闭仍有效。

## 当前边界

- KI-001/002继续用户延期。本轮旧场景再次失败只补证据，不恢复修复；原车尾诊断树候选不移植。
- 两项代码修复继续保持已复核关闭，不再派发；本轮不继续导航/字体调查或重复完整门禁。
- PAO-19 producer已审，生产帧/相机集成仍未开放。父18不标Done，依赖不解除，不自动合并。
- 当前按AGENTS.md第9条“检查失败时先修复并重新验证，未通过不得提交或推送”，保留WIP，不自动提交/推送事实桥。用户此前延期车尾的授权不等同批准带失败提交。

## 供用户裁定的具体阶段例外（尚未批准）

若用户希望在继续延期车尾的同时交付当前工程批次，需要明确覆盖本批完整E2E必须全过的提交门禁，范围限定如下：

1. 仅接受本次固定配置72项中ramp-roof-jump-land/roof-exit-land的PLAYING→GAMEOVER这一失败为**本批阶段提交例外**，原始71/72、退出码1及未知根因永久如实记录。不把它改成skip/expected failure，不更改原断言、超时、错误传感器或测试报告，不将例外写成全绿。
2. 在build/320单测/源及新测试类型检查、保护和正常hooks等其余检查通过后，由原18执行方正常提交/推送本批批准生产文件、专属新测试及必要本树文档/精简证据；提交前逐项核对暂存白名单。不得捎带本机QA配置/外部输出、别的任务或未通过的车尾候选，不跳hooks或强推。
3. 交付固定SHA后，由主Agent继续独立审核该实际提交。例外本身不等于父18 Done、全部动作正式验收、合并许可、19集成或PAO-20启动许可。
4. 例外只覆盖这一个已报告失败和本次工程批次；任何新增失败或代码变化不自动继承豁免。未获批准则保持原树WIP，不继续追绿或自动重复实验。

本稿是具体风险与授权边界说明，不是已获批准的执行提示词。用户裁定前不对18提交/推送或新任务作任何操作。
