# PAO-19 准备阶段证据索引

日期：2026-11-01（Asia/Shanghai）。范围：任务设计、接口缺口、测试矩阵；没有实现或视觉验收结论。

## Git 与权限

- cwd：D:/worker/paoku-sessions/pao-19。
- 起始分支codex/pao-19-ui，HEAD=19aa31492ddce4c1c5e74ef1e49312ad41ec2dd6，符合预期19aa314；起始git status --short为空、无暂存用户改动。
- origin=https://github.com/yboo2049-source/paoku.git；准备时git ls-remote --heads origin codex/pao-19-ui成功且无匹配，尚无该远端分支。
- 独占提交路径仅docs/ui/pao19-ui-spec.md、docs/superpowers/specs/2026-11-01-pao19-ui-design.md及本目录。共享总纲、PROGRESS、src、HTML、资产不写入；不合并、不切换基线、不启动其他任务或子Agent。

## 已读来源与在线状态

| 来源 | 读取范围 / 结果 |
|---|---|
| D:/worker/paoku/AGENTS.md | 完整；文档先行、审批、纯文档审查与正常commit/push规则 |
| D:/worker/paoku/docs/plans/2026-11-01-m2-dispatch-preparation.md | 第1–5节；准备白名单、PAO-14接续基线、PAO-7适用门禁与后续验收 |
| Linear PAO-19 | 读取正文及原生relations：Backlog，blockedBy=PAO-7、PAO-14；blocks=PAO-20、PAO-21 |
| Linear PAO-7 / PAO-14 | 正文/relations核实In Review / Done，未修改状态或发消息 |
| Linear get_agent_context | 已尝试，返回Tool get_agent_context not found；没有把缺失笔记当成已读取 |
| D:/worker/paoku-sessions/pao-7/docs/art/rebuild-style-guide.md | 只读v0.2；样式token、§4.2构图/HUD、系统字体与候选身份；该文件最近提交c66b59e190ee00ec7bc57eadf884d54c68a469a8 |
| 本树PRD / ARCHITECTURE / TEST_PLAN | 新方向及米制/只读口径，旧UI与传感器历史证据、验收入口；不沿用历史DOM存档权威 |
| 本树总重构设计 §8–9 | UI与音频、数据流和职责；明亮方向已批准 |
| src/ui/dom.ts / src/style.css | UIManager公开签名、事件绑定、音频字段意图、旧速度错标、Toast无上限、旧霓虹CSS |
| src/application/types.ts / src/types/index.ts相关类型 | AppSnapshot/CommandResult、RunSummary、四道具与只读timer来源 |
| src/main.ts相关应用桥/legacyView调用 | readApp构造、dispatchIntent/reportResult、捕获runId、终止摘要、UPDATE_AUDIO、已提交snapshot的update |
| index.html头部 | 仅为安全区最小请求核实viewport-fit缺失与lang=en；未改HTML |
| CONTRIBUTING / .husky/pre-commit | 普通分支提交；pre-commit执行npm run build && npm run test，不绕过 |
| docs/SUPERPOWERS_WORKFLOW.md / brainstorming / using-superpowers技能 | 原~/.workbuddy/skills路径缺失，已在plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills找到并读取；备用brainstorming无三路径内容，不伪称该文件为v6.3版本 |

在线Issue链接：[PAO-19](https://linear.app/paoku-v1/issue/PAO-19)、[PAO-7](https://linear.app/paoku-v1/issue/PAO-7)、[PAO-14](https://linear.app/paoku-v1/issue/PAO-14)。仅在线读取，没有Linear写入。

## 交付与审查

- [UI规格](../../ui/pao19-ui-spec.md)：四页、桌面/390×844、token、四态、48px触摸/安全区、四道具、有限Toast、保存/错误/等待、R01–R09及布局矩阵。
- [任务设计](../../superpowers/specs/2026-11-01-pao19-ui-design.md)：三方案比较推荐A、现有UIManager门面兼容、命令桥、I-01通用回执与I-02最小HTML请求、门禁及共享文档建议。
- 内容人工复核：权威与PAO-14保持一致；无直接存档/入账/模拟写入；音频仅字段意图；m/s例值与km/h换算一致；390px可用宽358=246+8+48+8+48，两列道具175×2+8=358。布局数值属于候选，未测CSS不得宣称真实布局通过。
- 本地相对链接及指定外树来源存在性、改动白名单、git diff --check结果记入validation.log。新文件先暂存再做cached diff检查，避免未跟踪文件漏检。
- 为正常pre-commit安装锁定依赖：npm ci成功（378 packages added）；不改package.json/lock或执行audit fix。构建产物与node_modules均不进入本任务提交。
- 正常hooks的build/test结果以Git提交控制台及最终交付报告为准；这只是未改源码的基线检查，不是新UI实现验证，不将尚未运行的检查预写为通过。

## 未验证与解锁条件

本轮无自然输入N、无夹具运行F、无截图/录屏、无新RED执行；没有运行E2E或真机验证。PAO-14的历史244单测/43 E2E不是本轮运行结果。后续RED与完整N/F矩阵详见UI规格§6；不得把预期RED写成实际失败。

UI细节与任务设计待审批，PAO-7适用UI风格待确认；Dispatcher随后同步共享文档与PROGRESS，明确解锁dom/views/style及专属单测/E2E。I-01/I-02另行批准和串行分派。main、types、应用服务仍不在UI写白名单内。准备文档提交与推送不代表PAO-19完成，不自动启动实施或其他任务。

提交号和远端一致性由最终交付报告给出，并以git log / git ls-remote实测为准，避免文档自引用提交哈希。
