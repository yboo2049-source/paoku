# PAO-19 准备阶段主审

2026-11-01（Asia/Shanghai）。结论：准备交付范围检查通过，未发现该范围内的阻塞问题。可进入用户设计审批；未批准实现，未验证新UI，不将PAO-19标Done。

## 核验

- 工作树 `D:/worker/paoku-sessions/pao-19`，分支 `codex/pao-19-ui`，提交 `943aad1b52ac662d4faa5cfa714e0be8c9dff9d0`。fetch后本地/远端0/0，工作树干净。
- 相对19aa314仅新增UI规格、任务设计、证据README及validation.log，共4文件261行。独立diff --check通过；src/public/index.html/package/lock无差异。
- 已读四份交付，按需核对UIManager/readApp/update、AppSnapshot/CommandResult、main.dispatchIntent/reportResult及HTML头部。Linear仍Backlog，blockedBy为PAO-7与PAO-14；本轮不改状态或发评论。
- 准备交付覆盖四页/双布局、样式与按钮状态、安全区/触摸目标、道具与单位、有限Toast、失败/等待、现有门面兼容、R01～R09与布局矩阵。候选数值与尚未执行的RED/N/F/浏览器验证分报正确。
- 独立复算390px无安全区可用宽358=246+8+48+8+48，道具双列175×2+8=358；这是设计算术，不是CSS布局验收。四道具两行与底部安全区可能压缩人物保留区，已有失败/靠边回退说明，正式实现须真实截图验证。
- 提交者报告正常hooks build和244单测通过；持久化validation.log未保存成功hook完整输出，本主审不将报告说成独立重跑。纯文档不重复跑游戏E2E/浏览器，不以旧图或旧244/43结果冒充新UI验收。

## 两项最小接线请求

| 请求 | 只读复核结论 | 后续边界 |
|---|---|---|
| I-01 命令等待/结果 | main.dispatchIntent返回void；reportResult仅失败Toast；AppSnapshot无通用pending身份。精确回执需求成立 | 拟新增UIManager.notifyCommandPending/notifyCommandResult及main最小调用；复用CommandResult，不改application服务、共享类型或存档schema。先固定UI接口，再由单一实现方串行接main |
| I-02 安全区/语言 | HTML viewport缺viewport-fit=cover，lang=en | 只改viewport声明及中文页面语言；不重做HTML结构，不将cover声明当真机安全区验收 |

I-01实现计划还须明确：同一commandId递延入队只建一次等待；原runId/type保留；迟到回执不清新局等待；失败显式重试沿用服务要求的命令身份/操作目标，不重复TOGGLE；成功/失败均收尾且错误不双发。具体字段意图与同ID重试受PAO-14已有契约约束，不从展示层重写事务。以上是后续计划检查项，不是本轮文档实现缺陷。

## 推荐提交用户审批的具体范围

采用[任务设计方案A](https://github.com/yboo2049-source/paoku/blob/943aad1b52ac662d4faa5cfa714e0be8c9dff9d0/docs/superpowers/specs/2026-11-01-pao19-ui-design.md)：浅实体卡片、桌面侧卡/竖屏底卡与边缘HUD，细节见[UI规格v0.1](https://github.com/yboo2049-source/paoku/blob/943aad1b52ac662d4faa5cfa714e0be8c9dff9d0/docs/ui/pao19-ui-spec.md)。批准范围建议一次包含：

1. 该UI规格的候选token/字体与四态、48px目标、安全区/焦点、四页布局；速度m/s；四道具图标/秒数；Toast容量与去重；保存和一般命令反馈。
2. PAO-7适用UI风格条目，限定此次UI；不据此冻结角色/场景资产或真机预算，不把PAO-7整体改Done。
3. I-01/I-02上述最小范围，后续串行实施；额外main/index.html写权仅在明确任务计划与互斥时段内生效，主Agent不直接写游戏代码。

当前尚未取得该批准。依据主仓AGENTS第8条“经用户审批（HARD-GATE）后，方可进入 writing-plans 与实现阶段”，不因准备材料已推送就解锁。批准后Dispatcher先同步PRD/架构/系统流程/测试/PROGRESS，再派任务级writing-plans和RED→GREEN；保留完整build/test/E2E与真实输入、桌面/竖屏截图门禁。默认主审抽看2～3张，有异常扩看。

PAO-19的UI准备可独立于角色源补交完成；不等待15/16才能审设计，也不随之自动启动17/18/20/21。本轮不合并分支、不启动实现、不联系其他Agent。
