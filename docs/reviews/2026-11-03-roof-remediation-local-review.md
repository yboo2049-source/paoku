# 车尾修复本地预审：完整门禁仍受预览超时阻挡

2026-11-03（Asia/Shanghai）。这是未提交实现的局部预审，**不是完整验收通过或已推送修复**。

## Git与现场

复用D:/worker/paoku-sessions/pao-15-roof-diagnosis，codex/pao15-roof-diagnosis；本地/远端HEAD仍为8af24af083b369f3f8dc8bb883a861975b9972af。顶层/common-dir/登记核对通过，暂存区为空。已有未提交physics.ts、sweptCollision增量以及新E2E/计划/证据全部保留，主Agent没有重置、代暂存、代提交或推送任务树。

主Agent记录三份待提交文件的原字节SHA：physics.ts=`4e926f98effbb0ebb3268d41a3635ed7f0263297ddf53e8e9e60ecc3b8bd638a`；sweptCollision.test.ts=`74f735394538b5c5c300b11990378c014a383a66c9641613413dc0bea03e6021`；roof-exit-continuity.spec.ts=`2341bb376eb977caf92945784e362ac0c8e85a90220adf2ec4f58c7166e0a3e2`。后续正常追加之前先检查变化，不能用HEAD对象代替本地修复身份。

## 已核实与成绩边界

- 独立读取physics差异：在非initialOverlap、向下top sweep已证明的分支，补充同一步最终owner边界作为离开依据，仍由原提交路径按身体重叠保留owner/side/y。未改积分/世界坐标/公共schema/接地事件。尚不能只据代码阅读推断所有边界正确。
- 主Agent实际重新运行`tsc --noEmit`及`vitest run tests/unit/sweptCollision.test.ts`，均exit0，72/72目标单测通过。
- 任务方报告build、完整292单测、新测试类型检查及4项新增E2E通过；完整旧46+新4为49/50、433935.374ms，skip/flaky/retries均0；新增4和原PAO-6坡顶用例通过。这些完整成绩本轮只核对报告/现场，主Agent没有再运行整套或将其记为独立重跑。

## 新失败与只读观察

唯一完整失败是旧`pao15-basic-motion-sample.spec.ts`等待`__BASIC_MOTION__.ready`超过原60000ms，在数值断言前停止。现场预览显示“样本已释放”及禁用控件，背景网格仍可见；没有任务方记录的pageerror/requestfailed。manifest/structure/dcc-report/GLB HTTP均200，其中dcc-report约17459ms。HTTP200不能证明JSON消费、模型导入、纹理/材质或scene.whenReadyAsync已经结束。

预览只读源码路径为：dispose→三个JSON fetch/parse→LoadAssetContainerAsync→addAllToScene→scene.whenReadyAsync→捕获骨/顶点、初始化clip/控件→ready=true。该预览没有加载physics.ts，未建立车尾代码导致本超时的因果关系；其后短序列用例成功也不能覆盖首次失败。

主Agent在本树5195执行**预先限定一次**只读新页面观察，原预览源码/旧超时/断言均不变；通过实际EngineStore读取scene/组/骨架/pending/ready/contextLost。约2701ms为5个背景mesh/无组；3454ms为40mesh/4组/1骨架、pending0而scene未ready；4001ms ready=true、场景ready、无脚本/请求错误、无contextLost。观察采集用例exit0只表示采集完成；本次未重现，不是旧完整49/50已修复。

现场和采集在本机`.pao15-local/main-preview-timeout-review/`，含observation.json、独立trace/截图及待提交文件hash。阶段轮询包含额外scene.isReady检查和动态导入，观测开销/编译时序影响未量化，不能当作原失败用例的无扰动等价执行。主Agent实际打开任务方首失败截图确认空预览状态。未修改tools预览、模型、旧测试、超时、依赖或默认配置；没有重复整套追绿。

## 结论和下一步

车尾修复具备局部GREEN证据，最终提交/验收继续暂缓。新阻挡当前为**加载就绪超时，具体原因未知**；不能定为单纯慢网络、GPU问题、preview逻辑错误或物理回归。

按[只读补充诊断提示词](../plans/2026-11-03-motion-preview-readiness-diagnosis.md)在同一现有树继续：保护本地车尾修复与首失败，有限采样各await阶段及整套前序条件，区分JSON/loader/纹理材质/scene readiness和资源压力。此补充不开放预览生产写权、不再建树；有根因证据后再给最小扩围修复请求。原45/46、59/60及本次49/50均保留，不改父状态/依赖、不集成新runner。
