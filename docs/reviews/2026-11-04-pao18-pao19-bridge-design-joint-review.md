# PAO-18/19 桥接设计联合审查与实施范围建议

2026-11-04，Asia/Shanghai。结论：**两份设计的文档审查通过，18上轮动作预期问题关闭；推荐批准以下限定范围，当前尚无用户实施批准。** 本文不是writing-plans或任务实现提示词。

## 固定交付及独立检查

| 任务 | 已复用工作树/分支 | HEAD及远端 | 文档范围 |
| --- | --- | --- | --- |
| 18事实桥 | D:/worker/paoku-sessions/pao-18-font-diagnosis / codex/pao18-font-diagnosis | c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85 | 相对f5c1ec6只改原三份设计文档；相对826b10f也仅这三份文档 |
| 19安全区 | D:/worker/paoku-sessions/pao-19 / codex/pao-19-ui | ff02092344fcef2f5a96f29f9762a01ea5043907 | 相对已审ed39cb9只新增规定三份设计文档 |

主Agent独立核对顶层、分支、common-dir、主仓登记、含未跟踪项status和指定远端任务分支，均一致且干净。18送审基线f5c1ec6、19已审ed39cb9分别为HEAD祖先，exit0；两批diff --check通过，本地链接目标分别7/6项有效。最初读取远端HEAD得到默认分支值，没有用它判任务同步，随后已用完整refs/heads分别核实上表SHA。

本轮只读审查差异、设计、候选合同和证据，没有修改任务树、创建Agent或运行游戏/截图。任务方正常hook的build/293单测（18）及build/252单测（19）属于未修改运行时代码的文档门禁；FB01–17、H01–16均未执行，不将其记为桥接通过。

## 18修订复审

[上次主审](2026-11-04-pao18-fact-bridge-design-review.md)指出的成功动作错误已在spec、FB02及README同步修正。从false/false且无physics介入时，JUMP→ROLL→JUMP仅前两条成功，最终true/true；ROLL→JUMP→ROLL三条成功，状态依次false/true、true/false、true/true。第三条拒绝不生成实例/音效，任务计数以未完成夹具沿用现有规则。没有为文档修改input合法性。本项关闭。

权威步内显式producer、成功提交完整批与snapshot stamp、数值序号和独立消费游标、GAP及有界保留、暂停与世界epoch分离的路线A可接受。事件子集为成功JUMP/ROLL/CHANGE_LANE及PLAYER_LANDED；impact未知保持null，不改求解器。运动事实与任务奖励分开，任务仍在原输入成功点，旧音频/通知只交付一次。

## 19设计审查

推荐A可接受：UI拥有绘制面登记/失效/量测，传只读值；应用将client坐标归一化到canvas CSS，渲染边界再按当前buffer比例适配现有CameraInput。实际占区与顶部保守包络分报，不把新候选字段冒称当前已实现接口。

设计已明确透明全屏HUD不占区、不透明卡片按全框、inert不等于不可见、道具滚动裁剪、Toast兄弟节点、背景/错误反馈及转场；env/padding不重复扣，visual偏移不重复减，DPR不直接乘。纸面转换例内部一致，但不代替后续浏览器和真机验证。

producer/epoch/revision租约、同帧写→读→render、dirty同步撤销旧值、布局重建/释放和未就绪保持pose均有说明。暂停/结算冻结pose，旋转只更新诊断；MENU/SHOP不新增动态构图。任意矩形只检查而未必可避让的solver边界如实记录，空间无解不能靠移动角色、缩字号或藏犬换绿。首批不改cameraRig求解器。

未发现需要退回修订的设计阻断项；API可用性、observer实际回调时序、变换/visualViewport/env浏览器差异及原有相机最终投影仍须未来RED和真实浏览器证据，当前不是运行时验收。

## 主Agent建议冻结的边界（待用户批准）

1. **18事实桥A：** 按其候选合同实施限定运动子集；journal 256批/1024事件、单tick64 draft、音频暂存256调用为初始上限，超限须显式GAP且保持玩法输入有效。只在成功提交后发布，异常步停止该局推进，fresh-context恢复，不用半步结算。main的最小步内音频暂存及交付重入屏障一并纳入，不能扩成PAO-20音效重构。types/contracts、simulation、input、physics观测接缝、main及三个render消费者/新测试为候选白名单；不改物理/支撑算法、application交易、audio模块、旧总线或完整PAO-9模型。
2. **19几何桥A：** 中立模块采用src/presentation/hudSafeArea.ts；producerId/epoch/layoutRevision只属布局租约，不与18的streamEpoch/eventId互用。只登记edge=top面形成顶部包络，候选4 CSS px间隙和向外1/64 CSS px量化；env与包络取max，间隙不重复扩。菜单/模态只诊断，暂停/结算严格冻结，未就绪保持pose。UIManager门面及新纯函数/测试可独立制作；相机solver、CSS/HTML和旧UI交互不默认开放。
3. **公共接线顺序：** 设计批准后，18方先独占其树的main/babylon及事件消费者接线。19方可并行在其树实现UI producer、中立纯值模块及独立新测试，main/render继续只读。18提交并主审后，由Dispatcher另选固定集成基线、核验/准备目标树和指定唯一接线者，再接19的main/babylon适配；本次不预先执行merge/cherry-pick。不能让19在活动18树并写入口。
4. **同帧协调：** 后续唯一入口从同次presentation/AppSnapshot取得身份和展示视图，UI写→批量读→render；18事件读取继续绑定该次presentation stamp，过程中不await或混用另一张snapshot。布局不可用只暂停本桥相机更新，不阻断角色、实体或事实消费，避免19的UNREADY造成18事件遗漏。

以上为可评审的具体建议，不是已实施能力或隐含授权。若应用故障恢复确需修改application、19需要改solver/菜单取景等，提出具体最小请求，不能从本审批范围推定开放。

## 批准后的工作与持续边界

用户批准后，主Agent先同步共享设计与进度、编写可执行分阶段计划及两份手动提示词，再重新核对各目标树实际HEAD/status。只给对应阶段白名单，不自动启动Agent。各代码批次RED→GREEN、build/test/完整E2E、真实截图/录屏及独立主审；资源/旧证据保护、N/F和首失败保留。19 producer即使未接相机也必须明确阶段能力，不能提前称完整安全区接入成功。

车尾及预览KI-001/002继续延期，未提交候选现场不动。字体和17主题已审不重做，正式runner/动作、音频重构和20/21另批。18父状态/依赖不变；19原UI Done不重开，本次仅后续桥接工作。

本批实现前需用户审批的依据为[AGENTS.md](../../AGENTS.md)第8条：Architectural/Bounded路径的设计“经用户审批（HARD-GATE）后，方可进入writing-plans与实现阶段”。当前两份新接口此前只获纯设计授权，旧字体/18工程或19 UI批准不替代本次契约及扩围批准。
