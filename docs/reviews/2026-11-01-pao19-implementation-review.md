# PAO-19 实现主审：cf9f965

2026-11-01（Asia/Shanghai）。结论：发现两项已独立复现的P2，**保持In Review，不验收Done**。主Agent只读审查与独立验证，不改游戏实现、不合并分支、不启动其他任务。

## 提交与范围

`D:/worker/paoku-sessions/pao-19`，`codex/pao-19-ui@cf9f965`；fetch后与远端一致，核验时工作树干净。Linear为In Review。游戏差异限UI/views/CSS、HTML语言/viewport及main命令回执桥；application/types/schema/模拟/物理/输入/渲染/资产/依赖未改。A→B检查点由任务报告和证据交接，未把最终单commit当作阶段顺序的唯一证明。

旧PAO-6测试在起跳前增加reach(page,31)的一行变更有任务内追加用户授权记录、基线对照与单行补丁；原断言保留，不误报为擅改物理或删测。任务提交中完整回归副本较多，后续复审输出优先保留本机忽略目录及少量关键证据，不继续复制整批历史图。

## P2：返回菜单后旧音频重试身份复活，吞掉新的开关操作

位置：`src/ui/dom.ts:188–192`、`:362–379`。`update`在换run时清理部分requests/pending但不清理或隔离retries。菜单命令runId=null，开始/结束一局再回菜单时activeRunId再次为null；`intent`仅比较runId，就把上一次菜单留下的失败操作识别为本次按钮点击的显式重试，复用旧commandId。

主Agent在独立5190/strictPort服务、真实Chromium与未改源码下重放：

1. 初始音乐开、revision0。F故障让第一次Storage.setItem先落盘再抛异常，紧随确认getItem失败一次；真实点击音乐开关后得到SAVE_FAILED。磁盘已有关闭设置，应用快照暂保留旧值，符合原未知提交契约。
2. 不重试该音频操作，通过真实按钮开始→暂停→返回菜单。结算路径确认旧提交并完成保存，回菜单时音乐关、revision2，旧错误视觉已清。
3. 现在真实再点一次音乐，预期是新操作：开、revision3。实际使用首次音频commandId，被现有事务幂等机制识别为已完成；最终仍关、revision2，点击无效。

另用一次UI成功回执替换成SAVE_FAILED的独立F夹具重放同一流程，结果一致。两例都是明确故障夹具，后续导航/点击为真实输入；不冒称纯自然场景。完整逐步快照、两次意图ID及预期/实际值见[精简证据](../evidence/pao19-stale-menu-retry-cf9f965.json)。没有修改存档服务、猴补业务结果或改源码掩盖问题；真实存储例使用生产AppService/SaveRepository和原样result。

修复目标是区分“当前交互上下文中明确重试原操作”与“离开后返回菜单的新操作”，不能将null runId当全部菜单访问的永久身份。可采用UI交互代次/合适生命周期清理或等价方案，并防止迟到的旧回执重新插入已过期retries。不能通过关闭业务幂等、生成每次重试新ID或清掉未知提交依据解决。

要求原Agent先补RED：真实存储未知提交→开始/暂停/回菜单→新toggle必须用新ID且生效；UI回执丢失同流程；旧结果迟到不恢复过期重试。保留当前菜单内显式重试同ID且只写一次、音量改值新意图、排队字段/双toggle、终止摘要、旧run及所有PAO-14/19回归。优先限定UI重试状态及专属测试，main如确有必要只改既有回执桥，不动application/存档schema。

## P2：竖屏开始底卡遮挡主角身体，人物预览目标未达成

位置：`src/style.css`的移动布局`#menu-screen`与其`.ui-card`（约355～361行），以及开始页音频区的默认展开。390×844真实页面在模型加载后，卡片实际矩形x16/y381.40625/w358/h446.59375，覆盖到y828。角色头部在卡片上方，但躯干和腿部位于卡片后；开始页基本只留下头部，未达到已批准UI规格的“上方保留人物预览”。

