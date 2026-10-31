# PAO-12 相对扫掠碰撞 Implementation Plan

**Goal:** 在 PAO-10 固定步和 PAO-11 支撑基线上，防止高速穿越漏判，以真实姿态盒判碰撞，并将接触、单次护盾/伤害和终局通知分离。

**Architecture:** 新增纯 contacts 模块，使用前后 AABB 的相对位移求接触时刻与法向；physics 聚合并稳定排序后，在拾取阶段之后结算一次伤害。Simulation 在每个 tick 输入之后、前进积分之前捕获脚底位置并显式传入 physics，不保存跨 tick 的障碍历史。

**Tech Stack:** TypeScript、Vitest、Playwright；现有 Babylon 页面只读。

## 授权、设计依据与范围

- 2026-11-01 用户授权执行 PAO-12，最新派发评论 `21bb2918-e82a-4be7-b329-5c88a35d2057` 定义实现范围及验收矩阵。本次为已派发方案的有界实施，不重启已批准总体设计审批。
- 当前分支 `feat/pao-12-swept-collision`，基线 `0875b276f91cfe344f24587cd0169177c0042fdd`，初始干净；不新建工作树、不切换或合并分支。
- 已读 AGENTS/CONTRIBUTING、架构/工作流/测试规范、PRD、Harness、Superpowers 工作流、PAO-11 计划及报告、surfaces.ts，以及只读 PAO-9 rebuild-contracts.md（含 §2.1–2.3、§5 tick 顺序）。采用 writing-plans、TDD、verification-before-completion。
- 白名单遵循最新派发：physics.ts、新 contacts.ts、必要 surfaces.ts/type 增量；必要 simulation.ts/main.ts 最小接线由独立核心子 Agent 实施并复核；新增指定单测/E2E 与本证据目录。共享主文档和 PROGRESS 只读，本文件兼记进度。
- 渲染、相机、材质、灯光、美术/public、生成器、应用服务、依赖及既有测试均只读。只做截图回归；如发现视觉与代理不一致，交接尺寸/原点接口，不修改表现。
- 方案比较：dt 封顶仍会漏相对运动；跨 tick 持久历史需要实例/run/传送失效机制且容易污染快照；采用当前 tick 显式起点和本次障碍移动前后值，避免持久历史及模块 Map 缓存。

## 算法、数据与接口

1. 玩家脚底中心，X/Z 中心±0.4m，站立高1.8m、翻滚高0.9m；障碍底面中心及实际 width/height/depth。不以 lane 或 isRolling 本身豁免高障碍，不保留低障碍 y>1.2 的独立免撞阈值。
2. `PhysicsStepStart {x,y,z}` 是可选、只读、仅当前调用有效的脚底起点。Simulation 消费本 tick 输入后、前进之前捕获，physics 同步使用后丢弃。main 仅适配回调。直接 legacy updatePhysics 无起点时以调用入口位置为起点，涵盖本调用横向/垂向和障碍运动，不能推测调用前外部移动。
3. 障碍起点在 physics 入口读取；MOVING_TRAIN 本次仍仅移动一次。无跨 tick 历史：重开、QA定位、世界清空、回收/复用的下一调用都从当前实体开始，不扫过旧位置。supportSample 只用于既有支撑，禁止冒充完整运动历史。
4. AABB 窄相使用相对位置，逐轴求重叠时间区间并相交，返回最早归一化 TOI [0,1]、接触法向和实体 ID。零相对速度需实际区间相交；初始严格重叠 TOI=0；平行擦边无体积交叠不伤害。仅数值 epsilon，不增加玩法容差。姿态按输入后的本 tick 姿态，计时到期须明确边界，不用动画状态回写。
5. 接触按 TOI、稳定实体 ID 排序，不能依赖 obstacles 数组顺序；确定性相同 TOI 的轴法向规则。先生成几何接触，再依据支撑语义过滤：RAMP 仍为支撑面；下降落顶、共同坡顶前缘以及从原支撑车尾/侧缘离开，不因自身旧体积重叠受伤。非支撑的真实车头/侧撞仍致命。保留 PAO-11 旧全部回归。
6. 判定顺序：效果计时→运动/支撑→收集接触→金币/道具拾取→伤害决定→单次事件。沿用兼容本批顺序，同 tick 拾取护盾可挡碰撞；多个道具按稳定 ID。运行中拾取/任务原行为保留，不改分数/固定时钟。
7. 聚合只结算最早有效伤害：护盾移除两兼容标志并赋原1.2s无敌，一次碎裂事件；无盾则结束状态先提交为 GAMEOVER 再发一次旧 COLLISION 桥，防重入/后续 tick 重复通知。不并行发布第二套终局桥；standalone 玩家入口需明确单次终局标记及重置接口（如需要则仅增必要快照字段）。无敌/godMode 属伤害层，不改变纯几何接触结果。
8. 本任务不实现碰撞后滑移/弹性响应，仍是护盾继续跑或结束；TOI/法向用于可测确定性结果。扫掠在一 tick 内采用线性位置段，重力/支撑仍按现有积分处理，不声称连续曲线精确解。

