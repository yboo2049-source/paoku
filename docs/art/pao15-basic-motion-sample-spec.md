# PAO-15 四类本地自动基础动作技术样本规格

2026-11-03（Asia/Shanghai）｜v0.1 review candidate｜固定输入`64c4f3120224f42995bc4b0fae544feae139d380`。

本轮只写设计/规格和纯文本证据。以下四clip、曲线、容差、manifest与测试均为**待批准提案，尚未生成或运行**；不覆盖已审绑定，不计作完整13正式clip，不放行PAO-18。路线取舍见[设计稿](../superpowers/specs/2026-11-03-pao15-basic-motion-sample-design.md)，来源/主审及本轮检查见[准备证据](../evidence/PAO-15/basic-motion-preparation/README.md)。

## 1. 已审输入、保护与隔离资源

技术输入为现有`runner-derived.blend`与`runner-rig-spike.glb`；原作者DCC不存在，后续只能另存明确标“从GLB派生重建”的新版本。旧工程、诊断GLB、rig-spike工具/证据全部只读，本轮不开启DCC、不加载二进制工程、不运行导出或重做绑定。来源/使用条件未取得，不声明商业发布许可。

| 项目 | 已审事实 / 限制 |
| --- | --- |
| 实际骨架对象/skin名 | `runner_rig_spike_v1`；`root_motionless`为固定根，23关节。不是早期正式规划名runner_rig_v1 |
| 蒙皮 | 1skin，≤4归一化权重，有效IBM；26,399导出顶点，26,268三角面，34蒙皮primitive，1材质 |
| 当前动画 | 只有`rig_diagnostic`，5秒、11诊断姿态；没有可宣称正式完成的Idle/Run/Jump/Slide |
| 坐标 | 已绑定探针参考高1.8m，脚底基准0；DCC Z-up/-Y前，GLB m/Y-up/+Z前。新样本不得再次套1.8385倍归一化 |
| loader | 旧独立预览使用Babylon右手原生glTF空间。游戏手性转换尚未在本样本验证，不能默认为已接线 |
| 资源上限 | 沿已审隔离试样：同屏1 runner、不增到30,000三角面以上、≤48 joints目标且优先保持23、≤4权重。原2张4K保留，RGBA8含mip约170.67MiB仅估算，不是GPU实测或正式预算通过 |
| 工具 | 既有便携Blender4.5.3 LTS；版本、包hash沿旧toolchain记录。本轮不安装/启动；未来执行前核对同版工具 |

拟议新导出仍保留同一网格/权重/rest/IBM，不加LOD、不重绑、不重烘焙；若结构变更确有必要，先报告而不擅自改旧工程。旧诊断action可留在新派生工程中作来源对照，**不混入四clip导出集合**。导出动画集合预期恰为下表四个名字，旧`rig_diagnostic`文件仍单独保存。

## 2. 真实骨名、rest与局部轴约定

按现有结构清单，下面括号是parent名称，不是新骨架创建指令：

| 分组 | 真实节点名与parent |
| --- | --- |
| 中轴 | root_motionless（无骨父）；pelvis（root_motionless）；spine_01（pelvis）；spine_02（spine_01）；neck（spine_02）；head（neck） |
| 左上肢 | clavicle_l（spine_02）；upperarm_l（clavicle_l）；forearm_l（upperarm_l）；hand_l（forearm_l） |
| 右上肢 | clavicle_r（spine_02）；upperarm_r（clavicle_r）；forearm_r（upperarm_r）；hand_r（forearm_r） |
| 左下肢 | thigh_l（pelvis）；calf_l（thigh_l）；foot_l（calf_l）；toe_l（foot_l） |
| 右下肢 | thigh_r（pelvis）；calf_r（thigh_r）；foot_r（calf_r）；toe_r（foot_r） |
| 附件预留 | backpack（spine_02）；旧几何算法没有给它分配变形权重，不视为已完成包带挂点 |

左/右沿旧数据`l=+X、r=-X`，不因画面左右或镜像而交换名字。新export的node index、skin joint index可以变化，必须重新按名字建映射，**不能硬编码旧root node=22或旧joint顺序**。骨父级、rest局部矩阵、IBM与权重须与固定输入做语义/数值对照。

下文角度均为**相对绑定rest的骨局部旋转增量**，单位度；不是世界Euler，也不从旧诊断的当前帧累加。旧脚本用XYZ Euler，骨局部Y沿骨段；旧肩、肘、髋、膝试姿用了局部X。旧试姿只证明该轴能变形，未完成解剖轴/骨roll的正式标定，不能假定所有左右骨都套一个世界X轴。建议未来将局部轴增量组合成连续四元数并固定符号半球，再采样；轴向明显反折属于工具参数/映射问题，须修正映射并记版本，不靠隐藏网格通过。

