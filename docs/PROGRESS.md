# 项目进展与重构日志 (Progress & Refactoring Log)

本文档用于记录核心机制的重大变更与功能落地，作为 Agent 协作的状态同步源。

## 最新进展 (Latest Updates)

### Superpowers 驱动重构 + 质量守护闭环 (obra/superpowers Overhaul) - 2026-08-19
*   **方法论落地**：基于 `obra/superpowers` v6.3.0（14 个 skill 已安装至 `~/.workbuddy/skills/`），按 `brainstorming → writing-plans → TDD → verification` 标准闭环完成本轮全部交付。
*   **文档体系对齐实际代码**：`AGENTS.md` 全面重写 —— 修正引擎事实（**Three.js → Babylon.js**）、修正文件路径（`src/render/three.ts → babylon.ts`、`src/systems/collision.ts → physics.ts`）、修正导航表（删除不存在的 `V4_PRODUCT_DOCUMENT.md`、新增 `SUPERPOWERS_WORKFLOW.md`）、新增 **Superpowers Skill ↔ Subagent 角色映射表**（14 skill 显式绑定到 5 Subagent + Dispatcher）、新增第 8 条方法论门禁（`brainstorming` HARD-GATE）。
*   **工作流规范化**：新增 [`docs/SUPERPOWERS_WORKFLOW.md`](SUPERPOWERS_WORKFLOW.md) 说明 WorkBuddy 适配差异（无 SessionStart hook → 手动触发 `using-superpowers`；无视觉伴随 → Playwright 截图替代）。新增 [`docs/superpowers/specs/README.md`](superpowers/specs/README.md) 作为设计文档索引。
*   **本轮 Plan A 全量完成（tsc + vitest 22/22 + playwright 1/1）**：
    *   物理核心：`tests/unit/physics.test.ts` 从 11 扩充至 14 用例，新增覆盖 AC-PRD-03 **无敌保护帧**、**翻滚计时器自动解除**、**完整跳跃抛物线落地**。
    *   任务系统：`tests/unit/mission.test.ts` 新建 8 用例，覆盖 AC-PRD-09（`initMissions` 深拷贝、`resetMissions` 归零、COLLECT_COINS 奖励入账、JUMP/ROLL 计数驱动完成、幂等不重复结算、非 PLAYING early-return）。
    *   Bug 修复：移除 `src/systems/mission.ts` 中冗余的 `ctx.totalCoins += reward`（dom.ts 每帧覆盖，行为由 `ctx.coins` 在 GAMEOVER 持久化保证）；修复 `src/systems/input.ts` 与 `dom.ts` 双监听 `Escape` 导致 TOGGLE_PAUSE 被触发两次、暂停失效的预存缺陷（移除 input.ts 中的 Escape 处理，保留 dom.ts 状态感知的单一入口）。
*   **设计文档**：[`docs/superpowers/specs/2026-08-19-paoku-superpowers-overhaul-design.md`](superpowers/specs/2026-08-19-paoku-superpowers-overhaul-design.md) 已审批归档。后续 6 项延后功能见 [`docs/FEATURE_LIST.md`](FEATURE_LIST.md)「后续迭代」段。

### 商业级 3D 渲染架构迁移与 3D 人物重塑 (Babylon.js Engine & Character Overhaul) - 进行中
*   **引擎底层替换**：将原有 Three.js 替换为现代商业级 3D 引擎 **Babylon.js**（`@babylonjs/core`, `@babylonjs/loaders`），实现物理、光影与材质的商业化全套升级。
*   **3D 骨骼角色与全身肢体 (Skeletal Character Mesh)**：将原有的发光长方体替换为具有头、身体、双手与双腿肢体结构的高精 3D 人物模型，支持肢体与关节视效联动。
*   **赛博辉光与高精阴影 (GlowLayer & Soft Shadows)**：引入 Babylon 专属 `GlowLayer`，使所有发光金属金币、赛博霓虹护栏与悬浮滑板喷口产生极具冲击力的真实发光效果。
*   **赛博天际线大楼 (Cyber City Skyline)**：在轨道两侧随机生成带窗户与发光广告牌的高低赛博建筑背景，彻底脱离原有简陋的空旷场景。
*   **3D 场景组件精细化重塑 (Train & Props Overhaul)**：全面升级火车车头灯/车轮/拉线、斜坡冲刺箭头与发光加固梁、栅栏双侧警示灯以及立体五角星金币。
*   **地铁轨旁多元环境元素升级 (Trackside Environment Multi-Elements)**：在轨道两侧与上方铺设跨轨龙门网架、高压电缆、轨旁信号灯杆、防撞控制柜、巨型工业通风管道、隔音屏障与弯曲赛博霓虹路灯。



---

## 历史遗留问题修复
*   修复了 Safari/部分 Chrome 核心下 Blob URL 解析 SVG 失败导致人物变“隐形人”的问题（已统一转为 Base64 内联方案）。
*   修复了 Resize 导致 3D 画布被 CSS 容器暴力裁切而引起的“视觉坐标偏移”、“右侧金币形变”等问题，`renderer.setSize` 现已完美贴合容器实际边界。

