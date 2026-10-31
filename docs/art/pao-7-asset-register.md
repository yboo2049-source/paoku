# PAO-7 资产、制作来源与许可登记

> v0.2 ｜ 2026-10-31（Asia/Shanghai）｜ 规划清单，待评审；配套 [风格与制作规格](rebuild-style-guide.md)。

本表区分“现有表现有基线记录”“计划制作”“本次概念文档”。没有据文件名、历史完成声明或下载可用性推断资产权利；PAO-6并未完成逐件许可证审核，本次也没有审核现有模型二进制或源文件。P0=缺少会阻塞玩法样板验收，P1=体验明显下降，P2=装饰扩展。本表不代表新的游戏功能或其他Linear任务已被执行。

## 1. 资产族与制作缺口

| assetId / 数量范围 | 优先级与阻塞项 | 基线状态与处置 | 计划制作来源与源文件 | 正式交付 / 许可状态 |
|---|---|---|---|---|
| runner_base / 1 | P0：角色识别与动作验收 | PAO-6有现角色运行表现；不认定现资产已满足新风格 | 原创建模/绑定；拟交 `source/runner/runner_v01.blend`，实际作者待指定 | 低模GLB＋LOD1＋贴图＋骨架；尚未制作，原创权利归属待记录 |
| runner_motion / 13个具名clip | P0：跑跳滑铲换道受击及失败 | 保留动作能力，替换正式动作；细项见规格表（jump与slide拆段） | 原创手工关键帧/经授权动作精修；拟交同一角色源与clip事件表 | 统一骨架、30fps、原地动作；未交付，外部动作若采用须独立授权 |
| chaser / 1角色族 | P1：追捕反馈与取景完整性 | PAO-6记录追捕实体局部出框；需独立构图复核 | 优先原创同骨架变体，`source/chaser/`，不复制现实执法标识 | GLB＋动作复用清单；未制作，许可待登记 |
| train_head / 1；train_car / 1 | P0：完整列车和可站车顶验收 | 基线有程序化部件；按新家族重做，不删玩法能力 | 原创模块化建模，`source/train/`，共用图集 | 头/厢完整结构、LOD0/1/2、支撑/碰撞/遮挡代理说明；未制作 |
| ramp / 1可参数化样板 | P0：地面→坡→车顶连通 | PAO-6固定夹具坡中躯干被坡体遮住；需替换盒体表现 | 原创真实斜面，`source/ramp/`；几何数据接口依PAO-9 | 坡脚资产原点→逻辑底面中心显式矩阵及单次应用状态；顶面、侧面、端点与代理；不能交平盒；未制作 |
| obstacle_low / 1；obstacle_high / 1 | P0：跳跃/滑铲语义 | 保留高低障碍类型，新造型区分横杆高度 | 原创模型 `source/obstacles/`，共用危险图集 | GLB＋独立代理；每类独特剪影与红色斜纹；未制作 |
| coin / 1 | P0：奖励识别与拾取反馈 | 基线有金币；替换强发光与标识 | 原创圆币与凹印，`source/collectibles/` | 低面数GLB、共享材质、拾取挂点；未制作 |
| powerup_magnet / 1 | P0：磁铁识别与激活 | 基线为类型立方体表现，F有激活证据 | 原创U形磁铁，`source/powerups/` | 模型＋同形HUD图标＋拾取/持续/结束视觉约定；未制作 |
| powerup_double_score / 1 | P0：倍分识别与状态 | F仅确认激活/HUD，不替代倍率验证 | 原创×2菱牌，同上 | 同上，不能把图标视为已实现倍率；未制作 |
| powerup_sneakers / 1对 | P0：跑鞋识别与状态 | F有激活与代表跳高样本，未验完整到期 | 原创成对鞋，同上 | 模型/图标/脚部效果；未制作 |
| powerup_hoverboard / 1 | P0：护盾与板姿态 | F有激活/碎裂事件与存活，不代表美术品质通过 | 原创长板，同上 | 板模型、双足挂点、破裂效果；未制作 |
| track_platform / 1主题模块族 | P0：跑道可读性及拼接 | 基线轨/站台/路旁有表现；新方向逐件替换 | 原创模块 `source/track/`，样板包含轨/枕木/站台/接缝 | 模块GLB＋图集、尺寸表、LOD与重复接缝检查；未制作 |
| city_mid_far / 1主题模块族 | P1：城市轨道空间感 | 不据旧PRD逐项勾选已完成 | 原创建筑/站棚/远景，`source/environment/` | 冷色中远景、图集/实例策略；未制作 |
| hud_core / 分数币数暂停道具任务 | P0：状态可读与操作 | 基线现HUD内部枚举、单位待改；保留能力 | 原创SVG图标＋DOM样式规格，`source/ui/`；不复用未核验字体文件 | 图标源/导出、常态与禁用焦点状态表；本次只有概念，不是可运行HUD |
| panels_core / 菜单暂停结算 | P0：缺少即阻塞完整可玩样板的开始/恢复/重开 | 基线有主要页面，不能宣称新布局已实现 | 原创布局与组件，`source/ui/` | 响应式版式/状态矩阵，交PAO-19；未制作 |
| panels_shop_settings / 商店设置 | P1：交易和偏好体验 | 保留现有能力，完整迁移验收仍须覆盖，不因P1而删除 | 原创布局与组件，`source/ui/` | 响应式交易/偏好状态，交PAO-19；未制作 |
| vfx_core / 拾币拾道具碎盾落地4族 | P1：事件反馈 | 只保留已证明反馈能力，不认定全部粒子质量 | 原创贴图/粒子设计，`source/fx/` | 图集、混合方式、生命周期/峰值/挂点；未制作 |
| skins / 基础及4个旧ID映射 | P1：旧所有权迁移 | cyan/pink/gold/green/purple为存档ID；新造型未定 | 原创基础服装变体，保留所有权意图 | 旧ID→新assetId映射待产品/数据统一，不擅自改价格或收回所有权 |
| theme_expansion / 数量待定 | P2：站台/检修区等扩展 | 先有一个完整主题，后扩展 | 原创复用模块 | 样板与预算批准后排期，不纳入本轮完成声明 |

