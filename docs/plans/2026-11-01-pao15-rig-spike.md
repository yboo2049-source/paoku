# PAO-15 骨骼绑定试样执行交接

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 验证现有runner能否获得合格真实蒙皮，并通过Babylon独立导入，不制作完整动作库。

> 最新用户决定：本轮仅本地自动流程，跳过人工调权/拓扑/动作精修，不使用Tripo云端。人工事项列入[后续TODO](../art/pao15-rigging-manual-todo.md)。自动诊断有质量问题可带TODO交付，不要求本轮逐项手修；正式资产不得因此标通过。

**Architecture:** 原GLB只读，派生DCC与导出探针分开追踪；独立预览只消费试样资产，绝不接main/render/模拟。主Agent规划/验收，用户手动触发原PAO-15聊天实施。

**Tech Stack:** 本地DCC（Blender优先）、GLB、既有Babylon.js、Node校验、Vitest/Playwright。

2026-11-01（Asia/Shanghai）。用户已批准小范围技术试样，范围见[试样设计](../superpowers/specs/2026-11-01-pao15-rig-spike-design.md)。不重复要求批准相同范围，不推定Tripo云上传/付费调用已授权。此前PAO-15“只准备、不绑定”仅在本探针白名单内被本轮批准替代，正式制作/13动作仍未放行。

## 目录、输入与白名单

- 延用 `D:/worker/paoku-sessions/pao-15`、`codex/pao-15-character-assets`，预期8b26bdf（含19aa314）；已验收UI在另一分支，不合并、不复制其他任务实现。
- 先读主仓AGENTS、本计划/设计、本树character-spec及角色设计。源只读取glb-review@7a2fb29的runner/清单中runner条目，核对设计中SHA；不扫全库/全图集。原始源不存在已由作者确认，不再把补源当探针前置。
- 可写 `assets-source/characters/runner/rig-spike/`：明确标派生重建的DCC工程、脚本/工具版本与README；`docs/evidence/PAO-15/rig-spike/`：源/派生清单、导出GLB、姿势/校验/少量图和报告。
- 可写 `tools/pao15-rig-spike/`：独立预览与资产校验脚本；`tests/unit/pao15-rig-spike.test.ts`、`tests/e2e/pao15-rig-spike.spec.ts`：专属测试；`docs/plans/2026-11-01-pao15-rig-spike-implementation.md`及原角色规格/设计中本探针记录。
- 可在 `docs/art/pao15-rigging-manual-todo.md` 更新真实诊断与证据索引；本树若尚无此表，可按主规划树同名清单建立任务副本，主Agent后续整合，不能勾选未执行项。
- `src/**`、`public/**`、index.html、依赖/锁文件、默认测试配置、旧测试与共享总纲/PROGRESS只读。试样GLB不放正式运行时资产目录。公共文档建议交Dispatcher统一整合。
- 浏览器端口5185独占、strictPort、不复用其他服务，Windows ANGLE D3D11；临时配置/工具便携包/完整回归镜像/大批旧图放本任务忽略目录。需要忽略新目录时仅改本机.git/info/exclude，不改共享.gitignore。

## 可执行步骤与停止边界

1. 先核对Git/源hash/工具。PATH和常见安装目录未发现Blender只说明有限探测结果；不要全盘搜索。可用现有工具，或在任务忽略目录部署官方便携工具，记录来源、版本及校验；不系统安装、不改全局PATH、不带入凭据。无法取得工具则交环境阻塞及现有结构检查，不假造试样结论。
2. 按writing-plans在任务树细化每步文件/检查命令和预期，先保存源/派生身份、预算与轴向。脚本逻辑先写有意义失败用例再实现；资产变形以实际试姿而非“增加了skin字段”作证。
3. 用本地脚本建立派生工程，保留原部件/材质，检查rest pose/关节几何/单位与轴向；自动建立骨架/权重与诊断姿势。程序错误和无效数据自行闭环修复；若自动权重不理想，只记录具体关节/部件、坏姿势、截图与建议到TODO，本轮不手工刷权重、改拓扑或重烘焙，不为了画面精修无限迭代。
4. 逐项试rest、肩肘髋膝左右与组合蹲姿。保存可编辑工程和单个诊断clip；该clip不作为13动作的一项正式完成。不做碰撞代理、武器特效或新玩法。
5. 导出GLB，校验skin/joint hierarchy/IBM、JOINTS/WEIGHTS有效范围、归一化与覆盖、有限矩阵和root轨道；确认姿态下网格真实变形，至少记录一个关节姿势的顶点变化或等价蒙皮验证。root固定不能用“整模完全没动”替代有变形。
6. 用独立Babylon预览导入GLB，记录实际skeleton/animationGroups/材质，重播/切姿/释放，确认DCC与引擎表现一致。只在局部探针里展示轴与地面标尺，不修改游戏镜头/角色/模拟。截图2～3关键角度，变形用短录屏或姿势索引补充。
7. 新增脚本/工具代码后立即类型/单测检查，交付运行本树build/test/完整test:e2e以及探针导入E2E，检查真实截图。此树是M1接续，不把其244/43基线与PAO-19的252/60混淆；最终数量按实际输出。完整镜像保留旧断言、重定向历史证据到忽略目录，记录服务raw身份和前后hash，恢复并校验旧原件。
8. 原GLB与只读实现前后hash一致。报告分开写自动流程是否跑通、蒙皮质量是否达标，并按设计结论分类，附人工TODO/未测项；允许“自动流程通过、人工修整待办”，不假造质量通过。正常hooks、仅暂存白名单、git push并核对远端。试样完成不标PAO-15 Done、不放行18或自动做13动作；交主Agent决定后续。实际启动时可将PAO-15标In Progress，若父Issue送In Review须明确只是试样阶段送审、父验收标准未全完成。

