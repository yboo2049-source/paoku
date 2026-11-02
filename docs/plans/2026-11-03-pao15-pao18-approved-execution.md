# PAO-15/18 A方案批准后执行计划与手动提示词

> 执行方按 using-superpowers、writing-plans、executing-plans 和 verification-before-completion 工作；用户已选择独立任务聊天，主Agent不启动Agent、不编写游戏实现。

**Goal:** 15交付隔离四动作技术样本；18交付不依赖新资产或公共事实桥的角色控制器与镜头工程批次。

**Architecture:** 15沿现有23骨/rest/skin生成局部骨关键帧，世界root不动。18沿17门面/生命周期拆分characterView与cameraRig，只读消费现有presentation；I-03、HUD应用桥和新资产生产注册另批串行，不包含本批。

**Tech Stack:** Blender 4.5.3 LTS、Babylon.js、TypeScript、Vite、Vitest、Playwright。

## 1. 批准、审查与工作树回执

2026-11-03，用户在主Agent明确提出“批准15和18的A方案，准备下一轮提示词，不自动启动”后回复“继续吧”，据此批准两份候选设计的A方案及本次准备。不是父任务Done、公共桥变更或合并许可。设计审查见[记录](../reviews/2026-11-03-pao15-pao18-design-review.md)。

| 任务 | 已复用实际目录 / 分支 | 本地HEAD=远端HEAD | 准备基线 / 核验 |
| --- | --- | --- | --- |
| 15 | D:/worker/paoku-sessions/pao-15 / codex/pao-15-character-assets | 8c4b09fc5351778fe8db19858d52924ac70463b9 | 64c4f3120224f42995bc4b0fae544feae139d380为祖先，exit0 |
| 18 | D:/worker/paoku-sessions/pao-18 / codex/pao-18-motion-camera | f2680f46ddef89a38c20496719a31abed9c3caf1 | 82d2d47b333de2cc0da778591f99df8fe98084ed为祖先，exit0 |

两树均登记在主仓worktree list，顶层/分支/共同Git目录已交叉核对，status含未跟踪项无输出。未创建第二份树，不reset推进成果。当前尚未在两树独立重跑运行环境/浏览器；交付方hook成绩只作历史记录，不是新实现通过。文件系统就绪不代表聊天已绑定，用户在各原任务聊天手动粘贴。复制后再次核对cwd/HEAD；若后续有推进，先检查新增提交，不回退到本表。

## 2. 15执行步骤与写权

先读本树已批准的设计`docs/superpowers/specs/2026-11-03-pao15-basic-motion-sample-design.md`和`docs/art/pao15-basic-motion-sample-spec.md`，以及主仓共享文档顶部当前契约。参数按已批准v0.1，真实局部轴错误可在本轮小范围修正并记录，不需逐角度重复审批；不得借此重绑/改拓扑。

1. 在本树新增`docs/plans/2026-11-03-pao15-basic-motion-sample-execution.md`，窄范围读取旧rig-spike工具，列准确文件/测试命令/失败预期/源hash和保护清单。先记录本树基线；旧失败保留，不用重试掩盖。
2. 在`tests/unit/pao15-basic-motion-sample.test.ts`先RED：错源/骨架/rest/IBM/权重、缺clip/少边界键、根轨道、反向循环速度与q/-q。每组失败确认后在`tools/pao15-basic-motion-sample/`最小实现并GREEN；不要用生成器写入的manifest自证GLB正确。
3. 从固定旧派生工程另存`assets-source/characters/runner/basic-motion-sample/v1/runner-basic-motion-derived.blend`。生成tech_idle_v1(30fps/60/2s)、tech_run_v1(30/24/0.8s)、tech_jump_v1与tech_slide_v1(30/36/1.2s)，附t=N/fps边界键。保留rest/skin/权重/root，旧诊断clip不混入导出集合。
4. 输出`docs/evidence/PAO-15/basic-motion-sample/v1/runner-basic-motion-sample.glb`和`motion-manifest.json`及纯文本检查。登记真实骨名映射、坐标/手性、来源/导出hash、版本/区间/marker和质量；未知写null+reason。Jump/Slide单clip分段/hold仅工程演示，不能直接把不闭合空中段循环。
5. 新`tests/e2e/pao15-basic-motion-sample.spec.ts`连独立真实预览，验证四clip、局部软顶点、DCC/CPU/Babylon姿态与顶点、暂停/切换/归位/重播/marker/释放重载。先RED后工具/预览GREEN。严格按BM-01~10及BM-Q1/Q2分报工具和品质结果，保留串权/穿插等人工TODO。
6. 按第4节完成本树完整验证和正常commit/push，返回固定SHA/文件hash/可用clip/质量限制，待主Agent独立验收。新样本不进入public，不放行18接入。

