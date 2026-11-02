# PAO-18 准备读取与事实证据

2026-11-03（Asia/Shanghai）。仅设计准备，无运行时验收。

## Git 起点

- 目录 D:/worker/paoku-sessions/pao-18。
- 分支 codex/pao-18-motion-camera；HEAD 82d2d47b333de2cc0da778591f99df8fe98084ed，与用户指定一致。
- 初始 git status --short 无输出，未发现用户改动或暂存项。
- origin https://github.com/yboo2049-source/paoku.git。
- 无另建树、reset/merge/cherry-pick、其他任务/Agent、15/17 树写入。

## 只读资料与当前口径

- D:/worker/paoku/AGENTS.md，完整读取；准备提示词 2026-11-03-pao15-pao18-preparation-prompts.md 完整读取。
- 主仓 docs/reviews/2026-11-01-pao15-rig-spike-review.md 与 2026-11-02-pao17-bright-theme-review.md 完整读取：15 单诊断 clip；17 明亮主题阶段通过，390 追逐者裁边递延。
- 主仓 ARCHITECTURE_DESIGN.md 当前段至 M1 生效口径（1–60）、SYSTEM_WORKFLOW_SPEC.md 当前段（1–50）、TEST_PLAN_AND_SENSORS.md 当前准备与17门禁（1–20）；未读取其历史实现示例来当新契约。
- 本树 CONTRIBUTING.md、package.json、.husky/pre-commit（正常 hooks 要求 build+unit）；初始无 node_modules，未预装浏览器/运行环境。
- 本树 docs/render/pao17-interface-and-validation.md 按 I-01/I-03 等关键词定位：I-03 是递延请求，I-01/I-02 已实施状态以顶部接续说明为准。

## 源码限定读取（固定 82d2d47）

| 文件/行 | 证实内容 |
| --- | --- |
| src/render/babylon.ts:29–34、46–95 | RenderFrameIdentity、资源/epoch/回调/角色/相机字段 |
| 同文件:279–327 | legacy-player acquire、实例/动画/皮肤、失败回滚和旧 epoch lease 释放 |
| 同文件:361–409 | 七 clip 列表及 jump→run、slide→sneak_pose、stumble→sad_pose，停止后切换组/模糊匹配 |
| 同文件:549–705 | 只读 render 帧边界、root 同步、整模缩放、角色选择、追逐者、y===0 震动和相机跟随 |
| 同文件:754–791 | reset/dispose、caster/订阅/缓存/自建 canvas 所有权 |
| src/types/index.ts:25–48、94–118 | Player 实际 contact/support/vy/rolling 等、ChaseState/GameContext |
| src/types/contracts.ts:1–19 | 过渡 SimSnapshot/DeepReadonly，未实现完整 PresentationEvent envelope |
| src/main.ts:78–104、248–278、320–371 | 重开 reset、PLAYER_LANDED 音效桥、同次 presentation+identity、disposeGame |
| src/systems/physics.ts:145–190 及 contact/support/PLAYER_LANDED 定位 | resolveSupport 后 emit {y}、移动支撑采样与 rollTimer；未扫描全部系统 |

只按任务关键词搜索上述路径；未读取整个代码库、全部系统/GLB/图集。最初尝试 src/render/contracts.ts 不存在，随后限定查到 src/types/contracts.ts。源码列七 clip 是静态事实，本轮未二进制加载 GLB，不能称重新验证资产内容。

## 技能与查询偏差

- 用户提示的 C:/Users/Administrator/.workbuddy/skills/using-superpowers/SKILL.md 与 brainstorming/SKILL.md 在此机不存在。通过文件名查找发现安装副本，并实际读取：
  - C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/using-superpowers/SKILL.md
  - C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/brainstorming/SKILL.md
- 该副本为一般 brainstorming 流程，不宣称其含项目定制三路径/HARD-GATE；分类和审批边界来自用户与项目规范。用户完整草案/不重复问批/本轮不 writing-plans 优先，未启动逐段审批或实施。
- 技能搜索首次目录范围过宽，返回安装目录的文件名清单，输出被截断；未读取这些不相关技能正文。随后限定匹配两个技能路径。不把搜索输出视作项目全库审查。
- Linear get_issue(PAO-18, includeRelations=true) 成功：Backlog；parent=PAO-5；blockedBy=PAO-17/11/15；blocks=PAO-21/20。正文职责、白名单和接触/镜头验收已读取。只读，无评论/状态写入。
- 可用工具元数据要求先取 field notes，尝试 get_agent_context 后服务返回 Tool get_agent_context not found；未得到补充笔记，不假装成功，不阻碍按源码形成草案。
- 15 准备稿路径存在性检查为 False，未读取/改写15活动资产，不引用不存在的稿件；待未来固定候选版本再审。

## 本轮产物与非结论

设计候选 v0.1 与接口/RED矩阵已准备，待内容/引用/差异审查。所有 RED、完整 E2E、截图/录屏、20轮/10reset、D3D11/HTTP/raw 及资源稳定测试均为后续拟议，本轮未运行，不引用旧主审计数当本轮成绩。不修改 PROGRESS、总纲、源码、HTML、public、测试、依赖或资产；正常提交 hooks 如需按锁文件装依赖，单独记录验证结果。

## 提交前内容审查与环境记录

- 对照用户范围复核动作/打断/支撑面、root 权威、15 候选接口、I-03 缺口、镜头/390/低动态、串行写权和未来 N/F 矩阵；已补充 I-01 尚未传 timeSec/stepSec 的缺口，未假设 tick 单位为秒。
- 两设计文档 Markdown 本机相对链接逐项解析，目标全部存在；主仓引用明确标为跨树本机审查引用，未声称进入任务树。
- 首轮 npm ci 返回运行会话后，继续时会话已不可访问且 tsc/hook 均不存在，未记作成功。再次 npm ci exit0：378 packages added，prepare=husky；恢复正常 .husky/_/pre-commit。未安装浏览器、启动游戏服务或运行 E2E。
- npm 提示 18 个依赖漏洞（3 low/10 moderate/5 high），属于锁文件现状；未运行 audit fix 或更新依赖，package.json/package-lock.json 无差异。不将该信息外推为本设计引入的问题。
- 读取并采用同安装副本 verification-before-completion/SKILL.md，实际 hook/build/unit 与提交/推送结果以本轮终端及最终交付为准；本文不预填未执行通过。
- 提交范围限定本轮三份 Markdown 文档。内容审查完成，提交前将对已暂存新增正文执行 git diff --cached --check；初次未暂存的 git diff --check 不能单独证明新增文档通过。
- 首次已暂存正文 diff --cached --check exit0。首次 commit 被正常 hook 拦住：npm 的 env bash 命中 Windows WSL bash，报 `/bin/bash: C:/Program Files/nodejs/npm: No such file or directory`，build/unit 尚未运行；未生成提交、未跳过 hook。发现既有 PortableGit 1.3.0（junction 指向 D:/APP/WorkBuddy/resources/vendor/PortableGit），拟只为重试命令前置其 cmd/bin/usr/bin 到进程 PATH，保持 hook 正文不变；最终执行结果见终端/交付。
