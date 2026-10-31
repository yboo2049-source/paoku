# PAO-12 物理实现与审查记录

日期：2026-11-01（Asia/Shanghai）。本记录为物理子 Agent 的实现自验，最终 build/E2E/截图及提交以 Dispatcher 总报告为准。

## 实现

- 新增 `src/systems/contacts.ts`：纯相对平移 AABB 求交，返回 entityId、归一化 time、障碍外法向 normal、initialOverlap。各轴的严格重叠时间区间求交，避免端点之外已穿过的障碍漏判。零相对速度按轴实际重叠判断；平行擦边、只接触且向外分离不算体积碰撞。初始重叠为 time=0，法向取最小穿透轴；同轴候选规则和同时入角法向按 X/Y/Z 稳定裁决。
- 接触排序使用精确 TOI 后按稳定实体 ID 的码点序，不使用数组顺序或 locale。physics 在本调用入口保存障碍起点，沿用原有移动列车每调用一次的积分；调用结束即丢弃局部起点，没有模块可写 Map 或跨 tick 障碍历史。
- `PhysicsStepStart` 只读 XYZ 由 Simulation 当前 tick 输入后、前进积分前提供。第四参数是明确接口；第三参数兼容 `ObstacleEntity[] | PhysicsStepStart`，保留既有直接将 updatePhysics 用作 Simulation physics callback 的调用。无起点的 legacy 入口只查询本调用内部发生的运动，不推测外部先前改写的位置，也不借 supportSample 伪造完整运动历史。
- 实际脚底位置及尺寸为 X/Z 中心±0.4m，站立高1.8m、翻滚高0.9m。移除了低栏 y>1.2 的硬编码豁免及高栏 isRolling 全免。翻滚到期采用固定高度的分段姿态盒：rollTimer/dt 之前滚动，之后站立；恰在 tick 末到期时另检最终站立盒，不把盒高线性渐变。dt=0 且计时已到期同样使用站立姿态。
- RAMP 沿用 PAO-11 支撑逻辑。车顶下降接触按 TOI 处脚底和外法向过滤；共同坡顶前缘只匹配几何端点和有效坡支撑；车尾/左右侧离面引用仍保留，但只有继续分离才豁免，后缘以列车相对 Z 位移判断。禁止以最终脚底高于车顶免掉更早的车头碰撞。`surfaces.ts` 完全未改。
- 几何接触先聚合，金币/道具拾取后再作伤害决定；道具按实体 ID 遍历，同 tick 新拾护盾可挡当前命中。一次决定最多消费一个护盾，移除两个兼容标志并给予原有1.2s保护，只发一个碎裂事件。
- Context 终局先置 GAMEOVER，再发布原 COLLISION 桥；入口和伤害结算点均检查已结束状态，以防同步拾取监听重入导致双通知。standalone 玩家用可选 collisionEnded 字段仅阻止重复伤害通知，不阻断后续重力/支撑运动。`resetPhysicsContacts` 清该字段和旧支撑引用，由核心 Agent 在 main 的 run/QA 边界接线。
- COLLISION 保留 targetType/position 并增补 obstacleId/time/normal；position 是最早伤害接触时的脚底位置。没有另外发布第二套 RUN_ENDED/伤害事件，未宣称完成 PAO-9 全部新版事件封套。

## 测试矩阵与 RED 证据

新增 `tests/unit/sweptCollision.test.ts` 共49项，其中核心起点3项、物理46项；既有104项单测不修改。首轮冻结时 `npx tsc --noEmit` exit0，全部146/146通过，见 `green-physics.log`。完整 E2E 后又修复真实 PAO-6 顶沿跳离回归，当前最终自验为11文件153/153通过且类型检查exit0，见 `green-airborne-edge-continuity.log`。最终发布验证由 Dispatcher 统一执行。

| 证据 | 行为 |
| --- | --- |
| red-physics.log | 首轮7个实际行为失败：45m/s掉帧薄障碍跨越、迎面列车相对高速、空中滚动高栏、实际低栏高度、Context/standalone重复终局、最早接触数组顺序 |
| red-reset.log | run/QA重置接口缺失 |
| red-matrix.log | dt=0且rollTimer=0时错误继续用滚动盒 |
| red-reentry-legacy.log | 左侧离面后向内再入错误豁免、legacy缺省无敌计时不结伤；同时保留尚未修的零时到期失败 |
| red-reentrant-relative.log | POWERUP_ACTIVATED同步重入双终局、移动前支撑追上玩家时错误后缘豁免 |
| red-roll-endpoint.log | rollTimer恰等dt时末点站立盒漏检 |
| green-physics-initial.log | 初始核心/物理/旧支撑3文件48项通过 |
| green-physics.log | 最终全量146项通过 |
| red-airborne-edge-continuity.log | 真实 PAO-6 两 tick 轨迹：rear/left/right 顶沿下降外离的下一 tick 错误初始重叠致死；重叠 roof 尚无稳定 departure owner |
| green-airborne-edge-continuity.log | 顶沿连续性修复后全量153项通过；另保护向内再入、原移动支撑追上、未知初始重叠仍伤害 |

