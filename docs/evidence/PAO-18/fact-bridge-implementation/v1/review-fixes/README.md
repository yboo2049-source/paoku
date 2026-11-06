# PAO-18 主审两项修复回执

2026-11-05，Asia/Shanghai。依据主仓`docs/reviews/2026-11-05-pao18-fact-bridge-local-review.md`及用户明确授权接续；本次只修两个复现问题，不扩范围。起始工作树`D:/worker/paoku-sessions/pao-18-font-diagnosis`，分支`codex/pao18-font-diagnosis`，本地/远端HEAD=`c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85`，common-dir=`D:/worker/paoku/.git`。原8个生产WIP、4个新测试及计划/证据全部保留，未reset/clean/stash、新建树或Agent。

[原71/72回执与首断连trace](../README.md)及全部历史文件保留；本次新日志隔离在`.pao18.local/fact-bridge/review-fixes/`，新证据在本目录。主Agent的忽略目录复现脚本未作为生产代码使用，也未读写19活动树。

## RED → 最小修复 → GREEN

相对接续前hash，仅修改两个生产文件及两个专属新unit文件；其余本地实现保持。

| 问题 | 新增RED | 最小修复及实际GREEN |
| --- | --- | --- |
| JUMP/ROLL后换道覆盖相位锚点 | 原lifecycle文件新增6例：JUMP/ROLL分别对照同tick后换道、同tick先换道、多tick末换道；真实Simulation/updatePhysics/AnimationGroup，另验证重复包、身份、receipt及root | CharacterView的`actionInstanceId/actionTimeSec`仅由JUMP/ROLL更新；CHANGE_LANE单独保留`laneActionInstanceId/laneActionTimeSec`，不重启clip。tick3的两种垂直/姿态clip playhead均与无换道对照相等（2/60秒）；每条换道receipt恰一次，重复包无新receipt，root等于同次presentation |
| restart floorTick残留旧局tick | 原journal文件新增1例：旧局3步后同runId fresh-context重开，立即floorTick/throughTick=0；保留全局sequence，旧cursor拒绝、新局首批读取、260步后淘汰floor正确 | Simulation先currentTick=0再boundary，不重置eventSequence；旧序号1、新局首事实序号2，旧epoch cursor拒绝；后续floorTick=4/floorSequence=2、GAP丢失1条 |

首次RED为7失败/13通过，行为断言分别命中锚点/身份及旧floorTick，不是导入/语法错误。修复后3个专属unit文件27项通过；完整unit为31文件/320项通过，build、源tsc及4个新测试文件显式tsc通过。原输入合法性、物理/支撑、任务奖励及旧测试未改。

## 本版本一次完整E2E

本次只启动一轮完整旧+新增suite（72项），保持5198独占、strictPort、reuseExistingServer=false、1worker、retries0、ANGLE D3D11。旧suite镜像仅可逆输出重定向和获准5188→5198，反向逐字校验；使用`.pw.ts`防止Vitest误收，不改旧请求/断言/时钟/超时/错误收集。字体输出也隔离到本次目录。

为保留可能的断连服务现场，忽略目录包装器仅tee原Vite CLI stdout/stderr并启用`DEBUG=vite:time,vite:transform`；不拦截HTTP、不改响应、keep-alive、超时或重试。原71/72日志/trace未覆盖。若此版本再次断连，保留请求trace和service.log后交主审，不循环重跑。

本版本完整轮已结束，实际为71通过/1失败；未达到提交门禁。详细回执如下，未追加重跑。

## 实际最终回执（2026-11-06收尾）

- [完整结果](full-once-summary.json)：72项，71通过/1失败，954.958秒，skip=0、retry=0、reporter flaky=0。新增7项事实桥E2E全部通过；旧PAO-11原断连用例此次通过，不能据此宣称已找到原ECONNRESET根因。
- 唯一失败为旧`pao18-controller-camera`的五行HUD占区用例，在第三次`page.goto('/')`等待load时耗尽全用例60000ms预算；未改变请求、等待条件、断言、超时或错误收集。没有再运行这个用例或完整suite。
- [导航请求与响应摘录](navigation-timeout.json)记录三次主文档GET均返回HTTP200，但最终load等待超时；这不能证明资源等待的具体根因。[首失败trace](failure-traces/pao18-controller-camera.pw-4ef52-tual-CSS-at-390-and-desktop.zip)、`checks/full-once.txt`及`checks/service.txt`完整保存，交主审裁定，不扩修旧HUD或基础设施。
- build、源tsc、4个新测试文件显式tsc、31文件/320条完整unit通过；7条新增RED及27条专属GREEN日志分别为`checks/red-first.txt`和`checks/green.txt`。正常提交hooks未执行，因为门禁失败后没有提交动作。
- [8文件disk/HTTP逐字身份](disk-http.json)全部匹配；[保护结果](protection.json)为原1221文件0变化、此前52份证据0变化。相对本次接续前，代码仅simulation/characterView和两个专属unit文件有变化；其他未提交实现保留。
- 已实际查看本轮三张新图：[390取景](F-390-near.png)、[桌面高速](F-desktop-high-speed.png)、[坡顶/HUD](F-roof-HUD.png)，三角色在画面内，仍是旧GLB与既有警官/犬形态。保留[本轮主入口坡顶/跳滑/暂停录屏](F-ramp-jump-slide-pause.webm)、[多tick录屏](F-multitick-jump-roll-pause.webm)及高速表现录屏；主入口录屏实际抽看23/24/25/26秒，见`video-review.json`。抽帧看见离地与持续跑姿，暂停冻结另由实际组断言证明，不把静图/抽帧或legacy别名当正式动作自然性验收。
- 资源、延迟加载、投影和dispose结果见本目录`F-lifecycle.json`、`F-delayed.json`、`F-projection-cases.json`及`F-dispose.json`；暖机20轮/10reset稳定、实际释放归零断言通过。
- [服务收尾](server-cleanup.json)：5198无实际监听，TCP连接被拒绝；残留TIME_WAIT/Closed记录未当作活进程结束，没有执行Stop-Process或停止其他服务。
- 全部门禁尚未通过，保持暂存区为空，**未提交/未推送**。本地和最后核验远端HEAD仍为设计基线`c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85`，不是已包含实现/修复的SHA。全部源码、测试和证据留在原树交主审；本轮未自动合并、接19或标父18 Done。

## 持续边界

仅工程事实桥，仍用legacy角色/clip别名及必要合成动画单测；不声称正式runner/动作自然性、精确impact或完整PAO-9模型。19 UI、安全区接入、车尾/预览、字体/17主题及音频重构不在本修订范围。原父依赖不改、不标18 Done、不自动合并，完整门禁全过后才正常hooks提交推送并交独立验收。
