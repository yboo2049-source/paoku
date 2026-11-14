# PAO-14 局内账本与终局摘要

范围仅为 `runSettlement.ts`、必要 `types/index.ts`、Simulation 初始化/重开/owner 兼容边界、physics 首次金币消费接线、mission 计数及奖励归属、新增 `runSettlement.test.ts`。未改碰撞求解、支撑、RNG、输入消费、积分与生成算法。

## API 与顺序

`createRunLedger()` 创建独立零账本；`initializeRunLedger(ctx)` 用于新局边界，绝不从旧 `ctx.coins` 推断历史分账。Simulation constructor/restart 自动初始化。`ctx.runLedger` 可选仅为保留旧独立系统调用签名，所有实际 Simulation 局始终存在账本。

真实局的 `ctx.coins` 是仅 getter：pickupCoins + rewardCoins，不存第三份可写总额。physics 在原 `collected=false→true` 的唯一消费处调用 `recordCoinPickup`。保留旧 collected 门闩，未引入第二消耗状态。任务只看 pickupCount，按 missionId 登记 reward 身份后发布完成事件；目标/奖励数值不变。main 的 afterStep 调用 `missionSystem.update(ctx,true)` 可在本 tick 已碰撞时完成最终任务奖励，普通 PAUSED/GAMEOVER update 默认无效。

`createRunSummary(snapshot,endReason)` 仅接受提交值，从账本生成冻结的 runId/scoreInt/pickupCount/pickupCoins/rewardCoins/earnedCoins/endReason。拒绝无账本、非法数字及非 ENDED 的 COLLISION 摘要。调用者先取完整 snapshot/summary，再清世界或 restart；钱包事务/幂等由应用服务实现。`Simulation.abandon()` 保留完整终局世界和账本，将兼容 context.state 设为 GAMEOVER，同时独立 phase 为 ABANDONED，清队列并停止后续 tick；restart 才清该标志。main 在 QUIT 摘要封存后调用，不将失败保存页面误标为碰撞 ENDED。

## 既有断言冲突及明确兼容

首次回归发现原 `tests/unit/simulation.test.ts` 的重入提交用例在 privileged `sim.change` 回调中执行 `ctx.coins += 7`，并断言其下一次提交与插值中为7。直接把 owner 也设成只读 getter 会使该既有断言失败。未修改原测试；向 Dispatcher 报告并依明确裁定增加窄 owner proxy：仅 `Simulation.change` 回调内的合法正安全整数增量被显式归入 rewardCoins，身份为 `legacy-owner:N`，pickupCount/pickupCoins 不变。零增量、减额、非法整数拒绝。真实 context、初始化对象与已提交快照仍无 coins setter，UI 不获该 owner 能力；main 正式业务不通过此兼容入口发奖励或落账。它不负责推断旧存档/旧局总额。新测额外锁定上述分账与拒绝行为。

## 验证

`red-ledger.log`：提供空实现后的行为 RED，证明新增传感器会失败，未用仅缺模块导入作为最终 RED。`red-quit-phase.log`：QUIT 生命周期 API 未实现时 1 failed/12 passed。`green-ledger.log`：账本13项加原 mission/physics/simulation 相关用例，共4文件42/42通过；`ledger-types.log` 最后一次 tsc 退出0无错误。新测覆盖30拾取+50奖励、重复消费、奖励不冒充拾取、mission身份、冻结摘要、同tick拾取/碰撞/任务完成、重开隔离、不插值账本、损坏账本拒绝、暂停/任意终局不奖励、owner旧增量兼容和QUIT的ABANDONED标志/保留最终世界/清输入/重开恢复。

较早 `ledger-regression.log` 为集成中失败日志，保留用于解释只读 getter 与尚未适配 main 的冲突，不代表最终全量结果。`ledger-types.log` 的首轮账本类型通过，整合中后续记录过 UI 文件编辑暂态；最终统一 build/test/E2E 与源码稳定性由 Dispatcher 完成后以最终日志为准。

无局内进度崩溃恢复、任意外部调用者恶意篡改 owner 能力防护或整个事件封套迁移承诺。旧未带账本的独立函数调用保留旧 API，不可用于创建可支付 RunSummary。