本批可写以上新路径、本树实施计划和新证据；src/public/main/render/physics/公共types/依赖/HTML/默认配置/旧测试/旧工具/旧源与GLB/旧证据只读。原角色源不存在不再索取，不调用云服务、不上传，不扩到追捕者或正式13动作。旧工具如需复用，导入固定版或复制并注明来源。

## 3. 18首批执行步骤与写权

先读本树`docs/superpowers/specs/2026-11-03-pao18-motion-camera-design.md`、`docs/render/pao18-interface-and-validation.md`及主仓共享契约。批准推荐A，首批只覆盖局部控制器、生命周期和镜头；正式事实/HUD/新资产输入仍是明确缺口，不要求靠改main/types凑齐。

1. 本树新增`docs/plans/2026-11-03-pao18-controller-camera-execution.md`，记录固定输入/原件保护/现有公开接口、旧角色兼容、逐步RED/GREEN与写权。只读定位所需babylon/类型/资产门面，不全库读取。
2. 新`tests/unit/pao18-*.test.ts`先RED验证深只读输入/root==presentation、派生动作优先级、跳滑组合/中断、重复帧不重启、暂停冻结实际Babylon组、reset/discontinuity/epoch晚到与幂等释放；在`src/render/characterView.ts`与`src/render/babylon.ts`最小实现并GREEN。旧七clip只做兼容，占位别名不计正式动作；合成clip隔离在夹具。
3. 新unit先RED验证`src/render/cameraRig.ts`的独立支撑/目标缓冲、30/60/120fps、低动态与真实矩阵投影，再GREEN。相机使用同帧玩家/警官/犬实际视觉bounds，不改模拟或追逐者位置以避裁边；保留门面单一资产/缓存/释放入口。移除玩家整模伸缩伪动作，未有正式姿态则稳定降级并记录差异。
4. 安全区采用显式可注入的render局部输入；本批应用默认布局仅可使用有证据的固定旧UI profile，声明尺寸/版本并测试。若无法核实，报告缺口；不得声称生产HUD安全区已通过。动态DOM测量/19 UI/偏好持久化均未接。低动态作为局部选项可在夹具验证，不添加设置页或存档字段。
5. 新`tests/e2e/pao18-*.spec.ts`验证真实门面、legacy GLB、暂停重开、晚到加载、390/桌面取景及资源。合成事实身份只验证消费者算法；真实`PLAYER_LANDED {y}`不能包装当前render tick冒充I-03，连续contact边沿仅工程降级，tick不得直接当秒。无权威事实不合成hurt；真实多tick落地不漏、action身份和去重留待桥接批次。
6. 完整验证并正常commit/push，交工程批次SHA和已实现/仅夹具/待桥/待资产清单；主审后另安排公共桥及固定15样本接入，不在本批自动继续。

本批白名单：`src/render/characterView.ts`、`src/render/cameraRig.ts`、`src/render/babylon.ts`、上述新unit/E2E、本树实施计划及`docs/evidence/PAO-18/controller-camera/v1/`新证据。assets/environment/entityViews默认只读；必要接缝先交最小变更请求。main/types/core/systems/physics/总线/DOM/HTML/public/依赖/默认配置/旧测试只读；15/17/19活动树只读且不合并。main/types/I-03/音频/HUD桥尚未指定写入者，不得抢写。

## 4. 两任务共用验收及提交门禁

- 每组RED→最小实现→GREEN；每次代码修改立即编译/单测，最终必须本树`npm run build`、`npm run test`、`npm run test:e2e`完整既有+新增套件通过，记录计数/skip/retry/时长/首失败。旧成绩不能迁移；不能改断言、skip、改时钟或跳hook换绿。
- 15独占5185、18独占5188，strictPort、reuseExistingServer=false、Windows ANGLE D3D11；冲突报告，不复用或终止其他树服务。raw模块身份、GLB HTTP/磁盘/hash和前后保护清单齐全。
- 截图默认实际打开2～3张，异常扩看；15看Run/Jump/Slide关键相位并配多循环/阶段短录屏；18看桌面高速、390近追逐者、坡顶/车顶。N自然输入与F合成/故障分报；静图不证明自然动作，投影不代替遮挡检查。
- 暖机真实资源后测稳定：15执行BM切换/释放重载；18执行20轮创建回收和10次reset，逐轮实例/共享缓存/动画/材质/caster/订阅分报。最终自有引用归零不外推通用Promise结算或浏览器堆。
- 旧E2E镜像仅可逆改输出路径且保留原断言，完整镜像/批量旧图放本机忽略目录；不覆盖历史证据。新工具类型检查也须显式执行，不能假设主tsc覆盖tools。
- 任务方检查暂存区仅本批文件，正常hooks、明确commit、push当前任务分支并ls-remote核SHA；不强推/跳hook，不修改Linear或解除依赖。推送失败如实报告。

