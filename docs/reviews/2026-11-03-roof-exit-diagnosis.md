# 车尾支撑/连续碰撞诊断（待主 Agent 审查）

2026-11-03，Asia/Shanghai。本轮只诊断；没有修游戏、改旧断言、制作角色、启动其他 Agent/聊天或合并。PAO-15 保持未 Done，不放行 PAO-18。

## 结论与置信度

**高置信度：有限车顶支撑与连续碰撞间存在跨 tick 的接触连续性缺口。** 已证明的 downward top contact 可以在本步免伤，却不记录 departure；下一步把同一接触遗留的体积重叠判为致死。这与原失败的位置、速度、终点和 Y+1/time0 特征吻合。截图/按键的墙钟时序会选择不同的有效输入 tick，是触发边界的因素，不能用改变夹具等待来替代物理修复。

原浏览器失败本轮 **未再次出现**：输出路径镜像 3/3 通过，额外被动观测 1/1 通过。无渲染固定步扫描 31 个 JUMP tick，tick97 失败、其余30成功；失败率1/31仅描述这个枚举集合，不估计线上概率。继承速度重建1/1复现原碰撞数值。原现场没有完整输入身份，因此 tick97 是重建的局部 tick，不能冒称原浏览器记录的绝对 tick。

## 固定身份、方法及输入

实际 cwd/top-level：`D:/worker/paoku-sessions/pao-15-roof-diagnosis`；分支 `codex/pao15-roof-diagnosis`；初始 HEAD 与固定起点均为 `614179d245d2a87a2a2aa3d61fde2a8de68eb7c1`，status（含未跟踪）干净，common-dir `D:/worker/paoku/.git`，未 reset。所有命令显式 workdir 使用本树。

遵循 systematic-debugging 的现场→假设→对照→证据→建议，止于诊断。技能实际位置：`C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/systematic-debugging/SKILL.md`（声明的短路径不存在，已搜索找到）。

按主仓[诊断计划](D:/worker/paoku/docs/plans/2026-11-03-regression-diagnosis-prompts.md)第2/3/4节及固定输入清单，只读了 roof 四条原现场；全部 SHA256 匹配，见 [input-hashes.json](../evidence/QA/roof-exit-diagnosis/v1/input-hashes.json)。原 full.json：45 expected/1 unexpected、0 skipped/flaky；error-context 预期 PLAYING，实际 GAMEOVER。其工具生成的修复指令没有作为授权。原失败 fixture 原字节内容另存为 [inherited-fixture.json](../evidence/QA/roof-exit-diagnosis/v1/inherited-fixture.json)，不覆盖源文件。

先读主仓 AGENTS、SYSTEM_WORKFLOW_SPEC、TEST_PLAN_AND_SENSORS 的当前规则；按需只读本树单文件：PAO-6 fixture/reach/snap、physics、surfaces。为确认 sweep/输入身份/积分顺序，增读 contacts、input、Simulation、InputQueue、types/index 和 main 的组合及 sensor 段。为核对既有期望增读 sweptCollision/surfaces 单测相关段和架构 M1 段；没有扫描整个系统、读取字体活动任务或修改共享总纲。

## 实验与实际结果

预登记与唯一有界补充见 [experiment-plan.md](../evidence/QA/roof-exit-diagnosis/v1/experiment-plan.md)。`.pao15-local/roof-diagnosis/` 先经 git check-ignore 确认忽略；未改 ignore。5195 执行前无监听；Playwright 各次自行 strictPort 启停、不复用、workers1/retries0、ANGLE D3D11、1440×900。未用时钟 mock、改碰撞体、开无敌或篡改断言。临时脚本、镜像和图仅在本树忽略目录。

