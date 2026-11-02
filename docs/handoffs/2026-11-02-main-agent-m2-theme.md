# paoku主Agent交接：主题已审，准备基础动作与镜头

2026-11-02（Asia/Shanghai）。新会话先读主仓AGENTS.md和本文件，随后只读当前任务所需计划/报告，不重新通读旧交接、全部历史、整个代码库或图集。状态以实际Git/Linear复核为准。

## 当前接续（2026-11-03）

用户要求原主Agent继续。17主题82d2d47已由新会话验收并记入d9c3d58，不重复同一批检查或派发。下一步使用[15/18并行设计准备交接](../plans/2026-11-03-pao15-pao18-preparation-prompts.md)：15树64c4f31只设计本地基础动作技术样本，18新树codex/pao-18-motion-camera@82d2d47只设计动作/镜头/接口，均未启动实现，用户分别粘贴触发。18目录已建立但未装依赖或跑本树验证，不含15新runner/19新UI，父依赖保留；人工精修延期。后面5298e1a“候选待收”记录为历史。

## 上一交接的主题核验历史

> 接续更新：用户已返回本批完成信息；最终本地/远端均为82d2d47（包含实现5298e1a）。主Agent已独立完成build、273单测、53完整E2E及新三图/资源/hash复核，[主题阶段复审通过](../reviews/2026-11-02-pao17-bright-theme-review.md)。下面“候选待接收/远端536f54b”是交接当时的历史快照，已被本更新替代，不重复派发或再验同一批。父17未整体Done，其他任务未自动启动或合并。

本轮交接核对发现，PAO-17主题工作**已有本地新提交**：

- 任务树 `D:/worker/paoku-sessions/pao-17`，`codex/pao-17-render`，本地 `5298e1a487ccda90cbfba9b0a53814fea056184e`，主题 `feat(PAO-17): preview bright bounded track and surface-aligned ramps`，是536f54b后继。跟踪内容无未提交改动，原`.pao17-local/`未跟踪证据仍在。
- 交接读取时`ls-remote`仍为 `536f54b41866e2819d21cd674e64af2cb4d70f80`，因此**不能声称5298e1a已推送或已验收**。Agent可能仍在收尾；不替它reset/强推/清理，不自动联系或启动Agent。
- 下一步先核对该任务最新本地/远程与用户返回，再读其 `docs/evidence/PAO-17/bright-theme-preview/verification.md`、`final-results-and-protection.json`及实施计划。需要时只读实际代码差异；本交接没有审读或认可新主题测试结果/截图。
- 已批准的主题计划为主仓[2026-11-02-pao17-bright-theme-execution.md](../plans/2026-11-02-pao17-bright-theme-execution.md)，第5节提示词已交用户。**不要再次派发同一主题实现提示词，不要把它当未开始，也不要重复索取批准。** 取得最终推送后由主Agent独立复审。

## 用户目标与协作方式

Web 3D跑酷全面重构，Vite/TypeScript/Babylon.js，已批准明亮风格化城市轨道方向。不是Godot，不因本机技能目录含Godot而切引擎。主Agent负责规划/边界/调度/独立验收，不直接写游戏实现。

用户在各任务独立聊天手动粘贴提示词。不要自动启动任务/子Agent、新建任务聊天、合并或删除工作树。新主会话也不因接续而自动执行其他任务。只读核验和本职责文档工作可自主推进；已批准范围不反复询问，新增具体设计按AGENTS第8条处理。

本地自动流程先行，手工绑定/刷权/拓扑/动作精修和场景手工修整延期到TODO，不自动安排人工或云上传/Tripo/Mixamo调用。可接收带未知项的技术探针阶段，正式品质标准与父任务Done不降低。

## Git与工作树

