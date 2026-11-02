# PAO-17 明亮主题与真实楔形坡实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 交付明亮城市轨道的一个可玩工程主题、连续有界循环及与M1支撑面一致的真实楔形坡，消除局内菜单展台遮挡。

**Architecture:** 原PAO-17单一实现方在已验收结构上迭代environment/entityViews/babylon/assets；渲染消费既有只读context/帧身份，不修改模拟/应用。原GLB保持候选资格，程序几何按逻辑尺寸生成。

**Tech Stack:** 已安装的Babylon.js、TypeScript、Vite、Vitest、Playwright，无新依赖/外部服务。

2026-11-02（Asia/Shanghai）。用户明确批准[路线A具体设计](../superpowers/specs/2026-11-02-pao17-bright-theme-preview-design.md)中的明亮主题、有界循环/局内展台隐藏和逻辑楔形坡；无需重复请求同范围批准。主Agent只完成文档/交接，用户粘贴后才执行。

## 1. 固定基线与本批边界

- 原目录 `D:/worker/paoku-sessions/pao-17`，分支 `codex/pao-17-render`；**接续536f54b41866e2819d21cd674e64af2cb4d70f80**。本地/远程SHA已核对，跟踪内容无改动；原`.pao17-local/`仍有未追踪临时证据，完整保留，不捎带提交或清理。
- 首批[结构/I-01/I-02主审](../reviews/2026-11-02-pao17-structure-implementation-review.md)已通过，不重做拆分或main接线。原261单测/48E2E是历史基线，本次结果按实测报告。
- 只读PAO-16 c7b09e6主审摘要即可，四件productionAccepted仍false；不读取其整份大型采样JSON/原始样本或追加第三轮自动采样。本批不修改、复制或加载四件新GLB，不合入15/16/19。
- 当前旧角色/动作、旧UI保持兼容。正式角色/13动作、镜头重设计、追逐者取景策略、I-03/I-04生产绑定、主题整套正式资产、来源/真机预算签收及父Issue Done均递延。

## 2. 独占白名单与数据契约

可改 `src/render/environment.ts`、`entityViews.ts`、`babylon.ts`、必要`assets.ts`；可新增本轮 `tests/unit/pao17-theme.test.ts`、`pao17-ramp-view.test.ts`、`pao17-theme-lifecycle.test.ts`、`tests/e2e/pao17-theme.spec.ts`、`pao17-ramp-view.spec.ts`。任务文档可写`docs/plans/2026-11-02-pao17-theme-implementation.md`、设计/接口文档中的本批状态和`docs/evidence/PAO-17/bright-theme-preview/`。

main、共享types/modelBindings、core/systems/application、DOM/HTML/CSS/public、依赖/锁文件、默认配置及所有旧测试只读。新测试如需拆成同前缀专属文件，在本树计划列明；禁止改旧断言/skip/时钟来迁就新画面。局部类型/几何帮助函数留在上述渲染文件，不新建18角色/相机模块。共享PRD/架构/流程/测试/PROGRESS由Dispatcher更新。

临时完整回归镜像/配置/批量旧图沿用`.pao17-local/`或主审已忽略目录，避免Vitest误收.pw.ts；输出必须重定向到本批新目录，不覆盖preparation、structure-lifecycle、PAO-6/15/16/19历史证据。先记录当前HEAD、已读取文件/旧资产/保护hash及未追踪临时目录，不以HEAD冒充未提交工作树内容。

环境重复仅为视觉，由playerZ确定，不消费模拟RNG、不生成障碍/金币/Surface。坡网格消费obs已有width/height/depth、底面中心x/y/z，保持Y高度/Z前进。生产渲染不引入物理系统实例；测试只读调用obstacleSurface/sampleSurface作独立期望，与实际变换后的网格三角形比较。

## 3. 可执行设计参数