## Tripo可选路线的处理

本节保留此前能力核对记录；用户现已选择本地自动路线，本轮不执行本节云端操作，也不等待Tripo输出。

用户若自行在Tripo原资产工作区操作，可先做Rig Check→Auto Rig→少量run/jump或诊断动作→导出含骨架/动画的GLB，记录实际版本/选项与hash。原地模式和命名骨架应按真实工具/API选项选择并验证，不能只在生成提示词写“有骨骼”。动作预设清单不代表正式13动作覆盖。返回的GLB仍需本地检查、派生工程和Babylon验收；下载GLB导入后保存的.blend标为派生源。

Agent本轮不自行上传模型到Tripo/Mixamo、不调用付费生成。未收到Tripo输出时可执行已批准的本地试样；无需为了可选路线再暂停所有准备工作。若用户明确选择并授权云工具，再按具体账号可用能力/配额另行执行，不让用户在聊天中贴密钥。

## 可粘贴到原PAO-15聊天

```text
继续PAO-15，仅执行已批准的runner骨骼绑定可行性试样，不制作正式13动作。目录D:/worker/paoku-sessions/pao-15，codex/pao-15-character-assets；预期准备提交8b26bdf（含M1 19aa314），先核对Git并保留用户改动。
最新要求：只走本地脚本化自动流程，先省去人工调权/重拓扑/动作精修；这些列TODO以后处理。本轮不走Tripo/Mixamo云端，不要等人工精修或云输出才交诊断结果。
先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-01-pao15-rig-spike.md全文及其试样设计链接；主规划PRD/架构/系统流程/测试/PROGRESS已同步本轮范围。原角色设计的“仅准备”在本探针白名单内已获用户批准，不重复问同范围批准；完整制作/13动作仍未放行。
职责是现有静态runner的真实骨架/蒙皮试样：原GLB只读，从副本建立标明派生重建的可编辑工程，测试肩肘髋膝及组合姿势、导出带蒙皮/单个诊断clip的GLB，并用独立Babylon预览实际播放检查。只读glb-review@7a2fb29的runner及对应清单条目，核对计划所列源hash。作者已确认没有原始DCC/骨架工程，不再索取不存在的源。
严格使用计划白名单：assets-source/characters/runner/rig-spike、docs/evidence/PAO-15/rig-spike、tools/pao15-rig-spike、专属单测/E2E与任务级实施计划。src/public/main/render/物理/应用/依赖/旧测试/共享总纲只读，不合并UI或main分支，不重生成角色造型。先细化writing-plans，脚本逻辑先RED，资产用真实蒙皮/关节试姿证据。
工具使用本地DCC自动脚本，缺工具可在任务忽略目录部署官方便携工具并记录校验，不系统安装或改全局PATH。来源/使用条件未取得的如实标注，不宣称商业授权。
按设计记录试样资源上限、Y-up/+Z/脚底、一次变换、≤48关节/≤4归一化权重目标、有效IBM与真实顶点变形，原地root不漂移；源4K/面数不冒充正式预算通过。脚本错误/无效数据自行修复，自动权重/关节变形瑕疵保留真实证据，写入docs/art/pao15-rigging-manual-todo.md（参考主规划同名表）；本轮不手工调权、修拓扑、重烘焙或精修动作。
交付本地可编辑派生工程、可导出的GLB、hash/工具/骨架/权重/姿势/导出记录、2～3关键截图与短录屏/姿势索引及人工TODO。分别报告自动流程/结构校验结果与资产质量：自动流程跑通但有瑕疵可交“需局部修整，人工待办”，不能标正式资产通过；无法导出则记录失败，不造假补齐。新增工具代码按build/test/完整E2E及独立导入验证，独占5185 strictPort/不复用服务，核对源码与旧证据hash，完整镜像/批量旧图仅留忽略目录。
正常hooks提交/git push核对远端，报告实际检查与未验证项；只送试样主审，不将PAO-15或PAO-18标Done，不自动做13动作/新任务/合并。工具缺失与模型不可绑定须区分，不能用整模颠簸或只增加骨骼节点冒充蒙皮通过。
```
