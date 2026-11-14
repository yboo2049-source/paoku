# PAO-17 接口请求与后续验收矩阵（待审，未实施）

> 2026-11-02接续状态：I-01/I-02及首批结构/生命周期已获批准并进入A→B实施，见[实施计划](../plans/2026-11-02-pao17-structure-implementation.md)与[阶段执行记录](../evidence/PAO-17/structure-lifecycle/execution-record.md)。当前render附参类型在渲染模块，main按同次presentation与同步应用快照投影传递；disposeGame接renderer幂等释放。以下“未实施”及RED表格是原送审阶段口径，实际通过范围只按新证据记录，生产标定/主题池/18仍递延。

2026-11-02（Asia/Shanghai）。配套 [设计草案](../superpowers/specs/2026-11-01-pao17-render-design.md)。分析基线 `19aa31492ddce4c1c5e74ef1e49312ad41ec2dd6`；该 SHA 不是未来实施放行。本文表格中的测试均是拟议 RED，不能引用为已运行通过。

## 1. 实际公开门面与调用点

行号均来自本树上述基线，只作为定位索引。

| 当前公开能力 | 当前证据 | 兼容要求 |
| --- | --- | --- |
| `constructor(container: HTMLElement)` | `src/render/babylon.ts:72`；main:56 创建 | 可创建/复用 Canvas，保持宿主调用；不添加键盘/触摸或 HUD 逻辑 |
| `render(ctx: GameContext): void` | babylon:824；main:322–342 legacyView / presentation(alpha) | 已插值位置只同步一次；快照只读，不决定金币、碰撞、计时或应用状态 |
| `reset(): void` | babylon:1229；main:99 | 清旧局表现及异步接纳资格，保留安全共享资产；新局不延续镜头平滑历史 |
| `applySkin({color,secondaryColor})` | babylon:608；构造时 SKIN_CHANGED 订阅 | 仅表现，保留最新已提交皮肤；晚到资源不得覆盖为旧选择 |
| `triggerShatterFX(pos: Vector3)` | babylon:975；main:278–284 盾碎事件调用 | 保持门面；只生成限量短命特效，不消费护盾/改变 chase |
| 无公开 `dispose()` | main:357–364 清 loop/input/subscriptions，未清 renderer | 完整释放需要新增门面并串行接线，不能声称现状已覆盖 |

必要类型：`src/types/contracts.ts:7–18` 有 DeepReadonly、SimSnapshot 的 runId/tick/phase/discontinuity 与只读 context；`src/types/index.ts:49–67` 的 obstacle 有可选 definitionId/segmentInstanceId/combinationId/visualRootId，但 GameContext 本身无帧身份。`src/data/modelBindings.ts` 只有两个未标定车绑定，不能当已接受的生产 transform。

## 2. 仅向主 Agent 提交的跨界请求

以下是审查请求，不是本轮改动，也不直接授予 main/types/DOM 白名单。

| 请求 | 最小建议与目的 | 后续责任方 / 验证 |
| --- | --- | --- |
| I-01 只读帧身份 | 保留 render(ctx) 兼容调用，拟增加可选第二参 `{runId,tick,discontinuity,appState}`；context 继续取现有 presentation(alpha)，不改插值算法。局部 render 类型复用 DeepReadonly，避免改 GameContext 为第二份权威 | 主 Agent 确认 presentation 身份来源及同帧原子采样后，单一实现方串行接 main；类型只在确有缺口时另请共享 types 最小变更 |
| I-02 释放桥 | 新增幂等 `BabylonRenderEngine.dispose(): void`，在 disposeGame 调用；不重排应用/存档业务。reset 保持无参也可用内部 epoch 失效 | 17 可在获批范围设计门面内部释放；main 另批串行调用，测 HMR/重挂载不残留 resize/event/Engine |
| I-03 事实事件交接（递延） | 18若需 landed/action 事实，主 Agent 先固定现行事件 payload 和去重身份；渲染接收副本，不从 y===0 猜测权威接地，不双订阅同事实 | 不在17引入新总线协议、不重写 main 盾碎桥；18接续时另审 |
| I-04 生产绑定资格（递延） | modelBindings 当前 transform:null / UNCALIBRATED；经资产条目验收后提供只读生产 manifest，带源hash/revision/空间/组合锚点/一次转换和关键面证据 | 资产及共享绑定变更另批；17只校验、消费和降级。无资格不猜矩阵、不调物理 |
| I-05 DOM 协同（无必需新增接口） | 使用既有容器尺寸/resize；桌面和390竖屏检查 HUD遮挡，问题提交主 Agent | PAO-19 代码在本树未合入，不新增UI组件或读取DOM输入；需布局改动时由DOM责任方串行处理 |

