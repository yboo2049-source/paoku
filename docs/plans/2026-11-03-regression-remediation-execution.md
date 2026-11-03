# 车尾连续性与同源字体修复：批准后执行计划

> 执行方使用writing-plans在目标树细化任务计划，再以executing-plans逐项执行；TDD及verification-before-completion持续生效。用户已指定独立任务聊天，主Agent不自动调度Agent或写游戏实现。

**Goal:** 修复已证顶面接触的跨tick连续性缺口，消除运行时外部字体域依赖，保留原错误传感器并完整复验。

**Architecture:** 车尾复用模拟现有supportDeparture的owner/side/y，在真实顶面接触后保留有限离开连续性；字体保留Outfit/Orbitron视觉意图，以固定身份/许可的同源文件替代外链。两任务分别复用现有诊断树，不合并、不串写共享入口。

**Tech Stack:** TypeScript / Vitest / Playwright / Vite-PWA / CSS @font-face。

## 1. 用户批准与实际就绪回执

2026-11-03用户明确“批准”[最小修复设计](../superpowers/specs/2026-11-03-regression-remediation-design.md)的两项A方案。以下授权覆盖原诊断提示词“仅文本、不得生产修复”的阶段限制，但只在列明白名单内生效。原诊断和主审证据只读，其他玩法/模拟协议/新资产/UI集成不开放。

| 任务 | 实际复用目录 | 分支 | 实际HEAD=远端HEAD | 核验 |
| --- | --- | --- | --- | --- |
| 车尾修复 | D:/worker/paoku-sessions/pao-15-roof-diagnosis | codex/pao15-roof-diagnosis | 8af24af083b369f3f8dc8bb883a861975b9972af | 该固定基线祖先exit0，干净 |
| 字体修复 | D:/worker/paoku-sessions/pao-18-font-diagnosis | codex/pao18-font-diagnosis | e6a52b1a88db911581c6b88b119d54c356ff9774 | 该固定基线祖先exit0，干净 |

主Agent已核对主仓worktree登记、目标顶层/分支/完整HEAD/common-dir/status（含未跟踪）并ls-remote比对。两树common-dir=D:/worker/paoku/.git，已有node_modules，源诊断方269/292基线成绩仅作历史记录；本轮主Agent未重跑修复基线、浏览器或新实现。5195/5198当前无监听，启动前再查。文件系统树就绪不等于聊天cwd绑定；用户在对应原诊断聊天手动粘贴提示词，不新建worktree或自动启动任务。

HEAD如推进先核对新增提交/改动，不能reset/clean回本表。保留原15@614179d与18@5bd31cc交付树，不在它们直接写入或merge/cherry-pick。修复绿也不能转写为原树已复验。

## 2. 车尾修复步骤与独占写权

先读主仓当前AGENTS、SYSTEM_WORKFLOW_SPEC、TEST_PLAN当前段、本计划/已批准设计/诊断主审，再读本树车尾诊断报告；按需定位physics、既有sweptCollision单测、surfaces/contacts只读段。

