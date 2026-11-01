# PAO-15 runner 本地自动绑定试样报告

2026-11-01（Asia/Shanghai）。起点`codex/pao-15-character-assets@8b26bdf2737cc86ea2c67476e08b22d417793f3a`，含M1 `19aa314`；启动时工作区干净。仅执行用户批准的本地自动探针，不制作正式13动作、不接游戏、不合并UI/main，不改Linear状态或放行PAO-18。

## 1. 结论分开签收

**自动流程/结构：通过。** 现有静态runner可在本地脚本化生成真实骨架和软蒙皮，保存可编辑派生工程、导出带单诊断clip的GLB，且Babylon实际播放/切姿/归位/释放/重导入成功。派生工程在新Blender进程重新打开和导出后再次通过结构/变形检查。不是只增加骨节点，也不是整模颠簸。

**资产质量：需局部修整，人工待办。** 几何自动权重存在肩部向帽兜/躯干泄漏、髋膝向对侧裤腿串权；组合姿态未做降髋/脚底接触与动作精修。不要求本轮人工刷权重、修拓扑或等云输出才能交结果，也不把延期当质量通过。当前没有证明必须换掉整个模型的证据。详细部件/帧/数值/后续处理见[人工TODO](../../../art/pao15-rigging-manual-todo.md)。

作者已确认没有原始DCC/骨架工程；本次.blend为**从GLB派生重建工程**，不再索取不存在的原始源。来源生成器/使用条件并未因此得到商业许可确认。试样仅供技术审查，不能据此发布正式角色。

## 2. 交付文件

| 文件 | 内容 |
| --- | --- |
| [派生工程说明](../../../../assets-source/characters/runner/rig-spike/README.md)、[runner-derived.blend](../../../../assets-source/characters/runner/rig-spike/runner-derived.blend) | 可编辑23骨架、原34网格/材质、归一化权重、打包贴图与单clip；已重新打开验证 |
| [runner-rig-spike.glb](runner-rig-spike.glb) | 单skin、23joints、有效IBM/JOINTS/WEIGHTS、一个rig_diagnostic动画；不放public正式目录 |
| [本地工具](../../../../tools/pao15-rig-spike/README.md) | build.py、validate.mjs、analyze.mjs、独立Babylon页；不改游戏入口 |
| [toolchain.json](toolchain.json) | 官方便携Blender URL、版本、SHA校验及本地隔离部署记录 |
| [dcc-report.json](dcc-report.json) | 原始/派生身份、归一化矩阵/部件、骨架父级/端点、算法、权重、姿势/逐部件位移与导出选项 |
| [structure.json](structure.json)、[重开重导出校验](reopened-structure.json) | 原导出及重导出GLB解析、逐姿CPU蒙皮、IBM/root与DCC差异 |
| [babylon-report.json](babylon-report.json)、[DCC/引擎数值对照](dcc-babylon-parity.json) | 真实导入数量、全关节试姿、实际播放推进、归位、释放、重载及零pageerror |
| [姿势索引](pose-index.json)、[诊断录屏](diagnostic.webm) | DCC帧/秒/引擎帧、局部旋转轴角度；约15秒隔离诊断录屏，含完整5秒单clip |
| [哈希清单](SHA256SUMS.txt) | 试样源/派生/工具/测试/文档与证据的文件哈希；自身不递归包含 |
| [保护前清单](protected-before.json)、[保护后核验](protected-after.json) | 963个原src/public/旧测试/旧证据/配置等路径hash未变，原runner未变 |

三张关键技术截图：

- [01 rest正面](01-rest-front.png)：脚底、造型、轴与整体取景；非正式美术验收。
- [02 组合姿势](02-combined-front.png)：脚底未锁、组合腿部交叠/重心未精修，真实保留。
- [03 膝120°侧面](03-knee-side.png)：屈膝软蒙皮、膝部压折和鞋踝姿态。

均为独立Babylon实际截图，最终完整回归视口1440×900；没有生图或拿概念图替代。主审可从三图和姿势索引定位问题，异常再扩看。

