# PAO-17 渲染架构设计草案（准备阶段，待审）

文件日期沿用调度约定；实际准备日为 2026-11-02（Asia/Shanghai）。分类：Architectural。本文只提交给主 Agent / 用户审查，不代表设计获批、PAO-17 Done 或正式接入放行。

## 1. 范围与依据

分析树为 `D:/worker/paoku-sessions/pao-17`，分支 `codex/pao-17-render`，起点 `19aa31492ddce4c1c5e74ef1e49312ad41ec2dd6`。它只用于本次文档分析；未来实施必须另行固定正式接续提交。总体明亮城市方向和已验收 M1 不重审。

本轮只写本文、[接口与验收矩阵](../../render/pao17-interface-and-validation.md)及 [准备证据](../../evidence/PAO-17/preparation/read-only-findings.md)。不改源码、public、HTML、依赖、测试、共享总纲或 PROGRESS，不做 HTML 原型、拆分或资产接入，不启动其他 Agent / 任务。

证据优先级：用户本轮边界 → 主仓当前生效架构/流程/测试章节与调度 → 主仓已接收的 PAO-16 技术主审 → 本树实际接口。主仓文档读于 `692bf24c1d7f434cd04efbe022fa6e7afc5cff40`，路径及 hash 见准备证据。旧文档的 Y 前进/Z 跳高、金币旧语义不作为契约。当前 X 横向、Y 高度、Z 前进，1 单位=1m；玩家脚底中心、实体底面中心，车道中心 `[-3,0,3]`。