1. 在本树新增`docs/plans/2026-11-03-roof-exit-remediation-execution.md`：记录固定源、原件保护、当前行为/规范、逐项RED/GREEN命令与预期；不能只依赖本机临时采集脚本。原失败45/46与诊断本机数值证据保留。
2. 扩展`tests/unit/sweptCollision.test.ts`先写本次确定性两步RED：tick138证明向下顶面接触，本步免伤、终点越尾且身体重叠；tick139连续离开应免伤；完全分离后记录清理。用真实原导出逻辑，固定原数值及96/97/98输入对照；先运行`npm run test -- tests/unit/sweptCollision.test.ts`保存实际行为失败，不能只报缺模块。
3. 只改`src/systems/physics.ts`的isSupportSweep/已有departure提交路径实现最小GREEN。先证明向下top contact，再按终点相对有限面及相对运动判离开，记录同owner/side/y；保留原交点已在面外路径，不改变世界积分/接地事实/重力/尺寸/无敌。没有证实顶面接触的initialOverlap不得豁免。
4. 同一unit增行为RED/GREEN对照：交点内侧/精确边界/外侧、左右边缘、移动owner追上/向内重入、未知初始重叠、同tick多障碍先前合法命中、owner回收/分离清理。保持全部原断言；若需要改surfaces落地或公共types/步序，先提具体扩围，当前不开放。
5. 新`tests/e2e/roof-exit-continuity.spec.ts`用独立真实浏览器导入生产Simulation/physics建立受控输入tick回放，验证三对照及实际碰撞事实，不只断言脚本缓存的目标值；原PAO-6墙钟用例保持原样参加完整回归。F固定夹具/回放与N真实输入分报，不改截图等待来回避边界。
6. 每次实现修改立即`npx tsc --noEmit`与相关unit，最终按第4节完整build/test/E2E和真实坡顶新图，写`docs/evidence/QA/roof-exit-remediation/v1/`新证据，正常commit/push后返回主审。可写新本树执行计划及该目录，原诊断/历史证据不可覆写。

白名单仅physics.ts限定段、sweptCollision.test.ts新增行为断言、新roof-exit-continuity.spec.ts、本树计划/新证据。surfaces/contacts/input/simulation/main/types/render/UI/public/字体/资产/依赖/默认配置/其他旧测试和其他活动树只读。新增测试若需类型检查用显式tsc，不能假定主tsc包含tests。

## 3. 同源字体步骤与独占写权

先读主仓AGENTS、ARCHITECTURE_DESIGN、TEST_PLAN当前段、本计划/已批准设计/诊断主审，再读本树字体诊断报告和index/style相关段。来源/具体文件许可核验是已批准实施的一部分，无需因相同A方案再停批；身份或分发条件无法核准时报告具体缺口，不绕过。

1. 本树新增`docs/plans/2026-11-03-font-local-remediation-execution.md`。列实际页面字重/字符使用、来源获取/许可核验步骤、不可变版本/hash、预期资源清单、RED/GREEN命令、视觉/离线矩阵与保护基线。
2. 新`tests/e2e/font-resources.spec.ts`先行为RED：阻断Google Fonts/gstatic域，在正常应用中应无这些域请求且真实本地两族/所需字重可加载；当前外链必失败，保留原requestfailed/console传感器。另写独立F本地字体404应可观察到错误，不能在完整回归把该错误过滤成成功。新`tests/unit/fontResources.test.ts`可检查实际清单/字节hash/引用存在/覆盖与版本，不只对照硬编码声明字符串。
3. 从原始官方来源固定不可变revision和具体可分发文件，核对配套版权/许可、保留名称/修改限制与来源关联。新增`public/fonts/`原文件、许可证/来源清单；优先不转换、不子集化、不提取系统字体。记录family/style/weight或range/字符覆盖、upstreamURL+revision、source/output SHA256、byteSize/licensePath/缓存版本。不能以可变main的OFL文本替代具体二进制核验。未核准的文件不注册生产。
4. 仅在`index.html`移除Google link、`src/style.css`移除Google @import并建立本地@font-face和必要字体路径。保留Outfit/Orbitron风格、所需字重、fallback与font-display意图；不重排UI、不改字号凑截图，不增加无依据的预加载。固定资源身份/缓存版本，测量实际字节与请求，不从菜单两个WOFF2推定完整覆盖或正式预算。
5. 新unit/E2E GREEN，验证冷缓存正确实际字体/字重、无Google字体域请求、原传感器仍能捕获独立F本地404。字体加载不以document.fonts.ready或computed font-family单独判定，要验证实际face加载和使用字形/相关量测。
6. 在生产build/preview验证字体是否进入既有PWA precache，测试已缓存后的离线刷新、更新/旧缓存失效及回滚。全新浏览器完全离线无法取得应用，报告这个边界。默认不改Vite/PWA配置；若验证证明缺字体预缓存，提出最小配置扩围与失败证据，不直接改默认配置。
7. 按第4节完整build/test/E2E、桌面/390/横屏与200%字体/长数字/缺字矩阵，检查菜单/HUD/暂停/商店/结算；默认实际打开2～3关键图，异常扩看。新证据写`docs/evidence/QA/font-local-remediation/v1/`，正常提交推送后交主审。

