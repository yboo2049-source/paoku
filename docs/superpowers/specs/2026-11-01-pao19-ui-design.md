# PAO-19 UI 任务级设计（准备送审）

2026-11-01（Asia/Shanghai）｜v0.1｜Bounded：限定DOM表现与现有应用桥的接入设计。没有扩大M1应用权威；跨界缺口另派单一实现方。

## 1. Brainstorming：目标与方案比较

目标是让开始、HUD、暂停、结算在桌面与390×844竖屏中保持清晰、可触达，并如实解释保存与错误。约束已由本轮用户指令明确，故先交完整可审查方案，不把未答复当批准，不创建HTML/CSS原型。

| 方案 | 取舍 | 结论 |
|---|---|---|
| A 浅实体卡片＋桌面侧栏/竖屏底卡，局内边缘HUD | 配合PAO-7候选；保留人物与路线；需独立两套布局测试 | 推荐；明确安全区和拥挤回退 |
| B 统一居中弹窗与同比缩放HUD | 迁移较少；竖屏/放大字体容易挤压，菜单持续遮人物 | 不推荐作为最终布局 |
| C 全屏独立页面与全面新命令协议 | 可以扩展复杂设置；增加导航和main/types写权，与本次四页范围不符 | 留待有明确需求的后续任务 |

推荐A：页面展示拆分在src/ui/views/，UIManager保留兼容门面；AppSnapshot决定页面及持久数据，只读ctx决定局内表现。完整字号、色板、四态、布局、道具、队列和RED矩阵以[UI规格](../../ui/pao19-ui-spec.md)为单一细节来源。

## 2. 与现有接口兼容

核验基线为19aa314。下表是后续拟实现契约，不是已新增接口。

| 现有接口/调用 | 保留方式 | 内部分工 |
|---|---|---|
| new UIManager(container, readApp) | 保留两个参数和返回类型 | 建立DOM节点和事件绑定；不构造AppService或仓库 |
| update(ctx: DeepReadonly<GameContext>):void | 签名不变，每次捕获readApp一次 | 派生readonly UiViewModel，再交各页面render；不从render调用命令 |
| getSelectedSkin():SkinConfig | 保留，取快照selectedSkinId及原目录回退 | 不另建所有权副本 |
| markNewRecord(runId:string):void | 保留 | 只做同局徽标，不持久化、不判定结算 |
| showToast(message:string):void | 保留main.reportResult兼容 | 默认普通消息入有限队列；不通过字符串解析错误码 |
| main legacyView(simulation.snapshot.context) | 保留现有接线 | UI不要求可写GameContext，不用presentation插值值代替结算事实 |

UiViewModel候选字段：page（源app.appState）、runId、menuStats、hud（scoreInt/coins/speedLabel/powerUpViews）、result（summary/status/errorLabel）、audio只读投影。UI局部状态仅含focusReturnTarget、activeModal、有限Toast队列/定时器、按commandId索引的视觉等待（I-01后才可准确建立）。不保存第二份钱包/权益/存档，不在UI维护或推进run phase。

候选views划分：menuView、hudView、pauseView、resultView、toastQueue与共用按钮/错误条；精确文件名由审批后的writing-plans确定。商店保留现有skin catalog与命令入口，只适配共用视觉、焦点和音频设置，不在PAO-19重做交易或扩大PAO-24范围。保留已有关键id（start-btn、hud-pause-btn、resume-btn、restart-btn等）与可访问角色，新增语义标签不删除行为断言。

## 3. 意图流与边界

意图流：用户输入 → UI的EventBus意图 → main.dispatchIntent捕获身份 → application.dispatch/事务 → AppSnapshot → readApp/update展示。UI既不调用finish，也不产生RunSummary，不直接改ctx/state、localStorage、钱包或音频已提交设置。不要在UI update或Toast任务事件监听中入账。

| UI动作 | 现有事件 | main命令/负载 |
|---|---|---|
| 开始 | START_GAME | START_RUN |
| 暂停/继续 | TOGGLE_PAUSE | main依最新应用状态解释PAUSE_RUN/RESUME_RUN；保留旧toggle兼容 |
| 重开/返回/商店 | RESTART / GO_MENU / OPEN_SHOP | RESTART_RUN / GO_MENU / OPEN_SHOP；终止摘要与冻结时机仍归main |
| 购买/装备 | BUY_SKIN / EQUIP_SKIN | {skinId}；权益与价格由服务校验 |
| 音乐/音效开关、音量 | UPDATE_AUDIO | {kind:'TOGGLE',field} 或 {kind:'SET_VOLUME',field,value}；不发整份旧audio快照 |
| 总静音 | TOGGLE_AUDIO | main转UPDATE_AUDIO的masterMuted字段意图 |