| 项目 | 命令/条件 | 结果 |
| --- | --- | --- |
| 安装 | `npm ci`，本树锁文件 | exit0，锁文件/依赖声明未改 |
| 基线编译 | `npm run build` | exit0，含 tsc |
| 基线单测 | `npm run test` | exit0，18文件269项 |
| F 原用例镜像1/2/3 | `npx playwright test --config .pao15-local/roof-diagnosis/runN/config.ts --grep ramp-roof-jump-land` | 各exit0，各1 passed；完整 suite 未运行 |
| F 被动观测4 | 同上 run4 | exit0，1 passed；真实 KEYBOARD JUMP tick105/sequence1 |
| F 固定步 | `node .pao15-local/roof-diagnosis/fixed.mjs` | exit0；31枚举中30成功/1 ENDED；另无跳跃成功、正面合法撞击 ENDED |
| F 数值及观测重放 | `node .pao15-local/roof-diagnosis/replay.mjs` | exit0；继承重建 ENDED，观测重放成功 |

固定步程序 exit0 表示采集完成，不表示被测轨迹全成功。最初4次启动使用 `--grep '^ramp-roof-jump-land$'`，因完整测试名包含文件前缀而零收集，均exit1/No tests found；没有执行游戏，不计复现样本，日志保留。随后只修筛选表达式，执行预登记的3+1个有效样本；没有增加样本追绿。

镜像1~3逆转换核对只有证据目录不同，见 [mirror-check.json](../evidence/QA/roof-exit-diagnosis/v1/mirror-check.json)。run4另外在浏览器内存包裹既有 `Simulation.prototype.step`：调用原方法一次、前后只读 snapshot，并记录 keydown；未改源文件或游戏状态。它有观测开销，单独分类，不能当无扰动镜像。所有样本都是 **F 注入地形 + 真实键盘** 或 F 模块重放；没有 N 随机路线试跑，也没有将 F 成功当自然可达证明。

结果/状态和精确命令见 [browser-summary.json](../evidence/QA/roof-exit-diagnosis/v1/browser-summary.json)、browser-run1~4-result.json/.txt。前三次 roof-contact 均z27.015208/y3；之后键盘JUMP最终均落地，不能从相同 roof-contact 推断相同 JUMP tick，因为 snap 在状态采集后还等待真实 screenshot。

run4 keydown 在已提交tick104，接受身份 `run-bc916dc9-eb82-4899-839d-4915cbeed275 / tick105 / sequence1 / KEYBOARD / JUMP`。tick105前z29.477222/y3，说明reach27→snap→按键期间前进了约2.46m。传感器没有 wrongRun/late/duplicate/paused/invalid；scheduler 在该点已有2 droppedSteps/0.033333s，未修改补步策略。首个两障碍/z0的 pre-step 是tick7、speed18.0291667，故实际输入为夹具局部98。使用该context及局部输入重放，到z62的202个tick中 x/y/z/vy/contact/supportSurfaceId 与浏览器逐项严格相同（0 mismatch），见 [observed-ticks.json](../evidence/QA/roof-exit-diagnosis/v1/observed-ticks.json) 和 [replays.json](../evidence/QA/roof-exit-diagnosis/v1/replays.json)。重放未接 mission/render/afterStep，不声称整个应用快照全等。

## 逐 tick 根因链

固定步直接调用原导出 Simulation/updatePhysics，stepSec=1/60，seed1，配置 `pao10-fixed-v1 / legacy-18-45-v1`；关闭的生成器与原注入夹具相同，不生成随机地形。player脚底初始(0,0,0)，base speed18、每步加0.25/60，gravity−38、JUMP13.5、depth0.8；无护盾/无敌/道具。RAMP18范围z12~24、y0~3；STATIC_TRAIN33范围z24~42、top3、width2.4。完整枚举终点/接触见 [fixed-summary.json](../evidence/QA/roof-exit-diagnosis/v1/fixed-summary.json)，每个tick前后 y/z/vy/contact/support/departure/phase、几何 sweep/time/normal/initialOverlap 见 [fixed-ticks.csv](../evidence/QA/roof-exit-diagnosis/v1/fixed-ticks.csv)。sweep为从真实前后状态调用原 sweepAABB 的只读重算；伤害事实另取实际 COLLISION 事件，不把几何查询等同于伤害。

