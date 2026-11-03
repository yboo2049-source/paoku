# 四动作预览ready超时：同树只读诊断补充

> 当前指令（2026-11-03）：用户已暂停该ready超时调查，本文件全部诊断安排/第5节提示词不再执行。请使用[暂停收口提示词](2026-11-03-roof-exit-deferred-handoff.md)，保留候选与首失败，不能自动重开。


2026-11-03（Asia/Shanghai）。用户交回车尾修复49/50现场后，Dispatcher准备本只读诊断补充。**不开放预览生产代码、旧测试或超时修改，不自动启动任务/Agent。** 原车尾生产修复授权保留，但本补充先冻结其已GREEN改动，调查新完整门禁阻挡。

## 1. 实际复用回执

- 目录D:/worker/paoku-sessions/pao-15-roof-diagnosis，分支codex/pao15-roof-diagnosis；本地/远端HEAD=8af24af083b369f3f8dc8bb883a861975b9972af，common-dir=D:/worker/paoku/.git，主仓登记/顶层已核验，不新建树。
- **树不干净是预期**：已有批准车尾修复physics.ts、sweptCollision增量、新roof-exit-continuity.spec.ts及其计划/证据，暂存区为空，尚未提交/推送。详见[本地预审](../reviews/2026-11-03-roof-remediation-local-review.md)与本机`.pao15-local/main-preview-timeout-review/pending-work-hashes.json`。不要reset/clean/checkout覆盖、代提交或误以HEAD是修复交付。
- 已有依赖。主Agent本轮独立tsc/72项目标单测通过，5195一次只读预览约4秒ready；完整49/50是任务方结果，不是新独立完整验收。该单次成功未关闭首失败。
- 用户仍使用现有车尾聊天/cwd；本轮未创建聊天或启动Agent。执行前再核Git和5195监听，不抢占或复用别的服务。

## 2. 输入与范围

按需先读主仓AGENTS、TEST_PLAN当前段、[已批准车尾计划](2026-11-03-regression-remediation-execution.md)及本地预审，再只读本树：

- `docs/evidence/QA/roof-exit-remediation/v1/README.md`、final-state.json、full-results.json、first-full-failure/的摘要/截图/error-context。
- 原16MBtrace绝对路径与SHA在final-state.json；只读，不覆盖。原始local完整结果在`.pao15-local/roof-remediation/full/`，按需定位目标用例，不扫描全部截图。
- `tools/pao15-basic-motion-sample/preview.ts`的doLoad/load/ready/生命周期；旧对应E2E及完整镜像，仅定位加载前序/时间/错误采集。manifest/structure/dcc报告和GLB只读；不要重建/重绑/改模型或重新导出。
- 主Agent单次只读观察`.pao15-local/main-preview-timeout-review/observation.json`作为成功对照，不是完整重跑。

其他活动树、原诊断/主审/修复失败证据、本地已有车尾生产改动均只读。本补充仅新增`docs/evidence/QA/motion-preview-readiness/v1/`纯文本诊断与可选本树新报告`docs/reviews/2026-11-03-motion-preview-readiness-diagnosis.md`；临时QA/镜像/新图/trace仅本树已忽略`.pao15-local/preview-readiness-diagnosis/`。先git check-ignore，不改默认配置或.gitignore。

## 3. 预登记的有界调查

使用systematic-debugging，不先猜修复。先离线读首次trace/前序测试和请求：HTTP完成/体积/时序、JSON消费、script/worker错误、GLB/纹理请求、浏览器/GPU/context异常、是否有未完成加载或page关闭。证据中缺少的阶段信息明确unknown；日志中的自动“请修代码”不扩大授权。

必要新实验先写计划，最多一组新鲜页面观察和一组有明确前序的序列对照，retries0。序列要以首次trace/原用例前序为依据，不任意增加循环直到复现。收集失败/成功全部样本，不把本次ready或定向绿称为修复。若两组仍未复现，交未排除项/最小新增观测建议，不无限重跑50项追绿。

