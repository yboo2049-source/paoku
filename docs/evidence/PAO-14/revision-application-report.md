# PAO-14 两项 P2：应用修订

2026-11-01。读取 revision-plan.md 与主 Agent 审查报告后，仅修改 appService.ts、saveRepository.ts、types.ts 及本任务 application/shopTransactions 单测；没有改 main/dom、其他旧测试或截图。

商店在受共享锁保护的 `checkFreshness()` 成功后，才使用缓存余额/所有权作拒绝或已拥有 BUY 幂等判断。陈旧 raw token 首次返回 CONFLICT、保留原内存并标记服务需重新 load；只有下一次显式重试才载入新记录。实际写入仍经过 `update()` 原有共享锁和 raw token 二次保护，没有静默覆盖、自动扣款重试或刷新要求。

新增 `AudioOperation` 判别联合与 `UPDATE_AUDIO` 命令。TOGGLE 仅允许三个布尔字段；SET_VOLUME 仅允许两个音量字段以及有限 [0,1] 数值。命令进入应用串行队列，在仓库锁内对当前 draft.audio 应用操作，不提交点击时的旧整份设置。原 SET_AUDIO 接口保留。成功前不发布设置；保存失败保留原设置/版本，同 commandId 可重试，成功 commandId 重放不再次切换。

## 验证

- revision-application-red.log：实现前实际运行，两文件 16 新项失败、16 既有项通过。失败包括已复现的陈旧低余额/未拥有/已拥有幂等路径，以及尚无 UPDATE_AUDIO 的操作断言。
- revision-application-green.log：实现后两文件 32/32 通过（原 16 + 新 16）。
- revision-application-types.log：`npx tsc --noEmit` exit 0。

新增测试使用两个服务共享存储与真实 Promise 串行锁；跨页结算后购买、跨页购买后装备、已拥有 BUY 均先报 CONFLICT，下一次显式重试恢复。音频测试先由独立持有者实际占用同一串行锁，再排入不同字段 toggle、同字段两次 toggle、主静音两次 toggle、音量/开关交错及同音量排队；持锁时断言已发布设置/版本不变，释放后核对所有操作结果和准确提交次数。另测保存失败重试/重复 commandId 与无效操作。完整构建、全部单测、E2E 及必要画面由 Dispatcher 在最终接线后统一验证，本报告不代替该门禁。

边界保持原策略：并发其他标签页先写入会导致操作明确 CONFLICT，用户再显式重试；不承诺所有标签页实时同步。外部绕过同源锁直接写键仍不属于合作事务保证。未修改声音算法、DSP、外观或音效生命周期。