- 工程色板与光照沿用已批准设计：天空#BEDFF4，底色#657A88、钢轨#5E6871、站台#F0E7D5、暖强调#E8B74F。主光暖中性、环境填光偏冷；FXAA开、bloom关、Glow少量金币/信号白名单初值约0.15，主阴影图初值1024、限定近处主要对象。为可读性可在该方向内微调并记录最终值，不逐个数值重新审批。
- L初值120m，5个可复用段覆盖idx-1至idx+3（idx=floor(playerZ/L)），绝对索引处理跨多段/回退/重开。候选far280m、雾100～250m；若调范围，证明池覆盖相机可见近远区间并保持有界。重复周期整除L，边界物只属于一段，移动根/子网格不保留陈旧frozen world matrix。
- 道路/轨枕/站台/信号与低细节远景用程序几何，路侧物留在通行走廊外，不遮高低栏开口或坡顶。按段/材质合批并保留回收粒度；MENU/SHOP展示独立展台，PLAYING/PAUSED/GAMEOVER隐藏，reset不在局内把展台重新显示。
- RAMP顶面从(z-depth/2,y)连续升至(z+depth/2,y+height)，两侧/底面不突出可走平面。箭头依坡面放置/旋转并保留窄装饰偏移，不能用旧悬空盒体装饰遮挡角色。
- 实施核对发现旧程序车顶板宽0.96×、深0.98×，且顶面为height-0.005。为实现已批准坡顶接缝，允许在entityViews内把**程序顶板**宽深覆盖到只读ROOF的逻辑范围、顶面调至obs.y+height；保留车身/物理尺寸，不把该小修扩成GLB重制。
- 标准F：坡B=(0,0,70)、2.4×3×6，脚67/顶73；车顶B=(0,0,79)、2.4×3×12，入口73/出口85。另验Y+5，采样脚/中/顶、左右边界和车顶入口/出口，网格空间数值误差按现行1e-6量级检查；不修改SURFACE_EPSILON或碰撞规则。

## 4. 顺序、RED/GREEN与完成门禁

原17聊天先按本计划细化本树theme-implementation，列实际函数/测试/命令，再执行以下步骤。本批按一个完整增量交付；各步骤即时build/目标单测，完成后跑一次完整build/test/E2E，发现新失败再做必要修复/复测。每次对外commit都须完成适用全门禁和正常hooks，不推送未验证代码。

### Task 1：有界循环和展台状态

先写pao17-theme.test.ts的RED：z=0、L±ε、多个L跳跃、回退、重开，段身份/数量/覆盖区间、无重复边界件；取真实网格world matrix/边界顶点验证迁移，不只检查池中保存的目标数字。展台逐个应用状态/重开后显隐失败亦须捕获。

最小实现environment的固定池、按绝对索引重定位、边界归属/矩阵更新、独立展台集合与状态同步。保留门面调用兼容，可在babylon内部传已有appState/context.state，不写main。`npm run test -- tests/unit/pao17-theme.test.ts`先RED后GREEN，随后`npm run build`；确认没有第二模拟循环/随机数权威。

### Task 2：明亮主题与资源归属

在上述environment池内实现批准的轨道、简化站台/远景；babylon灯光/雾/远裁剪、assets共享材质按工程色板调整，entityViews只调允许的表现材质。Glow/近处caster的增删与对象生命周期绑定，回收/reset/dispose注销引用，不全场景按名称猜所有权或每帧重建材质。

pao17-theme-lifecycle.test.ts先捕获重复段/材质/纹理/阴影引用持续增长。真实GLB和阴影纹理充分暖机（可复用8个实际渲染帧并确认稳定计数）后20轮跨段回收、10次reset；计数按池/共享缓存/动态对象分别归基线，最终dispose归零。保留既有异步/帧身份/I-02行为；`npm run test -- tests/unit/pao17-theme.test.ts tests/unit/pao17-theme-lifecycle.test.ts`与build通过。

### Task 3：楔形坡与程序车顶接缝

pao17-ramp-view.test.ts先RED：从真实顶点/索引和world变换求顶面，脚/中/顶及左右边界对比只读sampleSurface；包括非零X/Y、尺寸变化、坡→车顶入口/出口。原盒体、中点错高、顶板缩进/height-0.005须能被传感器捕获，不能只调用自家构造函数算同一组期望。

仅在entityViews及必要渲染材质处生成有正确法向/背面/阴影的楔形和贴坡箭头，校正程序车顶板的表现范围/高度。逻辑RAMP与ROOF保持原实体/接触，不重复加载工程车GLB。目标单测和build通过后，以专属浏览器F实际走坡/顶/退出，确认躯干不再被旧整块坡体遮住。

### Task 4：真实N/F与最终交付

