# PAO-15 基础动作样本与 PAO-18 动作/镜头并行准备

2026-11-03（Asia/Shanghai）。用户要求本主Agent继续负责。当前只准备设计/接口和后续验收矩阵，不启动其他聊天/Agent，不制作新动作或写游戏实现。用户分别粘贴触发，两项可并行；具体设计返回后由主Agent审查、用户批准，再进入实施计划。

## 目录、基线与边界

| 任务 | 聊天、目录与分支 | 固定准备起点 | 本轮交付 |
| --- | --- | --- | --- |
| PAO-15 | 原15聊天；D:/worker/paoku-sessions/pao-15；codex/pao-15-character-assets | 64c4f3120224f42995bc4b0fae544feae139d380 | 本地自动Idle/Run/Jump/Slide技术样本设计、采样/导出/质量边界 |
| PAO-18 | 新18专属聊天，选择D:/worker/paoku-sessions/pao-18；codex/pao-18-motion-camera | 82d2d47b333de2cc0da778591f99df8fe98084ed | 动作驱动/接触反馈/镜头安全区及接口、验收矩阵 |

15树跟踪内容核对无改动；18工作树已从已审17主题建立，干净，未安装依赖、运行本树测试/服务或推新分支。18不含15新runner或19新UI，建目录不代表正式实现或父依赖放行。两树互不写入，不合并，不从对方活动目录取未审产物作为契约。

当前事实：[15自动绑定主审](../reviews/2026-11-01-pao15-rig-spike-review.md)通过23骨/真实蒙皮/单个诊断clip；[17主题主审](../reviews/2026-11-02-pao17-bright-theme-review.md)通过明亮轨道/循环/坡顶。15/18仍Backlog，正式动作/角色品质及15/17→18依赖保留。

[人工TODO](../art/pao15-rigging-manual-todo.md)的刷权、拓扑、局部接触和动作精修继续延期，不重做绑定探针，不索取已确认不存在的原作者DCC，不上传云或付费调用。共享总纲由Dispatcher统一整合。旧绑定/主题提示词已经执行，不重复派发。

## 主Agent下发前门禁

主Agent先按[交接第3、4节](../handoffs/2026-11-02-main-agent-m2-theme.md)完成目标worktree的创建或复用，并核验Git登记、顶层、分支、实际HEAD、基线祖先关系和用户改动，再交付下面的提示词。不能只提供预期路径、把建树留给任务Agent；也不能因“不自动启动任务”而省略目录准备。

2026-11-03本机PAO-18已登记在D:/worker/paoku-sessions/pao-18，分支codex/pao-18-motion-camera，实际HEAD等于准备基线82d2d47b333de2cc0da778591f99df8fe98084ed，当前直接复用。本轮复核时已出现未跟踪候选设计/接口矩阵/准备证据，等待任务方交付，不重复派发第2节。新会话必须复核；HEAD推进或有未提交内容则保留并检查新成果，不回退或重复派发。目录已建不代表新聊天已绑定、依赖已安装、检查已通过或远程分支已推送，回执须分别说明。

用户新建18专属聊天时选择D:/worker/paoku-sessions/pao-18。提示词中的目录声明不会自动切换聊天cwd；命令必须显式使用任务workdir或git -C。任务Agent首次简短回报实际目录/顶层、分支、HEAD及“仅设计”阶段；发现目标目录缺失或分支错误，返回具体核验结果交Dispatcher处理，不改主规划树。

## 1. 复制到原 PAO-15 聊天