13个clip口径为 idle/run/jump_start/jump_air/land/slide_in/slide_loop/slide_out/lane_left/lane_right/hit/fail/hoverboard，以风格规格列出的这些必需clip为验收清单。

### 旧资源来源线索（历史文档，不是本次复验）

[历史美术审计](asset-audit.md) 报告曾记录 `public/models/player.glb`、`public/favicon.svg`、`public/icons.svg`，以及 `src/render/babylon.ts` 中的程序化模型、UI内联图标和第三方远程粒子纹理。Dispatcher本轮检查确认三个public文件存在，仅代表路径事实。历史预算、动画缺失和故障推断不能直接作为当前运行事实；本次不重新分析GLB，也不把模型中的 Mixamo 风格命名或 Blender 导出器名字当作授权证明。下列旧资源复用核验由后续对应制作负责人提供证据、Dispatcher放行，当前不指定未经确认的个人作者。

| 旧资源 / 线索 | 当前登记状态与后续处理 |
|---|---|
| `public/models/player.glb` | 作者源、原始下载URL、模型及动画各自许可证/授权凭证未核验；历史材质/骨骼命名不证明来源；正式复用前逐项查证，否则替换 |
| `public/favicon.svg`、`public/icons.svg` | 历史文档称脚手架残留；本次未核验其生成来源/许可，不能因位于public就默认可商用；新品牌图标另制作登记 |
| `src/render/babylon.ts`程序化几何与UI内联SVG | 运行表现来自基线；具体代码贡献及仓库许可覆盖范围未核验，复用也须记录贡献链和权利归属；渲染/UI制作负责人分别补证 |
| 历史远程 `PatrickNode/assets` 的 `line.png` 线索 | 是否仍加载、原图权利和授权均未在本次验证；不能据GitHub公开可访问判定可再分发；使用前核验并本地合规交付或替换 |

这些是审核待办，不是授权通过，也不在PAO-7清理或修改文件。

## 2. 本次实际新增的概念资产

| 文件 | 来源及可编辑源 | 许可/权利记录 | 完成口径 |
|---|---|---|---|
| `pao-7-same-screen-concept.svg` | 作者为Codex代理，2026-10-31按本任务约束绘制；SVG本身是可编辑源；无外部嵌入图片 | 记录任务/日期/提交号；未引入第三方模型或贴图；字体引用系统回退，不打包字体文件；原创制作说明不等于完整法律权利审查已通过 | 概念提案；不是3D模型、动作、碰撞或游戏截图；待人工评审 |
| PAO-7概念预览截图 | 浏览器栅格化上述SVG，用于检查标签/构图；具体证据见任务目录 | 沿用概念来源，浏览器预览不产生新的模型许可证明 | 只证明该静态文档能够显示，不能证明游戏实现与实机性能 |