## 3. 输入、工具与坐标

只读源：`D:/worker/paoku-sessions/glb-review@7a2fb2963deae061d15deae4019910a15f0dfbcf/public/models/character_runner.glb`。源SHA-256=`0f475ed22a2abfbbb9b4cb3069f5c9b131110847b23bd68fbcdff4b3baa797d9`，前后相同；仅使用清单runner条目与对应runner预览，没有全库源码/图集巡查或其他资产导入。

有限探测未找到本地Blender后，按批准范围从`download.blender.org/release/Blender4.5/`部署4.5.3 LTS便携包到`.pao15-local/blender/`；官方SHA-256=`6b657c8bdd3a7b65b07b9e1ae17eb4be7dd4aa23121da7f3d3354fc2551330a7`与本地一致，build hash=`67807e1800cc`。未系统安装、未改全局PATH，工具zip/完整回归镜像/旧批量截图仅在本地忽略目录；Git本机info/exclude仅追加该目录。未上传Tripo/Mixamo、未付费调用。

源完整节点经Blender glTF导入后为Z-up，源高实测0.9790511131；按`1.8/height=1.8385148394`归一化探针参考高度1.8m。与清单四舍五入0.9791相符，不能沿用accessor局部高0.4205推缩放。先烘完整节点世界矩阵，再按记录的normalizationDcc变换一次到mesh data，绑定前完成；未在IBM之后再Apply Transform。

DCC空间为Z-up/-Y前，导出由glTF导出器一次转回Y-up/+Z前；脚底最低Y=0，root为脚底基准，缩放1，静态根无位移/旋转动画。正面与侧图确认脸/脚尖对+Z；独立Babylon采用右手原生glTF空间，未接游戏手性适配，不宣称游戏接线已验证。实际rest bounds及所有矩阵见structure/dcc报告。

## 4. 自动绑定与真实变形

采用确定性“最近4条rest骨段，距离平方加0.035m平滑项后再平方取倒数，归一化”的几何自动权重基线；没有人工刷权重、语义手调、重拓扑/焊接/重烘焙，也没有尝试热权重求解器。保留原网格和材质，给出可复现下界，不假称高级语义自动绑定。backpack/root保留为预留关节，几何算法不向这两个关节分配变形权重，配饰专用跟随留TODO。

| 指标 | 本次实测/解析 | 限制 |
| --- | --- | --- |
| skin / joints / clip | 1 / 23 / 1（rig_diagnostic） | 满足探针≤48关节；不代表正式13动作 |
| DCC/导出顶点 | 26,372 / 26,399 | 导出UV/法线等接缝拆点，三角面未增加 |
| 三角面 | 26,268 | 低于隔离试样30,000上限；未达正式12k/6k候选 |
| 权重 | 全顶点覆盖，最大4，非负有限，和误差通过1e-4阈值；所有导出顶点有多骨软混合 | 归一化/覆盖通过不能证明权重语义正确 |
| IBM | rest joint world × IBM相对单位阵最大误差约2.251e-6 | 有效矩阵/有限/可逆；独立采样验证，不只数skin字段 |
| root | 静止/全轨道/各采样世界根平移0，单位旋转/缩放 | 真正局部顶点有变化，非整模静止冒充通过 |
| DCC↔导出GLB逐姿最大位移差 | 最大约9.169e-7m | 11个pose，CPU矩阵蒙皮核对 |
| DCC↔Babylon逐姿最大位移差 | 最大约9.113e-7m | 九个非rest姿态实际引擎软蒙皮采样 |
| 归位 | rest_return最大顶点差0（引擎记录） | 单clip往返不漂，不是正式跑步循环验收 |
| 网格/材质/贴图 | 34 skinned primitive / 1材质 / 两张4096² | 保留源资源；RGBA8+mip约170.67MiB仅估算，不是GPU实测或预算通过 |

