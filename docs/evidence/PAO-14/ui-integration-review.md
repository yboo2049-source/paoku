# UI / main / audio 独立只读审查

审查者：application 职责。2026-11-01。未改被审查源码、未重复检查截图。

当前落盘适配未发现阻塞问题：

- main 接收意图时捕获 runId，兼容无 payload 的当前按钮，同时保留显式旧 ID 让应用服务拒绝。存储期间的迟到命令携带原身份，不在执行时重新绑定新局。
- 重开/退出先从完整已提交快照生成冻结 summary，再清输入/暂停驱动/标 ABANDONED；服务成功释放旧局或创建新 ID 后才清世界。保存失败保留旧世界与摘要，可由菜单/重开等原按钮显式重试。
- 撞击结算由 `simulation.step()` 后的 `observeTerminalTick()` 触发，晚于本 tick 提交；DOM `update()` 不入账。legacyView 只读投影 app 状态/高分/钱包；Simulation 仍拥有局内可变世界。
- dom.ts 不再读 localStorage、不反读 HUD 文本发钱，不写 GameContext；商店/音频控件只提交意图并展示 AppSnapshot。原布局/selector 保留。
- 生产单例 `new AudioEngine(false)` 禁用旧五键读写，`applySettings` 仅应用服务提交后的偏好。独立构造的旧适配器保留既有测试/调用兼容；音频 DSP 与调度没有因本任务重写。

`application-integration-review.log`：新增应用/迁移/商店 29 项，加既有 pao10-main 3 项，4 文件 32/32 通过。最终完整 build/unit/E2E、实际截图与历史恢复由 Dispatcher 统一验收，本审查不重复浏览器工作。

已知范围边界：旧无 payload toggle 在输入时解释为 pause/resume；连续排队 toggle 可能被服务状态验证拒绝，不会跨局生效。这个兼容边界不应被描述为所有调用者都已迁移到新类型化命令协议。