## 3. 正式来源登记模板与禁止空填项

未来每个具体文件至少一行，不能仅按资产族写“全部原创”。完整字段：`assetId / version / author / creationMethod / sourcePath / exportPath / sha256 / sourceUrl / acquiredAt / licenseId / licenseTextPath / authorizationEvidence / attribution / redistributionRestrictions / AI-tool-and-reference-log / reviewer / reviewDate / status`。

| 制作路径 | 必需证据 | 未齐全时的状态 |
|---|---|---|
| 项目原创 | 贡献者、作者源、制作记录、贡献/委托权利条款、参考来源 | 待权利核验，不等于自动独占或已授权商用 |
| 第三方采购/开源 | 原始商品/仓库URL、准确版本、许可证原文、取得日期、购买/授权凭证、署名及再分发限制 | 禁止入正式发布包；“免费可下载”不构成许可 |
| AI辅助概念/贴图 | 工具/模型版本、日期、提示词、参考授权、人工修改和权利复核 | 仅候选，不承诺生成即可商用；概念不计入3D交付 |
| 旧版未查明资源 | 现文件/加载点、历史来源线索、缺失项及负责人 | 待核验；替换或补齐证据后再评审，不补造作者/许可证 |

作者源包含模型/骨架/分层贴图/动作，导出包包含低模GLB、必要纹理、每个LOD和clip/挂点清单；单独存许可证与原始凭证。没有授权证据的角色/动画/音频不能因模型可打开而放行。字体优先系统字体回退；引入网络或打包字体须新增来源与授权行。音频迁移仍需另案审核，此任务不制作或授予其许可。

### v0.2技术元数据与分档交接

