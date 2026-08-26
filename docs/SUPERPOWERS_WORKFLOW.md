# Superpowers 工作流 (obra/superpowers @ WorkBuddy)

> 本文档说明 [obra/superpowers](https://github.com/obra/superpowers) 技能框架如何在本项目（paoku）中落地，以及它与 WorkBuddy 运行环境、既有 Harness Engineering 约束的适配关系。

---

## 1. 安装状态

- **来源**：`git@github.com:obra/superpowers.git`（v6.3.0, MIT）。
- **安装位置**：`~/.workbuddy/skills/<skill-name>/`（用户级，14 个技能）。
- **注册格式**：每个技能目录含 `SKILL.md`（frontmatter 追加 `version: 6.3.0` 与 `source: obra/superpowers`）+ `_skillhub_meta.json`（WorkBuddy 原生注册元数据，skillId 前缀 `skill_obra_*`）。
- **已安装技能清单（14）**：
  `brainstorming`, `writing-plans`, `test-driven-development`, `systematic-debugging`, `subagent-driven-development`, `dispatching-parallel-agents`, `executing-plans`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `using-git-worktrees`, `finishing-a-development-branch`, `using-superpowers`, `writing-skills`。

> 安全审计结论：安装前已对仓库内全部 `.sh`/`.cjs`/脚本做静态审查，未发现 P0/P1 风险（无恶意删除、无外联下载、无密钥硬编码；脚本含 PID 校验、常量时间 token 比较、umask 077 等良好实践）。

---

## 2. WorkBuddy 适配差异（重要）

obra/superpowers 假定 Claude Code 运行环境，部分机制在 WorkBuddy 下需适配：

| 原始机制 | WorkBuddy 现状 | 适配方式 |
| :--- | :--- | :--- |
| `SessionStart` hook（自动注入 `using-superpowers`） | **不支持**会话启动钩子 | `using-superpowers` 改为**手动触发**：Dispatcher 在会话开始时主动声明方法论基线（见 AGENTS.md 第 8 条门禁） |
| 视觉伴随（visual companion） | 无原生对应 | 以 **Playwright 截图 + 浏览器验证** 替代（对应 AGENTS.md 第 6/7 条机械约束） |
| 遥测（telemetry） | 无 | 忽略，不启用 |
| Skill 注册元数据 | 仅 `SKILL.md` | 追加 `_skillhub_meta.json` 以匹配 WorkBuddy 原生注册 |

---

## 3. 标准闭环（与 Harness 融合）

新功能 / 重构的统一入口流程：

```
brainstorming ──(三路径分类)──► [HARD-GATE 用户审批]   ← Architectural/Bounded 须产出设计文档
      │ 批准
      ▼
writing-plans ──► subagent-driven-development / dispatching-parallel-agents
      │
      ▼
test-driven-development (RED → GREEN → REFACTOR)   ← 任何逻辑改动先写测试
      │
      ▼
verification-before-completion (tsc + vitest + Playwright 截图)
      │
      ▼
requesting-code-review ⇄ receiving-code-review      ← 关键改动互审
      │
      ▼
finishing-a-development-branch (合并/收尾) ──► writing-skills (沉淀可复用流程)
```

### 与 Harness 7 条机械约束的融合点

- **Doc-Driven（约束 1）** ↔ `brainstorming` 设计文档 + `writing-plans`。
- **Test-Driven（约束 2）** ↔ `test-driven-development`。
- **只读白名单（约束 3）** ↔ `subagent-driven-development` 的隔离边界。
- **闭环修复 / Ralph Cycle（约束 4）** ↔ `systematic-debugging` + `verification-before-completion`。
- **自动化 / 视觉 / 全局 E2E（约束 5/6/7）** ↔ `verification-before-completion` 的具体执行手段（tsc / vitest / Playwright）。
- **方法论门禁（约束 8）** ↔ `brainstorming` 的 HARD-GATE。

---

## 4. 三路径（Three Paths）速查

`brainstorming` 将需求分为三类，决定是否需要产出设计文档与审批：

- **Spike（探针）**：可行性未知，先做最小实验验证假设。无需重型文档。
- **Bounded（有界）**：范围明确、风险可控的小改动。轻量计划即可。
- **Architectural（架构级）**：影响文档体系 / 工程护栏 / 多模块。须产出 `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` 并经用户审批。

> 2026-08-19 的"superpowers 驱动重构"被分类为 **Architectural**，对应设计文档见 `docs/superpowers/specs/2026-08-19-paoku-superpowers-overhaul-design.md`。

---

## 5. 索引

- 设计文档索引：[`docs/superpowers/specs/README.md`](docs/superpowers/specs/README.md)
- 主入口：[`AGENTS.md`](../AGENTS.md)（含 Skill ↔ Subagent 映射表与方法论门禁）