继承重建只把起始速度设为原 ramp-approach 的18.020833333333332，JUMP局部97；其余同扫描。以下是[replays.json](../evidence/QA/roof-exit-diagnosis/v1/replays.json)中 inherited-inferred，AIRBORNE、support/departure皆null：

| 局部tick | 脚底z | 脚底y | vy | sweep/实际事实 |
| --- | --- | --- | --- | --- |
| 136 | 41.4941666667 | 3.3444444444 | −11.8333333333 | 无接触 |
| 137 | 41.8040277778 | 3.1366666667 | −12.4666666667 | 无接触 |
| 138 | 42.1139583333 | 2.9183333333 | −13.1 | top sweep t0.6259541985、normalY+1；本步无伤害，但无departure |
| 139 | 42.4239583333 | 2.6894444444 | −13.7333333333 | initialOverlap/time0/Y+1；实际COLLISION，ENDED |

tick138 sweep交点为 **z41.9980301103/y3**，仍比车尾42内侧约0.00197m；该步终点脚底已在车尾外，但身体尾部z41.713958仍重叠车厢。tick139实际事件位置采用步起点 **z42.1139583333/y2.9183333333**，终点 **z42.4239583333/y2.6894444444**，均与原现场匹配。

因果定位：

1. `surfaces.ts:62~124`只在最终脚底点采样支撑。tick138终点z>42，roof sample=null；跳跃中不满足validOld屋顶离开分支，因此不建立departure，也不在交点落地。
2. `physics.ts:317~325`明确把 downward top contact 作为支撑免伤；但只有交点本身已在车尾外（`at.z>42`）才记REAR。此处交点41.99803在内侧，所以返回免伤却不存连续性记录。`physics.ts:221~238`没有可提交departure。
3. 下一tick sweep从已经穿过顶面的体积重叠开始，`contacts.ts`正确报告initialOverlap/time0/Y+1。`isSupportSweep`此时at.y<3且before/after均无departure，故接触升级为伤害。问题在支撑免伤事实的跨步连续性，不是 sweep 几何漏检或 Y+1 本身错误。

成功对照：base speed18、JUMP96在tick137落回顶面，随后resolveSupport建立离顶记录；JUMP98在tick139穿top时交点已经在尾外，isSupportSweep记录REAR，下一步离开成功。失败JUMP97恰落两条路径的缺口。无跳跃也成功落地。合法对照 `legal-front` 对z9/depth3列车，在z7.1/y0、time0.5994475、normalZ−1命中并ENDED；没有把所有撞击都解释成bug。

## 规范依据、未排除项与建议

依据主仓当前 SYSTEM_WORKFLOW_SPEC 的 M1条目1~5：有效输入身份、固定步、支撑/碰撞后提交，表现不得反写；TEST_PLAN_AND_SENSORS 的2026-11-03段要求时序与固定步对照并保留失败。固定版本既有 `tests/unit/sweptCollision.test.ts:133` 的 “keeps real descending REAR top-edge departure continuous across the next tick”、离顶无害、未知initialOverlap致死、向内重入致死等已编码M1行为；其已有成功数据从z42.075625开始（交点已经在尾外），没有覆盖本次交点41.99803。由此，已接受top contact之后仅因积分端点错位而下一tick致死，与既有连续离顶期望不一致；不建议放宽旧 PLAYING 断言。当前力学设计是否要在本步交点真实落地或仅保留接触事实，仍需主Agent决定。