~~~text
继续PAO-15，本轮只设计本地自动基础动作技术样本，不生成动作/新GLB或修改游戏。目录D:/worker/paoku-sessions/pao-15，codex/pao-15-character-assets，固定准备起点64c4f3120224f42995bc4b0fae544feae139d380。先核对Git/用户改动，不reset/merge或启动其他任务/Agent。
命令显式设workdir为上述任务目录或git -C；先核验show-toplevel、branch、HEAD、status及基线祖先关系，首次简短回报结果。不要把提示词路径当作cwd已切换；目录/分支不符先交Dispatcher纠正，不在主规划树写设计。已有后续成果先检查保留，不因固定准备起点而回退或重复执行。
先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-03-pao15-pao18-preparation-prompts.md及15主审/人工TODO链接；再按需读本树character-spec、rig-spike/README、pose-index/骨架清单与build.py相关骨架/姿势定义。不扫全库/全部GLB/图集，不重跑已验收绑定。
现有派生工程assets-source/characters/runner/rig-spike/runner-derived.blend、诊断GLB docs/evidence/PAO-15/rig-spike/runner-rig-spike.glb，23骨/真实蒙皮但仅rig_diagnostic。Blender4.5.3已在.pao15-local/blender/便携部署，有旧版本/hash记录。本轮只读资料，不打开保存二进制工程、运行导出或改旧样本；原作者DCC不存在，未来只能创建标明来源的新版本派生工程。
使用using-superpowers/brainstorming形成完整可审设计；按需用art-animation-vfx/animation-spec，项目30fps、0基半开区间与GLB边界键约定优先于通用2D/1基闭区间/战斗模板，不引入攻击/美术无敌判定。疑点列假设/选项继续草案，不因已知源缺失或每个参数反复问用户。
只写docs/superpowers/specs/2026-11-03-pao15-basic-motion-sample-design.md、docs/art/pao15-basic-motion-sample-spec.md、docs/evidence/PAO-15/basic-motion-preparation/纯文本证据。src/public/脚本/旧测试/依赖/二进制/旧rig-spike证据和共享总纲/PROGRESS只读；本轮不写实施计划/测试代码，不安装工具或上传模型。
比较至少两条本地路线：现有23骨/rest数据上的脚本关键帧，或本地IK/约束后烘焙；推荐最小可复现路径，注明关节轴/自动权重风险。目标为Idle/Run/Jump/Slide四类技术样本，建议tech_idle_v1等独立命名；Jump/Slide如何展示分阶段、未来拆分/循环/中断及缺项须写明，不计成完整13正式clip。
提出每样本fps/N/秒、[0,N)播放和t=N/fps边界键、循环或hold_last、关键局部骨姿势、循环速度连续性、表现标记与取消优先级。root XYZ平移/旋转固定绑定值、scale1，局部pelvis变化与世界起跳/前进分离；move_delta=0，美术无敌/攻击窗口N/A，clip末帧不决定落地或滑铲结束。已知肩肘髋膝串权/脚底/包穿插带证据列TODO，人工延期，不推定必须重拓扑或重绑。
设计候选manifest：源/派生hash、骨架/clip版本/真实节点名、时长/循环/根轨道/坐标/loader手性/表现标记、未知/质量分类。它不修改公共schema，也不让18直接消费未审产物；18可参考准备稿，未来资产仍由主Agent按固定提交验收。
给后续有意义RED/质量矩阵：skin/IBM/<=4归一化权重、四clip真实时长/根固定/关节形变、循环边界、DCC与Babylon逐姿一致、暂停/切clip/重播/归位/释放重载；2～3关键图+短录屏。工具错误须闭环，视觉瑕疵分报，预算沿用已审隔离试样上限，不把正式面数/真机预算当通过；未来5185独占、不复用。
拟议未来新派生目录、导出/脚本/专属测试/证据白名单，保护旧blend和诊断GLB；后续代码须build/test/完整E2E及raw/HTTP/历史hash核对。本轮只交设计矩阵，不把这些写成已运行通过。
内容/引用审查、git diff --check，正常hooks仅提交本任务文档，push当前分支核对远程SHA；hook依赖按锁文件安装，不改依赖/跳hook。报告设计/规格/候选接口及提交分支，送主Agent审查；不标15 Done、不放行18、不进入writing-plans/实现、不合并或启动其他任务。具体设计批准后另发执行提示词。
~~~

## 2. 复制到 PAO-18 专属聊天

