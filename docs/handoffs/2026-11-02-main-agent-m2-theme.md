# paoku主Agent交接：当前状态、工作树准备与下一批调度

最后核验：2026-11-03（Asia/Shanghai），文件名沿用原交接入口。新会话先读D:/worker/paoku/AGENTS.md和本文件，再按需读当前任务的计划/报告。下列当前状态统一生效；旧状态仅查历史报告，不在本文件保留互相冲突的快照。

## 1. 当前要做什么

PAO-17明亮主题已独立验收，最终实现分支82d2d47已推送，验收记录d9c3d58已推主规划分支。不要重复派发或重验同一主题批次。

当前是[PAO-15/18并行设计准备](../plans/2026-11-03-pao15-pao18-preparation-prompts.md)：

- PAO-15原聊天：设计本地自动Idle/Run/Jump/Slide技术样本，不重做已验收绑定。
- PAO-18专属聊天：设计动作/接触反馈/镜头和最小接口，不写游戏实现。其独立worktree已经创建并核验，见第2节；本轮复核时已出现设计草案/接口矩阵/准备证据，尚未提交，不重复派发，等待任务方交付。
- 具体设计待任务方返回、主Agent审查及用户批准；不启动动作制作/18实现，不合并。人工权重/拓扑/动作精修继续延期，父依赖保留。
- 用户要求“给某任务提示词”时，主Agent先完成第3节目录/分支/基线准备，再给提示词。只在文字里写一个目录不算准备完成。

## 2. 工作树当前状态：唯一事实表

这是本机实际Git登记与命令核验结果，不代表其他机器自动有这些目录。新会话须快速复核；HEAD若已经推进，应审阅实际进展，不reset回表中旧值。

| 任务 | 实际目录 | 分支 | 本次核验HEAD | 状态 |
| --- | --- | --- | --- | --- |
| 主规划 | D:/worker/paoku | docs/pao-6-playtest-baseline | 修订前18a5b28；以最终HEAD为准 | 已存在；旧运行时代码/56单测，不是实现起点 |
| M1终点 | D:/worker/paoku-sessions/pao-14 | codex/pao-14-application | 19aa314 | 已存在，10→14链已审 |
| PAO-15 | D:/worker/paoku-sessions/pao-15 | codex/pao-15-character-assets | 64c4f31 | 已创建/复用，跟踪内容干净 |
| PAO-16 | D:/worker/paoku-sessions/pao-16 | codex/pao-16-world-assets | c7b09e6 | 已创建，跟踪内容干净；不追加同类采样 |
| PAO-17 | D:/worker/paoku-sessions/pao-17 | codex/pao-17-render | 82d2d47 | 已创建，跟踪内容干净；原.pao17-local未追踪证据保留 |
| PAO-18 | D:/worker/paoku-sessions/pao-18 | codex/pao-18-motion-camera | 82d2d47 | 已创建且登记；已有未跟踪设计文档，保留等待交付 |
| PAO-19 | D:/worker/paoku-sessions/pao-19 | codex/pao-19-ui | ed39cb9 | 已创建，跟踪内容干净，UI已Done |
| 原资产只读树 | D:/worker/paoku-sessions/glb-review | detached | 7a2fb29 | 已存在，不覆盖原GLB |

PAO-18实际核验详情：

- Git顶层为D:/worker/paoku-sessions/pao-18，分支codex/pao-18-motion-camera，HEAD为82d2d47b333de2cc0da778591f99df8fe98084ed。
- 主仓worktree list --porcelain包含该目录/分支；其.git为指向D:/worker/paoku/.git/worktrees/pao-18的文件，git-common-dir为D:/worker/paoku/.git。linked worktree的.git通常是文件，不要求它是目录；文件可能隐藏，优先用Git命令核验。
- 已从已审17主题建立，不含15新runner或19新UI；未安装依赖、运行本树基线/浏览器或推送远程18分支。没有origin/codex/pao-18-motion-camera不等于本地树不存在，不用空提交证明建树。
- 当前直接复用，不再新建第二份同名/同分支worktree。新会话若访问不到它，按第3节处理，不能直接抄“已创建”。
- 本轮后续复核发现未跟踪的docs/superpowers/specs/2026-11-03-pao18-motion-camera-design.md、docs/render/pao18-interface-and-validation.md及docs/evidence/PAO-18/preparation/read-audit.md。头部标明候选v0.1、待审/待批准；它们由任务树新增，本主Agent不暂存、不改写、不代提交。先前“树干净”是建树时快照，不能再作为当前状态；等任务方最终提交/推送后按固定SHA审查，不重发相同准备任务。

