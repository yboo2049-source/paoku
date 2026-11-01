# PAO-16 场景资产标定与优化规格（准备稿）

2026-11-01（Asia/Shanghai）。状态：供审设计，未授权制作或接入。总体明亮城市轨道方向已批准；具体色彩、比例、材质及设备预算适用项仍待确认。本稿不构成 PAO-16 完成或 PAO-17 开工凭据。

## 1. 输入、事实与证据等级

工作树 `D:/worker/paoku-sessions/pao-16`，分支 `codex/pao-16-world-assets`，起点 `19aa31492ddce4c1c5e74ef1e49312ad41ec2dd6`，初始暂存区与工作区干净。按主规划树 [调度准备计划 §1–5](D:/worker/paoku/docs/plans/2026-11-01-m2-dispatch-preparation.md)执行；写权仅本文、[任务设计](../superpowers/specs/2026-11-01-pao16-world-design.md)、[证据目录](../evidence/PAO-16/README.md)。

只读 M0 输入：PAO-7 `c66b59e` 的 `docs/art/rebuild-style-guide.md`、PAO-8 `be6c7d5` 的 `docs/performance/target-device-budget.md`、PAO-9 `59fc682` 的 `docs/architecture/rebuild-contracts.md`，分别位于 `D:/worker/paoku-sessions/pao-{7,8,9}/`。固定资产树为 `D:/worker/paoku-sessions/glb-review@7a2fb2963deae061d15deae4019910a15f0dfbcf`，读取 `docs/assets/glb-manifest.json` v2.0.0 与 `glb-visual-notes.md`；资产源提交 `622e7daa2262015f34e511e59628a3653273994d`。

Linear PAO-16 正文、全部4条评论、原生 relations 已读取；最新评论 `46c8e7dd-f442-44a8-9d19-23348d5f42c7`（2026-11-01）接受7a2fb29为技术检索输入，不是美术/尺度/性能验收。PAO-16=Backlog；blockedBy=PAO-7/8/9，均 In Review；blocks=PAO-17。未改 Linear 状态或评论。get_agent_context 返回 Tool not found，不声称读到缺失笔记。

证据分类贯穿本稿：**S**=既有解析实测，复用清单，不重算全体几何；**H**=本轮8个选定源文件 SHA-256核对；**V**=本轮抽看2张已有引擎技术预览；**C**=候选方案/算术推导；**U**=未验证，数值保持 null。S/H/V 均不能升级为正式美术、碰撞或设备签收。

## 2. 源资产表（不是米制物理表）

以下尺寸来自清单 `scene_world_after_node_trs.size`，是所有节点变换之后的场景 AABB，单位为归一化源单位；不把局部 accessor bounds、场景 AABB 或它们的最大边当作碰撞尺寸。完整 SHA、源路径、min/max、纹理和预览状态见 [选定资产记录](../evidence/PAO-16/selected-assets.json)。全部8项无 skins/animations。

| ID / 已交付文件 | S: scene X×Y×Z | S: 源三角形 / 4K图数 | 原点/朝向事实与缺口 |
| --- | --- | --- | --- |
| theme-gantry / env_gantry.glb | 0.9803×0.6678×0.1380 | 109871 / 2 | scene minY=-0.0006；X长；无引擎预览，门洞净空U |
| theme-arch / env_tunnel_arch.glb | 0.8624×0.9838×0.8456 | 130478 / 2 | minY=-0.0032；Y长；无预览，洞口/厚度U |
| ramp-engineering-truck / train_metro.glb | 0.9995×0.3110×0.3208 | 8968 / 1 | minY=0；X长；V确认工程车自带黄坡板，沿±X哪边上坡U |
| ordinary-carriage / train_ramp_or_car.glb | 0.9792×0.4386×0.3808 | 112516 / 3 | minY=-0.0001；X长；V可见门窗/双转向架；端面与前向符号U |
| low-barrier / obstacle_hurdle_barrier.glb | 0.9995×0.7642×0.2739 | 8894 / 1 | minY=0；X长；结构/朝向/杆底U |
| high-barrier / obstacle_slide_barrier.glb | 0.1255×0.9995×0.6313 | 9711 / 1 | 节点已有X+90°；不得再次扶正。门宽可能沿Z，必须量内缘；本轮未查看合影 |
| coin / prop_coin.glb | 0.9995×0.9995×0.1626 | 9767 / 1 | minY=0；厚度沿Z；圆心/正面标记U |
| magnet / prop_magnet.glb | 0.2304×0.9804×0.8108 | 115095 / 3 | minY≈0；Y长，U口朝向/剪影U；代表现有MAGNET槽 |

