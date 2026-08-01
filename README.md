# Paoku (3D 跑酷)

这是一个基于 Web 的 3D 跑酷项目。本项目不仅是一个游戏，更是一个探索 **AI 自主编程与架构控制（Harness Engineering）** 的试验场。

## 架构范式

我们强烈拒绝大模型在无边界环境下的“胡乱修改”。本项目通过清晰的文件层级、只读规范与自动化测试来约束 AI（即 Subagents）的行为。

如果您是人类开发者，或您是协助开发的 AI Agent，请务必在开始修改任何一行代码前，阅读以下导航文件：

1. **[AGENTS.md](AGENTS.md)**: 了解当前系统中有哪些虚拟 Agent，以及你被分配了什么角色、你的操作边界在哪里。
2. **[CONTRIBUTING.md](CONTRIBUTING.md)**: 开发者与 AI 协作的不可侵犯公约。
3. **[PROGRESS.md](PROGRESS.md)**: 查看项目最新的进度、上一次开发失败的教训总结。

所有的详细设计图、API 契约和历代 PRD，均收纳在 `docs/` 目录下。

## 本地运行

项目基于 Vite 构建：

```bash
npm install
npm run dev
```