未列骨默认保持rest增量0、scale1；root始终保持绑定TRS。局部pelvis平移在**父空间**表达：目标Y-up的上下变化映射为Blender父空间Z分量；父root当前单位姿态，仍须记录basis映射。不能把Blender局部Y当目标高度，也不能给骨location写世界坐标。

## 3. 统一采样、根与边界契约

| clipId / 实际动作名（候选） | fps | N | 秒 | 播放帧/秒区间 | 边界键 | 循环/结束 |
| --- | ---: | ---: | ---: | --- | --- | --- |
| tech_idle_v1 | 30 | 60 | 2.0 | [0,60) / [0,2.0) | f60，t=2.0 | 循环；边界姿态和速度匹配f0 |
| tech_run_v1 | 30 | 24 | 0.8 | [0,24) / [0,0.8) | f24，t=0.8 | 循环；边界姿态和速度匹配f0 |
| tech_jump_v1 | 30 | 36 | 1.2 | [0,36) / [0,1.2) | f36，t=1.2 | 非循环；hold_last，演示结束姿态回rest |
| tech_slide_v1 | 30 | 36 | 1.2 | [0,36) / [0,1.2) | f36，t=1.2 | 非循环；hold_last，演示结束姿态回rest |

N是播放采样数，不是最后键索引。GLB末键必须覆盖`t=N/fps`以让loader识别真实时长；边界键不增加一帧停留，不把时长写成(N-1)/fps。记录所有通道最大时间与导入animationGroup的秒数；不能只检查manifest的durationSec。常量通道允许STEP且完整覆盖时间，旋转/位移运动通道候选采用30fps采样LINEAR，不假设导出器自动保留CUBICSPLINE。

全部clip：`root_motionless`的XYZ平移/旋转固定绑定值、scale=(1,1,1)；armature/asset父节点同样不能另带位移动画。`move_delta=(0,0,0)`；攻击窗口/`hit_frame`、美术无敌区间均N/A。局部pelvis起伏不构成世界跳跃/前进；人物世界位置、支撑、碰撞和有效输入属于模拟，不从clip完成回调派生。

循环速度不以“首尾同姿态”代替：未来源曲线按周期C1构造，检查边界左右平移速度和四元数log角速度。LINEAR烘焙后也检查fN-1→fN与f0→f1的**带方向**速度差，比较前先统一四元数符号，不能只比角度大小。若采样造成接缝尖角，候选自动边界保护是在f1/fN-1放置与同一边界速度对称的局部平移/旋转样本，再复验包络和可见停顿；不添加额外播放帧，不手工精修。若该方法不能满足容差，标工具/循环失败，另提保留样条导出方案，不直接声称LINEAR天然C1。

## 4. 四样本姿势与阶段提案

以下为低幅、可复现初值，仍待设计批准和真实轴验证。不得以角度较小宣称消除了自动权重缺陷。

### 4.1 tech_idle_v1

相位`u=f/60`；spine_01局部X约`1.5°×sin(2πu)`，spine_02约`-0.5°×sin(2πu)`，neck/head各≤0.5°反向平衡；肩/腿/足保持rest，pelvis平移固定0。f0/15/30/45/60对应基准/呼吸峰/基准/反峰/回基准。没有脚步标记；不新增整模缩放呼吸。脚底仍须观察，串权可能令头肩轻微受牵引，不能只测骨location证明鞋底稳定。

### 4.2 tech_run_v1

候选相位`φ=2πf/24+π/4`，避开所有通道同时处于极值的循环接缝；f0/6/12/18/24为四分周期与边界。默认局部X增量：

| 骨/分量 | 候选周期参数 |
| --- | --- |
| thigh_l / thigh_r | `-25°cosφ` / `+25°cosφ`，相反步相 |
| calf_l / calf_r | `25°+20°sinφ` / `25°-20°sinφ`，约5～45°屈膝 |
| upperarm_l / upperarm_r | `+15°cosφ` / `-15°cosφ`，相对同侧大腿反向 |
| forearm_l / forearm_r | `35°+5°sinφ` / `35°-5°sinφ` |
| foot_l / foot_r | 候选≤5°的反相补偿；toe维持rest，不声称足底锁定 |
| spine_01 / spine_02 | 前倾约+5° / -2°；其他转轴默认0，避免未标定的额外扭转 |
| pelvis目标上下位移 | `0.015m×(1-cos(2φ))`，范围0～0.03m；X/Z平移0 |

