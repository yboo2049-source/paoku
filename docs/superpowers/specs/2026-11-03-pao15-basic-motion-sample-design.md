# PAO-15 本地自动基础动作技术样本设计

2026-11-03（Asia/Shanghai）｜v0.1｜brainstorming有界设计送审。**本轮仅设计；四样本尚未制作，未进入writing-plans。**

## 1. 目标、批准范围与有效输入

在已审23骨/真实蒙皮上提出Idle、Run、Jump、Slide四类最小可复现本地技术样本，让下一轮能独立检查关键帧→GLB→Babylon的动作链路与质量缺口。详细参数以[样本规格](../../art/pao15-basic-motion-sample-spec.md)为候选单一来源，读取/检查记录见[准备证据](../../evidence/PAO-15/basic-motion-preparation/README.md)。

固定输入为本分支`64c4f3120224f42995bc4b0fae544feae139d380`。主审接受的是自动绑定、真实蒙皮、单个rig_diagnostic和独立导入，不是正式动作库或自然动作质量。作者无原始DCC已确认；未来另存新版本派生重建工程，不再补问原始源，也不在本轮开工程/导出。

沿用已批准明亮城市轨道与M1模拟权威，不重新审批总体路线/绑定探针。人工权重、拓扑、局部接触和动作精修继续延期；这种延期不等于品质签收，也不应成为写完本草案的前置。PAO-18可并行参考设计意图，正式资产仍需主Agent按固定提交验收后另行放行。

本轮独占写入仅此设计、`docs/art/pao15-basic-motion-sample-spec.md`和`docs/evidence/PAO-15/basic-motion-preparation/`纯文本。无Agent派发/合并、新动作/GLB、游戏/工具脚本/旧证据/依赖变更；不写实施计划或测试代码，不安装工具或上传模型。

## 2. 两条本地路线

| 路线 | 做法与收益 | 成本/风险 / 建议 |
| --- | --- | --- |
| A 已有23骨/rest上的脚本局部关键帧 | 从固定派生工程另存，按真实骨名、周期曲线和小组关键姿态生成四个独立action，30fps采样、显式边界键；沿用skin/IBM/权重 | 推荐。依赖最少，参数与姿态可追溯，可直接检验时长/循环/切换；局部轴/骨roll与自动串权风险仍在，没有脚底IK或自然动作保证 |
| B 本地IK/约束后烘焙 | 在新派生工程中另加临时手足目标、膝肘pole和接触约束，将求解结果烘焙回相同23变形骨，导出不带控制器 | 有利于接触姿态，但需额外验证bone roll、链长、极点方向、约束循环、求解确定性与脚部过约束；不能修好已有权重。当前成本较高，作为A不能满足可读性/接触目标时的后续独立选项，不自动启用 |

不使用Tripo/Mixamo云端、网络动作库、旧player七clip重定向或整模摆动替代。旧诊断姿势只是局部轴和链路证据，不直接串联改名成Run。若A样本可导出但有瑕疵，先交真实诊断/TODO，不以改走B或手工精修无限延长本轮范围。

## 3. 四clip与阶段边界

候选输出为`tech_idle_v1`（30fps/N60/2s循环）、`tech_run_v1`（30/N24/0.8s循环）、`tech_jump_v1`（30/N36/1.2s非循环）、`tech_slide_v1`（30/N36/1.2s非循环）。命名专门标技术样本，不与未来正式clip名混用，也不把四条算作13条中的已交付数量。

Idle小幅局部呼吸，Run双腿反相/双臂反摆及有限pelvis局部起伏。Jump单clip按[0,6)/[6,24)/[24,36)演示预备、空中、缓冲；Slide按相同边界演示进入、维持、退出。具体局部骨角度/位移、姿势表、循环速度与标记见规格§2–5，未测角度列候选而不逐参数问批准。

根和asset父节点TRS保持绑定值，scale1；世界起跳、前进、支撑和切道仍属模拟。局部pelvis重心变化不移动世界root，`move_delta=0`，攻击/美术无敌窗口N/A。演示marker不产生落地或roll到期事实。未来拆Jump三段须重新构建空中循环，不能截取不相同端点直接repeat；Slide维持段也须独立循环/接触复验。换道、受击、失败、滑板姿态、跳滑组合、实机自然动作等仍缺失。

## 4. 曲线、导入与候选接口

播放采用0基半开[0,N)，导出附`t=N/fps`插值边界键。Idle/Run同时验证首尾姿态和**有符号**边界速度；30fps LINEAR不被假定天然C1，源周期曲线和自动边界切线保护都须未来数值/录屏验证。Jump/Slide终点hold_last仅留外观，阶段由事实接线时覆盖，不绑定真实运动占用时间。

候选manifest记录原静态/固定派生工程/诊断GLB的来源hash，新派生/导出hash暂null+not_generated，实际skeleton名`runner_rig_spike_v1`、23真骨名/parent、rest指纹待实测、四clip版本/时长/循环/根/局部pose basis/marker/质量分类。DCC Z-up/-Y与GLB m/Y-up/+Z的导出转换要登记，已绑定输入不重复缩放；独立预览先沿右手原生glTF，游戏loader手性适配另审。

