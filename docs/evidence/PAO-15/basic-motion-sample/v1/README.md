# PAO-15 四动作技术样本 v1：实施与验证报告

2026-11-03（Asia/Shanghai）。执行起点`codex/pao-15-character-assets@8c4b09fc5351778fe8db19858d52924ac70463b9`，包含已审绑定64c4f31；首次cwd/顶层/分支正确且干净。[当前批准计划](D:/worker/paoku/docs/plans/2026-11-03-pao15-pao18-approved-execution.md)§2/4覆盖候选稿“仅设计”的阶段限制；按[本树实施计划](../../../../plans/2026-11-03-pao15-basic-motion-sample-execution.md)执行，未重新申请同一授权。

## 1. 本阶段结论

**自动工具流程/结构与独立预览通过，待主Agent独立验收；资产品质需局部修整。** 四个隔离clip可加载、采样、循环/hold、暂停、切换、归位与释放重载，不是只挂骨节点或整模摇摆。旧23骨/rest/skin/权重和源几何保持，不执行旧绑定生成器。

Run仍有外展手臂和足底悬浮；Jump是原地收腿/缓冲演示，选定恢复帧有穿地；Slide进入/退出和脚底接触有瑕疵。已保留真实图/数据，列[人工TODO](manual-todo.md)，本轮不刷权/改拓扑/重烘焙/精修。四样本不是正式13动作，不接游戏，不标15 Done、不放行18；来源使用条件和真机/生产预算不因此通过。

## 2. 产物与可用clip

| 产物 | 路径 / SHA-256 |
| --- | --- |
| 新派生工程 | [runner-basic-motion-derived.blend](../../../../../assets-source/characters/runner/basic-motion-sample/v1/runner-basic-motion-derived.blend)；`b7e18628f85fa26a8d9621c25c13e2fcdd53d4f012195540386164316d535193` |
| 新隔离GLB | [runner-basic-motion-sample.glb](runner-basic-motion-sample.glb)；`da2d051918cd3c37c8a1551532b47dcbada842f1198ae39dbcb680d94b0f62dc` |
| 文件契约 | [motion-manifest.json](motion-manifest.json)：实际骨名/版本/来源hash/四clip/阶段/根/手性/marker/质量；仅新工具文件接口，不改公共schema |
| 工具与命令 | [本地工具说明](../../../../../tools/pao15-basic-motion-sample/README.md)，旧rig-spike工具只读复用解析/数学原语 |
| 校验与品质 | [checks.json](checks.json)、[structure.json](structure.json)、[manual-todo.md](manual-todo.md)、[quality-samples.json](quality-samples.json) |
| 完整文件hash | [SHA256SUMS.txt](SHA256SUMS.txt)，生成时文件字节；文本换行转换后需先还原LF口径，二进制直接比对 |

| clip（均为技术可用） | DCC fps / N / 设计秒 | 实际Babylon秒（float32来源） | 模式 / 限制 |
| --- | --- | --- | --- |
| tech_idle_v1 | 30 / 60 / 2.0 | 2.0 | 循环，小幅局部呼吸；不代表自然Idle签收 |
| tech_run_v1 | 30 / 24 / 0.8 | 0.8000000119 | 循环，对侧骨运动；无世界前进/正式配速 |
| tech_jump_v1 | 30 / 36 / 1.2 | 1.2000000477 | [0,6)/[6,24)/[24,36)预备/空中姿势/缓冲，hold_last；不产生落地事实 |
| tech_slide_v1 | 30 / 36 / 1.2 | 1.2000000477 | 进入/维持/退出，hold_last；不结束模拟roll或授予无敌 |

全部0基半开播放，另有t=N/30边界键；loader轨道60fps按秒换算。旧rig_diagnostic没有混入四clip集合。root XYZ平移/旋转保持绑定值、scale1，asset父层无重复位移；局部pelvis不是世界跳跃。move_delta=0、攻击/美术无敌窗口N/A。marker为本地姿态hint，未核实足底接触前不直接播放脚步声。