白名单：index.html字体link段、style.css字体导入/声明/路径、新public/fonts/与许可清单、上述新unit/E2E、本树计划/新证据。旧afterEach、requestfailed/console断言、其他旧测试、main/render/physics/types/存档/19 UI/依赖/默认配置/其他活动树只读。任何字体处理工具/脚本如需成为交付代码，先给具体新路径、可复现过程和类型/语法检查要求，不顺手扩写工具链。

## 4. 完整验证、继承失败与交付

- 用户批准的是两项独立修复，不是互相移植。车尾树仍含原外部字体依赖；字体树仍含原车尾逻辑。如完整回归遇到另一项继承失败，保存并准确归类、报告待受控移植的依赖；不得跨写对方修复、屏蔽错误、skip、改时钟或开retry换绿。未全绿不得声称最终通过，不提交未通过门禁的生产修复；本地成果保留，交Dispatcher明确串行解依赖后再完整验证。
- 每次代码修改立即编译/单测；最终各树`npm run build`、`npm run test`、`npm run test:e2e`完整既有+新增套件及新增测试显式类型检查。原诊断文本/失败/截图只读，新完整镜像只可逆重定向输出，不改旧断言/时钟/超时；.pw.ts镜像避免Vitest收集，批量旧输出仅本机忽略目录。
- 车尾5195、字体5198，strictPort/reuseExistingServer=false、1worker/retries0、Windows ANGLE D3D11；每次启动前查监听，不复用或杀其他树服务。保留首失败、修复、最终计数/skip/retry/flaky/时长和N/F分类。两项可独立进行，但不共享可写目录或入口。
- 本轮新图须真实打开检查，默认2～3关键图异常扩看；raw当前模块和HTTP资源/hash对磁盘，原件保护前后不变，所有既有源码变化仅限本批白名单。截图不能代替固定步/缓存/字体加载事实。
- 门禁通过后检查暂存区仅本任务文件，正常hooks明确commit，`git push`现有分支并ls-remote核完整SHA。不强推、不跳hook、不夹带本机临时脚本/旧媒体。推送失败如实报告。
- 返回固定提交、远端核验、准确写权diff、RED/GREEN与完整检查、真实图/录屏/资源身份、许可证/缓存或接触边界、尚未验证项。等待主Agent独立验收；不标父15/18 Done、不解除依赖、不自动进入I-03、新runner、19 UI或20/21。

## 5. 给现有车尾诊断聊天的完整实施提示词

