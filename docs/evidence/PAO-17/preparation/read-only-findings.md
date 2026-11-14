# PAO-17 准备阶段只读取证

2026-11-02（Asia/Shanghai）。证据类型：文档分析与提交门禁，不是运行时渲染验收。设计文件日期按调度约定沿用2026-11-01。

## 起始 Git 与授权边界

- cwd：`D:/worker/paoku-sessions/pao-17`；分支：`codex/pao-17-render`。
- 初始 HEAD：`19aa31492ddce4c1c5e74ef1e49312ad41ec2dd6`，主题 `fix(PAO-14): confirm ambiguous commits before replaying commands`。
- 初始 `git status --short` 为空，无用户改动、无暂存内容。
- origin：`https://github.com/yboo2049-source/paoku.git`。不建树、不reset、不merge/cherry-pick、不启动Agent/任务。
- 允许写入仅两份任务文档及本preparation目录的纯文本证据，其他跟踪文件保持原样。
- 主仓只读 HEAD：`692bf24c1d7f434cd04efbe022fa6e7afc5cff40`。主仓当前文档不意味着本分析树包含其代码或后续验收分支。

## 规范与技能读取

先读主仓 `AGENTS.md`、`docs/plans/2026-11-01-pao16-pao17-parallel-prompts.md` 及其链接的 `docs/reviews/2026-11-01-pao16-calibration-spike-review.md`。架构/流程/测试只将页首生效交接章节当当前契约；历史章节坐标与拾取例子不生效。补读 `docs/SUPERPOWERS_WORKFLOW.md` 及本树 CONTRIBUTING 的边界和正常提交约束。

声明安装路径 `C:/Users/Administrator/.workbuddy/skills/{using-superpowers,brainstorming}/SKILL.md` 不存在。按规则查找备用路径后成功读取：

- [using-superpowers](C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/using-superpowers/SKILL.md)
- [brainstorming](C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/brainstorming/SKILL.md)

备用技能没有主仓工作流描述的完整三路径文本；Architectural分类、送审停止点以用户指令及主仓AGENTS第8条为准。用户已要求有疑点列假设继续草案，因此未按技能通用问答流程逐节追问，也不使用通用技能的docs/plans路径覆盖用户指定specs路径。未进入writing-plans或实现。

尝试读取主仓 `docs/architecture/rebuild-contracts.md` 时文件不存在，未将其当已读内容；当前分析依主仓生效章节及本树实际types。未访问PAO-16运行中的工作树或未验收新数据，未重复扫描资产/图集。

## Linear 只读结果

使用 `get_issue(includeRelations=true)` 读取PAO-17、PAO-16、PAO-9；未调用写入/评论/状态接口。