## 3. 来源、工具与不重绑证明

- 旧工程SHA `a75de312d230d1f7924ec7616b47428515dba4b58f1f2219c1dbb8c7e17875bd`；旧诊断GLB SHA `cb84cfb9a308c54245ac49627383aa6643c8d40efc9c2a6929334dc60c7348f5`。两者前后完全一致。原作者DCC不存在，当前是明确标源的再派生版本，不索取不存在的原始源，不重生成角色。
- [toolchain.json](toolchain.json)记录既有便携Blender4.5.3 LTS/build67807e1800cc与实际exe hash；官方包校验沿旧记录，本次没有新安装、全局PATH改动或云上传/付费调用。
- [dcc-report.json](dcc-report.json)保存源/新源/导出hash、四action配置、30个共同采样及23骨原始/变形矩阵、每primitive空间分布顶点和实际资源。DCC rest/几何/权重指纹前后相同；Node另将真实GLB的骨父级、IBM、源顶点与权重逐项对照旧文件，不只信manifest。
- 工程已在新Blender进程重新打开并导出到忽略目录；[reopen-export.txt](reopen-export.txt)与[reopened-structure.json](reopened-structure.json)复验同样四clip、结构和姿态。没有保存旧blend或旧GLB。

坐标保持已绑定输入：DCC Z-up/-Y前，GLB m/Y-up/+Z前、脚底基准0、参考高1.8m，未再归一化/Apply Transform。pelvis竖直意图先映射为目标DCC向量，再经其rest基逆变换转换成PoseBone.location，避免直接把local Z当高度。独立Babylon采用右手原生glTF；游戏手性/注册/状态驱动接线尚未做。

## 4. 实际数值与生命周期结果

| 检查 | 本次结果 |
| --- | --- |
| skin / joints / primitive / 三角面 | 1 / 23 / 34 / 26,268；≤4归一化权重、有效IBM、源rest/权重保持 |
| 真实局部变形 | 四clip各有非root软顶点变化及不同骨变形矩阵；root始终固定。Idle最大位移约0.011875m、Run0.583029m、Jump0.283682m、Slide0.772741m（选定时刻） |
| DCC↔CPU | 30共同采样，最大匹配顶点误差约7.9422e-5m，最大骨变形矩阵误差约2.6613e-6 |
| DCC↔Babylon | 30共同采样，最大匹配顶点误差约7.9412e-5m，最大骨变形矩阵误差约2.6517e-6；阈值均保持1e-4 |
| 循环边界 | Idle/Run实际sampler端点和有符号局部TRS速度检查通过；最大角/向量速度误差读structure逐通道，约1.4e-5量级。实际播放分别至少10循环，最终次数见checks |
| 实际暂停/恢复 | 实际AnimationGroup帧与marker计数冻结；恢复后正常推进，不补跑墙钟；seek不补发历史marker |
| 非循环/归位 | Jump/Slide真实到达末时刻并hold；显式bind归位最大顶点残差约4.895e-7m |
| 暖机稳定 | 20轮切换/重播、10轮释放重载，逐轮场景计数一致；加载1骨架/4组/34蒙皮网格，释放0/0/0 |

逐姿数值对照是**全部23骨及每个34 primitive的16个分布顶点**，有sourceVertex→exportVertex和rest位置匹配，以处理导出接缝拆点；不是只比AABB/最大位移，也不冒称全时间连续几何证明。DCC和glTF骨局部轴基不同，逐骨使用共同变形空间pose×inverse-rest / jointWorld×IBM比较，原始骨矩阵仍保存。源空间/权重覆盖检查为全部导出顶点。

场景资源快照的mesh/geometry/material/texture/renderObserver完整数值见babylon-report/checks。独立预览环境与引擎暖机资源保留；释放快照只证明样本骨架/组/蒙皮网格移除、10轮不增长，不宣称整scene所有资源归零、任意Promise已结算或浏览器堆无泄漏。immutable manifest/DCC诊断数据保留供重新加载，不作为GPU实例。

