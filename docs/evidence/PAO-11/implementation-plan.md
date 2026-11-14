# PAO-11 支撑面与连续接触 Implementation Plan

> 使用 Superpowers writing-plans、test-driven-development 与 verification-before-completion；由隔离物理实现子 Agent 执行，Dispatcher 审查和浏览器验收。

**Goal:** 在真实 updatePhysics 中统一地面、坡道、车顶支撑，保证相对接触、跳离、落回、移动携带及回收清理。

**Architecture:** 保留 PAO-10 固定步长、输入和快照所有权。新增纯 surfaces 模块，将旧障碍适配为 Surface，使用世界脚底中心求高，物理层唯一更新移动实例并解析支撑。兼容旧 PlayerEntity，仅增量存储支撑 ID/接触及必要前次支撑采样；不引入第二个速度来源。

**Tech Stack:** TypeScript、Vitest、Playwright、现有 Babylon 页面（只读）。

## 授权、文档与边界

- 2026-11-01 用户明确执行 PAO-11；Linear 最新派发评论 3deba6ea-0676-4534-bc25-49c94c778d8a 为本次具体契约，设计/实施授权已给出，不再次启动设计审批。
- 基线 cf57d996596a15b1cce52deab6e879a2a013ef6a，当前 feat/pao-11-surfaces；不建工作树、不切分支。
- 已读 AGENTS.md、架构/工作流/测试规范、PRD、Harness、PAO-6 基线、PAO-9 最新 rebuild-contracts.md（只读，重点 §2.1–2.3）。共享文档/PROGRESS 只读，本专属计划同时记录本任务进度。
- 写白名单：src/systems/physics.ts、新 surfaces.ts；src/types/index.ts、contracts.ts 仅支撑增量；tests/unit/surfaces.test.ts、tests/e2e/pao11-surfaces.spec.ts；本目录计划/配置/日志/图像。生成器、渲染、main/core/input、应用服务、历史证据不修改。
- 三方案比较：继续内联各类型分支会重复容差并难以测相对接触；完整迁移碰撞/事件模型越过 PAO-12 范围；选择纯 Surface 查询+现有 physics 接线，最小边界可单独验收。

## 算法与数据结构

1. Surface 以 owner 底面中心为 origin；局部 X/Z 矩形范围、startHeight/endHeight、GROUND/RAMP/ROOF、稳定 surface ID 与 owner ID。GROUND 为 y=0 的稳定平面；速度只从现有 MOVING_TRAIN.speedZ 派生，Surface 不重复保存可写速度。
2. 采样先判断脚底中心是否在实际有限 X/Z 范围；范围外返回 null，不 clamp 为无限支撑。坡高 origin.y + startHeight + (endHeight-startHeight)*(z-zMin)/(zMax-zMin)。B=(0,5,100), D12/H3 得脚5、中6.5、顶8，车顶入口(0,8,106)。
3. 区分数值 epsilon（建议 1e-6m 量级，覆盖端点舍入）与旧玩法宽容（不得借 0.2/0.35m 吸附侧撞）。记录精确采用值并测试边界。支撑延续/邻面接缝通过前后采样或段内相对方向判定；下降穿越可落地，正相对法向上升禁止提前吸附。只处理本任务必要接触，不重构完整扫掠伤害。
4. 持续贴坡跟随局部高度；换面不发伪落地；侧向离开实际边界即清除旧支撑并重力下落；从下侧进入高坡/高车顶不提升脚底。
5. 每 tick 障碍移动一次；上 tick 支撑有效且未主动跳离才携带 speedZ*dt 一次。新进入支撑不追补上次运动；失效/回收 ID 在下一物理 tick 撤销；快照携带支撑字段，不能用模块级可变缓存破坏重开/回放。
6. 使用 legacy PLAYER_LANDED 桥，保留既有调用兼容；本次不假称已实现完整新版事件封套。

## Task 1 — 先失败测试与最小物理实现（物理子 Agent）