兼容与边界回归覆盖：双向及零相对速度、初始重叠最小穿透法向、平行擦边、进入/离开精确边界、同时入角稳定轴、同 TOI 稳定 ID、不同 TOI 最早障碍、实际横向换道侧撞、站立/地面翻滚/跳跃/空中翻滚、帧内与恰末点姿态到期、同 tick 多障碍+拾盾、连续保护 tick、护盾到期后的单次失败、同步终局/拾取监听重入、道具顺序和金币单次拾取、外部定位/替换实例不扫旧位置、18/45m/s显式起点下坡→顶→跳离→落地、左右侧/车尾离面不自伤、向内/相对再入仍伤害。既有全部 PAO-11 支撑单测同时保留通过。

## 独立审查

核心职责子 Agent 只读复核了起点传递、接触排序、姿态分段、支撑过滤、伤害去重与重置。审查提出的同步拾取重入和恰 tick 末到期问题均先记录 RED 再修；Dispatcher 提出的向内再入问题亦先 RED，再扩展为移动支撑的相对再入。核心子 Agent 最终独立类型检查及相关4套86项通过，无剩余阻塞项。该记录不代替最终浏览器来源/源码冻结检查。

## 完整 E2E 揭示的顶沿连续性修复

首轮完整 `runs/verified` 为23/25通过，其中旧 PAO-6 `ramp-roof-jump-land` 真实失败，未放宽旧断言。其保留 trace 显示列车 `STATIC_TRAIN33` 的范围 z24..42；跳跃下降时 `(y3.136666666666672,z42.07562499999995)` 到 `(y2.9183333333333388,z42.38534722222217)`，脚底在有限面外下降穿过顶平面，身体尾缘仍重叠。该 tick 的顶法向接触已正确不结伤，但跳跃时已撤销旧支撑 ID，没有产生 departure。下一 tick 身体仅余约0.0146528m尾缘重叠，time=0、normal=(0,0,+1)被当成陌生初始重叠误杀。

修复没有扩大阈值：只把实际求出的向上顶法向、顶高度的下降接触，且脚中心在车尾/左右边界外继续相对离开者，转交给既有 `supportDeparture`。每障碍先在局部 after 副本计算，允许同一 tick 后续姿态段继续识别该接触；候选按 TOI/ID 稳定排序后才提交玩家 singleowner 字段，避免遍历顺序影响状态。最终身体已水平分离则不登记；已有 surfaces 规则在后续分离/回收时清理。

先新增真实 trace 两 tick rear 回归，并旋转同样几何为左右侧回归，三者均记录 GAMEOVER→预期PLAYING 的失败；另记录 overlapping roofs 稳定 owner 缺失。最小修复后全部通过。保护性用例明确：已证明顶沿接触后向内返仍伤害，原移动车体追上仍伤害，未经顶接触证明的未知初始尾缘重叠即使朝外运动也不自动免撞。完全重叠的多个 roof 候选稳定选最早/ID最低者；本批沿用既有 singleowner 接触状态，不保证同时跨多个完全重叠 roof 外沿时均不结伤，不引入无界列表或模块缓存。

## 范围与局限

- 扫掠段是当前积分前后位置间的线段；保留现有离散重力和支撑积分，不声称求解真实连续抛物线、旋转碰撞或碰撞后残余滑移。一次 tick 完全跨过支撑面而最终脚底不在面内的落面问题仍是现有支撑求解的限制，不通过放大免撞阈值掩盖。
- 检测到致命接触后保留原有本 tick 最终积分位置，事件携带接触位置/TOI；未重绕整段模拟或改变计分/时钟。护盾继续跑、无盾结束。
- 本任务没有扫掠拾取体积；拾取仍用既有范围规则，运行中拾币/任务语义不变。同 tick 拾盾先于伤害是明确兼容顺序，不宣称所有高速越过拾取物也一定收集。
- updatePhysics 的纯接触查询与伤害结算已分离；旧 checkObstacleCollision 仍保留无敌/godMode兼容门控，不能当成不受效果影响的纯几何 API。纯几何应使用 contacts 模块。
- 渲染/相机/模型/材质/灯光/public、生成器、任务/音频、存档/商店及既有测试均未改。截图只供回归，正式人物模型是否贴合0.8×1.8×0.8m（滚动高0.9m）代理需主 Agent 协调渲染/美术验收；本任务不替其声明对齐。