Linear 只读核对：[PAO-17](https://linear.app/paoku-v1/issue/PAO-17/m2-拆分渲染并建立主题场景材质与灯光) 为 Backlog，原生 blockedBy PAO-16、PAO-9，blocks PAO-18；PAO-16 为 Backlog、PAO-9 为 In Review。技术阶段接收不解除这些依赖。PAO-19 已验收 `ed39cb9`、PAO-15 仅自动试样已审，均未合入本分析树；本文不将其行为作为现有能力。

方法论：已读备用安装位置的 using-superpowers / brainstorming（精确位置见证据），按需求比较路线、说明数据流、失败与验证。用户指定直接形成完整可审草案，未答细节以假设/选项列出。本轮停在 Architectural 设计送审，不进入 writing-plans。

## 2. 现状与两条可行路线

| 路线 | 实际范围与收益 | 成本与风险 | 建议 |
| --- | --- | --- | --- |
| A：保留 `BabylonRenderEngine` 门面，逐步拆 `assets/environment/entityViews` | 维持构造、render/reset/applySkin/triggerShatterFX 调用；将资源、主题段、实体差分各交给单一所有者；可用假资源和只读夹具先验证 | 需要清楚区分旧占位表现与新生产绑定；完整销毁仍需 main 串行接线 | 推荐。符合 Linear 白名单、减少 M1/PAO-19 接口回归面，给 PAO-18 留稳定交接点 |
| B：更换较大范围表现层 | 新建独立 presentation runtime（可仍用 Babylon），统一角色/镜头/环境调度及全新快照入口，清除旧别名/全场景名称查找 | 必须迁移 main、快照门面、事件订阅、角色镜头和测试；同 PAO-18/19 的职责交叉更大，验收难归因 | 技术可行，适合将来单独批准的重构；本任务收益不足以承担跨界迁移 |

推荐 A 不代表已批准。拆分时先做等行为迁移，再分别验证主题/资产能力，不能一次把未验收 GLB 与结构重构混成不可定位的改动。未来实施顺序和提交拆分由批准后的独立计划确定。

现有文件同时负责 Scene/Engine/Canvas、夜色环境、GLB 角色、动作别名、镜头、实体、粒子与材质缓存。`render(GameContext)` 从 engine delta 推进视觉时钟；main 已调用 `simulation.presentation(alpha)`，渲染不得再次插值模拟位移。现有环境长 1200、按 600 平移，合并网格冻结 world matrix；不能把注释“无缝”视作已验证结论。现有 reset 清理动态实体与部分镜头状态，没有公开 dispose；匿名 resize、SKIN_CHANGED 订阅和 GLB Promise 的失效清理需设计补齐。

## 3. 职责与资源所有权

| 所有者 | 持有内容 / 输出 | 禁止事项 |
| --- | --- | --- |
| `babylon.ts` 门面 | Engine、Scene、Canvas、相机与渲染级灯光/阴影/后处理；委派同步，保存 epoch/disposed；管理订阅注销 | 不新建游戏循环、不绑定键盘/触摸、不操作 HUD/存档/碰撞 |
| `assets.ts` | 资产注册、已批准元数据校验、异步加载、容器缓存与实例租约、共享材质/贴图所有权；向实体提供可释放 handle | 不按 GLB bounds 改逻辑尺寸，不读取 PAO-16 运行中的诊断 JSON 作生产配置 |
| `environment.ts` | 有限主题段池、近中远景、段变换与边界装饰；持有环境实例租约 | 不生成玩法障碍/金币，不回写关卡 seed/RNG 或地形支撑 |
| `entityViews.ts` | 按快照身份差分障碍/拾取物；单组合视觉根、fallback 和阴影注册集合；持有实体实例租约 | 不消费金币、不判碰撞、不决定工程车支撑或玩家位移 |
| PAO-18 后续 characterView / cameraRig | 角色姿态/动画、追逐者表现和镜头策略；消费只读状态及经批准事实事件 | 不以 root motion/动画结束驱动模拟，不与 17 同写入口 |

依赖方向：main → 门面 → 三模块；entityViews/environment → assets；模块不得反向访问 application/DOM。Canvas 的创建/resize 是既有宿主适配，不赋予渲染 DOM 输入权威。模块共享句柄而非互相销毁对象；无全场景按名称猜资源归属。角色/镜头旧行为在 17 中保持兼容，生命周期清理可统一管理，正式动作、13clip 与镜头重设计留给 18。

## 4. 快照与生命周期

现有入口仍接 `GameContext`，实际来自 main 的 `legacyView(simulation.presentation(alpha).context)`，而非完整 SimSnapshot；没有 runId/tick/discontinuity 可直接读。兼容路径只读 context，不增加第二套模拟插值。视觉时钟只影响旋转、浮动和粒子；PLAYING 之外暂停局内效果，不用墙钟重算道具/速度/接触。菜单展示时钟可独立运行。

建议后续由主 Agent 串行安排最小帧身份附参，详见 I-01：runId/tick/discontinuity/appState 只读元信息，加现有已插值 context。渲染内局部 DeepReadonly 视图可复用已有类型，不擅改共享 types。未接线前 `reset()` 的本地 epoch 可保护重开，但不能声称已验证跨 run 的全部事件隔离。

每帧先检查有效生命周期/帧身份 → 若重开或 discontinuity 则清空表现平滑历史 → 环境按绝对玩家 z 确定段索引 → 实体先分组再差分 → 角色/镜头消费只读帧 → scene.render。离散状态如 collected/phase 不插值；没有实体的快照负责撤除表现，异步回调不能使其复活。相同帧重复同步应幂等，不重复申请实例或阴影引用。

重开：epoch 增一，撤销旧实例申请资格，清理实体/特效/阴影引用、循环段位置、镜头滚转/震屏/lastY、动画语义状态及局内视觉时钟；保留 renderer 级可复用已完成资产与共享材质。皮肤保留最后已提交配置，不因加载回调恢复旧皮肤。新局首帧直接就位，不从旧局坐标平滑。

销毁：先置 disposed 并增 epoch，注销 resize/皮肤订阅及异步接纳资格；停止粒子/动画；实体和环境逐个移除阴影再释放租约；释放角色/镜头资源；最后释放共享缓存、阴影/Glow/pipeline、Scene/Engine。dispose 应幂等；只移除本实例创建的 Canvas，不删宿主已有 Canvas。main 当前未调用 renderer dispose，I-02 接线前不得宣称整个游戏生命周期已闭环。

## 5. 异步加载、降级与释放规则

拟议内部加载状态：UNREQUESTED → LOADING → READY / FAILED；失败状态不每帧重试。按资产 revision/hash 去重 in-flight 请求，受控显式重试生成新 requestId。每个消费者捕获 `(rendererEpoch, runEpoch, entityKey, bindingRevision, requestId)`；Promise 完成后检查 renderer 存活、身份仍匹配、实体仍在最新期望集合。旧消费者不可挂载；若底层不可 abort，结果仍须释放或交给仍有效的 renderer 级缓存，不能留在场景可见集合。renderer 已销毁时晚到容器必须释放。共享加载与消费者资格分开，不能因一个实体过期破坏同资产的其他有效实例。

加载到隔离容器并保持模板不可见，验证非空、绑定资格、转换记录后才实例化；实例准备成功再原子替换 fallback，禁止空白间隙和 GLB/代理双显。失败记录资产身份/阶段/原因，保留可读程序占位，不把失败当已正式接入。未知类型/缺元数据回退，不发业务失败、不修改碰撞。正式可走工程车没有合格绑定时继续保留原 M1 表现作为技术基线并暴露缺口，不冒称旧盒状坡已满足真实坡面验收。

实例独占 root、可变 transform、必要动画/骨架克隆；共享几何/材质/贴图由 assets 持有。实体销毁不得连带 dispose 共享材质/贴图；皮肤等需变色时用明确独占材质或按皮肤 key 缓存，不能改共享资产全局颜色。租约 release 幂等，引用归零才可回收缓存，renderer dispose 最终清空。模板、实例、fallback 的持有者均可枚举。

阴影使用实际 mesh Set 显式注册/撤销，避免 recursive add 与逐子节点 add 双计。替换、移除、reset、dispose 都先删除旧 caster 引用再释放 mesh；只让近处主要角色/列车/障碍投影，远景不入 caster。资源验收同时计 meshes/transformNodes/materials/textures/animationGroups/skeletons/粒子与阴影 renderList，不以“内存看似平稳”替代所有权验证。

## 6. 显式绑定与一次坐标转换

本树 `MODEL_BINDINGS` 只有 `carriage → ordinary-carriage → train_ramp_or_car.glb` 与 `ramp-truck → ramp-engineering-truck → train_metro.glb`。两者 calibration 均 UNCALIBRATED、transform=null、fallback=LEGACY_PRIMITIVES；它们是数据交接，当前旧 renderer 尚未使用。不能按名字 train_ramp_or_car 猜它是坡，也不能只按 STATIC_TRAIN 选择工程车。

拟议分组 key 为 `(runEpoch, segmentInstanceId, visualRootId)`；缺正式组合身份时只给单实体 legacy fallback，不按空间接近推测组合。工程车按 definitionId/combinationId 和显式 visualRootId 关联逻辑 RAMP/ROOF，一个视觉根、一个实例租约；ROOF 是 surface 角色，不是当前 ObstacleType 的新枚举。完整工程车自带坡，不再同时画独立坡和第二车身。底面锚点必须来自经批准组合元数据，不取遍历到的第一个实体坐标。组合部分被回收时按正式生命周期保留/撤除根，不让同组合重复实例化。

源节点已有变换完整保留（尤其高栏 X 旋转）；glTF RH → Babylon 默认 LH 在 loader 边界转换一次；asset→logic 的单位/朝向/基点由生产元数据在 adapter 处理一次。不能再手工翻 Z 或复制 RH 预览矩阵。普通车前向、接地线、可走顶面及工程车精确坡脚/顶/车顶交界未冻结时 transform 继续无资格。元数据须标明源 hash、节点路径、坐标空间、loader 手性、标定版本与关键面残差。

只接收 PAO-16 主审已接收技术事实：普通车源长轴 X；工程车三个坡内点向源 +X 上升、RH Y−90°使其向 +Z 上升，临时 RMS 约 1.910m；高栏保留源 X 旋转，中央净空约 0.511089 源单位、临时 RMS 约 0.300m；低栏有中央杆和脚的三角交点。内点/中央射线不证明端点/连续净空，残差不证明必须重建。四件 candidate.accepted=false、正式语义端点 null，均未放行。原始 DCC 已确认不存在；若后续修整只能另立有来源记录的重建派生工程，本文不要求索取原始 DCC。

M1 物理不变：车 `2.4×3×12`，坡 `2.4×3×6`，坡脚 Z67/坡顶73/车顶出口85；同时需非零基准 Y+5 验证。以上为标定夹具坐标，不硬编码为所有生产实例坐标。缺口不能通过调跳高、碰撞尺寸或支撑面绕过。

## 7. 主题段、景深与克制后处理

在明亮城市方向内建议晴朗暖中性主光、偏冷环境填光、低饱和城市背景；危险红黄/可走坡顶轮廓保持辨识，金币与道具颜色不被强发光抹平。具体色板和曝光上限是待审细节，不重新询问总体方向。

主题段采用渲染专属有界池：`segmentIndex=floor(playerZ/L)`，保留身后段与覆盖可视距离的前方段；数量由相机 far/fog 与预算决定。绝对索引计算支持跨多段跳转/重开，不用每帧仅 +L 的单步 if。L、轨枕/杆件周期、UV 周期、段边界 connector 统一；端点位置/法线/材质连续，边界装饰只有一个所有者。可移动根的子网格不得沿用失效的 frozen world matrix；只冻结真正不移动对象，或在回收后明确重算。菜单展台独立，不参与局内循环。

近景：轨面/轨枕/护栏与主要障碍、完整列车，保证脚底和坡面可读；中景：侧向站台、楼体、信号/龙门架，避免遮住前方危险；远景：稀疏天际线与天空/雾，降低细节和阴影。背景若用独立视觉随机源，只依主题索引，不消费模拟 RNG。合批限于同段同材质并保留回收/剔除粒度，不把整个世界合并成不可管理单网格。

候选设置是保留 FXAA，bloom 关闭；Glow 改为少量拾取/信号白名单且降低强度，先关闭景深、运动模糊、色差与额外全屏效果。阴影分辨率/距离按设备预算选择；先测基线再确定质量档，不能将当前 2048 阴影等同移动端承诺。速度线限量，不能遮挡高低栏开口。镜头 FOV/滚转/震屏仅保持兼容并列入 PAO-18 交接，不借主题改造重做镜头。

资源缺口：本轮没有已放行轨道/轨枕、站台、接触网、建筑/天空等完整主题套件，也没有生产金币/代表道具元数据、统一贴图/LOD/机型性能预算。可选路线是等待生产资产，或批准后暂用程序几何保持连续轨道/简化站台；后者只为候选设计，本轮不制作，且不得冒充正式美术。

## 8. 可独立验证的工作与阻塞项

| 类别 | 未来可验证内容 | 放行条件 / 限制 |
| --- | --- | --- |
| 纯渲染结构 | 三模块所有权、只读快照、差分幂等、假加载器失效/失败、reset/dispose 资源计数 | 具体设计批准、共享文档同步、固定接续提交后才实施；不依赖正式资产完成 |
| 环境算法 | 合成段接缝、绝对段索引、非零基点、冻结矩阵更新、近中远景可见性 | 可用专属夹具验证算法，不能据此签收正式城市风格 |
| 生产场景与列车 | 普通车/单工程车实例、坡顶脚底对齐、全宽净空、一次 RH/LH | 等 PAO-16 按条目放行生产元数据和源身份；不取其运行中目录数据 |
| 风格和性能 | 材质/贴图/LOD、光照曝光、阴影范围、设备质量档 | 等风格细则及设备预算批准，需真实浏览器/目标设备证据 |
| 应用生命周期/18接续 | 帧身份、销毁桥、事实事件、角色镜头 hook | main/types/DOM 最小请求由主 Agent 单一实现方串行安排；18须固定17已验收提交再接续 |

## 9. 待决项、前置与拟议白名单

| 待决项 | 推荐假设 | 可选项 / 审查要点 |
| --- | --- | --- |
| 模块路线 | A，维持门面 | B 单独重构另立范围 |
| 循环段长度/池大小 | 从可视距离与资源预算推导，不先锁死 600/1200 | 兼容旧周期过渡；或统一新 connector 周期，必须接缝测证 |
| 缺轨道/站台资源 | 先列缺口，正式资产优先 | 批准后程序几何临时方案，并明确非正式验收 |
| 失败与重试 | 保留 fallback、显式重试、同 revision 不逐帧重试 | 有限退避需另定上限/诊断，不引入无限网络循环 |
| 共享资源缓存 | renderer 级缓存，重开复用，销毁归零 | 有界 LRU 仅在预算需要时增加，避免提前复杂化 |
| 主题与设备 | 晴朗明亮、FXAA、低 Glow，无额外重后处理 | 冻结色板/曝光/材质和设备预算后定数值；不承诺未知机型帧率 |
| 帧/事件边界 | I-01/I-02 最小串行接线 | 未批准前只能验证局部门面，不能宣称全局生命周期通过 |

正式实施前必须有：具体设计批准记录、主 Agent 同步 PRD/架构/流程/测试与 PROGRESS、正式接续 SHA/单一入口写入者、按条目生产资产元数据放行（若实施批次涉及接入）、所需风格/预算、RED 传感器范围和证据保护方案。PAO-16/9 依赖仍由主 Agent 管理，不能因本草案消失。

拟议实施白名单（非当前写入授权）：`src/render/babylon.ts`、新增 `src/render/assets.ts`、`environment.ts`、`entityViews.ts`，以及主 Agent 批准的 `tests/unit/pao17-*.test.ts`、`tests/e2e/pao17-*.spec.ts` 和专属证据。角色/镜头后续路径归 PAO-18，17 不先实现它们。`src/main.ts`、共享 types、modelBindings、DOM、public、HTML、配置/依赖和共享文档本任务保持只读；确需变更时先提交最小接口请求，再另派串行批次。

验收使用接口文档的 RED/N/F 矩阵；目前没有执行实现测试、浏览器预览或截图。设计送审后停止；批准不会自动启动工作，须主 Agent 另发实施提示词。