~~~text
作为PAO-18动作/镜头Agent，本轮只设计准备。目录D:/worker/paoku-sessions/pao-18，codex/pao-18-motion-camera，固定准备起点82d2d47b333de2cc0da778591f99df8fe98084ed（已审17结构/明亮主题）。主Agent已建树，先核对Git/用户改动，不另建树/reset/merge/cherry-pick或启动其他任务/Agent。
命令显式设workdir为上述任务目录或git -C；先核验show-toplevel、branch、HEAD、status及基线祖先关系，首次简短回报结果。目录声明不会自动切换聊天cwd；若目录缺失/分支不符，返回具体检查结果交Dispatcher修复，不把D:/worker/paoku作替代。不因已有worktree而声称聊天已绑定或运行环境已验证；HEAD若已推进，先保留检查新成果，不回退或重复派发。
先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-03-pao15-pao18-preparation-prompts.md与15/17主审链接；主仓架构/流程/测试只读当前生效段，Linear PAO-18正文/依赖只读，不改状态或发评论。
事实：本树有RenderFrameIdentity、reset/dispose、明亮主题/楔形坡，但实际仍是legacy player七clip别名，不是新runner。15只有23骨/单诊断clip已审，四基础动作仍在并行设计；19新UI未合入。缺项不得写成已有能力，15/17→18父依赖保留。
用using-superpowers/brainstorming比较至少两条路线，推荐保留门面/生命周期、分离characterView/cameraRig并只读消费事实；大main/总线重构列成本和独立请求。形成完整可审草案，细节未知列假设继续；不重复审批M1/明亮主题，本轮不进入writing-plans/实现。
按需只读本树babylon.ts角色/动画别名/追逐者/镜头/reset/dispose，必要types/index.ts和contracts.ts；main只看I-01、PLAYER_LANDED、重开/释放桥附近，必要时physics.ts仅查contact/support与事件发出处，不扫描全部系统。Player实际有contact、supportSurfaceId/supportSample、vy/isJumping/isRolling；不虚构完整motionPhase或PAO-9事件envelope已实现。落地不能以y===0或clip结束猜权威。
只写docs/superpowers/specs/2026-11-03-pao18-motion-camera-design.md、docs/render/pao18-interface-and-validation.md、docs/evidence/PAO-18/preparation/纯文本证据。src/public/HTML/依赖/测试/共享总纲/PROGRESS只读，不写原型、导入/生成资产、拆渲染或调镜头，不改15/17树。15准备稿如引用须注明候选/未批准/版本；它未产出也不阻塞18完成草案。
设计动作选择/过渡/打断：跑、离地/上升/下降、地面/坡/车顶触地、滑铲阶段、切道叠加、受击/失败、滑板姿态。分清当前事实、派生表现状态、缺clip和最小接口请求；root只读模拟位置，骨架作用visual child。旧jump→run/slide→sneak_pose不当正式动作，动画不决定伤害/无敌/落地或roll时长。皮肤、旧请求/新局同ID、暂停重播/reset/dispose与17兼容。
明确15候选manifest/可用与缺失clip/版本/循环/相位/标记接口及I-03事实桥。若现有事实没有去重身份，提出最小run/tick/事件关联请求，由主Agent另定单一入口写入者；不自行加总线协议/shared types/main，也不把15活动目录当生产资产。
镜头含独立支撑/目标高度缓冲、前视/安全区、高速/切道/落地反馈、低动态参数，重点处理已知390追逐者裁边；验证角色/警官/犬屏幕可见与HUD保留区，只改表现不挪模拟坐标/碰撞。旧UI与19新UI安全区输入差异列接口，不让渲染遍历HUD/绑定DOM输入。低动态可先局部参数，UI入口/持久化另提请求，不自加schema或设置页。
列实施拟议白名单/顺序：characterView/cameraRig/babylon由同一18实现方接续，不与17并写；main/types/UI请求另串行。明确哪些能先用现有角色/合成clip验证、哪些等15样本/正式动作；工程样本不当正式父验收。
后续RED矩阵覆盖动作/打断/重复事实、只读快照/无root重复位移、各支撑面触地、新旧局/迟到/暂停重开、镜头目标高度/变帧率/低动态/390投影安全区、20轮/10reset资源稳定和dispose。未来N键盘/触摸与F事实/故障分报，build/test/完整E2E、5188 strictPort/不复用/D3D11、raw/HTTP/历史保护；2～3关键截图+高速/跳滑/坡顶短录屏，静图不证明动作自然。
纯文档不为本轮跑E2E/截图或预装运行环境，不把矩阵当已通过。内容/引用审查和git diff --check，正常hooks仅提交任务文档，hook需要时按锁文件装依赖，不改依赖/绕过。首次git push -u origin HEAD核对远程SHA，交主Agent审查。具体设计批准、固定实施提交后另发提示词；不标18 Done、不解除依赖、不合并或启动20/21。
~~~

两份设计独立返回，不必等“正式资产全齐”才审方案；后续按实际可用条目审批小批实现。样本/镜头工程预览均不替代正式动作/接触品质验收。
