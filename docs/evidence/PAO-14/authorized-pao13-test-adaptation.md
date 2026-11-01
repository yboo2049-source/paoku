# PAO-13 既有装配用例的授权适配

原全量单测红灯为219/220：末尾 PAO-13 main 装配用例未提供 localStorage / Web Locks，仍断言 GO_MENU 同步清世界，且从 PLAYING 直接 OPEN_SHOP。PAO-14 统一结算需先成功持久化，商店状态契约仅允许 MENU 或已结束局进入，因此原夹具与本次明确替换的遗留行为冲突。

Dispatcher 已取得用户明确授权后将最小修改派给 QA。本次仅改 `tests/unit/trackSegments.test.ts` 最后一项装配用例，25项数量不变，既有178项总数量保留，没有删测或跳过断言：

- 加入内存 localStorage 和串行 `navigator.locks` 夹具，让真实应用仓库执行完整迁移/结算写入，而非伪造存档成功。
- GO_MENU 等待 `vi.waitFor` 观察成功提交与模拟状态，再保留原 MENU、cursor0、障碍/金币清空断言。
- 第二局 PLAYING 直接 OPEN_SHOP 明确断言 INVALID_STATE，且生成元数据和世界数组原样保留。
- 随后 GO_MENU 等完成，再从 MENU OPEN_SHOP 等成功，保留原 SHOP、cursor0、障碍/金币清空断言。

相关套验证25/25通过，见 `green-authorized-pao13-assembly.log`；全量结果见 `test-authorized-assembly.log`。其他既有测试和主逻辑均未由此适配修改。