这是候选文件契约，不建立公共TS/schema，不声明PAO-9完整事件封套或PAO-18消费者已经实现。交18的正式入口必须是主Agent给出的固定提交、资源hash、可用clip清单与未通过项；禁止从活动目录直接引用未审产物。缺clip只报告缺项，不能用技术片段冒充完整动作。

## 5. 拟议未来新增路径与写权（本轮不创建）

| 用途 | 建议后续白名单 | 保护/限制 |
| --- | --- | --- |
| 新版本派生源 | `assets-source/characters/runner/basic-motion-sample/v1/runner-basic-motion-derived.blend`及同目录来源说明 | 从64c4f31的旧blend另存；不覆盖rig-spike源，不重新生成角色/蒙皮 |
| 新导出及清单 | `docs/evidence/PAO-15/basic-motion-sample/v1/runner-basic-motion-sample.glb`、`motion-manifest.json` | 1skin/四技术clip；诊断clip不混入；不放public正式目录 |
| 新脚本/独立预览 | `tools/pao15-basic-motion-sample/` | 新增导出/校验/预览；旧rig-spike脚本只读，需复用时导入固定版或复制并记来源，不能顺手重构 |
| 专属测试 | `tests/unit/pao15-basic-motion-sample.test.ts`、`tests/e2e/pao15-basic-motion-sample.spec.ts` | 批准后先RED，不改旧断言/默认配置 |
| 新证据 | `docs/evidence/PAO-15/basic-motion-sample/v1/` | DCC/GLB/引擎对照、2～3图、短录屏、品质/TODO；完整镜像/批量旧图留本机忽略目录 |
| 后续实施计划 | 由主Agent批准本设计后另指定任务级计划路径 | 本轮不写、不进入writing-plans，不将路径建议当实现授权 |

仍只读：src/public/main/render/物理/应用、公共types/schema、HTML/依赖/旧测试和默认配置、共享总纲/PROGRESS。骨架与动作源/导出写权不扩成游戏接线权；共享变更建议由Dispatcher统一整合。

## 6. 失败处理、人工延期与品质分类

工具错误须在未来执行中闭环修复：错源、未绑定点/坏IBM、少边界键、错名字/时长、重复根位移、无法导入、切换残留或释放异常不记通过。不得放松结构断言、删坏网格或覆盖旧样本掩盖问题。工具不可用归环境阻塞，不据此判模型不可动画。

自动权重引发肩肘躯干/帽兜牵引、髋膝对侧串权、鞋踝压折及包带/抽绳未专属处理，均沿主审TODO保留。降低候选摆幅不等于消缺；局部pelvis候选也不等于脚底接触已修好。人工调权/拓扑/重烘焙/动作精修不作为交自动诊断的前置，是否需要局部拓扑仍待判断，不擅自重绑或更换角色。

未来报告分开给`pipelineStatus=passed/failed/environment_blocked`与`qualityClass=unverified/needs_local_refinement/technical_sample_reviewed`；即使工具通过、样本可读，也不得用production_approved或父Issue Done表示。本轮所有新质量字段保持未验证；商业使用条件、正式预算与完整动作品质另审。

## 7. 后续验证设计

规格§8列BM-01~10、BM-Q1/Q2。重点是用能失败的案例检测错误，而非只核对生成器自己写的manifest：解析真实skin/IBM/权重；检查四clip真实时间与根；验证局部软顶点而非整模刚体运动；首尾速度/四元数符号；DCC/CPU/Babylon逐姿矩阵和对应顶点；暂停、切clip、重播、归位、hold_last、释放重载、marker去重。

未来代码交付须build/test/完整E2E与独立四clip预览，5185独占strictPort、不复用、D3D11；服务raw源码和HTTP GLB对照固定输入/磁盘hash，旧源码/测试/旧blend/诊断GLB/历史证据前后保护。2～3关键图建议Run接触相、Jump收腿/缓冲、Slide最低姿态，其中一张侧面；配Idle/Run多循环及Jump/Slide阶段短录屏和pose索引。静图不证明动作自然，N原生游戏回归与F独立clip夹具分报，未接游戏不宣称新runner自然输入验收。

已审绑定历史257单测/44 E2E不作为四样本结果。本轮纯文档只做内容/引用/数值口径和diff检查，正常hooks的build/test如实记录；不为设计重跑DCC、导入、E2E或新截图。

## 8. 审查决策与共享建议

请主Agent评审的具体内容：推荐A路线、四clip命名与30fps时长/阶段、局部骨增量/根策略、循环速度保护、候选manifest、隔离资源与后续白名单。设计细节未定可带修改意见再审；不重新审批明亮方向/M1或已验收绑定，不因已知原源不存在反复补问。

设计获批准后由主Agent统一同步PRD中的“技术样本不等于正式13动作”、架构/流程中的样本manifest和事实权威边界、TEST_PLAN中的BM矩阵、PROGRESS中的阶段/未测项与固定提交；本树本轮不写这些共享文件。随后另发执行提示词并进入实施计划。本轮仅送主审，不启动其他任务/Agent，不解除15/17→18依赖，不标15 Done，不自动制作或接线。