这些是局部骨运动，不生成18m/s等世界配速，也不宣称0.8秒周期的步幅能匹配游戏高速。足相/步幅/脚滑与躯干串权保留质量项。标记可暂用f0 `left_contact_pose_hint`、f12 `right_contact_pose_hint`，仅为候选姿态索引；**未核实足底接触前不得直接触发脚步音效**。两标记不证明实际交替接触。

### 4.3 tech_jump_v1：单clip展示三阶段

演示阶段：预备/蹬伸[0,6)，空中收腿/展开[6,24)，接触外观/恢复[24,36)。这1.2秒只是独立预览时间表，不与真实飞行时间、PLAYER_LANDED或支撑高度绑定。

| f / 秒 | 局部pelvis目标Y偏移 | 双thigh X / 双calf X | 其他关键姿态候选 |
| --- | ---: | --- | --- |
| 0 / 0 | 0 | 0 / 0 | rest |
| 4 / 0.1333 | -0.05m | -25° / +40° | spine_01 +10°，双forearm +25° |
| 6 / 0.2 | 0 | -5° / +15° | 双upperarm -10°；蹬伸姿态索引 |
| 15 / 0.5 | +0.02m | -35° / +70° | 双upperarm -20°，双forearm +30°；收腿峰 |
| 24 / 0.8 | -0.04m | -30° / +50° | spine_01 +10°；缓冲姿态索引 |
| 30 / 1.0 | -0.02m | -10° / +20° | 上身逐步回正 |
| 36 / 1.2 | 0 | 0 / 0 | 回rest边界、hold_last |

非周期段用有界Hermite/平滑插值，防止角度/位移过冲；起止速度候选0。pelvis最大只做局部重心变化，不画世界抛物线，不移动root；独立预览显示“起跳/空中/缓冲姿势”，不能假装角色在真实地面完成跳跃。

未来若拆正式jump_start/jump_air/land，需分别重设局部时间0和边界键。当前f6与f24不相同，**不可直接把[6,24)复制成循环jump_air**；须另造可循环空中片段并由真实接触事实切到land。样本没有持续空中时长适配、升降分相、不同支撑面着地或跳滑组合验收。

### 4.4 tech_slide_v1：单clip展示进入/维持/退出

演示阶段：[0,6)下降进入、[6,24)维持、[24,36)退出恢复。f0/f36为rest；f6/f24为相同低姿态候选：pelvis目标Y -0.25m，spine_01 X -25°后倾，左thigh -70°/calf +15°作前伸腿，右thigh -35°/calf +95°作折腿，双forearm +45°，foot各≤5°。此“左前右折”只是一种样本，不自动增加镜像clip。

维持阶段可用局部spine X幅度≤1°、`1-cos(2π(f-6)/18)`型小变化，保证f6/f24姿态相同且源端速度0；其余维持通道常量。进入/退出平滑到该姿态，不从实际模拟rollTimer推定阶段。保留低姿态下鞋底、膝和包带穿插的真实证据，未知最低轮廓/接触高度标未验证，不能反向改碰撞尺寸凑滑铲。

未来slide_in/slide_loop/slide_out可将阶段重定时为各自0基，但18帧维持段仍需独立循环速度与接触复验；entry/end/out需共享同版关键姿态。当前单clip自动走向退出仅为预览，不能因播完而结束模拟滑铲，也不能保证空中滑铲、再次滑铲或板上滑铲。

## 5. 表现标记、取消与生命周期候选

| clip | 仅供外观的marker（0基） | 预览取消/未来接线边界 |
| --- | --- | --- |
| idle | 无 | 任意帧可切其他已选样本 |
| run | f0/f12候选左右接触姿态hint | 任意帧可切；世界速度/支撑不由标记写入 |
| jump | f6 takeoff_pose、f15 tuck_peak、f24 landing_pose | 任意帧可被明确切clip/清理或权威阶段覆盖；marker不发落地事实 |
| slide | f6 low_pose_enter、f24 recovery_pose_begin | 任意帧可被明确切clip/清理或权威阶段覆盖；marker不结束roll或授予无敌 |

全部`cancel_from=0`仅表示技术播放器可中断，不是游戏输入窗口。优先级候选：dispose/reset/新局清理 > 真实终局/运动阶段事实 > 当前预览选择 > clip内演示阶段。未提供fail/hit动作时只能停止/切中立技术pose并报缺clip，不能偷偷给tech_jump改名fail；UI标记也不承担新模拟事件协议。

