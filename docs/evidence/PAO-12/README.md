# PAO-12 送审证据

日期：2026-11-01（Asia/Shanghai）。分支 `feat/pao-12-swept-collision`，基线 `0875b276f91cfe344f24587cd0169177c0042fdd`（验收通过的 PAO-10/11）。仅执行 PAO-12，交付 In Review 等待主 Agent；不设 Done，不启动其他任务。

## 结果与范围

先写 [实施计划](implementation-plan.md)，再 RED/GREEN。新增纯相对 AABB 扫掠及 TOI/外法向/稳定实体 ID 裁决，physics 聚合接触后在拾取阶段之后作一次伤害决定。真实站立/滚动盒决定低高障碍命中；翻滚到期分段并检查精确末点。护盾一次消费、终局先提交状态再单次通知，保留旧事件桥及运行中拾取/任务行为。

Simulation 仅传入当前 tick 的起点值，main 仅作必要转传/重置；无跨 tick 运动历史或模块 Map 缓存。重开、QA定位、清世界、实体回收不使用旧位置扫掠。保留坡→顶、跳离/落地、边缘连续接触与移动携带；`surfaces.ts` 及既有全部测试未改。

写入仅为派发白名单：physics、新 contacts、必要 PlayerEntity/起点类型、最小 simulation/main 接线、指定新增单测/E2E 和本目录。渲染、相机、材质、灯光、public/美术、生成器、计分/固定时钟、任务/音频、UI布局、存档/商店和依赖均未修改；没有生图或建模。

## 最终验证

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| npm run build | exit0，含 tsc；保留既有大 chunk 提示 | build-final.log |
| npm run test | 11文件153/153通过，新增49项，旧104项保留 | test-final.log |
| 独立相关4套复核 | 最终93/93、类型与diff检查通过 | review-airborne-edge-regressions.log、review-notes.md |
| 完整 npm run test:e2e（专属config） | 既有20+新增5=25/25，109.244916s，0跳过/0意外失败/0flaky | runs/verified-final/e2e-results.json、e2e.log |
| 服务与源码 | 5183 strictPort、禁止复用，served raw source匹配checkout；8生产源前后hash相同 | browser-source-identity.json、source-stability.json |
| 历史证据保护 | PAO-6/10/11及根截图437文件逐字节恢复通过，78刷新输出另存本任务 | history-restoration.json、regression-output/ |
| 真实视觉检查 | Dispatcher亲看桌面/竖屏最终截图，未见新增HUD/弹窗溢出 | 下列截图与browser-report.md |

表中浏览器文件位于 `runs/verified-final/`。生产源码与测试采集全程冻结。新增5项异常记录均为空；完整既有用例原断言保留，不能将既有历史诊断输出混写为新增运行异常。

## 测试矩阵与失败闭环

新增49项包含46物理、3核心。覆盖45m/s及大dt薄障碍跨越、迎面列车相对高速、双向/零相对运动、初始重叠/擦边/边界进入与分离、TOI/法向稳定轴、等时ID及数组逆序、实际侧碰、站立/翻滚/跳跃/空中滑铲、帧内/零时/精确tick末姿态到期、同tick多命中/拾盾、连续tick保护与保护后单次失败、同步监听重入、拾取顺序和单次金币、传送/重开/实例替换、18/45m/s坡顶连续路径与车尾/左右沿外离/再入。细节见 [物理报告](physics-report.md) 和 [独立审查](review-notes.md)。

首轮 `runs/verified` 为23/25，保留全部失败证据，不当作最终通过：

- 旧 PAO-6 跳离车顶时脚中心已过车尾，身体尚余约0.01465m重叠，上一tick已认可的下降顶接触未延续到下一tick而误死。按真实trace先补车尾及左右沿两tick RED，再最小延续已证实的顶沿外离状态，候选按TOI/ID稳定提交，不扩大阈值。向内再入、移动原列车追上、未知初始重叠仍伤害。最终完整旧用例通过。
- 新增用例在重开同步runId变化后立即Escape，未等待UI的下一次render，既有UI以lastState决定Escape而未暂停。仅修新增夹具为等新run数组/HUD就绪后点击真实暂停按钮，保留相同PAUSED断言，未改UI或旧测试。详见 [首轮定位](browser-first-run-analysis.md)。