固定完整准备基线：15为64c4f3120224f42995bc4b0fae544feae139d380；18为82d2d47b333de2cc0da778591f99df8fe98084ed。7/8/9规划树仍为pao-7@c66b59e、pao-8@be6c7d5、pao-9@59fc682。

## 3. 主Agent下发提示词前必须完成的准备

主Agent负责核对并创建/复用独立worktree。准备工作树在用户已有授权范围内，无需逐次确认；“不自动启动实现”不等于“不得准备目录”。建树不编写游戏代码，不启动任务聊天/Agent/服务或依赖安装。

按序完成并检查实际输出：

1. 核对主仓分支/用户改动、worktree登记、目标目录和任务分支。只查相关任务，不扫描全库。
2. 从已审记录锁定任务阶段与精确源SHA。对象缺失时只fetch来源任务分支，再验证指定SHA；不pull main覆盖，不把未审最新HEAD替代基线。
3. 正确worktree已存在就复用；不存在则由主Agent创建，规则见下表。
4. 显式workdir或git -C在目标目录核验show-toplevel、branch、HEAD、status、git-common-dir，并与主仓登记交叉核对。只看Test-Path不够，普通文件夹不等于worktree。
5. HEAD应等于准备基线，或包含基线后的实际任务进展。后者检查祖先关系和新增提交/改动，记录实际HEAD，不reset/clean。
6. 完成后才给提示词，明确实际目录、分支、已审基线、实际HEAD、已创建/复用、当前阶段、运行环境是否验证和白名单。不能把漏建树留给用户或子Agent补。

| 情况 | 主Agent处理 |
| --- | --- |
| 目录已登记、分支/基线正确 | 复用并报告已核验，不重复创建 |
| 目录/任务分支都不存在 | 创建新分支worktree，再核验全部信息 |
| 目录不存在，分支存在且未在别处检出 | 核对历史/祖先后用已有分支建树，不覆盖分支 |
| 分支已在其他worktree检出 | 核对能否复用该树，不强制抢占，不给同一树并派多个写入者 |
| 路径存在但未登记/顶层是其他目录 | 不能声称独立树。空目录核对后可正常建树；非空保留并明确占用，先给具体可用目录方案，不删除/覆盖 |
| 有用户/其他任务改动或HEAD推进 | 保留并检查，只处理本任务白名单，不重置用户成果 |

本机PAO-18只读核验命令；每项必须检查退出码与输出，不把敲过命令当核验成功：

~~~powershell
$taskGit = 'D:/APP/WorkBuddy/resources/vendor/PortableGit/cmd/git.exe'
$taskRoot = 'D:/worker/paoku'
$taskDir = 'D:/worker/paoku-sessions/pao-18'
& $taskGit -c safe.directory=D:/worker/paoku -C $taskRoot worktree list --porcelain
Test-Path -LiteralPath $taskDir
& $taskGit -C $taskDir rev-parse --show-toplevel
& $taskGit -C $taskDir branch --show-current
& $taskGit -C $taskDir rev-parse HEAD
& $taskGit -C $taskDir rev-parse --git-common-dir
& $taskGit -C $taskDir status --short --ignore-submodules=all
& $taskGit -C $taskDir merge-base --is-ancestor 82d2d47b333de2cc0da778591f99df8fe98084ed HEAD
~~~

只有确认目录/分支都不存在时才用以下示例；当前PAO-18已存在，不执行此创建命令。若环境提供合适的create_worktree工具优先使用，没有则用Git CLI，不能因工具缺失省略建树。

~~~powershell
& $taskGit -c safe.directory=D:/worker/paoku -C $taskRoot worktree add -b codex/pao-18-motion-camera D:/worker/paoku-sessions/pao-18 82d2d47b333de2cc0da778591f99df8fe98084ed
~~~

分支已存在且未检出时，用worktree add <目标目录> <已有分支>，不加-b/--force。建树后重复核验。纯文档准备不必为“目录就绪”装依赖/跑E2E；正常hook的必要依赖另按锁文件处理。