切clip时停止旧播放器与marker游标、将未被新clip驱动的骨恢复rest，再应用新clip当前相位；所有动作最好导出完整受影响骨通道，避免前一姿势残留。混合候选2～3帧，仅visual子层，不混世界root；重播从0，非循环hold_last不自动发出模拟命令。暂停冻结clip相位/本地marker，不补跑墙钟；恢复无补发旧提示。释放后禁用播放/切姿、可安全读空状态；重载不叠加骨架或订阅。重复marker可用本地`previewSessionId + clipInstanceId + loopIndex + markerId`去重，**不是已存在的公共run/tick事件封套**。

## 6. 候选manifest（只描述文件接口，不改公共schema）

| 字段组 | 候选字段和值 / 未知处理 |
| --- | --- |
| 身份 | documentVersion=0.1、artifactKind=technical_motion_sample、status=proposed；assetId=runner_basic_motion_sample，sampleVersion=v1；approvalStatus=pending |
| 来源 | sourceCommit=64c4f312…；originalStaticSourceHash=0f475ed2…；sourceDerivedBlendHash=a75de312…；sourceDiagnosticGlbHash=cb84cfb9…；来源全hash见准备证据，sourceKind=derived_reconstruction |
| 新产物 | futureBlendPath、futureGlbPath按设计§5；derivedHash/exportHash=null、reason=not_generated；exporterVersion、制作日期/参数hash未来实测填写 |
| 骨架 | sourceRigName=runner_rig_spike_v1；skeletonVersion=rig-spike-v1@64c4f31；23真实骨名/parent映射；restPoseFingerprint=null（未来计算规则/结果未取得）；新node/joint索引按名字登记 |
| 坐标 | units=m、up=+Y、forward=+Z、origin=sole_center；sourceDcc=Z-up/-Y；normalizationPolicy=preserve_already_bound_basis、normalizationAppliedAgain=false；loaderHandedness=RH_native_gltf_preview，runtimeConversionStatus=not_validated |
| 结构/质量 | skin/IBM/weight验证状态未来填写；resourceProfile=single_runner_rig_spike、triangleLimit=30000、jointLimit=48、weightLimit=4；qualityClass=unverified，knownIssues引用MAN-01~09，commercialUseConditions=unverified |
| clips（四条） | clipId/name、clipVersion、fps=30、N、durationSec、playbackRange、boundaryKeyTimeSec、loop、holdLast、phaseRanges、rootPolicy=fixed_bind_TRS、move_delta=[0,0,0]、drivenBoneNames、localPoseBasis、interpolation、boundaryVelocityPolicy、markers、cancel_from=0 |
| 行为边界 | markersArePresentationOnly=true、attackWindow=N/A、artInvulnerability=N/A、simulationAuthority=none；footContactVerified=false直到实测，禁止默认true |
| 证据 | exportSha256、DCC/GLB/Babylon姿态对照、root/循环/生命周期结果及截图/录屏索引未来填写；unknowns每项有null+reason，不用空字符串假通过 |

manifest只在未来独立预览加载器中审查；PAO-18可以参考字段意图，不得从15活动目录直接接未审GLB。正式交接须主Agent指定**固定提交、文件hash、可用clip清单与质量限制**；public/schema/shared types/main是否需接线另派单一实现方，本设计不修改公共接口。

## 7. 已知缺口及延期人工项

以下是已审绑定阶段的历史事实，不是本轮四clip的新实测；引用[主人工TODO](D:/worker/paoku/docs/art/pao15-rigging-manual-todo.md)与[固定试样任务记录](../evidence/PAO-15/rig-spike/README.md)。

| 风险 | 旧证据 | 本提案处理 / 不作的推论 |
| --- | --- | --- |
| 肩/帽兜串权 MAN-01 | shoulder_l f15 / shoulder_r f75；躯干约0.20m、帽兜约0.049m | 样本摆臂先取低幅，仍逐部件观测；不宣称减幅已修好权重 |
| 肘/躯干串权 MAN-02 | elbow_l f30 / elbow_r f90；约0.048～0.049m | 记录Run/Jump屈肘时袖口/躯干影响；人工延期 |
| 髋/对侧腿 MAN-03 | hip_l f45 / hip_r f105；对侧裤腿约0.089～0.093m | 记录跑步相反腿和Jump收腿；不推定必须重绑/重拓扑 |
| 膝/鞋踝 MAN-04 | knee_l f60 / knee_r f120；对侧约0.028m，膝后衣物压折 | Slide大屈膝风险更高，保留关键侧图与数据；不手修后才交诊断 |
| 包/抽绳 MAN-05 | backpack未配专属权重；旧rest/combined及部件表 | 专项穿插尚未知；不得声称挂点/包跟随合格 |
| 脚底/接触 MAN-07/08 | combined_squat f135未降pelvis/锁脚、双腿交叠；骨位/比例未正式签收 | 本提案局部pelvis只是新候选姿态，不等于修复；接触/脚滑/高度单列质量结果 |
| 优化与来源 MAN-06/09 | 原网格/材质保留，正式LOD/贴图/使用条件未验收 | 保持隔离上限，不以源面数/预览流畅当真机预算通过 |