诊断按30fps作者采样：rest f0；左肩15/肘30/髋45/膝60；右肩75/肘90/髋105/膝120；组合135；归位150。各肩骨局部X±90°、肘X120°、髋X-90°、膝X120°，骨rest basis见dcc-report。它们是诊断增量，不承诺已完成人工解剖轴标定或自然动作。引擎glTF轨道60fps、0–300帧，时间仍5秒；按秒换算切姿，不直接把DCC帧当引擎帧。

## 5. 代码与真实浏览器验证

| 检查 | 结果 / 证据 |
| --- | --- |
| RED | [unit-red](unit-red.txt)：10失败；[sampling-red](sampling-red.txt)：2失败/10通过；[step-red](step-red.txt)：1失败/12通过；[独立页RED](e2e-red.txt)：缺诊断页导致就绪超时；[生命周期RED](lifecycle-red.txt)：释放后控件仍可用 |
| 专属单测GREEN | 13通过；[unit-green](unit-green.txt)。覆盖坏权重/覆盖/索引/IBM/层级/root/预算/刚性伪装与采样；非只镜像实现 |
| 工具TS与语法 | tsc独立--ignoreConfig退出0；Node --check通过；Blender实际执行/重开导出通过 |
| 本树build | 退出0，[build](build.txt)，保留既有大chunk警告 |
| 全量单测 | 17文件257项通过，退出0；[unit-full](unit-full.txt) |
| 独立导入E2E | 1通过，退出0；[e2e-probe](e2e-probe.txt)，另有录屏。播放/切姿/释放重载均测 |
| 完整E2E | `npm run test:e2e -- --config .pao15-local/full.config.ts`：44/44（原43+新1），最终约5.1分钟，0跳过/失败/重试；[日志](e2e-full.txt)、[摘要](e2e-summary.json) |
| 服务身份 | [service-identity](service-identity.json)：5185返回本树src/main.ts原文，实际HTTP GLB哈希匹配磁盘；strictPort、不复用服务、ANGLE D3D11 |
| 原件保护 | 963文件前后完全相同，原GLB源hash相同；无旧证据需恢复，未改src/public/依赖/默认配置 |

完整镜像保留原测试/断言，仅重定向旧证据输出到`.pao15-local/regression-evidence/`；[镜像索引](regression-mirror.json)列原文件/镜像hash和断言调用数。忽略镜像使用`.pw.ts`后缀并在临时配置指定testMatch，避免默认Vitest误收Playwright镜像；最终完整回归是在该命名与生命周期修正后运行，镜像/配置不进入提交。服务标签中的旧端口说明文本保留，实际请求以5185配置和source raw身份核验为准。

N/F范围：既有完整回归含原N原生桌面/移动输入场景和F注入夹具；本次runner诊断仅F独立姿势/播放夹具，未接正式游戏、未做runner自然跑跳滑、随机路线或新玩法保证。抽看原游戏桌面菜单与390×844 N移动玩法截图，既有M1赛博UI/旧角色/速度文案仍在，属于只读基线，不冒称本轮已修复。批量旧图只留忽略目录，没有重复提交。

## 6. 自动闭环修复与未验证项

脚本/工具问题已自主修复：Blender ACTIVE_ACTIONS默认导出名Animation，显式设置诊断名；采样校验支持导出优化后的常量STEP轨道与LINEAR四元数；独立页重播先stop再start，并等待材质就绪以避免首次截图空白；播放推进在进行中断言，不在片段结束后用空animatable帧冒充失败；释放后禁用播放/切姿，空资产状态读取安全返回，并由E2E验证重载后重新可用。首次临时Playwright配置相对cwd错误已纠正为本树，TS6文件式检查加显式ignoreConfig。没有放松结构校验或删除旧断言。

未验证：正式授权/商业发布条件、最终美术比例/关节位置、权重修整后品质、完整13动作/循环/脚滑/挂点、正式LOD/纹理预算、游戏手性接线/物理/镜头、真机GPU/内存/热稳定。源4K/面数不当作生产预算通过。人工事项可延期，但正式角色仍需对应阶段签收；不自动标Done、合并或启动下一任务。