## 4. 文件系统目录与聊天目录分开确认

worktree已创建，不代表Codex新聊天已选中它；提示词写路径也不会自动切换cwd。

- 用户新建18聊天应选择D:/worker/paoku-sessions/pao-18；主Agent交付时明确告知该路径。没有聊天管理工具就不能声称已自动创建/绑定聊天。
- 任务Agent命令必须显式设目标workdir或git -C，再核对Git顶层/分支/HEAD；仍在D:/worker/paoku时先纠正目录，不在主规划分支提交18设计。
- 目标目录实际缺失时，返回具体检查结果交Dispatcher修复，不把主规划树作替代，不自行启动实现。
- 任务首次返回简短列实际cwd/顶层、分支、HEAD、当前“仅设计”阶段；最终只提交任务白名单。准备目录/创建聊天/启动实现/远程推送是四件不同的事。
- 下发前主Agent给用户的就绪回执至少含：PAO编号、绝对目录、分支、实际HEAD、基线祖先核验、已创建或复用、阶段/允许写入、是否已跑本树检查。

## 5. 角色、授权和当前入口

Web 3D跑酷，Vite/TypeScript/Babylon.js；不是Godot。主Agent只规划、约束、准备工作树、文档和独立验收，不直接写游戏实现。用户在任务聊天手动粘贴，禁止自动启动任务/子Agent/新任务聊天、合并或删除工作树。

已批准的总体明亮城市轨道方向、M1及已审17主题不重审。当前15/18只设计，具体方案审查批准后再派writing-plans/实现；人工刷权/拓扑/动作精修延期，无云上传/Tripo/Mixamo调用。已授权的可逆准备动作自行完成，不重复索取相同许可。

当前[两份提示词](../plans/2026-11-03-pao15-pao18-preparation-prompts.md)：第1节对应15；第2节对应18专属聊天。18本轮已出现准备草案，当前等待交付，不重复粘贴启动。两个任务只写各自设计/规格/接口矩阵和纯文本证据，其他源码/资产/旧测试/共享总纲只读。15/18不能互取运行中未审产物为生产输入，不能把四类技术样本当完整13动作或父Done。具体路径/白名单以该文件为准。

## 6. 已验收状态与来源

Project 492a7fa2-dba9-4b7b-9d22-154822bbe5a2，Workspace Paoku-v1，Team PAO，总纲PAO-5。下列Linear状态为最近回读记录；需要变更前再查实际状态，不能因父Backlog否认阶段成果。

| 任务 | 实际进度 | 父状态 |
| --- | --- | --- |
| 6、10～14 | M1链完成，终点19aa314；已关闭问题不重开 | Done |
| 7/8/9 | 9技术契约和7适用UI条目已接受，正式风格/设备预算未全部冻结 | In Review |
| 15 | 64c4f31自动骨架/真实蒙皮/独立导入通过，基础动作设计待做 | Backlog |
| 16 | 3de6e54和c7b09e6技术探针通过，四件生产资格false | Backlog |
| 17 | fcddba1设计、536f54b结构/I-01/I-02、82d2d47明亮主题均已审 | Backlog |
| 18 | 独立worktree已建，已出现未提交候选设计，待任务方交付；正式动作/接口前置仍有缺口 | Backlog |
| 19 | ed39cb9 UI最终复审通过，两项P2已关闭 | Done |

按需查报告，不重复跑已审阶段：

- [15主审](../reviews/2026-11-01-pao15-rig-spike-review.md)：23骨、真实蒙皮、11诊断姿势/单个5秒clip；独立Blender重开重导出、257单测/44E2E通过。[人工TODO](../art/pao15-rigging-manual-todo.md)保留肩肘髋膝串权等，未制作正式13动作。
- [16细化主审](../reviews/2026-11-02-pao16-calibration-refinement-review.md)：260单测、43旧E2E+2工具预览，零重试；12266交点/96索引对照通过。高栏1649点为1015达显示阈值、382未达、252未知，非连续净空证书。不再追加相同自动采样。
- [17结构主审](../reviews/2026-11-02-pao17-structure-implementation-review.md)：261单测/48完整E2E、补充真实GLB检查通过。暖机后20次reset稳定；真实延迟HTTP销毁后ERR_ABORTED/资源归零，但底层Promise未结算，不外推堆回收或所有Promise结算。
- [17主题主审](../reviews/2026-11-02-pao17-bright-theme-review.md)：最终82d2d47已推，含5298e1a；build、273单测、53完整E2E和三张新图/资源/保护通过，记录d9c3d58。已完成明亮程序主题、120m×5段循环、局内展台隐藏、逻辑楔形坡/程序顶板接缝；正式GLB/动作/新UI未整合。
- [19主审末节](../reviews/2026-11-01-pao19-implementation-review.md)：252单测/60完整E2E，ed39cb9 Done；不把19成绩和新UI能力算给尚未合入19的18树。

