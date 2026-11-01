# PAO-14 未知提交结果：应用实现与证据

2026-11-01。读取 unknown-commit-plan.md 和主审末节后，仅修改 application/appService.ts、saveRepository.ts 及本任务 application/saveMigration 新单测。没有改 schema、main/dom、音频算法或其他旧测试。

## 事务确认

仓库保存尚未确认的候选 `{id, baseToken, encoded, data}` 及同进程 receipt。应用写入使用 `command:<commandId>`；结算使用 `settle:<runId>`，与命令身份分开。普通无身份 update 调用保持可用，由仓库生成局部身份。首次写后抛错且确认读取失败时，返回 SAVE_FAILED，保留候选，不发布候选数据。

同身份重试先受共享锁读取：读回 encoded 只确认并发布该候选、登记 receipt，不重跑 mutator、不增加 revision；读回 baseToken 证明尚未落盘，原身份可重试同一编码，不重新计算 TOGGLE；持续读失败继续明确失败；第三 token 无法证明原操作结果，保留候选并返回 CONFLICT，load 也不能丢弃它后盲目重算。

另一条命令可确认此前已落盘候选后执行自己的事务，但不能拿旧 receipt 当成自己的成功。load/checkFreshness 确认旧候选时也保留原身份 receipt。原命令晚到只确认身份，不把旧候选覆盖到后续已提交数据上。应用在失败时也保留命令 fingerprint，恢复 receipt 前拒绝同 commandId 换 payload/操作，防止冒领。原普通未落盘写失败、写后异常但确认读取成功的快捷路径、商店锁/token检查、SET_AUDIO 和字段意图排队均保留。

这是同一仓库/应用实例的进程内确认机制，不是存档 schema 扩展，也不承诺刷新、崩溃或异常退出后的操作身份恢复。第三 token 分支保守拒绝，未实现自动合并或凭猜测发放成功。

## RED / GREEN

- unknown-application-red.log：生产修改前 6 个新增用例实际失败、38 个既有用例通过。覆盖精确故障、持续读失败、另一排队操作和晚到原身份、load/freshness 不丢身份、第三 token 保护及 base 未落盘不重跑 mutator。
- unknown-identity-guard-red.log：fingerprint 门禁已同批实现后补充的两项受控负例。临时撤除新增 fingerprint 检查，unknown 候选和已确认 receipt 两阶段同 ID 换操作均实际失败；随后按原字节恢复源码。这是门禁敏感性验证，不冒称原基线 RED。该次按名称选择两项，其余 skipped 是选择过滤，不是最终回归跳过。
- unknown-application-green.log：恢复最终源码后，application/saveMigration/shopTransactions 三文件 **53/53** 通过（此次新增 8 项）。确认精确故障只写一次、revision 保持 1；新命令真实执行后 revision 2，晚到原命令保持 2；原 token 重试时 mutator 只执行一次。
- unknown-application-types.log：npx tsc --noEmit exit 0；本职责 git diff --check 通过。

完整 build/unit/E2E、实际默认 Web Locks/localStorage 故障夹具、源码身份、历史恢复和必要画面由 Dispatcher 统一验证，本报告不代替这些最终门禁。
