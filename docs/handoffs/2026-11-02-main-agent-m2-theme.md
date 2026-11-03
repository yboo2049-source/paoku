# paoku主Agent交接：当前状态、工作树准备与下一批调度

最后核验：2026-11-03（Asia/Shanghai），文件名沿用原交接入口。新会话先读D:/worker/paoku/AGENTS.md和本文件，再按需读当前任务的计划/报告。下列当前状态统一生效；旧状态仅查历史报告，不在本文件保留互相冲突的快照。

## 1. 当前要做什么

PAO-17明亮主题已审82d2d47，不重复派发/另做主题主审。原15@614179d四动作样本完整45/46、18@5bd31cc控制器/镜头完整59/60的首失败仍保留；两项[诊断已审接收](../reviews/2026-11-03-regression-diagnosis-review.md)。用户已批准车尾连续性及同源字体两A方案，[执行计划](../plans/2026-11-03-regression-remediation-execution.md)继续作为限定写权依据，不重复索取相同批准。

车尾修复已在本地实现但未提交：主Agent独立tsc/72项目标单测通过；任务方完整49/50，新4及旧PAO-6通过，唯一失败为旧四clip预览ready超时。详见[本地预审](../reviews/2026-11-03-roof-remediation-local-review.md)。本地/远端HEAD仍8af24af，暂存区为空、工作区有批准修复/新证据，不能当已提交修复或干净树。保留实现，不reset、代提交或重派整批制作。

当前给原车尾聊天的入口是[同树只读ready超时诊断补充](../plans/2026-11-03-motion-preview-readiness-diagnosis.md)第5节：观察加载各await和前序条件，保留首失败和本地改动，不开放preview/旧测试/超时生产修改；有根因证据后再定最小扩围。主Agent一次只读新页面约4秒ready，不关闭原49/50。

字体修复按原批准执行计划等待任务方回执，当前不把车尾新阻挡套给字体。两修复均复用现有树，不再建树；I-03/main/types/新runner/19 UI集成未开放，父状态/依赖及人工精修延期不变。主Agent未修改游戏或启动其他Agent/任务聊天，不自动合并/移植；临时只读QA服务已退出。

## 2. 工作树当前状态：唯一事实表

2026-11-03实际Git登记核验；后续HEAD若推进先审新增，不reset到旧值。

| 任务 | 实际目录 | 分支 | 本次核验HEAD | 状态 |
| --- | --- | --- | --- | --- |
| 主规划 | D:/worker/paoku | docs/pao-6-playtest-baseline | 本轮修订起点c8a1a6d；以最终HEAD为准 | 旧运行时代码/56单测，不是实现起点 |
| M1终点 | D:/worker/paoku-sessions/pao-14 | codex/pao-14-application | 19aa314 | 已审 |
| PAO-15 | D:/worker/paoku-sessions/pao-15 | codex/pao-15-character-assets | 614179d | 干净，远端同SHA；技术样本链路通过，完整E2E45/46，最终验收暂缓 |
| PAO-16 | D:/worker/paoku-sessions/pao-16 | codex/pao-16-world-assets | c7b09e6 | 不追加同类采样 |
| PAO-17 | D:/worker/paoku-sessions/pao-17 | codex/pao-17-render | 82d2d47 | 已审；原.pao17-local证据保留 |
| PAO-18 | D:/worker/paoku-sessions/pao-18 | codex/pao-18-motion-camera | 5bd31cc | 干净，远端同SHA；首批工程检查通过，完整E2E59/60，最终验收暂缓 |
| 车尾诊断/修复 | D:/worker/paoku-sessions/pao-15-roof-diagnosis | codex/pao15-roof-diagnosis | 8af24af | 本地修复未提交，暂存区空、脏树保留；完整49/50，待ready超时诊断 |
| 字体诊断 | D:/worker/paoku-sessions/pao-18-font-diagnosis | codex/pao18-font-diagnosis | e6a52b1 | 诊断已审；A字体修复已批准，交付待回执，以实际Git为准 |
| PAO-19 | D:/worker/paoku-sessions/pao-19 | codex/pao-19-ui | ed39cb9 | 已审Done |
| 原资产只读树 | D:/worker/paoku-sessions/glb-review | detached | 7a2fb29 | 不覆盖原GLB |