以下是未来生产登记要求，本轮没有产生这些模型/贴图文件，也没有实施资源加载器。美术色板、比例、模型品质和设备覆盖仍待人工冻结。分档上限沿用 [PAO-8固定提交§4](https://github.com/yboo2049-source/paoku/blob/be6c7d52dc02bb9aeb9e5f42114ab7b7e8ef4f89/docs/performance/target-device-budget.md#4-候选预算及计算口径)，坐标交接沿用 [PAO-9修订固定提交§2.1–2.3及§3](https://github.com/yboo2049-source/paoku/blob/59fc682c33623150343f414b706e9771b8b6cbb4/docs/architecture/rebuild-contracts.md#21-坡脚资产原点到逻辑底面中心的交接)。

| 交付项 | 每件必填元数据 | 门禁与责任 |
|---|---|---|
| GPU唯一贴图 | `textureResourceId, contentHash, qualityTier, dimensions, format, mipLevels, layers, channelMeaning, colorSpace, sharedBy, gpuObjectCount, estimatedResidentBytes, fallbackFormat, unloadOwner` | 按真实GPU对象去重，不把共享引用当多张；相同内容若重复上传则重复计；PAO-15/16/19提交，表现/资源层复核 |
| 分档几何 | `assetId, lodId, sourceTriangles, visibleInstances, mainPassDrawIndexCount, submeshRanges, repeatFactor, transitionOverlap, shadowPassTriangles, fxPassTriangles` | Q0同屏实体不删、危险剪影不缩，按实际主pass提交含实例/重复倍数≤80k；阴影/FXpass另报但不豁免总draw call；PAO-16/17采集 |
| 原点与归一化 | `assetId, revision, sourceAxes, sourceUnits, N, assetOrigin, logicalOrigin, localForward, unitScale, dimensions(D/H), cA, T_asset_to_logic, transformConvention, appliedAt, appliedCount, bakedOrChildTransform, definitionRevision, endpointMarkers` | N后再重基，appliedCount=1；模型导入所有者负责；逻辑B/Surface/代理不另保存可写美术偏移 |
| 资源交接 | `residentBefore, candidateSet, residentAtPeak, sharedRefCounts, disposeCompletion, residentAfter, fallbackResult` | 当前驻留＋候选新套同时计峰值，仅一套PBR或一个atlas串行替换，确认释放再下一套；不得按未来卸载提前扣账 |

唯一贴图清单固定为8套PBR（24张）＋UI/FX各1张，共26张；组别、分辨率和逐项MiB以风格规格§6.2为唯一分配表，不因实例/LOD/动作或多面板增生副本。角色2套、车1套、坡/障碍1套、金币/四道具1套、近景2套、远景1套；天空纯参数，无skybox/environment/reflection/IBL纹理，DOM系统字体无额外WebGL字形图集，四FX同用一个atlas。新增贴图（包括字形、立方体、白色占位或额外FX）必须在分配表中替换/重分配后才能入库。

| 档位 | 保守RGBA8+mip稳态MiB | 最大一套PBR/atlas交接预留MiB | 同档串行当前常驻＋候选新套峰值MiB | PAO-8上限MiB |
|---|---:|---:|---:|---:|
| Q2 | 110.6667 | 16 | 126.6667 | 128 |
| Q1 | 45.6667 | 16 | 61.6667 | 64 |
| Q0 | 24.6667 | 4 | 28.6667 | 32 |

按表列分辨率RGBA8 fallback本身可通过算术分配，不依赖ASTC/ETC2/BC压缩才能过限；实际压缩仍按块另算并记录。只常驻当前主题和一个装备外观，共享资源引用归零才卸载；不得全量预加载多主题/多皮肤或把Q2+Q0整套并存。交接时旧套仍占内存，候选新套上传完成后换引用，再释放旧套；同一预留不能被换装、主题切换和atlas更新各花一次。无余量时延后可选加载并核验释放，不删除路线必需资产。RT/深度/阴影附件另按PAO-8分配，贴图估算不是总显存或实测。

表内峰值用于同档交接；跨档逐步复算并登记 `sourceTier / targetTier / transitionBudgetTier / targetActivationTime`。降档在源档上限内过渡，旧资源清退且≤目标档上限、目标资源与读路就绪后才宣告目标生效；Q2→Q0过程不能以≤128MiB冒充≤32MiB。升级只在设备允许目标档后按目标上限串行交接。无法承受源档的设备首次直接请求目标档或安全卸载后启动，不先载高档；记录旧/混合资源和新候选的真实峰值，不能漏算过渡。

Q0几何登记保留源LOD0对照114,400面，同时交出风格规格§6.1的相同数量LOD方案：角色24,000、列车12,000、坡/障碍6,400、金币/道具10,000、近景12,000、远景4,000、主pass效果2,000，共70,400，实际主pass额外提交共用9,600余量。不能以源文件加总代替最密集帧引擎采样；所有危险/奖励/道具保留，减面只减细节。每件LOD需交轮廓/支撑边缘保持说明、切换策略与实际提交证据；没有证据时状态仍为规划候选。

坡道算例统一为D=12/H=3，资产A沿+Z上坡、坡脚0；坡脚→逻辑底面中心向量 `cA=(0,0,+6)`，同一点A→L重基为 `T_asset_to_logic=Translate(0,0,-6)`，不能把向量直接当放置偏移。逻辑B=(0,5,100)时，坡脚世界(0,5,94)、坡中(0,6.5,100)、坡顶(0,8,106)；相邻3m高18m深列车底面中心(0,5,115)，车顶入口(0,8,106)。源模型/代理若在A中，导入一次转到L；Surface与契约代理已经在L中，运行时仅加B，不再套资产矩阵。作者源烘焙和模型子节点变换二选一，不能同时应用；逻辑不得补偿。导入验收要求模型通行面、Surface与代理声明的脚/中/顶和车顶入口共同端点一致（AABB仅检查包围，不用水平顶面充当坡面），建议接缝误差1e-4m待PAO-11/12确认；对应PAO-9 RAMP-01~04的运行验证尚未进行。

## 4. 样板交接次序与待评审项

1. 评审同屏概念、六语义、比例和本规格；结果写评审人/日期/版本/提交号，当前保持待评审。
2. 按PAO-8分档上限与PAO-9修订§2.1–2.3准备资源manifest，核对唯一驻留/交接峰值、Q0实际提交、坡脚重基及接缝端点；设备与具体美术仍待冻结，此处仅列依赖，不操作其他任务。
3. 先交角色白模＋车/坡/障碍的一套完整灰盒，检查剪影、坡面和脚底；本轮没有制作灰盒。
4. 单主题目标品质样板在引擎里验证，再扩充动作、道具、HUD与主题；正式资产每件完成技术及来源审核后才标记“可入库”。

需人工决定：具体色板/人物比例是否批准、原创角色造型细节、追捕实体设计、是否保留所有旧皮肤数量、字体方案、AI辅助允许范围和预算机型。需要实测：真实3D轮廓/坡道/动画、HUD无溢出、动态列车语义、移动真机、性能与加载。以上不以概念预览通过替代。