8项源面数合计505300，仅为选定文件算术，非同屏或GPU提交量。既有149.45MiB、41张4K、约143万面为总资源统计，本轮不重测、不作为同屏数据。notes §6 的“15无图”与清单/最新评论不一致，采用8有图、14无图；“五模型均Y长”也不采用，逐项看JSON。源原点近底部不等于已证明可用的坡脚、车顶中心、币圆心或净空标记。

## 3. 标定空间与一次转换协议（C，尚未实施）

空间定义：O=primitive局部；S=完整场景节点TRS后的源场景；A=已归一单位、Y-up、+Z前向的资产；L=逻辑底面中心局部；W=世界。列向量、右乘先执行：

```text
pS = M_scene_from_object * pO
pW = T_world_from_logic * T_logic_from_asset * N_asset_from_scene * pS
T_logic_from_asset = Translate(-cA)
```

`N`只处理S到A的单位/朝向/必要的源锚点重基，不再包含已经进入pS的节点旋转。Babylon glTF手性包装节点须单列为loader转换：若实测点已在导入后空间，该包装不得再乘一次。源节点、loader手性、任务wrapper三者逐个登记空间与应用次数；禁止简单说“所有GLB再旋转90°”。当前不读取/改渲染实现，因此loader实际矩阵仍U。

逻辑保持1m/单位、X右/Y上/Z前。资产先确定源标记，再拟合权威逻辑；不移动Surface、不改实体尺寸或容差来迁就模型。默认保留源文件，候选在表现wrapper应用一次；未来若烘焙派生文件，wrapper相应置单位矩阵，两者互斥。`appliedCount=1`是未来通过条件，当前是0/未应用，不能先填已转换。

| 类别 | C: scene→game标定方法 | 逻辑/视觉原点、简化代理、失败回退 |
| --- | --- | --- |
| 一个主题段 | 复用现有160m段长作为技术样板；门架跨三道、洞口只作中远景。用测得内缘对齐道路净空，不能用外AABB推门洞宽。先等比，再评审是否需派生拆件 | 环境底部锚点→段局部位置；只作装饰，不给门洞自动加碰撞。轨道、站台、街区平铺源未交付，登记缺口；继续既有环境回退，不以两件宣称主题完整 |
| 普通完整列车（静止/迎面） | X长轴候选绕Y±90°到+Z，符号由端面标记确认。以轮轨接触线、车顶面、前后端标记拟合，而不是AABB拉伸。静/动共用车族 | 逻辑底面中心；12m深、3m高、2.4m宽是本树目标，不是模型测量。代理为现有逻辑盒，ROOF独立。迎面只读负Z速度，不能在视觉另积分。端面未核验，缺车头不擅自复制/重做，转原作者补交；失败保持LEGACY_PRIMITIVES |
| 工程车＋真实坡 | 在唯一组合视觉根标定源坡脚、坡中、坡顶、车顶前后与左右边缘；先尝试单一N对齐全部点。不能拿黄板外框或最高点充支撑面 | 两个逻辑子实体不变，一个视觉根；代理为逻辑RAMP保守包围+斜面Surface、ROOF盒+平面Surface。不能额外画第二个独立坡。单一N不可拟合则未通过，申请原作者源/可编辑拆件再评审，当前继续旧表现且披露遮挡遗留 |
| 低障碍 | 低栏沿横向X，对齐接地脚及阻挡横杆；旋转符号、横杆高度量测后再定 | 当前目标宽2.2/高1/深0.5m，底面中心；保持逻辑盒。模型脚/横杆超出代理或无法保持剪影时失败回退，不改跳跃/盒 |
| 高障碍 | 门架场景已立起；候选Y±90°使开口宽沿X；量立柱内侧、横梁底/顶，禁止据总高直接推净空 | 当前逻辑横挡底y=1.2、高1.8、宽2.2、深0.5m。整门柱不能随横梁一起升至1.2；须确认可编辑分件或全局拟合同时满足梁底/地脚。柱脚若侵入合法路线则不采用；不新增柱脚物理障碍 |
| 金币 | 候选直径0.4m仅为PAO-7提案；用实际圆心重基，若与scene高度吻合，等比候选s=0.4/0.9995≈0.4002，圆心Y约0.49975仅作待确认起点 | 视觉圆心对齐拾取实例position（不是再加0.8m）；拾取范围维持既有逻辑，禁止把币AABB当拾取半径。字样/边缘低档不可读则保留现有币表现 |
| 代表道具磁铁 | 先确认U口朝玩家及主平面；视觉包络候选0.6m，等比起点s=0.6/0.9804≈0.6120，仅视觉试配 | 包络中心→拾取position；沿用MAGNET权威位置/效果，渲染不拥有吸取范围/时长。未获源/许可或低档不可识别，保持既有道具表现 |