采样至少区分JSON fetch完成与parse完成、LoadAssetContainerAsync开始/完成、addAllToScene、whenReady等待/完成、控件/ready初始化。优先CDP与只读EngineStore/scene观测，记录mesh/group/skeleton、pending items、材质/纹理状态、帧/CPU长任务和contextLost等可取得信息。若需浏览器内存包装或仅响应内的临时logpoint，标F观测及开销，保留原响应hash和替换清单；**不改磁盘预览源码、不改变promise时序/返回值/ready或跳过等待**。无法无侵入取得的指标说明未知，不靠修改生产插桩。

主Agent正常样本出现过pending0但scene未ready，之后才ready；因此pending0、HTTP200或页面背景已绘制都不能单独证明模型就绪。原dcc-report17459ms仅是相关时序，不足以断言它独自导致60秒超时。若做独立延迟/加载失败F，要事先单变量登记，不注入原完整回归、不截成空200或强制ready。

5195本树strictPort/reuseExistingServer=false、1worker/retries0、Chromium ANGLE D3D11；采集用例可为写出超时现场留额外清理时间，但被观察的原60000ms就绪门槛不延长，不改旧用例。N自然/原流程、F前序/故障/插桩分报，截图实际抽看2～3张异常扩看。

## 4. 返回与门禁

返回观察/推断/未知、阶段时间线、预登记样本结果、原件及本地修复保护hash；有根因证据则列最小生产修复文件/算法/失败传感器建议，尤其区分工具生命周期与环境因素。当前不授权修改preview.ts、旧E2E、loader库、依赖、模型或默认配置；需要生产修复时交Dispatcher具体扩围，不自行改。

原车尾完整49/50继续保留，原未提交修复/证据不移走、不提交/推送。补充诊断先作为本地文本返回，不为提交它捎带未过门禁的生产改动；后续根因修复另定范围，再完整build/test/E2E及独立验收通过后统一检查暂存区正常提交。不得删除旧失败、改变超时/断言/网络过滤、skip/retry换绿或自动合并/启动其他Agent。

## 5. 粘贴到现有车尾聊天的提示词

```text
Dispatcher已核对你的本地车尾修复和49/50失败现场。保留当前未提交生产改动、全部RED/GREEN/trace/截图；暂存区为空，不能reset/clean/覆盖或代提交。

继续在D:/worker/paoku-sessions/pao-15-roof-diagnosis，codex/pao15-roof-diagnosis；HEAD和远端仍8af24af083b369f3f8dc8bb883a861975b9972af。Dispatcher已复核顶层/common-dir/登记及脏树状态，这个SHA是接续基线，不是已提交修复。所有命令显式workdir/git -C，开始先核现状；不新建树或启动Agent。原有physics/unit/newE2E三文件hash已记在.pao15-local/main-preview-timeout-review/pending-work-hashes.json，后续如不同先说明，不重置。

先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-03-motion-preview-readiness-diagnosis.md及其引用的本地预审。按第2~4节只读调查旧四动作预览ready超时：离线trace先定位各await阶段；必要时预登记最多一组新鲜页面和一组有依据的前序对照，记录JSON解析/容器导入/场景就绪、资源和错误阶段。主Agent独立tsc/72单测通过，并在一次新页面约4秒ready；这未关闭完整49/50，不能拿它当修复。

只新增规定诊断文本，临时QA/新图/trace放本树已忽略.pao15-local/preview-readiness-diagnosis/。5195独占strictPort/不复用/retries0/D3D11。保留旧60秒门槛、错误断言、原源码/模型/资产/依赖和所有首次失败；不改preview.ts、不强制ready、不空200/过滤错误、不扩大超时或整套重跑追绿。若只读观测需内存logpoint，明确F和观测开销，不改变控制流或磁盘源码。

返回阶段证据、可证伪假设、成功/失败样本及未知；若根因明确，给最小生产修复/传感器范围交Dispatcher裁定。不能复现就按有界样本真实报告，不猜GPU/网络/物理原因。保护已GREEN车尾改动，不再修改或提交/推送当前未过完整门禁的生产批次；诊断先本地文本返回，不启动其他任务或更改父状态/依赖。
```
