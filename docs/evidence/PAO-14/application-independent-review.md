# PAO-14 应用逻辑独立审查

账本角色只读审查 `src/application/*.ts`、新增 application/saveMigration/shopTransactions 单测及 main 生命周期桥；不查看截图、不改应用/适配角色文件。

资金路径未发现阻塞缺陷：服务先复制并冻结输入 summary/command，串行处理交易；repo 通过共享 Web Lock 和 raw-token 检查拒绝 stale owner，完整 draft 写成功后才发布内存。写成功却抛 ack 异常时读回完全相同编码确认提交；真实写失败不会扣款、给皮肤或丢 summary 重试能力。冲突后服务下一次重试重新 load，保留封存 summary，按新钱包及 settledRunIds 决定入账。记录不裁剪，因此不会通过压缩使旧 run 重结算。

旧九键逐字段迁移，合法五色权利保留；新版本单记录成功写入即迁移完成，旧键原样保留；损坏/未来记录拒绝写入而不重新导入旧余额。失败策略明确，不假称本地存储可用或支持异常退出局内恢复。锁策略仅涵盖遵循本协议的同源标签页，非合作代码直接写键属于已披露边界。

应用命令检验局身份和允许状态，封存后不接受改变 summary 的重试；重复 BUY/finish 和 commandId 成功结果重放不二次扣款/入账。状态和存档快照的嵌套数组/对象冻结。新增测试覆盖主要路径，但本审查不把有限测试称作任意浏览器事务证明。

审查发现两项接线事项并已反馈 Dispatcher/适配角色：

1. QUIT 如果借 GAMEOVER 页面状态推导 phase，会被误标 ENDED。按 Dispatcher 裁定新增 `Simulation.abandon()`，先RED后实现，保留完整世界及账本、phase=ABANDONED；main 已改调用。对应13项账本及旧相关共42/42通过、tsc通过。
2. 存储事务等待共享锁时，PAUSE_RUN 会因 pendingTransactions 排队；在锁释放前 main 立即 projection 仍可能视为 PLAYING。最小场景为持有保存锁→SET_AUDIO→暂停→跳跃→释放锁。建议在匹配run的暂停意图边界立即隔离输入/调度，再依应用结果恢复/提交；已反馈，最终解决与验证由 Dispatcher/适配角色补记，本文不是该边界已经通过的声明。

未进行 UI 外观、音频听感、GLB/模型、碰撞或生成算法审查；不重复查看视觉证据。

Dispatcher最终补记：第2项已由main暂停意图屏障修复，真实浏览器RED→GREEN及最终完整37项E2E通过；另同步COLLISION终止命令延迟到完整tick提交后处理的浏览器用例通过。详见README、red-boundaries-browser.log、runs/release/e2e-results.json。本文原审查发现保留以便追溯，不代表仍有未解决阻塞。