完整回归/QA镜像留各树本机目录，主规划只存精简结果。旧PAO-6坡落地GAMEOVER/PAO-14传感器空值及字体网络失败、各次主审中止/修正均保留，不因最终全绿宣称根因已修复。阶段通过不解除父依赖，不启动20～26；具体下一项按已审来源和Linear正文/依赖规划。

## 7. 资产与数据边界

21个新GLB无skin/animation；旧player有7clip，不等于完整动作。runner静态完整高约0.9791；15派生工程是真实蒙皮试样，不是原作者DCC。作者0f96ee7已确认原始DCC/源标记或轨道/站台源不存在/未交，不反复索取不存在的工程。

train_metro是含黄坡工程车，train_ramp_or_car是普通车厢；五件FBX来源已有节点X旋转，不统一再转。raw AABB不当米制碰撞/可走边界，RH诊断不直接搬LH；普通车可选游戏约定前向，不要求源有唯一固有车头。四件源productionAccepted=false，正式接触/净空/表面元数据另验。

约149.5MiB、41张4K、143万三角是总资源量，不是同屏/真机测量；新道具文件不授权新玩法。15/16/19没有合入17或18，不自动merge/cherry-pick；后续集成固定来源并串行main/types写权。

## 8. 验证、提交和本机工具

- 按AGENTS文档先行/TDD/build/test/完整E2E/真实截图。默认抽看2～3关键图，异常扩看；N自然输入与F故障/QA分报。镜像只重定向输出、原断言可逆恢复，保留首次失败/旧证据，不改时钟/skip换绿。
- 端口：15=5185、16=5186、17=5187、18预留5188、19=5189；strictPort/reuseExistingServer=false、Windows ANGLE D3D11，不停其他树服务。核对raw/HTTP/hash与前后保护清单，真实加载/阴影充分暖机后立资源基线。
- Git位于D:/APP/WorkBuddy/resources/vendor/PortableGit/cmd/git.exe；主仓需-c safe.directory=D:/worker/paoku，但safe.directory不能替代workdir/-C。Node/npm位于C:/Program Files/nodejs/。
- 正常hook的bash/npm入口用进程临时PATH前置既有C:/Users/Administrator/AppData/Local/Temp/paoku-doc-review-npm-shim、PortableGit/bin/cmd、Node目录，不改全局PATH/hook或跳检查。
- 纯文档查内容/引用及diff，正常hooks额外build/主规划56单测保留，不为文档跑游戏E2E。任务树成绩与主树56单测分开；只暂存本任务文件，正常commit/push并核对远程，不强推/捎带临时证据。
- 备用Superpowers技能根：C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/。按需读，用户/AGENTS当前授权优先于技能通用选项。
- “5小时窗口”是账号额度刷新，不是五小时工作量；没有真实耗额数据，旧6～10/12～20窗仅未校准工程预算，不是正式品质承诺，已完成阶段不重复算。

## 9. 更新本交接的规则

推进任务后，直接更新第1/2/6节当前状态、阶段与提示词入口，不只在顶部追加“已覆盖下文”却留下相反结论。历史只链接到报告/PROGRESS；不把过期“未创建18”“5298待收”混进当前表。

每次交接分别写清：目录是否实际建立并登记、聊天是否绑定、当前准备/实现/验收阶段、依赖和写权、运行环境是否实测、实际HEAD/远端同步情况。未来HEAD推进先核验成果，不重复建树/派发/索取已批准范围。

当前没有需要接管的本主Agent游戏验证会话，未创建自动提醒或启动其他任务。