上述scale只是候选视觉试配，不证明米制校准。普通车厢若仅按scene外框强行拟合目标，旋转后三个轴倍率约为6.30/6.84/12.25，明显非等比；该诊断说明应测真实轮轨/车顶/端面并评审比例，**不是可直接采用的N**。工程车总长同时包含坡和车，不能把整车外框分别拟合6m坡与12m车两次。

## 4. 坡脚、坡顶与车顶端点表

本树只读 `src/data/modelBindings.ts`、`src/data/trackSegments.ts` 中相关定义及 `src/systems/surfaces.ts`：绑定calibration=UNCALIBRATED、transform=null、fallback=LEGACY_PRIMITIVES。以下为由既有定义推导的逻辑目标，**不是GLB端点实测**。模板段起点取0、车道1 X=0、基准Y=0。

| 点 | 现有L局部（m） | 现有W目标（m） | 源S实测 / 误差 |
| --- | --- | --- | --- |
| 坡脚 | ramp:(0,0,-3) | (0,0,67) | null / null |
| 坡中 | ramp:(0,1.5,0) | (0,1.5,70) | null / null |
| 坡顶 | ramp:(0,3,3) | (0,3,73) | null / null |
| 车顶入口 | roof:(0,3,-6) | (0,3,73) | null / null |
| 车顶中心 | roof:(0,3,0) | (0,3,79) | null / null |
| 车顶出口 | roof:(0,3,6) | (0,3,85) | null / null |
| 左右通行边缘 | X=±1.2 | 坡Z67..73、顶Z73..85 | null / null |

坡实例B=(0,0,70)、尺寸2.4×3×6；顶实例B=(0,0,79)、尺寸2.4×3×12。若采用坡脚A原点，D=6、cA=(0,0,3)，T平移-3Z；这只适用于坡脚空间的坡组件。组合源S包含整个工程车，必须先选定组合锚点，推导每个组件到组合根的固定变换，不给整GLB重复套两个cA。未来元数据登记root→ramp/root→roof矩阵和root锚点，不能由猜测的几何中心选择根位置。

PAO-9的D=12/H=3、B=(0,5,100)、车深18的例子独立作为契约校验：脚(0,5,94)、中(0,6.5,100)、顶/车入口(0,8,106)。不覆盖本树D=6/车深12定义。新增非零基准复测本树时整体Y+5：脚5、中6.5、顶/入口8，接缝Z仍73+段起点。

Surface当前数值epsilon=1e-6m；视觉接缝候选验收阈值1e-4m（来自M0建议），二者不是玩法吸附宽容。最终视觉阈值须审查，不能提高Surface epsilon让失败资产通过。对齐需覆盖宽度两侧、坡中、接缝法线/脚底，不只中心端点。

组合视觉归属：实例combinationId=`<segment>/truck`，visualRootId=`<segment>/truck/visual`；prefab=`ramp-engineering-truck`。root只加载一次train_metro；RAMP与STATIC_TRAIN子实体各保留逻辑/Surface，不再各自加载工程车或普通车厢。重复实例仍各有一个根；卸载按组合释放，不遗留子引用。普通carriage则单独使用ordinary-carriage。

## 5. LOD、贴图分档与制作缺口（C）

采用PAO-7 §6同一套分配，不另开“PAO-16预算池”。候选主pass总量Q2/Q1/Q0≤250k/150k/80k、总draw≤150/100/60，纹理≤128/64/32MiB；不是已冻结设备门禁。原普通车单件112516面、磁铁115095面，均不能原样视为移动低档交付。

