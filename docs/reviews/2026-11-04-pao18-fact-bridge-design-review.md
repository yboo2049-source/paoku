# PAO-18 事实桥设计独立审查

2026-11-04，Asia/Shanghai。送审提交 `f5c1ec6b685be7278efe89189254a19b0c96ae1d`。结论：路线A与主要边界可保留；一处成功动作示例/RED预期需修订，当前不进入实现批准。

## Git与文档门禁

实际复用树 `D:/worker/paoku-sessions/pao-18-font-diagnosis`，分支 `codex/pao18-font-diagnosis`。顶层、共同Git目录、登记、HEAD与远端一致，status干净；826b10f为祖先。相对826b10f仅新增spec、候选合同和准备README三份文档，共296行，没有生产或测试实现。diff --check通过，三文档7个本地链接目标独立核实存在。

任务方正常hooks记录build/293单测通过；主Agent本轮不重复运行游戏测试，不把已有代码的hook成绩当事实桥17项RED已经执行。未启动Agent、浏览器或车尾实验，没有读取并行19活动成果。

## 需修订：成功动作示例违反现有合法性

位置：任务树 `docs/superpowers/specs/2026-11-04-pao18-fact-bridge-design.md:36` 及 `docs/render/pao18-fact-bridge-contract.md:107`（FB02）。设计明确声称同tick的JUMP→ROLL→JUMP三次成功且最后只剩jumping；实际 `src/systems/input.ts:148–155` 并不支持这一结论。

从isJumping=false、isRolling=false开始，期间不插入physics：

| 命令 | 是否成功 | isJumping / isRolling |
| --- | --- | --- |
| JUMP | 是 | true / false |
| ROLL | 是；不清isJumping | true / true |
| JUMP | 否；被!isJumping条件拒绝 | true / true |

因此三条已消费命令只能产生两条ACTION_STARTED，任务JUMP/ROLL分别计一次，第三条不能发动作音效或生成actionInstanceId。将三条全记为成功，会诱导未来测试接受无效动作或修改玩法合法性，违背本批只观测现有成功分支的契约。该结论来自当前源码逐分支核对，本轮未运行新实验。

修订应同时保留此“混合成功/拒绝”对照，并另用从false/false开始的ROLL→JUMP→ROLL作为三次成功示例：三步的状态依次为false/true、true/false、true/true，JUMP清rolling使第三次ROLL合法。按真实成功结果赋予事实身份，不按命令数量凑事件。更新spec、FB02及README检查记录，不改src/input来迎合草案。

## 可保留的设计与后续审批边界

显式producer、提交后原子发布、完整tick批与只读snapshot关联，避免render补身份；独立audio/render游标、有界GAP诊断、暂停不按墙钟淘汰、epoch与phase断点区分及旧副作用单路均已写明。冲击速度保持null，不伪造相对速度；任务计数保持成功输入点与原奖励顺序，符合核对到的main/mission流程。

方案还提出main步内音频暂存、交付重入屏障和Simulation异常fail-stop/fresh-context恢复。这些均是未来具体扩围，不能仅凭“同意事件桥方向”默认放行。文档修订送审后，需一并裁定这些范围、预算和唯一写入者，再形成实施计划与明确生产白名单；遇到必须改application的情况仍需具体扩围，不把当前main/simulation许可扩成交易重构。

本次未审实现或运行时性能，不关闭父18、不改依赖；PAO-19继续其独立安全区设计。车尾/预览KI-001/002延期，字体/17不重做。

## 给原PAO-18聊天的修订提示词

```text
接续PAO-18事实桥设计主审修订，仅改原三份设计文档，不实现。
继续D:/worker/paoku-sessions/pao-18-font-diagnosis，codex/pao18-font-diagnosis；主Agent已核验本地/远端f5c1ec6b685be7278efe89189254a19b0c96ae1d、干净。先重新核对Git，推进先检查，不reset或新建树。

读D:/worker/paoku/docs/reviews/2026-11-04-pao18-fact-bridge-design-review.md。
spec第36行和FB02误将JUMP→ROLL→JUMP当三次成功。现有ROLL不清isJumping，第三次JUMP应拒绝：从false/false开始只产生两条ACTION_STARTED，最终true/true，任务JUMP/ROLL各一次，无第三次动作音效。
保留这个有效/无效混合对照；另用ROLL→JUMP→ROLL写清三次实际成功及每步状态。统一spec、RED矩阵及README，不把消费命令数当成功数，不修改input规则。

其余推荐A可保留；main音频暂存/重入屏障、异常fail-stop/fresh-context恢复、预算及未来生产白名单仍待整体审批，不以本次文档修订擅自实施或扩围。
本轮仅允许修改原三份事实桥设计文档，src/public/tests/配置/依赖/旧证据及其他树只读，不新增实验/浏览器/Agent，不打断19；车尾和预览继续延期。
内容/引用及git diff --check通过后正常hooks提交推送，核对远端；返回修订位置与固定SHA，等待主审及用户实现批准。纯文档无需E2E，不标18 Done。
```
