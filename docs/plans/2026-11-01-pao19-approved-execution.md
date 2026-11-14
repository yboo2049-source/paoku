# PAO-19 已批准范围执行交接

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 按用户批准的UI方案A及I-01/I-02交付响应式四页、准确命令反馈与最小HTML接线。

**Architecture:** UI只读投影AppSnapshot和提交的模拟视图；用户操作经现有应用桥，业务权威保持PAO-14。UI/HTML阶段A与main回执阶段B在同一工作树、同一实现聊天串行完成，接口固定后才接main。

**Tech Stack:** Vite、TypeScript、Babylon.js既有画布；DOM/CSS、Vitest、Playwright。

2026-11-01（Asia/Shanghai）。本文件是Dispatcher的授权、分工与执行交接；具体代码级RED/GREEN步骤由PAO-19实现方按writing-plans在其任务树细化，主Agent不写游戏实现，不自动启动聊天/Agent/服务。

## 1. 用户批准记录（本轮新增有效口径）

用户明确回复：“批准你说的那三点具体范围”。对应[主审三点](../reviews/2026-11-01-pao19-preparation-review.md)：

1. 采用943aad1的UI规格v0.1和方案A：浅实体卡片，桌面侧卡/手机底卡与边缘HUD；token/字体/按钮四态、48px目标、安全区/焦点、四页布局；m/s；四道具图标/秒数；有限Toast与保存/一般命令反馈。
2. PAO-7适用UI风格条目在本任务获准，不据此冻结角色/场景美术或真机预算，不将PAO-7整体标Done。
3. I-01结构化命令pending/result与I-02 viewport-fit=cover/中文页面语言最小接线，必须按互斥白名单串行实施。

此次批准解除上述任务级设计门禁，不需要再次询问相同批准。规格中“候选/待批”对这组已批准UI设计值转为实现目标，但不能据此宣称布局、对比度、事务反馈或真机性能已实测通过。若实际验证不满足目标，可在已批准布局的回退规则内修正；新增跨层能力、改模拟/存档/玩法或大幅改造设计仍须另行报告范围变化。

共享文档已在主规划树同步。本文件及本轮共享文档对PAO-19的效力优先于早期准备计划、旧任务设计中的“未批准实现/main与HTML只读”。原规格与审查保留历史状态，不重写成当时已获批准。

## 2. 固定目录、输入与写权

- `D:/worker/paoku-sessions/pao-19`，`codex/pao-19-ui`；准备提交 `943aad1b52ac662d4faa5cfa714e0be8c9dff9d0`，包含M1 `19aa314`。开工核对Git；如果已有后续用户改动先保留并核实，不reset/覆盖。
- 只读本树 `docs/ui/pao19-ui-spec.md`、`docs/superpowers/specs/2026-11-01-pao19-ui-design.md`及其证据。批准和共享规范以 `D:/worker/paoku` 本轮提交为固定输入，不从origin/main重建、不合并main/规划整分支、不要求迁移Godot。
- 所有阶段可写本任务专属设计/执行计划/证据；主规划总纲与PROGRESS仍由Dispatcher统一维护，实施方交同步建议。

| 阶段 | 唯一实现方 | 解锁路径 | 接口/检查点 |
|---|---|---|---|
| A UI/HTML | 用户手动触发的PAO-19聊天 | src/ui/dom.ts；src/ui/views/；src/style.css；index.html仅viewport-fit与lang；tests/unit/pao19-ui.test.ts；tests/e2e/rebuild-ui.spec.ts | 保留UIManager公开门面及旧关键id；定义并验证pending/result接收接口；暂不写main |
| B I-01最小main接线 | 同一PAO-19聊天，A检查点后串行 | src/main.ts仅命令生命周期/结果回传/去重；上述UI和专属测试必要适配 | A先build/test与真实浏览器自验，接口及快照投影稳定后记录检查点，再修改main；不能与任何其他聊天并写main |

`src/application/**`、`src/types/**`、模拟/输入/物理/生成/渲染、public资产、package/lock及默认Playwright配置不解锁。测试不删旧断言，不擅改QA传感器语义；新增依赖、共用配置或白名单外修复只报告具体需求。

同一聊天按A→B推进是一个已批准PAO-19任务，A检查点无需再次请求用户许可。当前主Agent只备好提示词；用户粘贴才启动执行。17/18/20/21均不随之启动。

## 3. 实现方的任务级计划要求

实现方先在 `docs/plans/2026-11-01-pao19-ui-implementation.md` 写可执行计划，再进入代码；仅按需读UI、CSS、main相关桥及应用类型，不扫全库。每项列确切文件、失败断言、运行命令、期望结果与最小实现步骤：