内部拟议 handle 的最低信息为 root、独占/共享资源归属、注册过的 caster 集合、幂等 release；加载请求独立记录 epoch/key/revision/requestId。它们不是共享 types 的新增强制 schema。

## 3. PAO-18 交接边界

17交出稳定的 Scene/相机/角色 anchor 生命周期与只读帧同步位置，入口每帧只调一次角色/镜头表现；root world position 仍来自模拟，动画只作用于 visual child。角色 root motion 不推进游戏坐标，摄像机不写玩家状态。applySkin、盾碎、追逐者与 reset/dispose 所有权清单一并交接。

18接续时由其独占 characterView/cameraRig 与必要 babylon 连接，先锁17已验收提交再写；17不同时写 babylon，不制作正式动画、不补13clip、不将旧 jump→run / slide→sneak_pose / stumble→sad_pose 别名算作正式动作完成。PAO-15 自动试样未在本树接入，不能据此承诺新角色能力。

## 4. 后续 RED 测试矩阵

每条先落有意义失败传感器再改实现，保留 RED 日志与修复后结果；禁止仅镜像内部实现、削弱旧断言或以截图替代资源/状态断言。

| ID | 层级/刺激 | 必须先捕获的失败与后续断言 | 条件 |
| --- | --- | --- | --- |
| R01 | unit：深冻结 context（含 Map）、同快照多次render | 渲染写状态或消费拾取时失败；前后语义hash一致，无模拟/账本/接触变化 | 独立假Scene/只读夹具可验证 |
| R02 | unit：相同ID重复、乱序集合、实体删除再迟到 | 重复实例/迟到复活时失败；每有效key一handle，collected及时清理，重复release无害 | 不靠全局mesh名字匹配 |
| R03 | unit：可控deferred loader，A局请求→reset→B局同ID→A完成 | 旧局挂载/覆盖新皮肤时失败；epoch和revision检查，旧租约清理、B局资源仍有效 | runId接线前只证明内部epoch，接线后补全局用例 |
| R04 | unit+browser F：reject/404/空容器/错revision/无资格 | 空白或双显时失败；fallback一直可见且可读，有限诊断，非逐帧重试；成功原子替换 | 不改失败为业务成功 |
| R05 | unit+browser F：工程车RAMP/ROOF，多个同prefab，跨段回收 | 两车身/重复自带坡时失败；一visualRoot一实例，两逻辑角色仍独立，普通车不选工程车 | 假生产manifest可测分组；真实资产等放行 |
| R06 | unit+browser F：源节点X旋转、RH/LH，Y+5基点、朝向标记 | 二次翻转/丢节点变换时失败；源→loader→logic一次链；量测坡脚/中/顶/两侧与车顶，非AABB代证 | 真实标定必须生产元数据，RH预览不代替LH证据 |
| R07 | unit+browser F：多轮生成/回收/reset，dispose两次、加载晚到 | 共享材质被早释放/数量单调增长/阴影死引用时失败；暖机后各类计数平台稳定，reset回基线，dispose归零（外部Canvas除外） | 记录循环次数、缓存上限、计数与GPU观测范围；资源稳定不等同真机预算 |
| R08 | unit+browser F：z跨0/L/多L、回退、重开；循环接缝附近 | 单步平移遗漏/冻结矩阵陈旧时失败；覆盖可视区、接缝无裂口/重复杆、UV方向连续、池数量有界 | 合成几何可测算法，正式套件另验 |
| R09 | browser N/F：高低栏、普通车、工程车、金币/道具，同屏逆光/阴影 | 栏开口被光晕遮住、坡顶与脚底断层、背景遮挡时失败；轮廓完整、危险/可走面清楚，无空白 | 桌面/390竖屏截图+几何/像素或DOM量测，真实资产未放行不得签收正式外观 |
| R10 | unit+browser F：dispose/remount/HMR，皮肤+resize | 旧订阅多触发、旧Engine仍活动时失败；持有回调全部注销，仅有效renderer响应，旧Promise不挂载 | I-02串行接线后才可验全流程 |
| R11 | unit+browser N：暂停/恢复、首帧、discontinuity、重开 | 二次位移插值/旧局镜头拖影时失败；离散状态最新、位置仅同步，局内效果不追跑隐藏时间 | I-01/18边界未接前明确范围，不改物理/时钟 |

