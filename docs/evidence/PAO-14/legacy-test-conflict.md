# 既有 PAO-13 集成断言与 PAO-14 契约冲突

首轮整合 build=0，单测219/220。失败日志 test-integration.log，既有 tests/unit/trackSegments.test.ts 第358行要求 GO_MENU 同调用栈已清世界。该用例还在 PLAYING 直接 OPEN_SHOP 并要求成功；PAO-9 §6.2 和派发59842dc5要求先持久化结算，OPEN_SHOP仅允许MENU/null或匹配GAMEOVER。其Node夹具没有localStorage/WebLocks，不能完成新的持久化前置条件。

建议最小适配：只修改此同一个既有用例，保留测试数量和其生成器断言。添加内存localStorage与串行锁夹具；GO_MENU后等待应用完成，再保留MENU/生成cursor0/清数组断言；第二局PLAYING发OPEN_SHOP先断言INVALID_STATE且世界未清，然后GO_MENU等待成功，从MENU进入SHOP等待成功，再保留SHOP/清世界断言。所有其他177既有单测及28既有E2E原文不变。此修改不放宽新结算/状态契约、不跳过测试。

用户于本聊天明确回复“授权最小适配，继续完整验收”。仅对上述一个用例执行最小适配，保留178既有单测数量；不会通过生产兼容分支允许非法商店状态或存储失败假成功来满足旧断言。
