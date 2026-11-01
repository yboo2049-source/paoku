# PAO-14 未知提交结果重试修订

2026-11-01（Asia/Shanghai）。基线`74a5b14aec8cf0f1bed544b43c8712be55935af4`，分支`codex/pao-14-application`。仅处理主审9f5c8a0d/e40cf976的TOGGLE未知提交结果P2，先读正式复审报告、写[计划](unknown-commit-plan.md)，再补真实RED。不扩展刷新/崩溃恢复，原商店、排队设置、旧SET_AUDIO行为保持。

## 修复

仓库保留同进程待确认候选`{id,baseToken,encoded,data}`及事务receipt；应用对命令传稳定`command:<commandId>`，结算使用独立`settle:<runId>`。setItem抛错且确认getItem也失败时，返回SAVE_FAILED，缓存仍为上次确认值，不假发布候选。

同身份重试先在共享锁内核对：

- 原候选编码完全匹配：确认原事务并记录receipt，不再执行TOGGLE/mutator，不增加revision或再次setItem。
- 读仍失败：继续失败并保留候选，不假报成功。
- 原baseToken匹配：证明未落盘，原身份可保存同一编码，不重新计算操作目标。
- 第三份token：无法证明原结果，保留候选、明确CONFLICT；不静默load后盲目重算。

load/checkFreshness也保留并确认本地候选身份。另一条命令可以先确认旧候选再执行自己的操作，不能冒领旧receipt；原命令晚到只返回原确认，不用旧draft覆盖后续提交。首次失败也保留请求fingerprint，同commandId换payload拒绝。正常锁/raw-token二次检查、普通未落盘写失败和写后异常但可确认的快捷路径均保留。没有扩展存档schema。

源改动仅`src/application/appService.ts`、`saveRepository.ts`；单测追加在PAO-14自己的application/saveMigration，新浏览器文件为pao14-unknown-commit.spec.ts。main/dom、音频引擎、物理/生成、渲染/GLB、HTML/CSS、依赖及旧41项E2E未改。

## RED 与证据

- `unknown-application-red.log`：原基线6项新增真实失败/38已有通过。后补2项身份门禁测试使用受控移除新增fingerprint检查的负例，`unknown-identity-guard-red.log`实际失败后按原字节恢复；不冒称这两项是原基线RED。
- `unknown-application-green.log`：application/saveMigration/shopTransactions三文件53/53（本批新8项），另tsc及diff检查通过。
- `unknown-browser-red.log`：一次和两次确认读失败的两项实际失败，四次同commandId尝试后错误反转false、revision2、写2次；完整attempt数据保留本机归档。
- `unknown-browser-focused.log`：同故障两项2/2通过；首次返回SAVE_FAILED且缓存false/revision0，磁盘已true/revision1；读恢复后始终true/revision1，只写1次。两次读失败场景的首次显式重试仍失败，未假发布。

新浏览器为F：在实际Vite页面导入生产AppService/SaveRepository，使用真实localStorage和默认WebLock，仅辅助SaveStorage边界注入写后异常及确认读失败。原页面仍MENU/tick0，未把辅助服务结果冒充自然游戏/音效或UI操作。每次结果、缓存、磁盘值和写次数先落JSON再断言。

首轮完整回归42/43，唯一失败为既有PAO-12用例afterEach记录到Google Fonts两个woff2的ERR_CONNECTION_CLOSED；护盾/暂停断言已通过，新增两项故障用例均通过。没有放宽网络错误断言或修改源码，历史恢复与源hash核验均通过；两个URL随后HTTP200预检保存在unknown-font-preflight.json。失败轮次完整记录留在本机prior-runs/unknown-full，旧门禁仍要求最终整轮43项通过。

最终完整门禁全部通过，见`unknown-validation-summary.json`及`runs/unknown-verified/`：build exit0；16文件244/244单测（旧236＋新8）；完整43/43 E2E（旧41＋新2），275.243秒，0 skipped/unexpected/flaky、exit0。独占5185 strictPort/no reuse，两项修订raw源与checkout精确匹配，整个src前后hash相同；709份历史原文件逐字节恢复，共731路径核验通过，旧release/revision-full目录Git无差异。早期RED/focused及字体网络失败完整输出移入忽略目录，精简摘要见`unknown-prior-runs-summary.json`。最终日志为`unknown-build.log`、`unknown-test.log`、`runs/unknown-verified/e2e.log`。

## 必要视觉检查与局限

本批没有UI/渲染修改，不新增与持久化无关的图集。执行者已实际查看最终完整回归的以下两张稳定图，主Agent只需按需抽看这两张，不重复安排多个审查者全量看图：

- `runs/unknown-verified/screenshots/F-review-desktop-audio-both-off.png`：保存锁等待期间MUSIC/SFX两个意图排队，释放后两项OFF同时可见；按钮、滑块与菜单完整，未见新增溢出。
- `runs/unknown-verified/screenshots/F-review-portrait-shop-retry.png`：另一页增加余额，本页冲突后显式重试购买，余额50、pink EQUIPPED、cyan EQUIP及返回按钮可见，无新增遮挡；其余皮肤仍在原滚动列表，不据此声称全部可见。

均为既有F对抗场景，等待toast退出、opacity=1及动画完成后截图；Windows Chromium/ANGLE D3D11，竖屏为390×844桌面模拟，非真机。精确故障的数值依据是同目录`F-unknown-toggle-{1,2}-confirmation-read-failures.json`，不能由普通菜单截图证明重试幂等。

机制仅同一仓库/应用实例进程内，receipt和候选不持久化，不承诺刷新/崩溃/异常退出后的操作身份恢复。第三方提交已替代候选且无法证明原结果时保守拒绝，未实现自动合并或猜测成功。无事务身份的旧update接口保持调用兼容，本次AppService所有持久事务均提供稳定身份。跨标签页普通新鲜度/冲突策略不变，非合作写键仍不在保证内。

全部门禁通过后正常hooks commit/push并核对远端，回写Linear、设In Review等待复审，不设Done、不启动下项。提交推送日志为本机`.pao14-local/unknown-commit-hook.log`、`unknown-push.log`，提交号由Linear回写，不改写远程历史。