R07建议最小夹具：暖机完成后记录基线，连续20轮固定实体集创建/删除和10次reset，再dispose并等待全部deferred完成；要求每轮回同一缓存基线（允许项显式枚举），不是容忍固定增长。最终次数和缓存预算须在正式计划固定。

## 5. 未来真实 N / F 验证与截图

N 为真实自然输入：桌面启动→菜单/商店→开始→键盘切道/跳跃/翻滚、拾币/道具→暂停/恢复→碰撞结束→重开；390竖屏用触摸完成主要路径。禁止用测试setter/改快照来冒充自然试玩。检查既有事件/存档/界面迁移回归但不越界修业务。PAO-19汇合后另验新DOM表现，不能直接引用其已验收成绩给本树计分。

F 为夹具/故障：固定主题边界与车坡组合、非零Y、加载失败/过期、资源压力、销毁重建；所有注入须专属且获批，测试传感器不能成为生产玩法权威。N/F单独报告通过/失败/重试/跳过数、时长、seed和输入记录，保留第一次失败。全绿不能抹除历史失败或替代资产阶段验收。

未来每批实现需 `npm run build`（含tsc）、`npm run test`、`npm run test:e2e` 完整回归，并运行专属传感器。服务器使用5187、`strictPort: true`、`reuseExistingServer: false`；端口被占用时查明并停止本批验证，不复用或停止其他任务服务。Windows浏览器环境记录 ANGLE D3D11 与实际参数，不能仅修改截图输出来声称新结果。

默认人工查看2～3张本轮真实新增关键图：①桌面局内，高低栏/完整列车/坡顶与角色同屏；②390竖屏局内，角色取景、危险预警及HUD安全区域；③优先重开后的循环接缝，或失败fallback关键帧（按风险选取另一尺寸）。其他矩阵帧可自动保存索引；若2～3图不能覆盖异常则扩看，不用静态原型代替真实游戏。截图关联N/F、viewport、DPR、run/tick/seed、资产revision和代码SHA；可配短录屏说明跨接缝连续性。截图数量不是整个矩阵执行次数上限。

## 6. raw/hash 与历史证据保护

正式批次开始先记录干净/用户改动、基线SHA、受保护跟踪文件和原资产/旧证据hash。服务启动后比对当前实现模块的 raw 源码身份（Vite `?raw` 响应与本树源字节），核对生产资产 source/copy/HTTP hash及revision，避免访问旧服务器或其他任务树。转换模块响应不直接同源文件字节比较。哈希不一致先定位，不能继续签收截图。

每批输出到新增 `docs/evidence/PAO-17/<batch>/` 或约定忽略目录，不覆盖 PAO-6/15/16/19 历史日志/图/诊断。完整旧回归若会覆盖证据，只用获批输出重定向或保持断言可还原的隔离镜像；保留原测试语义与失败记录，禁止删断言、skip或改时钟换全绿。检查前后保护清单，差异逐项解释。

纯方案阶段本轮只执行内容/引用审查和 `git diff --check`；如正常提交hook要求 build/test，可按锁文件安装并运行，这是文档提交门禁，不是R01–R11或N/F已通过。无需为了文档运行E2E或浏览器；正式实施门禁不能用本轮文档检查替代。

## 7. 送审与停止点

主 Agent 审查路线、I-01/I-02、资源所有权/失败策略、资产前置、待决预算和矩阵后，由用户批准具体设计；再同步共享文档、固定正式接续提交、串行接口/入口写入者及白名单，另发实施提示词。本轮只提交/推送任务文档，不合并、不改Linear、不解除依赖、不启动18。