首轮失败与后续通过分别保存，未放松断言、跳测试或反复重试碰运气。中间类型检查失败日志 `core-types.log` 是分工实现接口尚未落盘的阶段，最终build的tsc已通过。

## 浏览器证据与视觉交接

环境：Windows、Playwright Chromium、ANGLE D3D11；桌面1440×900，竖屏390×844为桌面浏览器/CDP触摸模拟，非手机真机。**F** 为固定障碍/QA定位/浏览器内spawner夹具；**N** 为无QA写入的既有自然键盘/触摸流程。新增 isolated browser Simulation 明确为 F，不能冒充应用自然局或随机路线保证。

Dispatcher亲自查看：

- [桌面迎面薄列车终局](runs/verified-final/screenshots/F-desktop-head-on-ended.png)
- [竖屏护盾消费后运行](runs/verified-final/screenshots/F-portrait-shield-consumed.png)、[暂停](runs/verified-final/screenshots/F-portrait-shield-paused.png)
- [旧车尾路径修复后落地](runs/verified-final/regression-output/docs/evidence/PAO-6/fixture-roof-exit-land.png)
- [桌面车顶](runs/verified-final/regression-output/docs/evidence/PAO-11/runs/final/screenshots/F-desktop-roof.png)、[竖屏上坡旧遮挡](runs/verified-final/regression-output/docs/evidence/PAO-11/runs/final/screenshots/F-portrait-ramp.png)

车顶/落地人物在画面中可见，HUD和稳定弹窗未见新增溢出。黄色坡体仍会遮挡上坡角色，为既有表现局限；不据截图宣称正式模型与物理代理已对齐。本任务不自行修渲染/资产。

交主 Agent 协调的尺寸/接口：玩家逻辑脚底中心，宽×站高×深=`0.8×1.8×0.8m`，滚动高`0.9m`，姿态与垂直运动独立；障碍底面中心，width/height/depth对应X/Y/Z；D12/H3坡道的局部脚/顶为`(0,0,-6)`/`(0,3,6)`，实例基准B=(0,5,100)时世界端点`(0,5,94)`/`(0,8,106)`，相邻车顶入口须共点。模型通行面、代理、Surface需共用这些语义；资产坡脚原点只在导入边界转换一次。当前截图不验证具体骨骼模型外形尺寸。

## 局限

扫掠使用当前积分前后线段，保留离散重力/支撑；没有连续曲线、旋转碰撞或命中后滑移/剩余时间求解，致命事件携带TOI接触位置而状态保留本tick积分终点。一次tick完全越过有限支撑面时的落面仍有旧求解限制。拾取仍是既有范围检测，本次没有扫掠拾取。沿用singleowner departure，不保证同时离开多个完全重叠roof的所有边缘均无伤害；稳定选择已测，无无界缓存。旧事件桥未升级全部PAO-9事件封套。未测手机真机性能、正式模型对齐或音频品质。

## 复现

```powershell
npm run build
npm run test
$env:PAO12_PHASE='review'
node docs/evidence/PAO-12/browser-runner.mjs
```

runner调用 `npm run test:e2e -- --config docs/evidence/PAO-12/playwright.config.ts`，输出独立phase，持久备份历史后采集、复制刷新输出、按原字节恢复并核验。history-backup仅本机恢复副本，不提交。跨平台换行可使旧SHA不同，复跑需重新采集基准。

提交和远端SHA核对结果回写 Linear；正常hooks运行build/test，不跳过检查、不强推、不合并其他分支。

提交前仅规范化本任务日志/Markdown的行尾空白与末尾空行以通过git diff --check；失败内容、断言、结果与JSON记录不变，历史原件未动。Codex捆绑Git缺少bash、系统bash指向WSL，提交进程为npm提供临时sh入口直接执行同一已安装Node/npm-cli.js；hook原文与build/test命令不变，不禁用或跳过hook。
