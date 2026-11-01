# paoku主Agent交接：M1完成，准备M2

2026-11-01（Asia/Shanghai）。本文件是换会话的精简入口，后续状态以实际Git及Linear核验为准。先读本文件与AGENTS.md，按下一任务读取对应规范，不全量扫描旧代码/图集/聊天。

## 用户目标与协作方式

完整重构Web 3D跑酷：玩法基础、场景、人物动作、渲染、完整UI、坡道、列车与道具。已批准总体重构及明亮风格化城市轨道方向。Babylon.js/Vite/TypeScript工程，非Godot；不因技能目录含Godot就迁移引擎。

主Agent负责规划、职责边界、Linear派发与最终验收；用户在侧边栏各任务聊天粘贴提示词执行实现。不要自动启动其他任务/创建侧边栏聊天/合并分支。原GLB Agent另行交资产，主Agent不擅自重新生图/建模。实现Agent按任务白名单隔离，主Agent可安排必要的窄范围只读审查。

## 已验收状态与Git基线

- 主规划目录：`D:/worker/paoku`，分支 `docs/pao-6-playtest-baseline`。当前交接提交同时更新验收报告和PROGRESS，正常commit/push后以HEAD为准。此树仍是规划/旧运行时代码，不能把其56项单测与M1实现单测混淆。
- PAO-6 Done；PAO-10/11/12/13/14均已完成技术验收，Linear Done。PAO-7/8/9仍有In Review候选或人工冻结项；PAO-9技术契约已作为M1输入接受，预算/设备/细节美术不冒称全面冻结。
- M1接续基线：`D:/worker/paoku-sessions/pao-14`，分支 `codex/pao-14-application`，`19aa31492ddce4c1c5e74ef1e49312ad41ec2dd6`，已推origin同分支。该分支包含PAO-10→11→12→13链。
- 前驱：PAO-10 cf57d99；PAO-11 0875b27；PAO-12 6efdd1f；PAO-13 a4486a2。各工作树位于 `D:/worker/paoku-sessions/pao-N`，保留不删除。
- PAO-14最终独立验收：build、244/244单测、43/43 E2E（273.236秒），源码稳定/731历史路径恢复通过，抽看2图。三项P2已关闭（过期商店缓存、排队音频覆盖、未知提交TOGGLE重复）。不重复退回已修复旧问题；细节见 `docs/reviews/2026-11-01-pao-14-review.md` 末节。

不要直接pull/merge origin/main覆盖M1实现。正式资产与已验收M1链应由专门集成任务汇合，而不是覆盖目录。新分支默认codex/前缀。

## GLB资产与后续职责

远程main最近已核验资产说明提交 `7a2fb29`；独立只读树 `D:/worker/paoku-sessions/glb-review` 已检出该版本。其 `docs/assets/glb-manifest.json` 与 `glb-visual-notes.md` 为结构化技术检索入口；22文件哈希一致、21静态模型场景尺寸复核通过。新增远程更新先fetch核对提交，没新提交不重复验图。

21个新GLB无skins/animations；历史player.glb有骨骼/7动画。runner完整静态高约0.9791，不是旧错值0.4204。五个FBX来源模型已有X+90°节点旋转，不能再统一转一次。所有朝向/游戏米制尺度/可走面仍需接入标定。train_metro是带黄斜板工程车；train_ramp_or_car是普通车厢，PAO-13已有显式绑定/唯一组合视觉根。不能按名字或raw尺寸改物理。

原静态GLB当前约149.5MiB、41张4K贴图、约143万三角总资产量；并非同屏GPU实测。清单8个有引擎预览、14个没有，均不等于美术已验收。PAO-15正式角色绑定/动作、PAO-16场景资产标定/优化、PAO-17渲染接入、PAO-18动作镜头、PAO-19 UI分别负责；不要把整角色颠簸冒充正式跑跳滑动作。新jetpack/shield/mystery_box文件不授权新玩法。

## Linear与下一步

Workspace Paoku-v1，Team PAO，project `492a7fa2-dba9-4b7b-9d22-154822bbe5a2`，总纲PAO-5。项目计划见 `docs/plans/2026-10-31-paoku-rebuild-linear-plan.md`，其中初始Backlog描述是历史记录，当前以Linear为准。共享field-notes工具曾返回Tool not found，Issue正文/评论接口正常。

下一步先核对PAO-15/16/17/18/19的状态、原生依赖和现有资产交付；结合已验收M1基线准备M2职责分工、独立目录及用户可粘贴提示词。尚未启动这些实现。涉及main/types共享写入时串行接线，先明确互斥白名单；不要同时让多个聊天改同一工作树。新设计/重构遵循AGENTS既有方法论门禁，不重新要求批准已完成M1或已批准总体方向。

## 用量与验证约定

优先读结构化清单、短摘要和变更差异；只读取相关模块，日志输出尾部/摘要。主Agent默认抽看2–3张关键桌面/竖屏图，有异常才扩大；同批图不分给多人重复逐张看。进度/提交/测试数量直接给文字，不让用户截图；描述不能代替必要真实视觉验收。保持必需测试，不为省token删除断言或跳过hooks。

代码交付按AGENTS通过build/test/完整E2E，等弹窗opacity/有限动画完成后截图；自然输入N与故障/QA夹具F分报。独占端口、strictPort、不复用服务，核对raw源和src前后hash；旧证据逐字节恢复。完整回归镜像/临时shim仅放本机忽略目录，不反复提交旧图。纯文档做内容审查及diff --check即可，正常hooks额外执行build/test照常保留。

每任务仅暂存自己改动，正常commit/push并核对远端；不强推、不跳过hooks。实施Agent送In Review，主Agent验收后才Done。旧坡体遮挡、右侧追捕者裁切、霓虹/速度单位仍交后续表现任务，不伪称已修复。

## 本机执行提示

Git不在PATH：`D:/APP/WorkBuddy/resources/vendor/PortableGit/cmd/git.exe`；主规划树需 `-c safe.directory=D:/worker/paoku`。npm：`C:/Program Files/nodejs/npm.cmd`。必须用明确workdir或git -C，safe.directory不等于切目录。

Windows hook的bash/npm入口问题已用进程临时PATH shim直接调用相同Node/npm-cli解决，未改hook或跳检查；可参考本机临时目录paoku-doc-review-npm-shim，不将shim提交。Superpowers实际可读目录曾为 `C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/`，不要因旧别名路径不存在就宣称所有技能缺失。

完整PAO-14主审运行输出在 `.pao14-local/parent-final/acceptance-output/`（相对于pao-14工作树）；故障确认的精简证据在主规划树 `docs/evidence/pao14-toggle-confirmation-19aa314.json`。不需要重新读取全部失败历史。