- 新pao17-theme/pao17-ramp-view E2E：N桌面键盘、390触摸全流程与重开；F固定坡脚/中/顶、Y+5、车顶接缝/落地，以及跨段前后实际场景覆盖/资源计数。测试setter只在QA夹具下使用，不冒充自然输入。镜头策略不变，若追逐者裁边仍在，按既有18待办记录。
- `npm run build`、`npm run test`、`npm run test:e2e -- --config .pao17-local/theme-acceptance.config.ts --retries=0`。本机配置必须含原12份/48项完整E2E及本批新专属测试，保留旧源码/断言；可逆镜像只改证据输出。现有固定资源基线测试可能需新夹具适配时用新增测试处理，不能直接削弱旧断言。
- 独占5187、strictPort、reuseExistingServer=false、Windows ANGLE D3D11；核对实际模块raw字节、仍使用的legacy GLB source/HTTP hash及保护清单前后。未追踪临时证据保留，历史跟踪文件若由旧测试生成，恢复原字节再交付。
- 保存并查看2～3张本轮真实图：明亮桌面同屏、390布局、坡顶接缝/角色可见性；循环接缝可用短录屏/额外自动帧索引，异常扩看。最终报告记录色板/灯光/池/雾参数、N/F及全部检查计数/时长/重试/失败保留、资源口径和原件保护，不拿前批48项或旧图给新主题计分。
- 正常hooks仅暂存本批白名单，commit并push当前codex/pao-17-render，核对远程SHA后送主Agent阶段复审。不给父17/16/21标Done，不改Linear依赖、不合并或启动18/20。

## 5. 复制到原PAO-17聊天

```text
继续PAO-17，用户已明确批准明亮主题工程预览路线A、有界循环/局内菜单展台隐藏及逻辑驱动真实楔形坡。沿用D:/worker/paoku-sessions/pao-17，codex/pao-17-render，固定接续536f54b41866e2819d21cd674e64af2cb4d70f80。先核对Git与未追踪.pao17-local，保留全部已有证据，不reset/merge其他分支、不启动其他任务或Agent。
先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-02-pao17-bright-theme-execution.md、其中批准设计/首批主审链接，再按需读本树environment/entityViews/babylon/assets及systems/surfaces的只读接口。共享PRD/架构/流程/测试/PROGRESS已同步本范围。旧设计待批准和首批A→B提示词是历史状态，不重复执行。
用writing-plans细化本树docs/plans/2026-11-02-pao17-theme-implementation.md，按新计划Task1～4执行RED→最小实现→即时build/目标单测→最终完整验证。主Agent不写游戏实现，本聊天是本批唯一实现方。
做一个明亮城市轨道的程序几何工程主题。L初值120、5段idx-1..idx+3、far约280/雾100～250，按floor(playerZ/L)处理多段跳转/回退/重开，重复周期/边界归属连续，移动节点不保留陈旧冻结矩阵。MENU/SHOP独立展台可见，PLAYING/PAUSED/GAMEOVER隐藏；背景不消费模拟RNG或生成玩法对象。
按已批准色板/暖主光冷填光、FXAA开/bloom关/低Glow白名单和近处主阴影初值1024实现，可为可读性微调并记录最终参数，不逐值再问审批。材质/Glow/阴影/池的归属与回收/reset/dispose保持首批契约；真实加载和阴影充分暖机后再立资源基线。
RAMP改真实楔形：脚z-depth/2,y，顶z+depth/2,y+height，中点线性，箭头贴坡；程序车顶板需覆盖ROOF逻辑宽深、顶面到y+height，校正原0.96/0.98缩进和低0.005m的表现偏差。取真实顶点/索引/world平面与只读sampleSurface比对，脚/中/顶/两侧/车顶出入口及Y+5均验；不改physics/Surface/尺寸/跳高/容差来迁就画面。
本批可写environment/entityViews/babylon、必要assets及新计划列明的专属theme/ramp测试、任务文档和新证据docs/evidence/PAO-17/bright-theme-preview/。main/shared types/modelBindings/core/systems/application/DOM/public/HTML/依赖/默认配置/旧测试/共享总纲只读。四件新GLB仍未生产合格，不加载/复制/修改，不合入15/16/19，不做正式动作或镜头重设计。
充分暖机后20轮生成回收/10次reset、边界覆盖和最终dispose；N桌面/390触摸与F坡车顶/非零Y/循环故障分报。最终完整build/test及原48项E2E+本批新增测试，5187 strictPort/不复用服务/D3D11，raw/legacy HTTP和保护hash核对，可逆镜像不改旧断言/时钟且不误收Vitest，保留首次失败。
保存并查看2～3本轮真实关键图（明亮桌面、390、坡顶接缝/角色），异常扩看，必要短录屏验证循环。正常hooks仅提交本批白名单，git push核对远端，报告真实参数/计数/时长/重试/证据与剩余范围，交主Agent复审；不标父任务Done、不合并或启动18/20。批准范围内不重复索取同样确认，确有跨界缺口只提交最小请求。
```