现有main支持payload.commandId/runId，并在入队前捕获原身份。后续UI有延迟提交时必须捕获点击时runId，不能在定时器执行时读新局再提交；普通按钮可沿用main即时捕获。禁止用UI防双击替代服务幂等，也不改暂停输入隔离、summary封存、提交后的音频applySettings或原任务提示音事务。

## 4. 最小跨界请求（本轮只提案）

I-01：main中的dispatchIntent当前返回void，reportResult失败仅调用showToast字符串，AppSnapshot无通用pendingCommandId。要完成准确的等待/错误反馈，请Dispatcher另派main唯一实现方，在既有command构造后把结构化生命周期送给UI：可选新增UIManager.notifyCommandPending({commandId,type,runId})与notifyCommandResult(result:CommandResult)，pending位置必须在调用dispatch前；成功和失败都回传并与原command关联（保留原runId/type，可由pending表补全）。不要重写dispatch、结算或音频事务。新增UI方法可兼容旧main，但功能完整验收依赖接线；新main接线时避免同一错误再经旧showToast重复显示。UI只接收只读回执，不获得application实例。不新增AppSnapshot持久字段，不要求改application/types.ts或src/types/index.ts。

I-01属于额外main写权申请，批准UI方案不自动授予；应单独串行接线并用现有PAO-14集成回归证明旧run拒绝、冻结摘要与音频字段事务未变。若不批准，按规格降级为settlementStatus等待＋旧showToast错误，必须标记通用命令精确等待/错误条缺口，不冒称PAO-19完整验收。

I-02：index.html只读检查发现viewport未含viewport-fit=cover且lang=en。申请独立最小变更viewport加入cover、页面语言与拟采用中文一致；不重做HTML UI、不借机整理旧占位结构。未批准前使用浏览器安全视口和CSS env回退，不能宣称刘海全屏与读屏语言已验证。此请求同样不自动打开index.html白名单。

其他main/types/输入层若实测发现新缺口，只报告触发条件、所需最小信号、专属测试，由Dispatcher串行分派；本轮不预设新的命令协议、模拟字段、音频生命周期或持久化schema。

## 5. 失败处理、回退与验证

UI页面只跟appState转换。异步等待保持原界面，显示中性“正在处理”，迟到结果按原commandId/runId归属；失败显示同页错误并由原按钮显式重试。summary缺失展示等待，不借HUD凑出最终成绩。保存失败保留现场/摘要由应用实现保障，UI不可清世界后再装作成功。道具秒数由提交快照读取，暂停不递减；Toast有限、文本安全、清理旧局及定时器，音效不跟出队重复播放。

准备阶段仅内容/链接/范围审查与git diff --check；正常pre-commit额外build/test照常，不把通过它们说成新UI已验证。本轮不跑E2E、不截图、不建立实现传感器。

后续按UI规格R01–R09写RED：先投影/单位/道具和Toast的纯逻辑断言，再桥接等待与结算失败，再真实输入N和故障F，保留全部历史回归。测试路径只拟开放tests/unit/pao19-ui.test.ts与tests/e2e/rebuild-ui.spec.ts。正式代码交付必须build/test/完整test:e2e及主审截图；5189需先确认空闲，strictPort、reuseExistingServer=false、Windows ANGLE D3D11，用本机忽略的专属配置/完整回归镜像，不误连5174旧服务，不删原用例。记录源码身份/hash、N/F范围、截图索引和未验证真机项。

UI回退按模块恢复旧展示，保留相同应用桥与schema；不回退PAO-14、不恢复文本反读金币或整份SET_AUDIO覆盖。未批准PAO-7具体token时保持本稿为候选，不以实现默认值冒充风格冻结。

## 6. 审批与后续门禁

待审项：方案A及UI规格v0.1的色板/字号/四态、桌面与竖屏布局、安全区/48px目标、道具图标与秒数、m/s、Toast与错误/等待策略；单独处理I-01/I-02请求。PAO-7适用UI风格项仍需明确批准，PAO-14 Done与总体明亮方向不重新要求审批。

用户本轮只授权准备。项目AGENTS第8条要求“经用户审批（HARD-GATE）后，方可进入 writing-plans 与实现阶段”；本轮只提交可评审任务设计。实际找到的brainstorming技能为[本地SKILL.md](C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/brainstorming/SKILL.md)，其“Propose 2-3 different approaches with trade-offs”已体现在§1；本项目审批门禁来自AGENTS，而非将此备用技能声称为已安装v6.3的三路径实现。用户指定输出路径与准备边界优先于技能默认docs/plans路径及后续实现建议。

批准后Dispatcher先把PRD/架构/系统流程/测试总纲/PROGRESS同步，再明确解锁src/ui/dom.ts、src/ui/views/、src/style.css和上述专属测试；main/types/index.html仍只读，除非另行派发最小接线。随后另开writing-plans与RED→GREEN实现。此次commit/push仅证明准备文档可追溯，不将PAO-19移Done、不启动PAO-20/21或任何其他任务、不自动合并。
