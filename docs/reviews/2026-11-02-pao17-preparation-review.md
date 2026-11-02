# PAO-17 方案准备主审

> 后续批准：用户已明确批准本主审末节的路线A、I-01/I-02及首批结构范围，当前使用[批准后的A→B计划与新提示词](../plans/2026-11-02-pao17-approved-execution.md)。下文“尚未批准”为主审当时状态；正式资产/完整父任务验收仍未因此放行。

2026-11-02（Asia/Shanghai）。**准备阶段验收通过，可以提交具体设计审批；未批准或开始渲染实现，不将PAO-17标Done。** 输入为 `codex/pao-17-render@fcddba1495a27436de64971720aad67624bc4420`，分析基线M1 19aa314。

## 核验与适用范围

- 任务树D:/worker/paoku-sessions/pao-17干净，origin同分支SHA一致。相对19aa314仅三份新文档、266行；源码/public/依赖/测试/共享总纲无变化，独立diff检查通过，相对文档引用有效。
- 已读设计、接口/验收矩阵、准备证据；窄范围核对现行render/reset/构造订阅、main的legacyView/presentation/disposeGame、快照类型与两个显式车绑定。关键现状有源码依据：render只收到GameContext、main已做空间插值、没有renderer.dispose调用、模型transform仍null/UNCALIBRATED。
- Linear PAO-17仍Backlog，blockedBy PAO-16/9、blocks PAO-18；不更改状态或依赖。PAO-16当前树有未提交工具/TODO变更，未读取或采纳其未验收结果，不把其活动目录作为17固定输入。
- 提交方报告正常hooks的build与244项单测通过；三份正式文档未持久化成功hook完整日志，本主审不称已独立重跑这些检查。纯文档不重复运行E2E或查看旧截图，不把R01～R11计划当已通过测试。

交付固定链接：[设计方案](https://github.com/yboo2049-source/paoku/blob/fcddba1495a27436de64971720aad67624bc4420/docs/superpowers/specs/2026-11-01-pao17-render-design.md)、[接口请求与验收矩阵](https://github.com/yboo2049-source/paoku/blob/fcddba1495a27436de64971720aad67624bc4420/docs/render/pao17-interface-and-validation.md)、[准备证据](https://github.com/yboo2049-source/paoku/blob/fcddba1495a27436de64971720aad67624bc4420/docs/evidence/PAO-17/preparation/read-only-findings.md)。

## 设计审查结论

推荐路线A：保留BabylonRenderEngine公开门面，分阶段提取assets/environment/entityViews。资源归属、旧请求失效、fallback原子替换、单工程车视觉根、阴影注册/撤销、循环段有界池及18交接均有明确设计；不需要为本轮改成更大的表现运行时。未发现阻止方案送审的架构问题。

I-01帧身份与I-02释放桥的需求成立：同一次presentation采样应同时提供context与runId/tick/discontinuity；appState保持应用只读投影，不再插值位移。renderer.dispose内部实现与main的disposeGame最小调用需要分阶段、单一入口写入者串行处理。两者不是共享types/应用/存档的全面重构授权。

正式场景尚缺合格列车/坡面/净空元数据及主题资源；不可因架构准备通过直接加载四件GLB。主题候选色调、程序轨道/站台、正式角色动作和设备质量档均未因此冻结或制作。原M1兼容表现只作为结构回归基线，不冒称达到明亮主题或真实坡体品质。

## 进入实施计划前应纳入的细节

1. **输入溯源**：准备证据中的主仓692bf24是当时HEAD，不是所有读取文件的完整固定提交；该提交没有并行新提示词。一部分文件在读取后随7a5fe84更新，四份主仓输入记录hash与当前文件不同。任务树七份源码/公约/hook的磁盘hash均匹配记录，CRLF换行口径与19aa314内容相符。正式计划应按当前主仓生效文档重新记录HEAD、文件状态和字节hash；工作树快照与Git blob区分，不因该历史记录否定其源码分析，也不将它当完整固定输入证明。
2. **R01的Map护栏**：Object.freeze(Map)本身不能阻止set/delete/clear。失败传感器需使用能拒绝这些操作的只读包装，或对Map条目做前后语义比较，并证明对抗性写入会被捕获；不只断言Object.isFrozen。
3. **R11断点消费**：同runId/tick的discontinuity=true可能被多个渲染帧观察，必须按身份只消费一次；连续reset不能破坏同局已完成资源缓存。旧局完成、重复帧和新局同实体ID组合应纳入失败矩阵。
4. **R07资源口径**：区分暖机后renderer共享缓存基线、每局实例、外部宿主资源与dispose归零范围；完成可控deferred请求后再判断。不得以任意固定正增长容差或单看进程内存代替资源/阴影引用断言。

这些是下一步计划中的具体约束，不要求本轮编写游戏代码或为文档追加浏览器验证；正式实现前按它们落有意义RED。

## 建议一次审批的具体范围

1. 采用路线A，仅先做等行为渲染拆分、加载/实例所有权、失败回退及reset/dispose；保持M1已验收玩法和既有公开门面，未来新增模块限assets/environment/entityViews。
2. I-01只读帧身份及I-02释放桥允许作为后续串行接线范围；main/types写权仍须在正式任务计划具体列明，主Agent不写实现。I-03事实事件与I-04生产绑定继续递延。
3. 第一实施批次仅结构和专属合成夹具验证，不做生产GLB接入、程序主题资产、角色动作/镜头重设计或正式风格/设备预算签收。拟先在本17任务分支接续fcddba1准备实施计划，实施起点由Dispatcher在核对任务树后固定；该批不合入15/16/19，跨分支最终整合仍归后续专门任务。

上述具体审批尚未取得。AGENTS第8条规定：“经用户审批（HARD-GATE）后，方可进入writing-plans与实现阶段”。因此当前完成的是方案主审；批准后主Agent先同步共享文档、固定串行白名单与接续提交，再给用户可复制的writing-plans/实施交接。不自动启动、合并或解除16/9的整体依赖。
