# PAO-19 主审两项P2复审报告

基线codex/pao-19-ui@cf9f965，开工工作区干净；主审输入为主规划树00803f1的2026-11-01-pao19-implementation-review.md及三份精简JSON/正常和隐藏UI诊断图。采用systematic-debugging和TDD，仅修这两项，未启动任务/Agent、未合并/reset。

## 重试上下文
UI不能以永久null runId表示所有菜单访问。新增UI作用域MENU/SHOP/RUN+activeRunId，在update、意图、pending和result入口同步；离开作用域即过期UI的requests/retries/pending/error。迟到回执已无当前请求，不能重新建立旧retry。同一run内PLAYING/PAUSED/GAMEOVER属于同作用域，保留终止失败重试原ID。

不清业务幂等记录、不改未知提交依据、不把所有重试改成新ID；main、application、音频字段事务、schema、模拟/物理/输入/渲染/资产/依赖保持只读。当前菜单内原样重试与音量改值等旧断言保留。

三例F分别是真实存储已落盘但确认失败、UI成功确认丢失、UI旧失败确认迟到；随后均用真实按钮完成开始→暂停→返回菜单→音乐。检查新commandId、最终音乐开/revision3，同时保留同上下文未知提交仅写一次的原测试。精简数据见retry-regressions.json；未将故障注入说成N自然输入。

## 竖屏开始预览
保持方案A底卡，在portrait范围限制卡片高度并优先标题/开始，成绩、商店、设置保留在原生内部滚动区，48px目标不变；不改相机、不缩小人物。音频仍默认展开，避免破坏现有原生滑杆/焦点回归。

等待真实GLB Beta_Surface加载后，只读投影其世界包围盒。390×844模型底边约616.77，卡片顶边633；开始按钮完整位于卡片内。正常截图可辨认主角整体姿态。隐藏UI截图仅为F诊断，留在忽略目录，不当产品验收图。几何量测见menu-preview.json；320小屏、短横屏、200%字体、安全区及N键盘/触摸旧断言仍完整执行。

## 验证与范围
实际最终build/单测/完整E2E计数、raw源码/前后hash、历史证据恢复、白名单检查结果见verification.json。全部新镜像与批量旧图/完整日志位于本机忽略目录.pao19-p2.local及tests/e2e/.pao19-p2.local；只提交本目录少量关键证据。首轮两个旧用例因遗留Google Fonts连接关闭失败，未屏蔽请求或断言；后续完整结果和重试次数如实记录。

原全部断言与PAO-6已批准的一行保持不动；共享总纲/PROGRESS未改。本修复保持In Review，待主Agent复审，不Done、不自动合并/启动下游。实体手机/真实刘海与系统手势仍未测。

最终结果：build exit0，17个单测文件/252项通过，完整E2E 60项通过（配置允许一次重试，本轮实际重试0次），另有12项专项验证通过。10个模块raw身份与前后hash一致；其余26个只读源码、1141个历史证据/截图/元数据哈希均相同，无需恢复字节。提交仅14个本任务文件，3张关键图合计约0.7MiB。

复审入口：[加载后390菜单](mobile-menu-loaded.png)、[桌面HUD](desktop-hud.png)、[竖屏结果](mobile-result.png)、[验证摘要](verification.json)、[三种重试精简数据](retry-regressions.json)。