- 主规划树 `D:/worker/paoku`，分支 `docs/pao-6-playtest-baseline`；本次交接起点18b17ae，交接文件正常commit/push后以最终HEAD为准。主树旧运行时代码只有56单测，**不是各实现任务的基线**。
- M1已审链终点 `D:/worker/paoku-sessions/pao-14`，`codex/pao-14-application@19aa31492ddce4c1c5e74ef1e49312ad41ec2dd6`，包含10→11→12→13→14。
- PAO-15：`D:/worker/paoku-sessions/pao-15`，`codex/pao-15-character-assets@64c4f3120224f42995bc4b0fae544feae139d380`。
- PAO-16：`D:/worker/paoku-sessions/pao-16`，`codex/pao-16-world-assets@c7b09e6136acbbb5e248baa2d24e2d71c51a4773`。
- PAO-17：已审结构536f54b；本地主题候选5298e1a/远端读取时536f54b，见首节。
- PAO-19：`D:/worker/paoku-sessions/pao-19`，`codex/pao-19-ui@ed39cb9aad981da1e9eda0a196b86d0c0c6702d9`。
- 原资产只读树 `D:/worker/paoku-sessions/glb-review@7a2fb2963deae061d15deae4019910a15f0dfbcf`。本轮origin/main仍此SHA，不从main覆盖实现树。
- 7/8/9规划树仍为pao-7@c66b59e、pao-8@be6c7d5、pao-9@59fc682。18目录尚未创建；20以后也不随本次自动启动。

分支交付分别保留，15/16/19未整合进17。本批主Agent不自动merge/cherry-pick。后续集成必须固定来源和串行main/types写权。

## 阶段验收与Linear（本轮已回读）

Project `492a7fa2-dba9-4b7b-9d22-154822bbe5a2`，Workspace Paoku-v1，Team PAO，父总纲PAO-5。

| 任务 | 真实进展 | Linear父状态 |
| --- | --- | --- |
| 6、10～14 | 已Done；M1终点19aa314已验收，旧已关闭问题不重开 | Done（前次已审记录） |
| 7/8/9 | 9技术契约与7适用UI条目已接受；完整风格/设备预算未全部冻结 | In Review（本轮核对） |
| 15 | 自动骨架/真实蒙皮/独立导入试样阶段通过，不是正式13动作完成 | Backlog |
| 16 | 首批3de6e54及自动细化c7b09e6阶段通过；四件productionAccepted=false | Backlog |
| 17 | 设计fcddba1及结构/I-01/I-02的536f54b通过；明亮主题已批准，候选5298e1a待接收 | Backlog |
| 18 | 未启动，仍有15/17正式前置 | Backlog |
| 19 | ed39cb9独立验收通过，旧菜单重试和竖屏遮挡两项P2关闭 | Done |

父Backlog不表示阶段成果不存在；阶段接收不冒充父Done，不擅改依赖。20～26仍按原路线后续处理，具体下一项先查正文和依赖。

## 已审证据索引（按需读）

- [PAO-15自动绑定主审](../reviews/2026-11-01-pao15-rig-spike-review.md)：23骨、真实软蒙皮、11诊断姿势和一个5秒诊断clip，独立Blender重开重导出/build/257单测/44E2E通过。肩肘髋膝串权等见[主人工TODO](../art/pao15-rigging-manual-todo.md)，不再重做同一探针、不假定必须整角色重拓扑。
- [PAO-16细化主审](../reviews/2026-11-02-pao16-calibration-refinement-review.md)：260单测、43旧E2E+2工具预览通过，0重试；12266交点、96索引对照复算一致。三张新图已看，不再整批复看。高栏1649采样点为1015达显示阈值/382未达/252未知，不是连续净空证书。不要再开第三轮相同自动采样。
- [PAO-17结构主审](../reviews/2026-11-02-pao17-structure-implementation-review.md)：261单测、48完整E2E通过（315.045秒、0重试），补充真实GLB测试1项通过；1078跟踪路径稳定、995原件保护、三张N图已看。仅结构阶段，不是新主题验收。
- PAO-17补充检查：首次8→9纹理数来自阴影延迟初始化，充分暖机后20次reset稳定；实际延迟HTTP销毁发生ERR_ABORTED、活动请求/缓存/场景归零，底层loader Promise在取消路径未结算。两次主审探针修正保留，不声称任意Promise结算或堆内存回收已证明。
- [PAO-19主审末节](../reviews/2026-11-01-pao19-implementation-review.md)：252单测、60完整E2E、0重试；不能将其计数/新UI能力算给尚未整合19的17树。
- 工具/完整回归镜像在各树本机忽略目录，主规划docs/evidence只放精简父审结果。原E2E偶发PAO-6坡落地GAMEOVER/PAO-14传感器空值均保留；最终零重试通过不等于已解释或修复这些时序现象。

