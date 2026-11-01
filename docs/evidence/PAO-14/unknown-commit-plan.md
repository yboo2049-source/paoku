# PAO-14 TOGGLE 未知提交结果修订计划

2026-11-01。基线74a5b14，codex/pao-14-application，工作区干净。只处理主审9f5c8a0d/e40cf976及正式复审报告末节的P2，不改原商店、字段排队、旧SET_AUDIO契约，不扩展刷新/异常退出恢复。

故障不是普通写失败：setItem已写入候选revision1后抛错，紧接着确认getItem也失败；此时磁盘true但内存false。必须返回未确认失败并保留同进程内的候选编码、原token、事务身份或等价依据。相同commandId再试时先受锁读取核实：完全匹配原候选才确认原事务、发布已确认数据并返回原成功，不重新执行TOGGLE或增加revision。

实现优先在repository维护待确认候选和同进程事务确认记录，应用update传递稳定事务身份。确认不能误归给另一条排队命令；load/checkFreshness不能丢掉待确认依据。读仍失败时继续明确失败、不假发布；若读回原token证明未落盘，可以安全重试原候选；若读回第三份记录无法证明原结果，则显式冲突保护，不能盲目重算TOGGLE。保留原update锁/raw-token二次检查、写后异常但确认成功的快捷路径与原正常写失败重试。任何同进程确认账本不宣称跨刷新持久幂等。

职责/白名单：应用角色仅src/application/saveRepository.ts、appService.ts及必要types.ts、PAO-14自己的saveMigration/application/shopTransactions单测；Dispatcher负责新增tests/e2e/pao14-unknown-commit.spec.ts、任务证据与完整验收。无需改main/dom、音频引擎、渲染/GLB、物理/关卡、HTML/CSS或依赖。完成后由另一角色只读审查，不重复看图。

先RED：写后抛错＋确认读取失败；同commandId恢复后只写/切换一次、revision仍1；确认读持续失败时不发布；确认前另一排队命令不能被当成旧事务；确认成功后晚到原命令不能覆盖后续合法设置；读回原token未落盘与第三方token冲突。保留原不同字段/双toggle、失败重试、旧SET_AUDIO、商店冲突和暂停隔离用例。

浏览器通过真实AppService/main事件桥、Storage故障夹具复现一次/多次确认读失败（F，不冒称自然流程）。最终build、全部236旧单测加新增、完整旧41项E2E加新增通过；独占5185 strictPort/no reuse，核验raw源及src前后hash。历史证据逐字节恢复、既有release/revision-full不覆盖；新phase使用unknown前缀，完整镜像/早期批次仅本机忽略目录。只查必要稳定桌面/竖屏图。正常hooks commit/push，核对远端、回写Linear、设In Review等待复审，不设Done、不接续其他任务。
