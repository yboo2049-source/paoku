# 网页版《地铁跑酷》V3 版本产品执行文档 (Harness PRD) - 终极进化版

## 0. 版本规划声明
V3 版本将是对整个项目的一次“大满贯”升级，标志着游戏从技术 Demo 正式迈入商业化大作标准。得益于前置版本严格落实的“数据与渲染解耦”架构，我们将能在不破坏任何底层核心物理与交互逻辑的前提下，实现极度跨越式的演进（例如原地平滑切换 3D 引擎）。

## 1. V3 系统边界与新增架构意图

### 1.1 终极蜕变：Three.js 真实 3D 渲染 (Graphics Revolution)
*   **技术栈变更**：引入 `three` (Three.js)。废弃纯原生 `Canvas 2D` 的伪 3D 投射，改为真正的 WebGL 3D 渲染器。
*   **架构收益验证**：这一步是对 Harness Engineering 理念的终极考核。我们的 `src/systems` 产出的 `(lane, y, z)` 逻辑坐标将不做任何修改，无缝桥接至 Three.js 的空间坐标系，完美体现读写分离的强大。

### 1.2 视听觉共鸣：音效系统 (Audio System)
*   **边界约束**：基于 Web Audio API 或 HTML5 Audio。
*   **规范**：音频管理器 `AudioManager` 只能作为 Render 层级别的只读消费者。它通过监听全局上下文中的状态变化（例如 `score` 的跃变、`buffs` 的激活、`state` 变为 GAMEOVER）来触发音效，绝不允许反向影响游戏逻辑。

### 1.3 移动端原生化：PWA 与 触控系统 (Mobile & PWA)
*   **PWA 架构**：集成 `vite-plugin-pwa`，增加 `manifest.json` 与 Service Worker 注册，支持离线缓存和“添加至桌面”功能。
*   **输入突变**：`Input System` 除了监听 Keyboard，新增全局 `Touch` 滑动事件（上滑跳跃、下滑翻滚、左右滑切道）。

### 1.4 全局成就与竞技：任务与模拟后端 (Missions & Leaderboard)
*   **任务引擎**：新增 `MissionSystem` 纯函数。监控单局各项数据（如单局获得金币数、躲避障碍数），完成后提升全局等级并赋予分数倍率。
*   **排行榜中心**：构建一个模拟的异步排行榜 API (`mock-backend`)。在 `GAMEOVER` 时上传当前最高分，并在主界面展示“世界天梯榜”。

## 2. 模块重构与多代理脚手架 (Subagent Scaffolding)

为确保并发开发安全，将派遣 3 名高度专业的 Subagent：

### 🎯 代理 A：3D 引擎架构师 (Role: 3D Engine Developer)
*   **隔离域**：只修改 `package.json`（安装 three）、`src/render/three.ts`。
*   **任务**：
    *   移除 `canvas.ts`，创建全新的 `ThreeRenderer` 类。
    *   构建 Scene、PerspectiveCamera、WebGLRenderer 和简单的环境光/定向光。
    *   将 `entities` 映射为 3D 几何体（如金币为旋转的 Cylinder，玩家为带材质的 Box）。

### 🎵 代理 B：多媒体与移动端专家 (Role: Mobile & Audio Expert)
*   **隔离域**：只修改 `src/core/audio.ts` 和 `src/systems/input.ts`。
*   **任务**：
    *   实现极简的 Audio 单例，暴露 `playJump()`, `playCoin()`, `playCrash()` 等方法。
    *   在 `input.ts` 中绑定 `touchstart` 和 `touchend` 事件，通过坐标差值（Delta X/Y）计算滑动意图，将其统一转化为现有的 `InputCommand`。

### 🌍 代理 C：PWA与后端工程师 (Role: Meta-Game Developer)
*   **隔离域**：只修改 `vite.config.ts`, `src/core/missions.ts` 及 UI DOM。
*   **任务**：
    *   配置 Vite 的 PWA 插件。
    *   实现任务升级树逻辑，并在 UI 层面显示当前任务（如“收集 100 枚金币”）。
    *   构建一个带延迟的假 Fetch API，返回 10 个世界排名的随机名字及分数，并附加玩家的真实分数，注入排行榜 DOM。
