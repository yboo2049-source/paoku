# HUD 动态安全区设计准备 v1：输入与检查登记

2026-11-04（Asia/Shanghai）。纯文档批次；不代表动态安全区已实现或验收。PAO-19 原 UI 已验收 Done，本批不改变任务状态/依赖，不重复开展原 UI 验收。

## 1. 工作树与范围

开始时实际 cwd/Git 顶层均为 `D:/worker/paoku-sessions/pao-19`；分支 `codex/pao-19-ui`；HEAD 与 `git ls-remote origin refs/heads/codex/pao-19-ui` 均为 `ed39cb9aad981da1e9eda0a196b86d0c0c6702d9`。`git status --porcelain=v1 --untracked-files=all` 为空，common-dir=`D:/worker/paoku/.git`，主仓 worktree 登记同树/同分支/同HEAD。复用现有工作树，没有 reset、建树、merge/cherry-pick。

唯一允许新增并提交的文档：

- [方案设计](../../../../superpowers/specs/2026-11-04-pao19-hud-safe-area-bridge-design.md)
- [候选契约/RED矩阵](../../../../ui/pao19-hud-safe-area-contract.md)
- 本 README。

本轮未写 src/public/tests、配置、依赖、旧文档/旧证据或共享总纲；未启动其他 Agent、未读取 PAO-18 活动产物。仅本地 hook 需要时正常 build/unit；未运行 E2E、新浏览器实验或新增截图。

## 2. 固定输入

主规划树路径均位于 `D:/worker/paoku`，以下读取文件的 scoped status 为空；记录实际最后修改提交和读取时 Git blob。未合并该树。可用 `git show <commit>:<path>` 复核：

| 路径 | 实际最后修改提交 | Git blob |
| --- | --- | --- |
| AGENTS.md | 604685b64b8869ca2bc71a8872d44bf586cc0bb5 | e68e1fa06fa855b8aa4a59191229d534684bf904 |
| docs/plans/2026-11-04-pao19-hud-safe-area-design-brief.md | 84248040196ed1804fcbf46c24f343c9e0c53061 | e2b05f109f84ab063e25414b582adeb2b1f32fb6 |
| docs/reviews/2026-11-01-pao19-implementation-review.md | a7f8f66c870f96ec6d62e29ce53e75bb343d128d | 20e1223e7a54673ab960b33def3f7f2cee9e5972 |
| docs/PRODUCT_REQUIREMENT_DOCUMENT.md | 2d251537d39cd82321f6cdacfd6239a1990226e8 | e1f29a83913570b6a4778676f9077c16a5dc08bb |
| docs/ARCHITECTURE_DESIGN.md | 2d251537d39cd82321f6cdacfd6239a1990226e8 | f8e575c21b81d924fdb8bc4fc2d171aff7629825 |
| docs/SYSTEM_WORKFLOW_SPEC.md | 2d251537d39cd82321f6cdacfd6239a1990226e8 | a939a8d23f8d48b2f2b9d00aea135c3e34101a7b |
| docs/TEST_PLAN_AND_SENSORS.md | 2d251537d39cd82321f6cdacfd6239a1990226e8 | 2c9fe4bf1cf166cb4e2d2dfc050970d5c92ec53b |

AGENTS、任务简报、主审全文已读；PRD/架构/流程/测试仅按需读取 UI 权威、隔离、暂停/帧采样、I-01/I-02 与 N/F 验证条款。主审末节明确 ed39cb9 两项P2关闭、原UI已验收；旧准备稿状态不覆盖它。

本树输入固定于 `ed39cb9aad981da1e9eda0a196b86d0c0c6702d9`：

| 路径 | Git blob |
| --- | --- |
| src/ui/dom.ts | 648e39c879d4c46aaa6dfda6e2ef65991ced34f0 |
| src/ui/views/screens.ts | 865ecdd56b9fb6defcfb89ce451020ebf0b0f878 |
| src/style.css | a7edd2aa3ee6cc2ca81d4c4e22943c53f1a50672 |
| index.html | 96656edea04c12e089b7ad47fe04d879be5c9fb3 |
| docs/ui/pao19-ui-spec.md | ea3dfc6c36dc6b5edf44f330367134575a96a4a8 |
| docs/superpowers/specs/2026-11-01-pao19-ui-design.md | 01bf6f11dd6c9ce7ab5c42cb3ac6c9f7b02622c7 |
| CONTRIBUTING.md | 5115ca4655b092a30669e36ac8d550238788e56d |
| docs/SUPERPOWERS_WORKFLOW.md | 3e1c5f68741988bdf2934abe9041cb07559764f0 |

PAO-18 仅通过本树 `git show 826b10fd8c6200fbaec02a76f4ec9d5482d5bb12:<path>` 读取：

| 固定对象路径 | Git blob / 读取范围 |
| --- | --- |
| src/render/cameraRig.ts | a844eac1f8d2c6fb28ba3b23a83db6339e69c41a；全文 |
| src/render/babylon.ts | 290197f59849b1a95944fbf8dff226b8f1135e5a；CameraInput入口、setter、render取buffer和rig调用、reset/dispose相邻段 |
| docs/render/pao18-interface-and-validation.md | 8680a6ad6b4964dddda454a995a57fc8dd91fd38；I-18U及邻近接口条目 |

以上固定实现没有 canvasRect/layoutRevision 字段。I-18U 只是候选；未读取正在进行的事件桥、更未假定它已经集成 PAO-19。

方法：读取本机 `C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/` 下 using-superpowers、brainstorming、verification-before-completion 的 SKILL.md。实际 brainstorming 提供多方案比较流程；Architectural 分类及实现审批门禁依据项目工作流和本次说明，未把本机技能误称为另一版本。只完成设计，不进入 writing-plans。

浏览器几何事实另外只读核对官方工作草案：[CSSOM View](https://drafts.csswg.org/cssom-view/)、[CSS env安全区](https://drafts.csswg.org/css-env-1/#safe-area-insets)、[ResizeObserver交付](https://drafts.csswg.org/resize-observer/#delivery-of-resize-notifications)。这些只支持 API/单位语义，不是目标设备实测；文档中的数值例是纸面验算，真机/浏览器兼容假设留后续 RED。

## 3. 内容与引用审查

核对项目：A/B/C比较及推荐；绘制面而非全屏空容器；inert/透明/转场/滚动裁剪；CSS与buffer唯一转换、env不双扣；三元布局身份、dirty及同帧原子提交；菜单/模态与严格冻结；unready/无解回退；observer/订阅幂等释放；独占未来main/babylon且不改I-03；H01–H16待执行矩阵与N/F、DOM/投影分报；未把原UI成绩冒充新桥通过。

本轮静态审查已完成：6个本地链接/锚点、UTF-8与代码围栏有效；H01–H16共16项；Git范围核对仅有规定三份新增文档，无已有跟踪文件改动。最初 Python 检查入口因系统别名不可用退出，改用 Node 内存脚本执行同一审查，exit0，未创建辅助文件或安装依赖。

提交前/后的diff检查、正常hooks和远端核对结果在完成对应操作后补入本节。提交号以Git对象及交付回复为准，不把尚未执行的步骤填成通过。
