# 测试用例与传感器计划 (Test Plan & Sensors)

## 1. 静态类型护栏 (Static Guardrails)
*   **验证指令:** `npx tsc --noEmit`
*   **验收标准:** 必须 0 Error，任何类型推断不明确（any）都不被允许。每次关键节点（Checkpoint）必须通过此检验。

## 2. 核心逻辑单元测试 (Unit Tests via Vitest)
### 2.1 Input System Tests
*   **用例 1: 正常切道** 
    *   输入：`lane 1`, 向左指令。 断言：返回 `lane 0`。
*   **用例 2: 越界防御 (边界保护)**
    *   输入：`lane 0`, 向左指令。 断言：返回 `lane 0`，不抛错。
    *   输入：`lane 2`, 向右指令。 断言：返回 `lane 2`，不抛错。
*   **用例 3: 动作冲突**
    *   输入：在 `Jumping` 状态下输入 `Rolling`。 断言：优先取消跳跃，进入 `Rolling` 状态。

### 2.2 Collision System Tests
*   **用例 1: 完美碰撞触发 GameOver**
    *   构造数据：Player 与 Obstacle 坐标完全一致，在同一 Lane。
    *   断言：执行 Collision System 后，`GameContext.state === GameState.GameOver`。
*   **用例 2: 高度规避 (跳跃/下蹲)**
    *   构造数据：Player 与低矮障碍物在同一(lane, y)，但处于跳跃状态且 `player.z` 高于障碍物高度。
    *   断言：不触发 GameOver。
*   **用例 3: 金币收集**
    *   构造数据：Player 与 Coin 碰撞。
    *   断言：分数增加，金币的 `isCollected` 标志变为 true。

## 3. 视觉传感器 (Debug 面板)
*   在前端页面左下角固定 `<pre id="debug-panel">`。
*   **输出内容 (每帧 JSON.stringify):**
    *   `FPS`
    *   `Game State (Menu/Playing/GameOver)`
    *   `Player State (lane, z, Action)`
    *   `Entities count` 