```text
用户已批准车尾连续性修复A方案，接续现有诊断聊天，不新建树/Agent。实际工作树D:/worker/paoku-sessions/pao-15-roof-diagnosis，codex/pao15-roof-diagnosis，固定接续8af24af083b369f3f8dc8bb883a861975b9972af；Dispatcher已核对登记/顶层/分支/HEAD/common-dir/status，干净且远端同SHA，基线祖先exit0，node_modules已存在。主Agent本轮未重跑修复基线/浏览器，历史成绩不迁移。先显式workdir或git -C重新核对；推进先审新增，不reset，不在主规划或原角色资产树代写。

先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-03-regression-remediation-execution.md第1/2/4节、已批准设计/诊断主审，再按白名单读本树诊断和相关单文件。新授权覆盖原“仅诊断文本”的限制，但只开放计划列明范围。无需重复询问是否修复或是否沿用A方案。

使用writing-plans写本树专属实施计划，然后executing-plans逐项RED→最小修复→GREEN。仅physics.ts的isSupportSweep/已有departure提交段、sweptCollision.test.ts新增行为、新roof-exit-continuity.spec.ts及专属新计划/证据可写。先用真实数值证明138→139缺口，再复用owner/side/y补连续性；未知重叠、向内重入、移动owner追上仍须致死，owner回收/完全分离清理，早期合法碰撞不能被最终免伤覆盖。不改surfaces步序/schema/位置/重力/碰撞体/无敌或旧断言；必要扩围先报告具体证据。

5195独占，完整build/test/E2E+新测试类型检查、原件保护/raw身份、N/F与2～3张真实新图通过后正常commit/push并核远端SHA。原PAO-6旧用例保持不变，固定步反例不可由墙钟截图等候代替。如果完整回归遇到另一个未移植字体错误，保留现场交Dispatcher，不过滤、不自行跨范围修字体、不提交门禁未通过的生产修复。所有首次失败保留，不retry换绿。

最终交固定SHA、改动/RED/GREEN/完整计数/截图与接触边界，等主Agent独立验收。不得合并/移植、改变父状态依赖或启动其他Agent/聊天/集成。主Agent不写游戏实现，你是本树此修复的唯一生产写入者。
```

## 6. 给现有字体诊断聊天的完整实施提示词

```text
用户已批准同源自托管字体A方案，接续现有诊断聊天，不新建树/Agent。实际工作树D:/worker/paoku-sessions/pao-18-font-diagnosis，codex/pao18-font-diagnosis，固定接续e6a52b1a88db911581c6b88b119d54c356ff9774；Dispatcher已核对登记/顶层/分支/HEAD/common-dir/status，干净且远端同SHA，基线祖先exit0，node_modules已存在。主Agent本轮未重跑修复基线/浏览器，历史成绩不迁移。先显式workdir或git -C核对；HEAD推进先审新增，不reset，不在主规划或原渲染树代写。

先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-03-regression-remediation-execution.md第1/3/4节、已批准设计/诊断主审，再按白名单读本树诊断和index/style相关段。新授权覆盖“仅诊断”，不必重复审批相同字体路线；具体文件来源/许可核验是本批必做，不明则报告具体缺口。

writing-plans写本树专属计划后executing-plans执行。先RED真实应用无Google请求、本地两族/字重可加载及独立F本地404仍能被传感器捕获；固定官方不可变revision、具体文件与配套许可/hash后新增public/fonts/及来源清单，优先原文件不转换/子集化。仅改index.html外链与style.css字体导入/声明/路径，保留Outfit/Orbitron视觉、字重/字符与fallback/font-display意图，不重排UI、不空CSS或过滤网络错误。新fontResources.test.ts/font-resources.spec.ts和专属计划/证据可写；main/render/physics/19 UI/依赖/默认配置/旧测试只读。

生产build/preview核对PWA字体预缓存、已缓存离线、更新/失效/回滚；不承诺首次未缓存离线。默认配置不开放，若字体漏预缓存先交最小扩围。字体清单不能用可变main许可文本自证具体二进制，来源/分发条件不明的文件不注册生产。字体自然加载看实际face/字形，不只看ready或声明族。

5198独占，最终完整build/test/E2E和新测试显式类型检查，桌面/390/横屏与200%字体/长数字/缺字矩阵，2～3关键真图、N/F及raw/HTTP/hash/原件保护通过后正常commit/push并核SHA。若完整回归遇到未移植的车尾旧失败，保留现场交Dispatcher，不改物理或旧断言，不提交门禁未通过的生产修复。所有首失败保留，不retry换绿。

交固定SHA、文件/许可清单、真实字节/缓存/离线/视觉检查、RED/GREEN与完整计数、未知项，等待主Agent独立验收。不合并/移植、标父18 Done、解除依赖或启动其他Agent/聊天/I-03/新runner集成。你是本树本批字体改动唯一生产写入者。
```