## Task 1 — RED/GREEN 物理（隔离 physics 子 Agent）

1. 先新增 `tests/unit/sweptCollision.test.ts`：用现有 updatePhysics/Simulation 复现高速薄障碍、迎面列车、空中滑铲高栏和重复终局；运行目标测试，保存预期行为失败日志到本目录。
2. 失败确认后实现 `src/systems/contacts.ts` 纯查询及 physics.ts 聚合/伤害，必要 type 增量由本子 Agent 拥有。覆盖最高配置45m/s、掉帧大 dt、正负及零相对位移、初始重叠/擦边、实际侧碰、数组逆序、同 tick 多命中、连续 tick、同 tick 护盾拾取及消费、低/高障碍真实姿态盒、跳跃/空中滑铲。
3. 保持坡→顶、前缘/侧缘/车尾、跳离/落地和移动携带。测试正常支撑不误死以及真正从车侧撞入不被宽泛豁免。新增针对性回归均先 RED 后修复。
4. 每轮完成后 `npx tsc --noEmit`、目标测试、`npm run test`，保留失败与通过日志。禁止修改既有测试放松断言。

## Task 2 — 核心最小接线（隔离 core 子 Agent）

1. 与 physics 子 Agent 锁定 `PhysicsStepStart` 和第四参数接口。先在新增单测文件的独立 core 区段编写捕获起点/重启/QA变更回归（与物理写入串行交接文件）。
2. simulation options.physics 增可选第三参数 start；step 输入后、z积分前创建起点；main 用包装函数转传 updatePhysics 第四参数，不改计时/计分/应用服务。
3. 如 resetToPodium/QA 定位需撤销旧支撑引用，只做明确重置接线。完成类型/单测验证，交独立复核；不得增加模块全局历史。

## Task 3 — 浏览器与全局验证（隔离 QA 子 Agent）

1. 新建 `tests/e2e/pao12-collision.spec.ts`，固定实体场景显式标 F；正常输入场景标 N。真实浏览器验证薄障碍、迎面列车、姿态盒、护盾单次及终局单次、支撑回归。桌面1440×900/竖屏390×844并采图、trace及console/pageerror。
2. 在本目录创建专属 Playwright config 和 runner：5183、strictPort、reuseExistingServer=false；读取 served raw source 与 checkout 字节比对；采集全程源码 hash 稳定。
3. 逐字节持久备份旧 PAO-6/10/11 所有证据和根六张截图，完整 `npm run test:e2e -- --config docs/evidence/PAO-12/playwright.config.ts`（既有20项加新用例），把被刷新输出复制本任务目录后恢复旧文件并校验hash。失败保留日志，不改断言、不重试碰运气。
4. 生产源码冻结后统一运行 `npm run build`、全部单测和完整E2E。Dispatcher亲自查看桌面与竖屏真实图像，核对无新增明显异常，记录旧坡体遮挡/模型尺寸及模拟器局限。

## Task 4 — 交接

独立只读审查接口与物理，所有阻塞发现先回归再修。`git diff --check` 与白名单/暂存审查后正常 commit/push 当前任务分支，核对远端 hash。Linear 回写结果、证据、局限、commit/分支及同步状态，设 In Review，等待主 Agent，不设 Done、不启动其他任务。

## 进度

- 已读取任务及最新派发，Linear In Progress；计划先于测试和实现落盘。
- Linear get_agent_context 工具在服务端返回 not found；任务正文、评论和磁盘规范已正常读取，以实际文件为准。
- 首轮统一 build exit0、146/146单测通过，独立复核后冻结源码；完整浏览器 verified 为23/25。历史437文件全部恢复，8生产源hash不变。两项失败保留原日志，不改旧断言。
- 浏览器回归修复方案（先于修复实现记录）：旧PAO-6跳离车顶时，下降顶接触发生在脚底中心已越过车尾而身体后沿仍重叠的位置，下一tick缺少departure而误伤。以真实trace两tick新增RED；沿用现有supportDeparture，在真实下降顶接触且处于边缘外继续相对分离时登记同owner的短暂离面状态，完全分离/回收/重置仍按现有通道清理，向内/相对再入仍伤害，不扩大几何阈值、不存跨tick位置缓存。
- 新增E2E重开后立即Escape时Simulation已重开而UI lastState尚未下一render更新；仅调整新增用例为等待真实HUD暂停按钮可见后点击并保留相同PAUSED断言。生产UI只读。修复后重新build/全单测并冻结，完整复跑保存在新phase，不覆盖首轮失败证据。
- 最终修复与独立复核完成：新增49项（物理46、core3），统一build-final exit0、test-final 153/153；相关4套独立复核93/93。surfaces.ts/旧测试均未改。
- 最终冻结浏览器 runs/verified-final：25/25通过，109.244916s，0跳过/0flaky；437历史文件逐字节恢复、78刷新输出另存，8生产源hash不变。Dispatcher已亲看桌面/竖屏、车顶/尾沿落地/旧坡体遮挡，结论与尺寸交接见README。