| 家族 | 候选派生LOD0/1/2三角形上限 | 优化保护与Q0夹具 |
| --- | --- | --- |
| 完整车族（含工程车组合总和） | 6000/3000/1200 | 保车头/端面、窗门、轮组、车顶与坡面；同屏1×LOD0+2×LOD1=12000；不可把坡和车各花6000 |
| 坡/高低障碍独立件 | 800/400/160 | 保净空、通行边缘、阻挡横杆；8×800=6400；组合内坡已计车族则不再重复计 |
| 金币/四现有道具 | 400/200/80 | 保圆/U/鞋/板/倍分标记；50×200=10000；磁铁从115095到400须作者源、重拓扑/烘焙条件审查，不能承诺自动减面保真 |
| 轨道/站台模块 | 1200/600/240 | 20×600=12000；对应源尚缺，不从两件环境资产推断交付齐全 |
| 中远景门架/洞口/街区 | 1000/500/200 | 20×200=4000；门架净空与入口剪影优先，装饰不占路线 |

世界相关Q0分配合计44400；加两角色24000、FX2000=70400，距80k余9600，与M0一致。表是预算夹具，不是生成器并发实测；若工程车占用额外实例、主pass双面/重复draw、LOD重叠，要按实际提交重新计数。实例化减少draw，不减少每实例面数。阴影/FX各pass另报成本，总draw仍计全部。LOD以屏幕占比选档并滞回，阈值待镜头/设备确定；不以隐去危险、金币或缩小交互轮廓凑数。

| 唯一PBR资源组（每套最多baseColor/normal/ORM三张） | Q2 | Q1 | Q0 |
| --- | --- | --- | --- |
| train_family，1套 | 1024 / 16MiB | 1024 / 16MiB | 512 / 4MiB |
| ramp_obstacles，1套 | 512 / 4MiB | 512 / 4MiB | 256 / 1MiB |
| coin_powerups，1套 | 512 / 4MiB | 512 / 4MiB | 256 / 1MiB |
| track_platform，2套 | 1024 / 32MiB | 512 / 8MiB | 512 / 8MiB |
| city_mid_far，1套 | 1024 / 16MiB | 512 / 4MiB | 256 / 1MiB |
| PAO-16世界部分稳态小计 | 72MiB | 36MiB | 15MiB |

RGBA8+mip按w×h×4×4/3计，图集/LOD共享同一GPU对象才去重；不需要的贴图用常量，未证实ORM通道前不得把源metallicRoughness直接当完整ORM。baseColor/emissive为sRGB，normal/ORM线性；法线方向与切线须导入验证。保留作者原贴图，未来派生降采样、图集合并/烘焙、压缩均需批准和许可。

全项目稳态含角色/UI/FX为110.6667/45.6667/24.6667MiB；最大一套PBR串行替换预留16/16/4MiB，峰值126.6667/61.6667/28.6667MiB。按未舍入值验收。无额外天空盒/IBL/lightmap隐性占用；新增须重新分配。压缩依据实际设备支持，失败退同档RGBA8与相同分辨率，不依赖压缩才守住预算。先选档再加载，禁止4K/Q2全量先入内存再降档；每次一套上传ready→原子换引用→无旧引用后释放→核稳态再下套。跨档按源/目标过渡规则逐步复算，旧高档未清退前不能称Q0生效。

磁盘源总量、单图JPEG大小不代表显存；首局压缩传输候选8/6/4MiB，首屏阻塞2/3/4MiB，需发布构建/固定网络实测，当前均U。帧时间、RT、CPU解码/进程内存、真机热稳定也U。

## 6. 未来交付数据与失败策略

待门禁放行后建议 `public/assets/world/` 存派生资产与许可，`docs/assets/pao16-calibration.json` 存版本化元数据；本轮不创建这两个交付路径。拟定每条记录：

- 身份：assetId/revision、definitionId/revision、visualPrefabId、sourceCommit/path/SHA256、derivedHash、author/source/license证据。
- 空间：sourceAxes/unit（未知不能写米）、nodeTRSIncluded、loaderHandedness、sceneBounds仅诊断、sourceAnchorMarkers、N、assetOrigin/logicalOrigin、cA、T、transformConvention、bakedOrChildTransform、appliedAt/appliedCount。
- 几何：logicalTarget尺寸与定义版本、source/asset/logic/world空间的坡脚/中/顶/顶入口/出口/左右边缘、各点误差及量测方法；collisionProxies独立L坐标、surface引用，不从渲染AABB生成物理。
- 组合：组合根锚点、root→child变换、childEntityIds、唯一视觉拥有者、是否抑制子视觉（是）；静/动态变体同源，速度归模拟。
- 资源：LOD面数/材质/边界误差、纹理内容哈希/尺寸/格式/mip/layers/共享ID、档位/传输量、释放所有权。
- 状态：parseMeasured / candidate / unverified分别存，当前N、T、源端点、误差、代理实测均null，calibration=UNCALIBRATED；审批人/版本、证据索引、fallback及失败原因。