15/18的顶层、分支、HEAD、共同Git目录D:/worker/paoku/.git、含未跟踪项status已在目标目录核对，并与主仓worktree list交叉核验。15完整HEAD=614179d245d2a87a2a2aa3d61fde2a8de68eb7c1；18完整HEAD=5bd31cc06a44c1a2ac382809ea8eadb69df76984；ls-remote核实两个分支均已推送一致。

15准备基线64c4f3120224f42995bc4b0fae544feae139d380、18准备基线82d2d47b333de2cc0da778591f99df8fe98084ed均为各自HEAD祖先，exit0。本轮直接复用，不建第二份树、不改写或代提交任务产物。linked worktree的.git是文件，不能用目录存在与否替代Git核验。

本轮主Agent已在两树独立运行build/unit/完整浏览器及新证据检查，实际失败和边界见第1节/主审报告；不能沿用交付方全绿作为本轮成绩。临时服务已退出，无常驻验证会话。聊天是否选中对应目录仍由用户手动确认。 两诊断文本提交已推送，基线为8af24af083b369f3f8dc8bb883a861975b9972af与e6a52b1a88db911581c6b88b119d54c356ff9774；其源基线祖先检查通过。车尾当前HEAD未变，但生产修复/测试/证据未提交，status不干净且暂存区为空，不能沿用诊断交付时clean快照。主Agent独立重放车尾三对照，不重复完整回归或自然网络采集；定向成功不能关闭原完整失败。诊断端口5195/5198，原主审目录保留。7/8/9规划树仍为pao-7@c66b59e、pao-8@be6c7d5、pao-9@59fc682。

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

已批准的总体明亮城市轨道方向、M1及已审17主题不重审。15/18的A方案已批准且限定工程批次已交付，当前先处理主审完整门禁失败，不重复执行整批；人工刷权/拓扑/动作精修延期，无云上传/Tripo/Mixamo调用。已授权的可逆准备动作自行完成，不重复索取相同许可。

[两份批准后提示词](../plans/2026-11-03-pao15-pao18-approved-execution.md)保留作已交付批次授权历史，不重新粘贴启动。15四样本和18控制器/镜头已检查，但完整门禁失败尚未关闭。[两项诊断提示词](../plans/2026-11-03-regression-diagnosis-prompts.md)也已执行完毕，保留作历史授权，不重复派发。用户已批准两A修复方案，当前使用[新批准执行计划](../plans/2026-11-03-regression-remediation-execution.md)第5/6节，工作树已复用核验，核心契约已同步；无需重复询问相同修复批准。原15/18树不自动写入/移植或合并，两诊断树各自独占限定生产写权。车尾已实现但门禁未通过，当前使用只读补充诊断入口，不能重派原实现或宣称修复已交付；字体待后续回执。

## 6. 已验收状态与来源

Project 492a7fa2-dba9-4b7b-9d22-154822bbe5a2，Workspace Paoku-v1，Team PAO，总纲PAO-5。下列Linear状态为最近回读记录；需要变更前再查实际状态，不能因父Backlog否认阶段成果。

| 任务 | 实际进度 | 父状态 |
| --- | --- | --- |
| 6、10～14 | M1链完成，终点19aa314；已关闭问题不重开 | Done |
| 7/8/9 | 9技术契约和7适用UI条目已接受，正式风格/设备预算未全部冻结 | In Review |
| 15 | 614179d四技术clip链路检查通过；完整E2E45/46，最终验收暂缓，品质待修整 | Backlog |
| 16 | 3de6e54和c7b09e6技术探针通过，四件生产资格false | Backlog |
| 17 | fcddba1设计、536f54b结构/I-01/I-02、82d2d47明亮主题均已审 | Backlog |
| 18 | 5bd31cc首批工程专项通过；完整E2E59/60，字体网络失败，最终验收暂缓 | Backlog |
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