## 5. 新截图、短录屏与品质

已实际打开本次最终新图：[Run接触候选相](01-run.png)、[Jump收腿相](02-jump.png)、[Slide侧面维持相](03-slide-side.png)。人物/材质与诊断面板可读，取景无主角裁切；新图保留悬浮与非自然姿态，没有隐藏坏部件。阶段标签明确为演示，不冒充真实支撑/碰撞。

[四clip短录屏](four-clips.webm)按Idle→Run→Jump→Slide播放实际组，包含周期与阶段；不是新runner在游戏中自然输入。足底/串权、包带、正式13动作、预算/来源限制分别见人工TODO。静图与矩阵一致性不能证明动作自然。

## 6. 本树完整检查与保护

| 命令/检查 | 实际结果 |
| --- | --- |
| 先RED | [unit-red](unit-red.txt)8失败；[marker-red](marker-red.txt)3失败/8通过；[finite-red](finite-red.txt)1失败/11通过；[e2e-red](e2e-red.txt)缺预览未就绪 |
| 专属单测GREEN | 12通过，[unit-green.txt](unit-green.txt)；坏源/rest/骨架/IBM/权重、缺clip/短时长、根/父层、NaN、反向速度/q/-q和marker生命周期 |
| 工具语法/类型 | 三mjs node --check与显式工具tsc通过；[typecheck.txt](typecheck.txt)为空表示无诊断，exit0；Blender脚本真实运行/重开导出通过 |
| npm run build | exit0，[build.txt](build.txt)，保留既有大chunk提示 |
| npm run test | 18文件269/269，exit0，[unit-full.txt](unit-full.txt) |
| 独立浏览器 | 2/2，exit0，[e2e-probe.txt](e2e-probe.txt)，含实际四clip对照/生命周期和短序列 |
| npm run test:e2e -- --config .pao15-local/basic-full.config.ts | **46/46**（旧44+新2），约4.2分钟，0 skip/unexpected/flaky、retries=0，exit0；[e2e-full.txt](e2e-full.txt)、[e2e-summary.json](e2e-summary.json) |
| 服务 | 5185 strictPort/reuseExistingServer=false/ANGLE D3D11；[service-identity.json](service-identity.json)四个raw源与磁盘一致，新GLB HTTP/磁盘hash一致 |
| 原件 | [protected-before](protected-before.json)/[protected-after](protected-after.json)：1052旧跟踪文件字节和1个gitlink指针前后相同，旧blend/GLB hash相同，无旧证据需恢复 |

完整镜像位于本机忽略目录`.pao15-local/basic-motion-regression/`，仅改旧证据输出路径、全部断言保留，.pw.ts不误收进Vitest；[镜像记录](regression-mirror.json)保存每份原/镜像hash和调用数。批量旧截图与完整JSON仅在新忽略目录，没有改/重交旧历史图。N部分为既有生产键盘/移动触摸回归，F包括既有注入与本批独立clip/故障夹具；新runner没有游戏集成，不称自然跑跳滑验收。

首失败与修复见[first-failures.md](first-failures.md)，尤其保留[first-import-failure](first-import-failure.txt)和[first-lifecycle-failure](first-lifecycle-failure.txt)。浮点时长按已批准1e-5s门禁，归位仍按1e-4m；不删旧断言、改时钟或放松阈值换绿。正常提交hooks仍运行build/test，不跳过。

## 7. 交主Agent的边界

可独立主审本固定提交的四技术clip与工程链路；不能用活动目录产物直接注册生产资产。manifest已标待独立主审、品质需局部修整、footContactVerified=false、productionApproval=false。来源商业条件、正式13动作/空中循环/换道/受击/失败/滑板、游戏接线/真实支撑反馈、LOD/贴图分档与真机预算仍未验证。

本批结束后等待主Agent按固定SHA独立验收，不改Linear、不标15 Done、不放行18、不自动接入或继续生产。共享总纲/PROGRESS仅供主Agent另行同步，任务树未越界写入。
