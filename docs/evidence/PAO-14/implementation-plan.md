# PAO-14 实施计划

2026-11-01。目录 `D:/worker/paoku-sessions/pao-14`，分支 `codex/pao-14-application`，基线 `a4486a21435a7315d091769d8ac6bc8accc8f2f0`，开工工作树干净。仅执行 PAO-14；依据 Linear 59842dc5/40be348c、PAO-9 §4–6/C-06/C-09 及 PAO-13 主 Agent 接续审查。总体架构已批准，本计划细化既定方案。原 Superpowers 技能路径不存在，检索本机也未找到对应 SKILL.md；沿用项目已记载的文档、RED/GREEN、隔离职责与验证流程，不宣称读取了缺失技能。

## 权威与数据

应用服务独占 AppState、activeRun、不可变 RunSummary、钱包/皮肤/音频偏好及结算状态；Simulation 独占世界、tick、输入与局内账本。UI 只发意图和读取深只读视图。旧无 payload 事件仅 main 边界填当前 runId，显式旧 runId 必须拒绝。AppSnapshot 提供状态、活动局、存档字段、summary/settlementStatus/errorCode。

局内账本包含 pickupCount、pickupCoins、rewardCoins、rewardedMissionIds；earnedCoins 派生，ctx.coins 仅兼容显示。首次金币消费后更新账本，任务仅看 pickupCount，奖励每 missionId 每局一次。不得从旧 ctx.coins 反推分账。RunSummary 包含 runId、scoreInt、分项、earnedCoins、endReason，冻结后不再变化。

## 状态与命令

| 命令 | 前置 | 成功结果 |
| --- | --- | --- |
| START_RUN | MENU，无局 | 创建唯一 runId，PLAYING |
| PAUSE_RUN / RESUME_RUN | 匹配局 PLAYING / PAUSED | PAUSED / PLAYING，清输入与墙钟 |
| FINISH | 匹配局，完整已提交终局快照 | COLLISION/ENDED 或 QUIT/ABANDONED；统一结算 |
| RESTART_RUN | 匹配局 PAUSED/GAMEOVER | 先封存、成功结算，再清世界并新 runId |
| GO_MENU | 匹配局或 SHOP/null | 有局先封存并结算，再释放局和清世界 |
| OPEN_SHOP | MENU/null 或匹配 GAMEOVER | 确认结算后释放局，进入 SHOP |
| BUY_SKIN / EQUIP_SKIN | SHOP | 校验 ID、权利、余额；重复 BUY 不重复扣款 |
| SET_AUDIO | 任意 | 校验五项偏好，成功持久化后应用 |

结果显式区分成功、幂等成功、状态非法、局身份过期、未知商品、余额不足、未拥有、存储失败、未来版本和并发冲突。相同命令身份不能重放交易；失败保存允许同局重试。结束只在固定步完整快照提交后观察，不能由 DOM 每帧 update 入账。终局封存发生在清世界/重置任务/新建 runId 之前。失败时保留 summary 和可重试局，不更新已提交余额/高分/权利/记录。

## 存档与失败策略

单键版本化记录含 schemaVersion、revision、walletCoins、highScore、ownedSkinIds、selectedSkinId、audio、settledRunIds。整数仅接受非负安全整数，音量有限且在 [0,1]。旧九键逐字段迁移，保留 cyan/pink/gold/green/purple 所有合法权利与旧键；新记录成功写入即迁移完成标识，不另写易中断标志。刷新优先新记录，不能重新导入旧余额。损坏新记录采取明确受保护回退，不静默覆盖未来 schema。

事务生成新完整对象，写成功再发布内存；检查 revision/raw token，冲突拒绝。浏览器写入需同源串行锁/明确独占策略，不能将单次 setItem 宣称完整并发事务；仓库注入锁/同步边界以可测试，具体接口随实现记录。保留全部 settledRunIds，不裁剪导致旧 run 重结；容量满即失败，保留重试。写成功后响应中断可从记录判重恢复。localStorage 读取/写入异常显式失败，禁止内存假成功。异常关闭的未结算局进度恢复不在范围内。

## 隔离实施与 RED

1. 应用/存档角色：仅 src/application/** 与 application/saveMigration/shopTransactions 新单测；先写 RED，再实现事务、迁移、状态和商店。先发布最小 API 给适配角色。
2. 账本角色：仅 runSettlement.ts、必要 types、simulation 生命周期/账本、physics 首次金币接线、mission 分账及 runSettlement.test.ts。先 RED：30+50、重复消费/奖励、同 tick 终局、冻结摘要、重开隔离。禁止碰撞、RNG、积分与生成算法改动。
3. UI 适配角色：仅 main.ts、dom.ts、audio.ts；依应用 API 接线，禁止共享入口并写。保持 HTML/CSS/selector/皮肤表现与音频 DSP 原样；移除 DOM 存档与业务。
4. Dispatcher：新增 PAO-14 E2E、本目录计划/证据与浏览器执行；必要只读审查，不重复分派截图检查。

新增失败用例还覆盖：重复结束/退出/重开、旧 run 迟到、保存失败再试、损坏/旧/未来 schema、迁移中断、写后重试、并发冲突、重复购买/未拥有装备、DOM 文本篡改、暂停动作隔离/重开清输入。

## 白名单与门禁

严格遵从 59842dc5 白名单。既有测试、历史证据、共享主文档和 PROGRESS.md 只读（本次更具体白名单优先）；本目录承担本任务设计/进度记录。无生图/建模/GLB/渲染/布局外观/碰撞求解/关卡生成改动。所有跨角色接口串行协调。

保留178既有单测和28既有 E2E。最终 npm run build、全部 npm run test、完整 npm run test:e2e（任务 config）通过，独占 5185 strictPort/no reuse，核对 raw source 与 src 前后 hash；历史证据含 PAO-13 逐字节备份、镜像放本机忽略目录、恢复核验。桌面/竖屏真实截图等待稳定弹窗并由执行者实际查看，记录 N/F、场景、操作、可见问题、路径，推荐主 Agent 抽看2–3张。全部通过后正常 hooks commit/push 并核对远端，Linear 回写证据/限制、设 In Review，不设 Done，不启动其他任务。

## 执行中经授权的门禁适配

首轮单测219/220：PAO-13装配用例要求同步清场及运行中直接进商店，与本任务新契约冲突。用户在本聊天明确授权“最小适配，继续完整验收”；仅扩展 tests/unit/trackSegments.test.ts 最后一个装配用例，补真实内存存储/串行锁、异步完成等待及运行中商店拒绝断言，原178测试数量与生成器断言保留。见 legacy-test-conflict.md、authorized-pao13-test-adaptation.md 及 Linear 回写。没有改其他既有测试。

额外RED闭环：真实保存锁等待时暂停输入未即时隔离；同步COLLISION监听重入退出时封存上一tick；异步迁移后相同revision使商店购买按钮保留初始禁用状态。均先保留失败日志，修复限定main生命周期边界/DOM视图缓存，没有扩展新玩法或改视觉模板。