失败策略按整件/整组合处理：哈希不符、缺许可、矩阵非有限/重复应用、坡面/净空/端点不符、资源加载失败→拒用该新视觉，保留LEGACY_PRIMITIVES，记诊断；不混搭“新坡旧顶”造成不连续，不从失败资产反改逻辑。旧表现可能仍有坡体遮挡，本准备稿不声称已修复。生产派生不合格回退上一已验收派生版本或既有表现；不回写原GLB。隐藏远景装饰可降成本，交互物不隐去。

现有四道具槽仅MAGNET、DOUBLE_SCORE、SUPER_SNEAKERS、HOVERBOARD；此次选磁铁为代表，不代表其他三件已校准。jetpack/shield/mystery_box是资产库存，未授权新玩法；不新增枚举、效果或碰撞机制。

## 7. 后续验收矩阵（全部待执行）

| ID | 检查与成功条件 | 失败识别/证据 |
| --- | --- | --- |
| CAL-01 | 固定提交/SHA/许可/作者源对齐；源不变，派生独立追踪 | 哈希或许可缺失拒用；源/派生清单 |
| CAL-02 | 完整TRS+loader+wrapper只转换一次；正逆往返、重复实例不累计 | 五模型重复X旋转、手性镜像、漂移；矩阵与标记记录 |
| CAL-03 | 本树6m坡脚/中/顶/两边与Surface及代理一致，非零B.y重测；另验PAO-9独立算例 | 不用外框代坡面；候选1e-4m视觉阈值不修改1e-6数值容差 |
| CAL-04 | 顶入口/出口对齐、跨接缝走/跳离/落地脚底连续；出边界不虚撑 | 源标记误差表+调试线+真实录像，几何夹具F与自然输入N分报 |
| CAL-05 | 每组合一个visual root、两个逻辑孩子、不重复画自带坡；重开/回收无遗留 | 根/mesh引用计数；固定种子多组合 |
| CAL-06 | 高栏站立危险/滑铲净空、低栏跳越、静/迎面车完整端面与运动辨识 | 真实正常视角1440×900/390×844；坡脚/顶/危险遮挡截图，默认抽看2–3张，异常扩看 |
| CAL-07 | Q0/1/2最密集帧逐pass提交、唯一驻留/过渡峰值/冷首屏、失败fallback | 设备/版本/格式/缓存/种子；非桌面模拟冒充真机；采用PAO-8四场景 |
| CAL-08 | 原玩法/Surface/拾取结果与改视觉前一致，加载失败仍可玩 | 正式代码批build/test/完整e2e、真实输入与console/网络；不得删断言 |

本轮纯文档仅内容审查、引用/JSON/算术核对、diff --check；正常hooks如触发build/test，单列真实结果。不把已有244单测/43E2E历史成绩算作本轮运行。无新浏览器模拟流程、无N/F游戏实测、无生产性能签收。

## 8. 待适用项确认与共享文档建议

需审查：本任务设计与派生复用路线；具体色彩/材质/比例（特别是列车非等比风险及门架净空）；目标机型与预算适用档；原作者可编辑源、许可与端面/坡/车顶标记；主题轨道/站台缺项如何补交；具体代理/源端点实测验收与最终视觉误差。总体方向和M1无需重批。确认后仍由Dispatcher先同步共享总纲和PROGRESS，再明确实现白名单、writing-plans与正式制作，不能因本稿提交自行开工。

| 共享文件（仅建议，不直接写） | 建议内容 |
| --- | --- |
| PROGRESS.md | PAO-16准备稿提交/证据/未验证项，父任务保持未完成；PAO-17未启动 |
| PRODUCT_REQUIREMENT_DOCUMENT.md | 一个主题段、完整静/动车、真实坡及四道具保留；文件存在不授予新玩法 |
| ARCHITECTURE_DESIGN.md | 一次scene→game边界、唯一组合视觉根、只读绑定、派生资产元数据与失败fallback |
| SYSTEM_WORKFLOW_SPEC.md | 模拟位置/Surface权威；根复用/回收、资源引用生命周期，表现不得重积分或修正物理 |
| TEST_PLAN_AND_SENSORS.md | CAL-01~08、S/H/V/C/U分类、源端点null、N/F分报与设备未签收 |
| M2调度/任务索引 | 接续固定提交须含正式PAO-16验收交付再派PAO-17，准备稿不解锁依赖 |