## 8. 后续RED与质量矩阵（本轮均未执行）

| 编号 | 未来先失败的有意义案例 / 通过条件 | 证据与分类 |
| --- | --- | --- |
| BM-01 身份/只读 | 换错源hash、骨名缺失/重名、parent/rest/权重被意外改、覆盖旧输出应拒绝；保护旧blend/GLB/rig证据 | 源/新派生/输出SHA、名字映射与旧文件前后hash；工具门禁 |
| BM-02 蒙皮/IBM | 缺skin/IBM、越界JOINTS、非有限/负/未归一/>4权重、未蒙皮点及不可逆/不抵消rest的IBM均失败 | 真实accessor与world×IBM；容差沿旧结构检查，权重和1e-4、rest抵消1e-4；工具门禁 |
| BM-03 四clip/时长 | 缺clip/混入rig_diagnostic、fps口径错、少边界键导致短一帧、伪duration应失败 | DCC键时间→GLB sampler最大时间→引擎秒数一致，误差候选≤1e-5s；工具门禁 |
| BM-04 根/变形 | root或父wrapper重复前进/起跳、scale变化应失败；仅加骨节点/整模转动不能通过 | 各通道/采样root偏差≤1e-4m/1e-4rad，scale1；至少一个局部关节驱动软顶点且并非全体同一刚体变换，Idle非root变化须高于数值噪声 |
| BM-05 循环边界 | 同姿态但反向速度、四元数q/-q误判、重复终点停顿均需被捕获 | Idle/Run连续10循环，骨/顶点边界；候选骨位置≤1e-4m、角差≤1e-3rad；带方向边界速度差≤0.01m/s、≤0.05rad/s。不是全曲线全局C1保证 |
| BM-06 DCC/引擎 | 故意重复归一化、时间fps翻倍、左右骨映射错、仅比最大包围盒应失败 | 共同关键帧与阶段内中间时刻，逐骨world矩阵、具名primitive/匹配顶点位移；DCC↔CPU↔Babylon对应顶点误差候选≤1e-4m，接缝拆点需登记映射而非只比vertex索引 |
| BM-07 暂停/切换 | 暂停墙钟补跑、切clip残留旧骨通道、hold_last假发落地/roll结束应失败 | 多个非边界相位暂停/恢复；Idle→Run→Jump→Slide→Idle，任意阶段中断；root和模拟无写回 |
| BM-08 重播/清理 | 重播不从0、归位失败、释放后仍可播、重载叠骨架/marker应失败 | 20次切换/重播、10次释放重载，1骨架/4clips/34蒙皮primitive或释放0，资源计数和重复订阅稳定；不是完整游戏泄漏结论 |
| BM-09 标记 | 循环接缝双发f0、seek补发历史、暂停重复、将hint当落地事实应失败 | 本地clipInstance/loop/marker去重；跳转默认仅定位不播声音/FX；无新公共事件协议 |
| BM-Q1 足底/轮廓 | Run脚滑、Jump仅原地收腿、Slide脚穿地/包穿插、关节压折分别记录 | 2～3关键图+短录屏+姿态索引；足底接触与最低轮廓未签收可判“需局部修整”，不能改碰撞或删坏网格 |
| BM-Q2 品质分报 | 结构通过但有串权不应被汇总成正式资产通过 | 自动流程passed/failed/blocked与quality未验证/需局部修整/可继续分别列；人工延期不阻断交诊断，也不放行正式品质 |
| BM-10 集成防护 | 未来代码修改必须本树build/test/完整E2E和独立四clip导入 | 独占5185/strictPort/reuseExistingServer=false、ANGLE D3D11；src raw/HTTP GLB/hash核对，完整旧断言镜像输出留忽略目录；N原生回归与F样本分报 |

BM-Q1中的“原地Jump”是设计边界，不能仅因它不产生世界飞行判工具失败；但身体是否像收腿/缓冲、低姿态是否可读须如实评审。新样本未生成前，任何矩阵条目都不能记已通过。旧257/44和主审数据只证明旧绑定/诊断阶段，不迁移为四clip验收结果。