## 当前主题批准的确切范围

[设计](../superpowers/specs/2026-11-02-pao17-bright-theme-preview-design.md)与[实施计划](../plans/2026-11-02-pao17-bright-theme-execution.md)已经用户明确批准：

- 单一明亮城市轨道程序几何工程主题，低Glow/暖主光冷填光/FXAA，工程参数可为可读性微调并记录；不是正式整套美术或设备预算签收。
- 有界段池，L初值120m、5段idx-1..idx+3，按绝对floor(playerZ/L)处理跨多段/回退/重开；远裁剪/雾必须受覆盖约束，移动节点无陈旧冻结矩阵。
- MENU/SHOP显示独立展台，PLAYING/PAUSED/GAMEOVER隐藏；相机/追逐者策略留18。
- RAMP真实楔形，坡脚z-depth/2,y，坡顶z+depth/2,y+height；贴坡箭头。程序车顶板铺满只读ROOF宽深，纠正旧0.96/0.98缩进和低0.005m表现偏差；物理、尺寸和SURFACE_EPSILON不变。标准坡脚67/顶73/车顶出口85与Y+5另验。
- 白名单仅render四文件和新专属theme/ramp测试/任务证据；main/types/modelBindings/core/systems/application/DOM/public/依赖/默认配置/旧测试只读。不加载四件新GLB、不合入15/16/19、不做正式动作/镜头。
- 完整原261单测/48E2E和新专属测试、真实N/F及2～3新图、20轮回收/10reset/dispose、raw/HTTP/hash/历史保护与正常hooks。下一主Agent据5298e1a实际最终交付审查，不借此扩大批准范围。

## GLB事实与后续边界

21个新GLB没有skin/animation；旧player.glb有骨架/7clip但不等于正式动作。runner静态完整高度约0.9791，派生绑定工程不是原作者DCC。作者0f96ee7已确认原始DCC/源标记及轨道/站台套件不存在或未交，不再反复索取不存在的原始工程。

train_metro=带黄坡工程车，train_ramp_or_car=普通车厢；五件FBX来源已有节点X旋转，禁止统一再转。raw AABB不是米制物理或可走边界，RH诊断矩阵不直接搬LH游戏。普通车双驾驶室可选游戏约定前向，不必强求源有唯一固有车头；支撑/接触/净空仍需具体资格。149.5MiB/41张4K/约143万三角是总资产量，不是同屏或真机测量。新道具文件不授权新玩法。

## 新会话执行约定与工具

- 按AGENTS文档先行、TDD、build/test/完整E2E与真实截图；默认看2～3关键图，有异常再扩看。N自然输入与F故障/QA分报；完整回归镜像只重定向输出、原断言可逆恢复，保留首次失败/旧证据，不改时钟/skip换绿。
- 验证用独占端口strictPort/reuseExistingServer=false，Windows ANGLE D3D11：15=5185、16=5186、17=5187、18预留5188、19=5189。不要停别的树服务。核对raw源码和实际资产HTTP hash、前后保护清单；充分暖机后立资源基线。
- Git `D:/APP/WorkBuddy/resources/vendor/PortableGit/cmd/git.exe`；主树加`-c safe.directory=D:/worker/paoku`，仍须明确workdir/-C。Node/npm位于`C:/Program Files/nodejs/`。
- 正常hook的bash/npm路径可用**进程临时PATH**前置既有`C:/Users/Administrator/AppData/Local/Temp/paoku-doc-review-npm-shim`、PortableGit/bin/cmd与Node目录。不得改hook或跳检查。
- 纯文档审查内容/引用及diff检查，正常hooks额外build/56单测保留，不为文档跑游戏浏览器。只暂存本任务文件，正常commit/push并回读远程；不强推、不捎带任务树临时文件。所有已授权范围继续执行，不重复问批准。
- Superpowers实际备用技能根为`C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/`。按需使用，已安装技能内容与项目适配以当前AGENTS/用户约束为准。
- “5小时窗口”指账号额度刷新，不能当5小时工作量；无实际耗额数据，旧6～10/12～20窗是未校准工程预算，不是完整正式品质承诺，已完成阶段不重复估算。

当前无本主Agent运行中的游戏验证会话需接管，未创建自动提醒或其他任务。接续以页首当前事项为准，不再重复历史主题推送核验。
