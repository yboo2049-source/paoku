# PAO-19 并行批次：HUD 到镜头的动态安全区设计

2026-11-04。本批仅设计，供用户手动接续原PAO-19聊天。PAO-18事件桥已经进行中，不重派、不等待其草稿，也不读写其活动工作树。

## 工作树已就绪

复用 `D:/worker/paoku-sessions/pao-19`，分支 `codex/pao-19-ui`，实际HEAD及远端均为 `ed39cb9aad981da1e9eda0a196b86d0c0c6702d9`。顶层/分支/common-dir/主仓worktree登记一致，共同Git目录为 `D:/worker/paoku/.git`，status含未跟踪项为空，已验收基线为HEAD祖先，exit0。没有新建树、安装依赖、启动任务或重复运行UI验收。

PAO-19@ed39cb9已验收Done，主审历史build/252单测/60完整E2E通过。本批是后续接口设计，不重做四页UI、两项已关闭P2或旧验收，不把旧成绩说成本批接口已实现。任务方首次运行时再次核对Git；若HEAD推进先检查新增，不reset。

## 目标与设计路线

让UI提供实际可见遮挡区域，使PAO-18相机能够避开HUD和控件。输出只读几何数据，不把DOM对象传给渲染，也不允许镜头反写UI、人物位置或模拟。新UI目前未合入18，不能将两个树的能力相加当已集成。

比较三条路线：A（推荐）UI测量实际布局并发布带revision的只读值，应用边界统一换算后传镜头；B由应用直接查询DOM，接线较少但页面/清理责任耦合；C维持固定边距profile，易实现但无法正确覆盖长文字、道具增减和响应布局。最终选型及最小路径由设计论证，不以本简报直接批准生产实现。

已核对固定18消费者 `826b10fd8c6200fbaec02a76f4ec9d5482d5bb12:src/render/cameraRig.ts`：CameraInput已有width/height、safeArea四边数值、reservedRects矩形及reducedMotion；无canvasRect/layoutRevision字段。legacyHudProfile是固定旧UI边距，projectActors使用这些量做屏幕投影及遮挡检测，不代表新UI动态桥已经实现。不要凭候选文档臆造现有接口。

## 只读输入与并行边界

- 主仓AGENTS、PRD/架构/流程/测试规范按需读；本树 `docs/ui/pao19-ui-spec.md`、原UI设计、`src/ui/dom.ts`、必要views/CSS/HTML以及[ed39cb9主审](../reviews/2026-11-01-pao19-implementation-review.md)为依据。旧规格的未批准/未实现段是历史，实际已验收实现优先，不重新打开已关闭P2。
- 18只读参考固定Git对象：`826b10f:src/render/cameraRig.ts`、`src/render/babylon.ts`中CameraInput入口及`docs/render/pao18-interface-and-validation.md`的I-18U条目。使用本树git show固定对象；缺对象交Dispatcher，不去读取进行中18树，不merge/cherry-pick。
- 不占用main/types/模拟/事件总线写权，不另定义I-03事实协议，不改18事件桥设计。双方若提出同名公共字段，交Dispatcher统一冻结，任务方不自行覆盖对方成果。

## 设计必须回答

1. HUD成绩/金币/速度、暂停/声音按钮、动态道具、toast及错误条分别如何登记；隐藏/inert/透明或转场元素是否占区，遮罩和可滚动卡片取实际可见交集还是整个矩形。不得把全屏HUD容器的空白都当遮挡，也不能只列按钮漏掉不透明卡片。
2. 明确viewport/canvasRect、safe insets、reservedRects的单位与坐标原点；client rect、CSS px、canvas局部CSS坐标、drawing buffer/DPR和visualViewport偏移/缩放只换算一次。明确env安全区与padding不重复扣除。
3. 只读快照、profile/page、layoutRevision与可用/未就绪/释放状态；resize/旋转、字体或内容变化、道具增减、toast、滚动及visualViewport变化的失效条件、采样时点与同帧一致性。避免每个render强制同步DOM布局；提出测量节流/合并及首帧无数据的回退。
4. 开始页、局内、暂停、商店、结算各自的策略；普通HUD避让与模态遮罩分开，不能为了避开全屏modal让镜头逃离场景。暂停镜头冻结与旋转/布局变化如何兼容须说明，不偷偷推进动画或模拟。
5. 空间无解、过期/非法rect、canvas未挂载/零尺寸、UI重建与销毁时的回退和诊断；不能移动/缩小人物、改变追逐距离、隐藏犬或缩字号来掩盖冲突。精确遮挡优化或相机求解器重构不默认纳入本批。
6. ResizeObserver/监听/订阅归属及dispose/reset幂等、迟到回调、局/页面切换；最小候选接口与未来生产文件白名单，UI producer和应用/镜头adapter由Dispatcher安排串行接线。
7. 后续RED矩阵：桌面、390竖屏、短横屏、canvas偏移/DPR1与2、200%字体、长数字与多道具、菜单/暂停/结算、滚动、UI重建/释放。DOM量测和真实投影/截图分报；N真实输入与F夹具分开，未来默认抽看2–3张关键截图，有异常才扩看。

本轮不写测试或跑新增浏览器实验；可以将需要实际DOM验证的假设列为待验证，不把纸面矩形当实测通过。后续代码批次仍须build/test/完整E2E和真实截图，不可用本次文档或旧UI成绩替代。

## 本批允许新增的三份文档

1. `docs/superpowers/specs/2026-11-04-pao19-hud-safe-area-bridge-design.md`：方案比较、推荐设计、数据流/生命周期、异常与未来写权。
2. `docs/ui/pao19-hud-safe-area-contract.md`：候选值结构、坐标换算、页面/可见性规则、RED/验收矩阵及待主Agent统一的接缝。
3. `docs/evidence/PAO-19/hud-safe-area-preparation/v1/README.md`：Git/固定输入、检查和提交推送回执。

除此之外均只读：不改src/public/tests、旧文档/证据、主仓共享文件、依赖或配置，不创建其他Agent/聊天。以brainstorming的Architectural路径完成限定接口设计，交主Agent审查及用户批准后才writing-plans/实现；当前不是实现授权。

纯文档完成内容/引用审查及git diff --check后，只暂存这三份新增文档，正常hooks提交推送当前任务分支，核对远端SHA。无需专为文档跑E2E；hook需要构建/单测时正常运行，不绕过。最终交推荐方案、最小接线文件、待决项与提交号，不改变已Done的PAO-19状态、不解除PAO-18依赖。

车尾和独立预览KI-001/002继续延期；字体与17主题已验收，均不重做；新runner、音频重构、PAO-20/21不在本批。