主审先在本轮自然输入开始截图发现异常，按用户约定扩大查看两张：等待模型加载后的[正常开始页](../evidence/pao19-review-cf9f965/mobile-menu-loaded.png)，以及同一生产菜单场景仅临时隐藏UI的[遮挡诊断对照](../evidence/pao19-review-cf9f965/mobile-menu-hidden-ui.png)。后者清楚显示角色身体原本已正常加载；不是GLB未加载、缺角色资产或要求重做渲染。仅隐藏UI属于F诊断，不当产品验收图。[DOM矩形](../evidence/pao19-review-cf9f965/menu-preview-bounds.json)可复核位置。

由原UI Agent在获准方案A和布局回退范围内调整卡片/内容折叠/响应布局，确保正常竖屏可辨认主角整体姿态且开始操作、安全区和滚动仍可用，不用进一步缩小人物来掩盖。若现有镜头下无法仅靠UI达到目标，先给最小取景接口请求，不能擅自扩大到render/相机修改。补模型加载后的稳定菜单截图及人物可见性验证，保留320小屏/短横屏/200%字号回归；不以只检查按钮48px/无横向溢出代替人物构图验收。

## 独立验证与视觉检查

主Agent独立build exit0；默认npm run test为17文件251/251通过；完整npm run test:e2e为56/56、exit0、无跳过/失败/重试。29个源码文件raw身份核对通过；运行前后1170个已跟踪源码/证据/根截图/元数据逐字节hash相同，原任务树干净，无需恢复源码或旧证据。[精简验证结果](../evidence/pao19-review-cf9f965/verification-summary.json)保存实际E2E时长/计数与稳定性。

审查用镜像最初放在根忽略目录，被Vitest额外收集为11个Playwright错误套件；这是主审工具放置问题。移到项目排除的tests/e2e子目录后，未改配置/断言的默认npm run test重新通过251项，不将最初环境失败归责游戏实现。

默认抽看本轮重跑桌面HUD、竖屏开始、竖屏结果三图：桌面HUD单位/路线清晰、竖屏结果保存与按钮未见明显新增裁切；开始页发现上述遮挡，才扩大两张诊断图。真实N键盘/触摸完整流程、F存储/布局等分报；实体手机/系统手势/真实刘海仍未签收。旧霓虹场景/追捕者裁切属既有后续表现任务，不混作本UI回归已修复。

本机完整输出、只改证据路径的审查镜像、源码身份核对与专项复现在 `.pao19-parent.local/`，镜像已归位tests/e2e/.pao19-parent.local以免污染单测，不整批提交历史图。全绿回归未覆盖新增P2，不能据此直接验收。

## 可粘贴给原PAO-19聊天的修复交接

```text
只修PAO-19主审两项P2，不启动其他任务。继续D:/worker/paoku-sessions/pao-19、codex/pao-19-ui，送审基线cf9f965。
先读D:/worker/paoku/docs/reviews/2026-11-01-pao19-implementation-review.md及其精简证据。主Agent确认：菜单音频未知提交失败后，真实开始→暂停→返回菜单，再点音乐会复用上次null-runId菜单的commandId，实际关/revision2，预期开/revision3。UI回执丢失例也复现。保持In Review，不标Done。
先补RED再最小修复UI重试上下文生命周期，防止旧失败/迟到回执在新菜单访问中复活；当前上下文明确重试仍保留原ID，不得破坏未知提交确认/字段音频事务。第二项为390竖屏开始卡片遮住主角身体，模型加载后仍仅露头：先看主审正常/隐藏UI诊断图，在已批准UI方案A内调整CSS/内容折叠和布局并补稳定截图/可见性验证；如果确需相机接口只提最小请求，不改渲染。优先src/ui/dom.ts、src/style.css、views必要状态与tests/unit/pao19-ui.test.ts、tests/e2e/rebuild-ui.spec.ts及本任务文档/证据，application/schema/模拟/物理/渲染/资产/依赖保持只读。
保留原全部断言与PAO-6已批准单行。完整build/test/E2E、N/F分报、独占服务/raw源码与前后hash、旧证据恢复，查看稳定桌面/竖屏关键图；新增回归镜像及批量旧图留忽略目录，只提交本修复少量关键证据。正常hooks提交/push核对远端后再送主Agent复审，不自动Done/合并/启动下游。
```