1. 新建 tests/unit/surfaces.test.ts，先使用现有 updatePhysics 断言非零基准坡、范围外、侧撞/上升、连续过面、携带和回收。运行 npm run test -- tests/unit/surfaces.test.ts，将预期失败日志存 red-unit.log，确认行为失败而非拼写错误。
2. 在 surfaces.ts 定义只读 Surface 适配/求高/接触逻辑；增量支撑字段放 PlayerEntity/必要 contracts 类型。替换 physics.ts 的支撑解析，保持拾取、伤害和其他逻辑边界。
3. 跑 npx tsc --noEmit、目标单测与 npm run test；自主修复，记录 green-unit.log。确认原 physics/simulation 单测通过，直接 updatePhysics 调用仍兼容。
4. 断言矩阵：地面→坡→车顶→跳离→落地；非零坡脚/中/顶；无范围外夹取；侧撞高车顶不能上车；向上跳不落回；横向切出；下降落回；不同速度符号移动面只携带一次、首次接触不追补、回收清引用；epsilon 内/外端点。

## Task 2 — 浏览器与全局回归（Dispatcher/QA）

1. 新建 pao11-surfaces.spec.ts，真实键盘/触摸驱动坡→顶→跳离→地面，桌面1440×900及竖屏390×844，记录 tick、脚底 y、support ID、错误和布局。夹具标 F，普通输入标 N；高基准实例为夹具验证，不声称随机生成路线可达。
2. 新建本目录 playwright.config.ts：独占5182、strictPort、reuseExistingServer=false，校验实际源文件来自此 checkout。
3. 专属 wrapper 备份既有测试写入的历史 PAO-6/PAO-10 图像日志与根截图，运行完整 npm run test:e2e（专属 config 覆盖端口，所有旧 spec 加新 spec），复制新采集到本目录后逐字节恢复并核验 SHA256。不改变旧用例断言或磁盘游戏实现。
4. npm run build、npm run test、完整 E2E 均为必须成功。亲自查看桌面和竖屏截图，记录旧坡体遮挡/侧道取景局限；不声明物理任务修复渲染。

## Task 3 — 交接

审查白名单与 git diff --check，正常 hooks 提交本任务文件，push 当前分支并核验远端 SHA。将验证命令/统计、证据路径、局限、提交和分支回写 Linear，置 In Review，等待主 Agent；不置 Done，不开始其他任务。

## 进度

- 开工：已读正文/最新派发及规范；Linear In Progress；当前工作区初始干净，基线正确。
- 计划完成；下一步先记录失败测试。
- 物理完成：新增 23 项单测，完整 104/104 通过；首次 10 项为 9 失败/1 已满足。后续 red-seams / red-relative / red-departure / red-normal / red-stale / red-zero-time 日志记录迭代发现与最小修复。
- 实际类型增量只在 PlayerEntity：supportSurfaceId、contact、supportSample，以及避免坡顶提前碰撞的 supportRampExit、离顶身体仍重叠期间的 supportDeparture。supportDeparture 在完全分离/回收/重新着面时清理，不是永久忽略碰撞；无新增可写速度或模块缓存，contracts.ts 无需变更。
- 最终数值容差 1e-6m；不保留旧车顶 0.2/0.35m 吸附阈值。GROUND 无限范围是旧无限地面的适配特例，有限障碍面严格检查 X/Z 后求高。
- 相对方向按前后脚底与表面的 signed gap 判断；旧 QA 定位改变 y 时拒绝陈旧样本；dt=0 不取消上升跳离。每 tick 先计算横向结果再判移动携带，首次落车顶不追补已发生的位移。
- 规格与代码质量只读审查通过；Dispatcher 已在最终生产文件上确认 build exit0（既有 chunk 警告）、104/104 单测。全局浏览器最终冻结复验进行中。
- 最终完整浏览器复验 runs/verified：20/20通过（94.89s），7个生产源hash前后不变，233历史文件恢复校验通过。Dispatcher已查看桌面/竖屏最终真实截图，旧坡体遮挡明确保留为范围局限。
