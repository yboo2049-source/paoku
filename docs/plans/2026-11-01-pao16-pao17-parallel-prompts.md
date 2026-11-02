# PAO-16 自动标定接续与 PAO-17 设计准备提示词

> PAO-17准备提示词已执行：fcddba1的[方案准备主审通过](../reviews/2026-11-02-pao17-preparation-review.md)，不要重复派发第2段。当前待具体路线A及I-01/I-02范围审批，尚无正式实施提示词。PAO-16第1段仍按其原聊天实际进度接续，不覆盖本地未提交工作。

2026-11-02补齐（Asia/Shanghai，文件沿用11-01批次命名）。两项可以并行，用户分别粘贴后才执行。主Agent不启动聊天/Agent、不写游戏实现、不合并分支。首批标定[主审](../reviews/2026-11-01-pao16-calibration-spike-review.md)已通过技术阶段；四件资产均未获正式接入资格。

| 任务 | 粘贴位置 | 独立目录与分支 | 本轮交付 |
| --- | --- | --- | --- |
| PAO-16 | 原PAO-16聊天 | D:/worker/paoku-sessions/pao-16；codex/pao-16-world-assets；起点3de6e54 | 同四件资产自动测点/净空细化、独立预览及剩余TODO |
| PAO-17 | PAO-17专属聊天，选择下列目录 | D:/worker/paoku-sessions/pao-17；codex/pao-17-render；准备起点19aa314 | 只读现有渲染，形成设计、接口及验收方案；不写实现 |

PAO-17目录已从已验收M1建立，仅供文档准备，未安装依赖/运行基线/启动任务；19aa314不是未来正式接入基线。PAO-17正式实现仍等具体设计批准、所需资产条目验收与Dispatcher固定接续提交；其16/9原生依赖不解除。PAO-16/17互不写对方工作树；共享文档由Dispatcher统一同步。端口分别5186/5187，仅在各自需验证时使用，strictPort、不复用或停止别人的服务。

## 1. 复制到原 PAO-16 聊天

```text
继续PAO-16，执行首批技术标定后的本地自动细化Spike。工作目录D:/worker/paoku-sessions/pao-16，分支codex/pao-16-world-assets，接续3de6e543ff5b5d29a2c624c8d482e5acb8865444。先核对Git及用户改动，不reset/merge其他分支、不启动其他Agent或任务。
先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-01-pao16-pao17-parallel-prompts.md、D:/worker/paoku/docs/reviews/2026-11-01-pao16-calibration-spike-review.md，再按需读本树既有core/measure/preview与诊断JSON、TODO。不重复扫描全资产/全图集。现有3de6e54已通过主审，不重复原样跑一遍充作新交付。
范围仍仅glb-review@7a2fb29的普通车厢train_ramp_or_car、带坡工程车train_metro、低栏obstacle_hurdle_barrier、高栏obstacle_slide_barrier。原GLB、M1物理和src/public只读。目标是减少测点语义未知项：车头正负方向的可复核特征、轮轨接触候选、实际车顶可走边界；工程车坡脚/坡顶/车顶交界候选和两侧范围；高栏全宽/全深通行区域；低栏杆/脚的结构范围。
优先使用实际三角形、连通/法向/剖面与独立预览。自动置信不足仍写null、候选集合和理由，不要求用户点坐标，不把AABB/内点拟合残差当端点证书或必须重建证明。净空采样明确覆盖范围与采样误差，不能把有限采样声称连续空间证明。没有可靠结论时交付自动方法的边界及TODO，不无休止试参数。
保持M1现行尺寸/碰撞容差不变：车2.4×3×12、坡2.4×3×6、坡脚Z67/顶73/车顶出口85，非零基准Y+5另验；工程车只一个视觉根。源节点X旋转及RH/LH转换各一次。可在独立工具比较LH加载边界，但任何结果都不等于游戏已接入，不把RH矩阵直接复制生产。
先补本次任务级计划与有意义RED，再改工具。可写tools/pao16-calibration/、既有pao16专属单测/E2E及必要新增同前缀专属测试；新诊断docs/assets/pao16-calibration-refinement.json、新证据docs/evidence/PAO-16/calibration-refinement/、docs/art/pao16-calibration-todo.md与本任务实施记录。首批calibration-spike证据及诊断JSON保留，不覆盖旧结果；新增量测从新入口输出新路径。临时镜像/输入/配置留.pao16-local/，不改共享配置、依赖、旧测试、PROGRESS或其他共享总纲。
同步纠正工具生成TODO中“必须取得作者可编辑源再修整”：原作者已确认原始DCC不存在，未来只能建立标明来源的重建派生工程；本轮不执行派生几何修整、手工建模/刷权/烘焙/LOD/材质精修，也不做外部云上传。原始证据的旧文字由新记录说明更正，不抹去历史。
每批工具改动立即类型/单测检查，最终完整build/test/E2E及独立真实预览，5186独占strictPort、reuseExistingServer=false、Windows ANGLE D3D11。核对raw源码、四资产源/副本/HTTP哈希和历史保护文件；旧回归镜像保留原断言且重定向证据，保留失败记录。查看2～3张真正新增关键图，异常再扩看。
正常hooks提交、push当前任务分支并核对远程SHA，报告新增可靠结论、仍未知项、分类变动与依据。不标PAO-16 Done，不解锁或执行17/18/20，不整合PAO-15/19实现；交主Agent阶段复审。
```