## 5. 给PAO-15原聊天的完整提示词

```text
接续PAO-15。用户已在主Agent批准本地骨关键帧A方案，人工权重/拓扑/动作精修继续延期。不要重做已审绑定，不重新询问相同授权。

工作树已由Dispatcher实际复用并核验：D:/worker/paoku-sessions/pao-15，codex/pao-15-character-assets，本地及远端HEAD=8c4b09fc5351778fe8db19858d52924ac70463b9，包含已审64c4f3120224f42995bc4b0fae544feae139d380，核验时干净。未由主Agent重跑本树浏览器；聊天cwd请自行显式设为该树并先核对顶层/分支/HEAD/status。HEAD推进先审新增，不reset；路径异常交Dispatcher，不在主规划树代写。

先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-03-pao15-pao18-approved-execution.md，严格执行第2/4节；再读本树已批准的basic-motion设计/规格。主仓计划为当前授权，覆盖候选稿的“待批准/本轮仅设计”阶段限制，其他技术/质量边界沿用。

使用writing-plans先写本树专属实施计划，随后executing-plans按本批授权执行，无需再次等待同一设计批准。按需窄读旧工具，逐项RED→GREEN。只生成隔离四动作技术样本、真实校验和独立预览，不改src/public或旧源/GLB/测试/依赖，不云上传、不接游戏、不启动其他Agent或聊天。完整build/test/E2E、工具类型检查、2～3张实际查看的新图与短录屏、N/F和工具/品质分报、源/HTTP/hash保护、正常commit/push后交固定SHA。结构通过但串权/脚底瑕疵仍须真实列出；不把四样本当13正式动作，不标15 Done、不放行18。

首次简报实际cwd/顶层/分支/HEAD和本批阶段。最终返回提交/远端核验、产物hash/clip可用性、全部验证计数及质量限制，等待主Agent独立验收，不自行继续生产接入。
```

## 6. 给PAO-18原聊天的完整提示词

```text
接续PAO-18。用户已在主Agent批准保留门面和生命周期、拆characterView/cameraRig的A方案。本批仅角色控制器/镜头工程实现；正式事实桥、新runner和19 UI接入另批，不重复已验收17主题。

工作树已由Dispatcher实际复用并核验：D:/worker/paoku-sessions/pao-18，codex/pao-18-motion-camera，本地及远端HEAD=f2680f46ddef89a38c20496719a31abed9c3caf1，包含已审17基线82d2d47b333de2cc0da778591f99df8fe98084ed，核验时干净。未由主Agent重跑本树运行时检查。先显式切到该树核对cwd/顶层/分支/HEAD/status；推进先审新增，不reset，不借主规划树代写。

先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-03-pao15-pao18-approved-execution.md并严格执行第3/4节，再读本树已批准motion-camera设计与接口矩阵。主仓计划覆盖候选稿“待批准/仅设计”的阶段限制；其事实/资产缺口仍有效。

使用writing-plans写本树专属计划，然后executing-plans执行获批首批，无需再次申请相同A方案许可。先RED→GREEN，只写批准三个render路径、新专属测试/计划/证据。main/types/physics/总线/UI/依赖/旧测试只读，assets/environment/entityViews必要改动先提最小请求。旧角色/合成clip只证明工程链路；15@8c4b09f仅批准设计，不是可加载四clip。不得读取15活动产物并生产接入，不合并其他树、不启动其他Agent。

暂停须冻结实际AnimationGroup而不只是dt；root只复制presentation；动作不拥有模拟/无敌/接触权威。用同帧实际三角色bounds验证390安全区；不移动追逐者掩盖裁边。HUD仅显式局部输入/有证据固定旧profile，动态UI桥另批。I-03不存在时明确降级，不用当前render tick伪造事件、不把tick当秒；真实事实去重/不漏落地与新资产自然品质留待后批。

完整build/test/E2E、5188独占真实浏览器、2～3张实际查看新图和短录屏、暖机资源稳定/延迟/释放、N/F及前后保护通过后正常commit/push。返回固定SHA、远端核验、验证计数、已实现/仅夹具/待桥/待资产边界；不标18 Done、不改变依赖、不自动进入共享桥接或正式资产集成。
```
