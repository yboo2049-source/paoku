# PAO-18 未提交事实桥独立预审

2026-11-05，Asia/Shanghai。结论：**保留本地实现，暂不验收/提交。两处已独立复现的边界需先修复；完整71/72的网络失败保留，未证明为桥逻辑根因。**

## Git、范围及原门禁

复用 `D:/worker/paoku-sessions/pao-18-font-diagnosis`，分支 `codex/pao18-font-diagnosis`，本地及指定远端HEAD仍为 `c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85`。该SHA仅含设计，不包含本轮实现。顶层/common-dir/登记一致，暂存区空；8个批准生产文件有本地修改，4个新测试及计划/证据未跟踪。主Agent未暂存、reset/clean/stash、删除或代提交这些成果。

读差异确认input/physics主要是显式观测接缝，没有改碰撞/支撑/动作合法性；main及三个render消费者接入新模式。旧UI、19、新runner及字体不在本批实现。具体运行能力仍需修复后的完整门禁及独立主审，不能只据静态范围给通过。

任务方build/313单测/新测试显式tsc及7新增E2E通过；完整suite实际71通过/1失败、共72，958.385秒、0 skip/retry/flaky。读取其结构化结果，唯一失败为旧PAO-11 beforeEach的 `request.get('/src/main.ts?raw')` 报 `read ECONNRESET`（用例783ms即失败），尚未进入自然玩法。它是本地源码请求断连，不是此前Google字体外链失败。具体关闭连接原因未知；不以新增7绿或首轮旧suite绿替代本轮完整门禁，不过滤错误或加retry。

## 独立只读复现

主Agent在本树忽略目录 `.pao18.local/main-fact-review/` 创建一次本地SSR/NullEngine QA脚本，调用实际Simulation、updatePhysics、CharacterView源码。未修改生产/测试或启动真实游戏浏览器；Vite为middleware模式且关闭HMR/watch，finally关闭实例。脚本和完整数值留 `probe.mjs` / `probe-result.json`，不是未来任务应复用的生产代码。

### 1. 换道覆盖垂直动作时间锚点（必须修复）

`src/render/characterView.ts` 对每条ACTION_STARTED都覆盖actionInstanceId/actionTimeSec，但仅非CHANGE_LANE置newAction。若一个render跨多个tick，前面JUMP置newAction=true，后面CHANGE_LANE将actionTimeSec改为换道发生时间；随后新clip按该时间起播，导致同一跳跃相位依赖是否在批次末换道。

实际Simulation对照：stepSec=1/60，tick1成功JUMP，推进至tick3，两个render之间不逐tick绘制；对照组tick3另加成功RIGHT。两组当前timeSec均0.05，phase均ASCEND，使用同一真实Babylon动画组与CharacterView：

| 输入差异 | 成功事实时间 | 上升clip playhead |
| --- | --- | --- |
| 只有JUMP | JUMP=0.016666666666666666 | 0.03333333333333334 |
| JUMP后另换道 | JUMP同上，CHANGE_LANE=0.05 | **0** |

换道不应覆盖正在进行的JUMP/ROLL垂直/姿态动作锚点。修复应保留所有事实receipt及换道自身身份，但将影响clip重启/相位的动作锚点与非重启换道分开；不能删换道事实或修改模拟速度/合法性来修动画。补RED覆盖多tick同批JUMP→换道、ROLL→换道、同tick相应顺序、重复包；验证动作身份和游标稳定，换道receipt仍恰一次，root保持presentation。

### 2. restart后的floorTick沿用旧局（必须修复）

`Simulation.restart()`先执行boundary（把floorTick设为当前旧tick），随后才currentTick=0。实际推进3步再用fresh context重开：新snapshot tick=0、epoch=2、throughTick=0、journal为空，但motionDiagnostics.floorTick=3。

这是任务方已列待办，本轮已独立重现。需先补RED证明旧局运行后重开立即floorTick=0，与新局水位一致；同时保留eventSequence不复用、旧局cursor拒绝、新局首批可读，以及后续正常批淘汰floor随实际新批更新的断言。修复只更正新局边界初始化次序/值，不重置跨局事件序号或放松游标校验。

## 视觉与当前限制

抽看任务方本轮390近追逐者、桌面高速、坡顶HUD三张真实截图。角色在画面内，坡顶图仍为primitive fallback，其余legacy角色；警官/犬部分重叠沿用旧形态。没有将F图当正式runner/动作品质验收，也未因此重开17或调整取景。本轮主Agent未重复完整18测试；已有完整失败不作为已通过结果。

## 修复后一次完整验证，避免网络重跑循环

两处修复均在已批准simulation/characterView及专属新测试白名单内，无需重新批准同一设计。由原任务执行方先RED→最小修复→GREEN；主Agent不直接写游戏实现。保留当前所有未提交源码/测试/证据和网络首失败。

真实源码修复后执行tsc、新测试显式tsc、完整unit/build，随后**新版本一次完整旧+新增E2E**（retries0），配真实事实/receipt和新图录屏。它是代码变化后的必要回归，不是原版本失败用例反复重跑换绿。若仍有ECONNRESET或其他继承失败，保存版本、请求/响应/服务日志及首trace后交主审，不改旧请求、断言、时钟、超时或错误过滤，不继续循环，不扩到车尾/预览。完整门禁未过仍不提交/推送生产批次。

## 给原PAO-18聊天的提示词

```text
接续未提交的事实桥实现，保留原树全部改动，不新建树、不reset/clean/stash，不代入其他任务。
目录D:/worker/paoku-sessions/pao-18-font-diagnosis，分支codex/pao18-font-diagnosis；HEAD/远端仍c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85，暂存区空，8个生产修改及新测试/证据保留。先核对实际Git，不把基线SHA说成已含修复。

先读D:/worker/paoku/docs/reviews/2026-11-05-pao18-fact-bridge-local-review.md。
只处理两处主审已独立复现问题：
1. 同批JUMP后CHANGE_LANE覆盖actionTimeSec，tick3上升clip应约0.0333秒却归零。把垂直/姿态动作锚点与非重启换道身份分开，receipt/root/所有事实保留。先补JUMP/ROLL→换道及重复包行为RED。
2. restart先boundary后tick归零，floorTick留下旧tick。先补重开立即水位一致、事件序号不复用、旧cursor拒绝及新局后续淘汰RED，再最小修正。

无需重批已有A方案；仍只写原批准路径和专属新测试/本批证据，不改模拟合法性/碰撞/支撑/旧测试/配置，不读19活动树，不恢复车尾/预览。
保留原71/72 ECONNRESET首现场。代码修复后完整build/unit/类型检查，并对新版本执行一次完整E2E和真实图/录屏；若仍断连，保存证据交主审，不改请求/断言/超时或循环重跑到绿。
全门禁通过才正常hooks提交推送核SHA；未通过仍保留本地现场。交固定SHA和结果待独立验收，不自动合并/接19或标18 Done。
```