## 2. 复制到 PAO-17 专属聊天

```text
作为PAO-17渲染任务Agent，本轮只做方案准备。工作目录D:/worker/paoku-sessions/pao-17，分支codex/pao-17-render，准备基线19aa31492ddce4c1c5e74ef1e49312ad41ec2dd6。主Agent已建立目录；先核对Git/用户改动，不自行建树、reset、merge/cherry-pick或启动其他Agent/任务。
先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-01-pao16-pao17-parallel-prompts.md和其中PAO-16主审链接；主仓架构/系统流程/测试规范读当前生效章节，旧坐标例子不作为契约。核对Linear PAO-17正文/依赖，只读不改状态或发评论。
任务分类为Architectural设计准备，遵循using-superpowers及brainstorming，形成可供主Agent/用户审查的具体设计，不进入实现。总体明亮城市方向/M1不重审；若细节没有答案，列明确假设和选项继续完成可审查草案，不阻塞在缺失原始DCC或要求用户截图库。
只按需读本树src/render/babylon.ts；进一步仅为核实实际公开门面/快照读取src/main.ts调用处、必要types及modelBindings，不扫描全库。PAO-16仅使用主仓主审中已接收的技术条目；其运行中的目录/新未验收数据不当固定契约。PAO-19已验收ed39cb9、PAO-15仅自动试样已审，但本树均未合并，不能冒称已包含它们。
写docs/superpowers/specs/2026-11-01-pao17-render-design.md、docs/render/pao17-interface-and-validation.md及必要docs/evidence/PAO-17/preparation/纯文本证据。其他文件只读，尤其src/public/HTML/依赖/测试/共享总纲/PROGRESS。当前不做HTML原型、渲染拆分、资产接入或失败测试实现；纯文档阶段无需安装依赖或为文档运行E2E。
设计比较至少两条可行路线，给出推荐和理由：保留现有BabylonRenderEngine公开门面后逐步拆assets/environment/entityViews，或更大范围更换表现层。基于实际接口列出职责/所有权、快照同步与重开/销毁生命周期、异步加载失效/失败回退、实例和共享材质释放、阴影引用、主题段循环/近中远景和克制后处理方案；不得给渲染DOM输入、碰撞/存档或玩法权威。
为PAO-18预留角色/动作镜头交接边界，不实现正式动画或13clip，不与18并写babylon.ts。普通车/工程车显式绑定，工程车一个视觉根对应RAMP/ROOF；标定缺口不得改物理绕过。列哪些纯渲染工作可独立验证、哪些必须等生产资产元数据/风格预算或后续串行接线。缺轨道/站台等资源如实列缺口，候选程序几何方案只提设计，不自动制作。
给出后续RED测试矩阵：状态快照只读、过期加载/重开、失败回退、重复实例/单组合根、RH/LH一次转换、资源计数稳定/清理、循环接缝和障碍可读；未来真实N/F流程及桌面/390竖屏2～3关键截图、build/test/完整E2E、5187 strictPort/reuseExistingServer=false、raw/hash/历史证据保护。纯方案不把测试矩阵写成已运行通过。
main/types/DOM跨界只提交最小接口请求，由主Agent另行串行安排。列设计待决项、正式实现前置和拟议白名单；设计送审后停在本轮准备交付，不自动进入writing-plans/实现。具体设计获批准且主Agent同步共享文档、固定正式接续提交后，另发实施提示词；19aa314仅本次文档分析起点，不是未来正式接入放行。
内容/引用审查、git diff --check，正常hooks仅提交本任务文档；首次git push -u origin HEAD并核对远程SHA。hooks如需依赖按锁文件在本树安装，不更改依赖或绕过hooks。报告设计/接口/验收矩阵链接、提交/分支及推送结果，仅交主Agent审查，不标PAO-17 Done、不改依赖、不合并或启动18。
```

先把第1段贴回原PAO-16聊天，再将第2段贴到选择PAO-17目录的独立聊天；两个聊天可同时工作。主Agent按各自固定提交分别验收，未提交或正在变化的交付互不作为已冻结输入。
