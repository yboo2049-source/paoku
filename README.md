# Paoku 3D (Web-based Subway Surfer Clone)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-3D_Engine-green.svg)

这是一个基于 Web 的 2.5D/3D 跑酷游戏项目。玩家可以在三条赛道上躲避疾驰的火车、跨越路障、收集金币，并使用各式各样的强力道具（磁铁、护盾、飞行背包、超级跑鞋等）刷新最高分。

本项目不仅是一个网页游戏，更是一个探索 **AI 自主编程与架构控制（Harness Engineering）** 的前沿试验场。

## 🌟 游戏特性 (Features)

- **2.5D 纸片美术风格**：使用自定义 SVG 材质结合 Three.js 平面几何体，还原《地铁跑酷》（Subway Surfers）中经典的 Jake 人物形象与精致的 2D 贴图。
- **严谨的物理碰撞引擎**：精准计算抛物线跳跃、翻滚高度，确保平地无法直接跃上火车，高度契合真实跑酷逻辑。
- **自动地形生成 (Spawner)**：无限随机生成前方的火车、金币阵列与组合障碍。
- **渐进式 Web 应用 (PWA)**：支持离线缓存，提供类似原生 App 的体验。
- **AI 自动寻路 (Autopilot)**：内置机器人，可自动规避危险、收集金币。

## 🏗️ 架构范式

我们强烈拒绝大模型在无边界环境下的“胡乱修改”。本项目通过清晰的文件层级、只读规范与自动化测试来约束 AI（即 Subagents）的行为。

如果您是人类开发者，或协助开发的 AI Agent，在修改代码前请务必阅读以下导航：

1. **[AGENTS.md](AGENTS.md)**: 系统内虚拟 Agent 角色划分、操作边界约束以及**自动化自测公约**。
2. **[CONTRIBUTING.md](CONTRIBUTING.md)**: 开发者与 AI 协作的不可侵犯公约。
3. **[PROGRESS.md](PROGRESS.md)**: 项目最新进度追踪与 Fail-Refine 教训总结。

所有的详细设计图、API 契约和历代 PRD，均收纳在 `docs/` 目录下。

## 🚀 本地运行与部署

项目基于 Vite 构建，天然支持极速的热更新体验。

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务器
npm run dev

# 3. 生产环境构建 (Vercel 部署会自动执行)
npm run build
```

*(注意：由于开启了 PWA，如果在开发时更新代码后没有看到画面变化，请强刷浏览器或清除 Service Worker 缓存。我们在 `index.html` 中已加入自动清缓存脚本)*
