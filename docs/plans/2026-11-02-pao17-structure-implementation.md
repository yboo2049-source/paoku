# PAO-17 Structure / Lifecycle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 保持legacy表现与公开门面，提取assets/environment/entityViews，完成内部生命周期后串行接I-01/I-02。

**Architecture:** renderer拥有引擎/场景/回调，assets拥有共享资源及异步缓存；views持独占实例，environment持旧环境。main只在B使用同次presentation及同步app快照投影；不再次插值。

**Tech Stack:** 已锁定TypeScript/Babylon/Vitest/Playwright，无依赖/默认配置变更。

2026-11-02。授权来源：主仓`docs/plans/2026-11-02-pao17-approved-execution.md`及其中准备主审；用户已批准A/I-01/I-02。固定接续fcddba1495a27436de64971720aad67624bc4420。本轮单一实现方，不派Agent，不询问重复许可；技能中的分派/额外检查点审批由本次明确A→B授权取代。旧准备文档为历史，不是新的实现禁令。各外部输入的实际字节hash/工作树状态见`../evidence/PAO-17/structure-lifecycle/current-inputs.json`，不是仅凭主仓HEAD冻结所有文件。

## Task 0 — 输入与护栏

1. 核对分支/HEAD/status，阅读批准计划、主审和本树设计/矩阵；记录主仓页首当前生效章节。
2. 记录所有本树跟踪文件字节hash及gitlink提交到initial-protection.json；不扫描其他任务树；初始用户改动为空。
3. 写本计划；临时工具/完整旧回归镜像/批量图放`.pao17-local/`，镜像扩展名`.pw.ts`不被Vitest收集。默认配置和旧断言只读。

## Task 1 — assets（A）

Files: 新增`src/render/assets.ts`、`tests/unit/pao17-assets.test.ts`，修改`src/render/babylon.ts`旧player加载处。

1. RED：测试renderer级AssetCache的共享deferred加载、A消费者过期/B消费者有效、空/失败缓存不逐帧重试、release幂等且不提前释放共享容器、dispose晚到释放。测试先动态导入并断言接口存在，以明确缺少能力失败而非收集错误。
2. Run `npm run test -- tests/unit/pao17-assets.test.ts`，原样留RED日志。
3. 实现最小泛型AssetCache：资源由cache持有，request按key去重；消费者guard只控制实例申请；leases独占实例；缓存保留到renderer销毁，晚到dispose清理。材质缓存统一归assets。
4. 旧player改用LoadAssetContainerAsync及实例租约，保持路径/旋转/缩放/动画别名；皮肤在挂载时读取最新值，fallback准备好后才隐藏，不提前载入新生产GLB。
5. Run目标测试与`npm run build`，GREEN后再继续。

## Task 2 — environment / entityViews（A）

Files: 新增`src/render/environment.ts`、`src/render/entityViews.ts`、`tests/unit/pao17-views.test.ts`和`tests/e2e/pao17-structure.spec.ts`；修改babylon委派。

1. RED：用NullEngine/真实Scene验证乱序/重复同步、collected/删除、caster撤销、共享材质存活。immutableCopy对Map的set/delete/clear与绕过尝试必须报错，条目前后相同；真实views只读同步。
2. Run `npm run test -- tests/unit/pao17-views.test.ts`并留RED。
3. 将原环境构建/合批/600平移原样迁移，实体构建/位置同步/差分及材质获取迁移；不做新池/新主题/组合生产绑定。合成单组合根用通用实例归属夹具验证，不以距离猜组合。
4. Run assets/views及build。记录旧环境潜在算法/外观缺口，不借结构任务修主题。

## Task 3 — reset/dispose与A完整检查点

Files: `tests/unit/pao17-lifecycle.test.ts`、`tests/e2e/pao17-lifecycle.spec.ts`及四个渲染模块。

1. RED：真实受控宿主Renderer路径，重复dispose、回调off、外部Canvas、晚到加载；NullEngine views暖机后20轮实体创建删除、10次reset，分别断言meshes/transformNodes/materials/textures/animationGroups/skeletons/particles/casters计数回基线。
2. Run目标RED，补最小reset/dispose与枚举计数；保留共享缓存，清局内状态；scene/engine最后释放，dispose后render/reset安全no-op，自己创建Canvas才移除。
3. Run build、完整test、完整旧E2E镜像+专属E2E。5187 strictPort/reuseExistingServer=false、D3D11；raw与legacy player HTTP/hash，历史保护hash，真实桌面/390截图。完整命令：`npm run test:e2e -- --config .pao17-local/acceptance.config.ts --retries=0`。
4. 写A检查点结果；检查main字节仍匹配初始保护清单，A完整通过才进入B。

## Task 4 — I-01（B）

Files: `tests/unit/pao17-frame.test.ts`、`tests/unit/pao17-main.test.ts`、babylon与main局部render/legacyView。

1. RED：可选帧门面同run/tick discontinuity只消费一次、reset+新run合并清理、重复帧保留实例、首帧/run切换不带旧历史；兼容无附参。
2. main测试真实执行模块，以受控simulation.presentation每次返回不同身份、context，捕获GameLoop的真实render回调；断言一次调用、context/identity一致及同步appState投影（不是源码字符串测试）。
3. 实现render模块导出只读FrameIdentity，main在同回调保存presentation和app snapshot，legacyView接受该app参数；不改types/core/事务/模拟插值。
4. Run frame/main/lifecycle及build。

## Task 5 — I-02（B）

1. 在main测试补RED：调用真实disposeGame必须释放renderer的实际所有资源，重复释放不残留；专属浏览器夹具验证实际renderer销毁/重挂载，旧skin/resize/Promise无效。业务mock仅隔离存档/loop，renderer释放不以mock调用数代替资源验证。
2. 在既有disposeGame加入renderer.dispose，必要的幂等防护；其他业务释放顺序不改。
3. Run main测试及专属E2E，资源计数按所有权报告。

## Task 6 — 完整交付

1. 最终B完整build/test/E2E与A相同门禁；旧镜像仅改输出路径/必要相对import路径，每个镜像附逆变换hash证明原断言完整。
2. 新自然输入N桌面键盘与390触摸启动/运动/暂停恢复/结束重开，和F失败/过期/销毁分报。抽看2～3本轮关键图，异常扩看；保存JSON计数、时长、重试、失败及图索引。
3. raw实际源身份/legacy资产源HTTP/hash/历史保护核对。仅批准路径可改；不修改preparation原证据、共享总纲/PROGRESS。
4. 正常hooks（如需使用进程临时npm shell入口解决Windows bash路径，仍执行真实npm/原hook，不跳过）提交本任务、push核对远程SHA；仅交主Agent阶段复审，不Done/合并/启动18。

## 测试结果记录

结果写入`docs/evidence/PAO-17/structure-lifecycle/`，失败与后续成功按新文件保留。R06真实生产标定、R08新主题池/正式循环品质、R09明亮主题及18正式动作继续递延；合成夹具不代表这些生产范围已通过。

## 本批执行状态

Task0～6已完成本批实施与验证，待正常提交推送后交主Agent复审。A完整build/test（254项）/47项E2E通过，main字节在A检查点未改；随后B最小接线、挂载回滚补强并完成build/test（261项）/48项E2E，0重试/跳过/flaky。详见[阶段验收](../evidence/PAO-17/structure-lifecycle/verification.md)及保留的RED/首次失败日志。父任务完整Done、生产资产与18接续不在此次完成口径。