| Issue | 状态 | 依赖核对 |
| --- | --- | --- |
| [PAO-17](https://linear.app/paoku-v1/issue/PAO-17/m2-拆分渲染并建立主题场景材质与灯光) | Backlog | blockedBy PAO-16/PAO-9；blocks PAO-18；正文规划assets/environment/entityViews，要求快照同步/主题循环/障碍可读/重开销毁清理 |
| [PAO-16](https://linear.app/paoku-v1/issue/PAO-16/m2-制作场景完整列车真实斜坡与代表道具) | Backlog | blockedBy PAO-7/8/9；blocks PAO-17；需完整主题段、列车/真实坡/障碍/拾取、代理和表面元数据 |
| [PAO-9](https://linear.app/paoku-v1/issue/PAO-9/m0-统一坐标事件数据模型与模块契约) | In Review | blocks PAO-17等；PAO-6前置仍在；不因技术交接推断Issue Done |

PAO-16主审只接收`3de6e543ff5b5d29a2c624c8d482e5acb8865444`技术探针结论；四件accepted=false、正式端点null，未放行生产接入。PAO-19 `ed39cb9`已验收和PAO-15仅自动试样已审，是用户提供的阶段事实；未读取/合入其源码，不报告为本树能力。

## 源码只读范围与发现

- `src/render/babylon.ts`：公开门面与资源/加载/环境/实体/reset范围；实际使用GameContext而非完整SimSnapshot，默认LH场景，没有公开dispose；匿名resize和皮肤订阅、晚到加载需要清理设计。
- `src/main.ts`：只读import及render/reset/盾碎/dispose调用附近；实际render用legacyView包装presentation(alpha).context，UI读提交快照；disposeGame未调用renderer释放。
- `src/types/index.ts`、`src/types/contracts.ts`：只读必要实体/快照/DeepReadonly字段；ROOF不是当前ObstacleType枚举。
- `src/data/modelBindings.ts`：两个显式车绑定均UNCALIBRATED / transform:null / LEGACY_PRIMITIVES；现有渲染没有消费这些绑定。
- 为提交门禁读取package.json及.husky/pre-commit；该hook要求build和test。未读取其他业务实现、测试实现或public资产。

## 输入身份（SHA-256）

以下为准备分析时本机文件字节hash；主仓路径以 `D:/worker/paoku/` 为根，任务树以 `D:/worker/paoku-sessions/pao-17/` 为根。

| 根 | 路径 | SHA-256 |
| --- | --- | --- |
| 主仓 | AGENTS.md | a7ba647a34ebb8d5ec3f53ca1ba9234bb95412c06a344d8caf7cdc7a42cc7490 |
| 主仓 | docs/plans/2026-11-01-pao16-pao17-parallel-prompts.md | 81f2b9b59b9b1a472177a38cee7db8f2d85f9aadd2c2c8f34ee38216432b79bf |
| 主仓 | docs/reviews/2026-11-01-pao16-calibration-spike-review.md | 4af850ca0b34091a9845d9d282dce3ae89db7cd125d768690669628cb21a2d88 |
| 主仓 | docs/ARCHITECTURE_DESIGN.md | 24820e342de3dc4a8996f3c146b21297ef0cbb0585bb961293d6055101a95a35 |
| 主仓 | docs/SYSTEM_WORKFLOW_SPEC.md | 4f54f04ae33cce17fa4eaa4d9da60cbd2b162cc7015ca5ec0b161fc1c2cf95aa |
| 主仓 | docs/TEST_PLAN_AND_SENSORS.md | 34d9d8ab81b7c50d4c75df211d5ece224fdf690a522008c5841a8262c7df3482 |
| 主仓 | docs/SUPERPOWERS_WORKFLOW.md | 90eb1cc83386fa4adff967243f1769d7cd39fed09c1034c8d9d50ae4e91611dc |
| 任务树 | src/render/babylon.ts | d60e9885dd9d515635488b610877d29894312652f92b753cf8b870ca50fa7571 |
| 任务树 | src/main.ts | 05b5d022d5309a57383e11e2b82bd02c3a599e75f3aa20fd44d81476d47cd750 |
| 任务树 | src/types/index.ts | b2842de277d980ba890b0f75dabde2b029aedf4f01f5d0c0cff063c306fa4988 |
| 任务树 | src/types/contracts.ts | 3b9520d21a06c683d5250a7839c5a9537ae8666723fd0f6a8cace471489558e4 |
| 任务树 | src/data/modelBindings.ts | 8448dc8ecb19cc440dfa0b5ebc2975f8ec796cef467482a2aa09808480f8773c |
| 任务树 | CONTRIBUTING.md | 17266aa39b950c6cd26f31422c3add3eb455b977945952dc4b9a71e06e8a3413 |
| 任务树 | .husky/pre-commit | f14f491c6eab1534b2e057d98e838f09f3ea8d3859a1897e25ab4fc00d7eec29 |

## 审查与验证口径

内容审查覆盖：两条路线、现有门面差距、只读/权威边界、生命周期与失效、共享资源/阴影、单工程车与一次转换、循环与后处理、资产缺口、18串行边界、前置/白名单和未执行RED矩阵。相对文档引用需解析到本次新增文件，主仓来源按上述固定SHA及路径追溯，不假装主仓新文档已在本树。

提交前执行 `git diff --check`、暂存白名单核对；正常hook按锁文件安装所需依赖后执行build/test，实际结果以终端及交付报告为准。不因文档阶段运行E2E，不生成截图，不将R01–R11、N/F、风格或资源预算列为通过。旧证据文件不改写，最终跟踪差异只能为三份新增文档。

当前成果仅供主 Agent / 用户审查。未来需具体批准、共享文档同步、正式接续提交和另发实施提示词；无自动接入、状态更新、依赖解除、合并或18启动。