未排除：原失败没有runId/tick/sequence及support/vy完整快照，不能唯一恢复原绝对输入身份；截图执行时间为何各机/各轮不同尚未量化，也未隔离GPU/字体/其他负载的贡献。有限扫描只覆盖85~115、18m/s起步、静态直线后缘，未穷尽侧缘、移动列车、其他速度、斜向和重叠屋顶。浏览器原例本轮0/3失败，故“物理机制可确定复现”和“原墙钟运行再次复现”分开陈述。未加载四clip，不归因角色资产。无需为观察到的缺口猜测相机/字体根因。

最小候选修复范围（**只建议，未实施**）：`src/systems/physics.ts` 的isSupportSweep/有效top contact向后续departure提交；必要时才改 `src/systems/surfaces.ts` 的同一步有限面穿越解析。保留 owner/side/top 既有数据或显式短寿命的已证明top-contact记录；在已证明向下顶面接触、终点越过边界且身体仍与同owner重叠时，保持连续性，分离/回收/重入时失效。不能仅凭“向外移动”豁免未知初始重叠，不能仅看最终高度免除更早正面命中。

另批先在 `tests/unit/sweptCollision.test.ts` 新增本数值两步RED（tick138免伤且连续记录→139免伤→完全分离清理）；扫描96/97/98与当前旧断言同跑，扩展移动owner追上/向内重入/未知初始重叠/侧缘/owner选择与分离清理。必要时 `tests/unit/surfaces.test.ts` 加交点内侧而终点外侧的连续支撑用例。PAO-6保留原用例；可另批增加受控有效输入tick的回放传感器，避免只用截图后按键作唯一边界验证。跨树前置是固定目标源码/契约审查、批准生产写权及RED→GREEN，然后 build/unit/完整E2E与真实截图独立验收，不直接移植本树临时脚本。

## 证据与交付检查

实际查看 run4 的roof-contact、roof-jump、roof-exit-land三张新图：角色在中央偏下且全身可见，HUD无明显溢出；jump画面中央既有发光场景线遮住部分角色，本轮不作角色/渲染品质验收，未见影响诊断读数的页面异常。图片仅在 `.pao15-local/roof-diagnosis/run4/evidence/`，不跟踪提交。新图hash和本机路径见 verification.json。

初始受保护跟踪普通文件逐字节SHA存 protection-before.json，gitlink不遍历；交付前重新核对并记录 verification.json。四份原现场也重新hash，未改写。跟踪交付仅本报告和v1纯文本；无src/public/旧测试/资产/依赖/共享文档修改。内容、JSON/CSV、引用存在性、暂存白名单、git diff --check均检查；正常 pre-commit执行build/unit，未跳hook。未重新运行完整46项，不把定向4个绿或固定步采集exit0作为完整门禁通过。提交及推送后的固定SHA由聊天交付，保持待主Agent审查。

文本证据使用LF；命令日志副本仅去除行尾空白/多余末尾空行，原始本机日志保留。SHA256SUMS.txt校验提交文本的规范LF字节（不对旧输入哈希做归一化）。初次暂存检查发现工具日志尾随空白，已仅整理文本副本后重新检查。

首次正常commit被环境阻止：hook中的npm shell脚本经`/usr/bin/env bash`误取Windows WSL bash，报`C:/Program Files/nodejs/npm: No such file or directory`。本机便携Git仅有sh/dash、没有bash；未修改hook或依赖，在已忽略临时目录提供仅用sh直接`exec node`原npm-cli.js的启动入口，并只在commit命令PATH前置该目录。相同hook仍正常执行原npm run build和npm run test；不是跳过检查。原失败日志保留在本机commit.log，文本摘要随本报告。

第二次正常commit中build通过，但Vitest意外收集了临时Playwright镜像`roof.spec.ts`，出现4个“Playwright test.beforeEach不应在此调用”的收集错误；原18文件269项仍通过。已将这4个临时镜像改名为不匹配默认Vitest规则的`roof.pw.ts`，未改旧测试、Vitest配置或断言，再运行相同hook。此处是本轮临时工具收集范围错误，不能归为继承游戏失败；完整失败日志保留commit-normal.log。
