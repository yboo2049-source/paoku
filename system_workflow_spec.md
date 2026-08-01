# 核心系统模块与纯函数规范 (System Workflow Spec)

## 1. 模块边界原则
所有在 `/src/systems` 下的函数，必须设计为纯函数（或接受可变状态但自身不引起外部副作用的函数），其标准签名为：
`type SystemFunction = (context: GameContext, deltaTime: number, inputs?: InputState) => void;`
*为优化性能，可以在单例模式下允许直接 mutate context 树，但严禁在 system 中操作 DOM 或 Canvas，保持严格的边界隔离。*

## 2. 模块细分
### 2.1 Input System (输入控制)
*   **输入:** 键盘事件流转换后的 `InputState`。
*   **处理:** 
    *   检查冷却/防抖。
    *   处理越界防御：如果 `player.lane === 0` 且输入向左，则忽略。
    *   变更 `player.lane`, 触发 `player.state` 变更为 Jumping/Rolling 并重置定时器。
*   **输出:** 变更后的 `player` 状态（就地修改）。

### 2.2 Movement System (运动系统)
*   **处理:**
    *   根据 `deltaTime` 和当前 `speed` 增加 `player.y`。
    *   更新 `player.z` 模拟跳跃抛物线。
    *   处理 `Jumping/Rolling` 的倒计时，结束时恢复为 `Running`。

### 2.3 Spawner & Garbage Collection (场景生成与回收)
*   **处理:**
    *   在玩家前方距离 `y + renderDistance` 处按概率生成 `Coin` 或 `Obstacle`，推入 `context.entities`。
    *   检查 `context.entities`，若实体的 `y` 落后玩家超过一定距离（不在渲染区域内），则将其从数组中 `splice` 移除。

### 2.4 Collision System (碰撞物理)
*   **处理:**
    *   遍历 `entities`，基于 3D 逻辑坐标（lane, y, z）和包围盒进行 AABB 碰撞检测。
    *   若类型为 `Coin` 发生重叠：标记 `isCollected = true`，`score += 10`。
    *   若类型为 `Obstacle` 发生重叠：更改 `context.state = GameState.GameOver`。