1. 冻结快照投影：UI不拥有钱包/结算/存档；速度18/45显示18.0/45.0 m/s，四道具只读计时，summary缺失不借ctx补结算。
2. 有限Toast：1可见+3等待，去重/溢出、textContent、换局/隐藏恢复、清定时器；错误固定在卡片，不被普通队列挤掉，不重复播音效。
3. 四页与共用状态：保留new UIManager(container,readApp)、update、getSelectedSkin、markNewRecord、showToast兼容；分离views，保持中文信息及旧商店/音频入口可用。
4. 响应式与I-02：48px命中框、动态视口、安全区/长文案/大字号、四态与焦点、modal拦截；只改HTML的lang与viewport声明。真实截图量测后处理底部两行道具和人物保留区冲突。
5. A接口检查点：pending发生在dispatch前，接收只读commandId/type/runId；result复用CommandResult并保留原命令归属；定义迟到/重复/换局处理与失败重试身份。单测用假回执验证，此时不得冒称main已接通。
6. B最小接线：在既有dispatchIntent中接UI生命周期，成功/失败均回传；递延终止命令不能重复pending，初始化结果无pending不伪造；syncApplicationProjection和暂停屏障保持原顺序/语义。
7. 精确反馈与重试：300ms提示等待、5秒改中性文案，不能超时判失败或自动重发。显式重试须保留原操作身份及字段意图；修改操作与重试区分。同ID未知提交重试不得重复TOGGLE；原run回执不能结束新run等待。I-01接通后同一失败不再双发旧Toast。

步骤1/2/5/6/7先写能暴露问题的RED并运行确认，再最小GREEN；不要写只镜像内部结构的测试。布局用浏览器量测/真实输入，不用静态字符串断言替代。

## 4. 验证与交付

- 正式实现前在本树检查基线。`npm run build`、`npm run test`须成功；A完成立即运行build/test和浏览器自验，代码交付及最终B完成均按AGENTS运行完整`npm run test:e2e`。实现细化分步检查，每个代码批次完成后立即类型/单测检查，最终不得只报专项用例。
- 浏览器独占5189，先核对占用/本树raw源码与前后src hash；strictPort、reuseExistingServer=false、Windows ANGLE D3D11。本机忽略的专属配置/完整回归镜像保留全部旧用例；不误连5174、不关闭别人服务、不提交临时shim或覆盖旧截图。
- UI规格R01～R09完整覆盖，N自然输入与F保存/锁/旧run/音频故障分报；保留PAO-14商店新鲜度、音频字段排队和未知提交重试回归。N完整开始→操作→暂停继续→失败→重开→返回，真实触摸与键盘都测。
- 视口1440×900、390×844为主，320×568/短横屏、200%字体、长数值/错误/四道具、安全区/reduced-motion按矩阵验证。等待opacity与有限动画结束后截图；索引附DOM量测。主Agent默认抽看桌面HUD、竖屏开始、竖屏失败结算2～3图，异常扩看。模拟inset不当真机签收。
- 任务提交前检查暂存区，只含白名单本任务改动，历史原件恢复/哈希检查，正常hooks提交推送并核对远端。已有upstream使用git push，不跳hooks/不强推。
- 实际开始时才可将PAO-19设In Progress；完整实现送In Review，由主Agent独立验收后才Done。报告A/B检查点、提交/分支、build/单测/E2E数量与exitCode、N/F范围、2～3关键图索引、源码身份/历史恢复及未验证项。不能把用户设计批准当运行时验收通过。

## 5. 用户可直接粘贴到既有PAO-19聊天

```text
继续PAO-19正式实现，使用D:/worker/paoku-sessions/pao-19、codex/pao-19-ui；准备基线943aad1（含M1 19aa314）。先核对Git与用户改动，不reset、不合并main或其他任务分支。

用户已明确批准：UI方案A及规格v0.1具体UI范围、PAO-7适用UI风格、I-01命令回执和I-02安全区/中文语言最小接线。不要重复请求同一设计批准。先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-01-pao19-approved-execution.md全文；主规划树PRD/架构/系统流程/测试/PROGRESS已同步本次授权，优先于旧准备稿“待批/main和HTML只读”。记录这些文档的实际Git提交作为输入，不合并整规划分支。

沿用本树UI规格/设计及主审，先用writing-plans写docs/plans/2026-11-01-pao19-ui-implementation.md，列确切文件、RED断言/命令/期望结果，再TDD实现。只按需读单模块，不全库扫描。

严格按授权计划A→B串行：A实现dom/views/style及I-02（index.html仅viewport-fit=cover与lang），建立并验证notifyCommandPending/notifyCommandResult等只读接收接口；main保持只读。A完成build/test/完整E2E和真实浏览器检查，记录接口检查点后，同一聊天进入B，独占src/main.ts仅做I-01最小接线、去重与旧失败Toast协调，再完整回归；不与其他聊天并写共享入口。A→B属于本次同一任务，不另启动任务/Agent，不需再问同范围批准。

白名单与禁止区以授权计划第2节为准：application/types/schema/模拟/物理/输入/渲染/资产/依赖不改。保留PAO-14事务、原run和commandId、字段音频意图、暂停屏障及未知提交重试，不因新UI反馈重复TOGGLE/结算。不用字符串反推业务结果，准确关联pending/result，旧run迟到结果不能影响新run，无超时自动重发。

按计划第4节完整build/test/test:e2e、R01～R09、N/F分报与真实触摸/键盘流程；独占5189、strictPort、reuseExistingServer=false，确认raw源码和src hash，恢复旧证据，截图等过渡结束。关键桌面/竖屏图给2～3张供主审，异常再扩大；真机未测如实写。

开始才更新Linear In Progress，完整交付送In Review，禁止自行Done。仅提交任务白名单改动，正常hooks/git push并核对远端，报告提交/分支/检查与证据，交主Agent验收。不自动执行17/18/20/21、不合并分支；白名单外问题提供最小请求，常规编译/测试错误自行闭环修复。
```
