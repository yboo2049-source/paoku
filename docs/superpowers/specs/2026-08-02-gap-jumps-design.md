# Gap Jumps & Physical Ground Entities Design

## Goal
丰富地形生成预设，添加连续断层路段 (Gap_Jumps) 并实装严谨的物理坠崖判定（重力系统不再默认脚下永远有平地）。

## Architecture / Design

### 1. 实体系统 (`types/index.ts`)
*   新增 `EntityType`: `'GROUND'`。
*   `GROUND` 将作为真实的地块实体存在于关卡中，负责为玩家提供 `z=0` 的物理支撑。

### 2. 物理与移动逻辑 (`movement.ts`)
*   **重力保底修改**：取消硬编码的无条件 `floorZ = 0`。默认 `floorZ` 修改为 `-100`。
*   **支撑检测**：在计算 `floorZ` 的实体遍历中，加入对 `GROUND` 实体的检测。如果玩家所处的 Y 轴范围和赛道内有 `GROUND` 实体，则 `floorZ` 提升为 `0`（或对应的地板高度）。
*   **坠落行为**：如果玩家进入了未生成 `GROUND` 的空白区域，且不在列车顶或 Ramp 上，`floorZ` 为 `-100`，重力将导致玩家 `z` 轴坐标急剧下降。

### 3. 碰撞与判定 (`collision.ts`)
*   **死亡判定**：在每帧碰撞检测中，如果发现玩家坐标 `player.z < -20`，则判定为坠崖死亡。
*   **结算行为**：此时游戏状态变更为 `GAMEOVER`，上报 `player_fall` 遥测事件。

### 4. 关卡生成器 (`spawner.ts`)
*   **向后兼容的底层铺设**：对于所有现有的 Pattern（如 `Pattern_ZigZag_Trains` 等），统一为其三条赛道铺设与 `segment.length` 等长的连续 `GROUND` 实体，保证旧关卡的正常体验。
*   **新增预设 `Pattern_Gap_Jumps`**：
    *   长度如 800。
    *   在该路段中，部分赛道或全部赛道会发生中断（例如 Y: 200 到 350 不生成 `GROUND`）。
    *   在断层边缘提供金币作为跳跃引导。
    *   为了增加挑战，可能其中一条赛道不断裂，逼迫玩家切道；或者三条全部断裂，逼迫玩家起跳跨越。

## Spec Self-Review Checklist
*   [x] 涵盖所有功能点（实体、物理、生成）。
*   [x] 没有遗留 TBD/TODO 等占位符。
*   [x] 兼容现有关卡（旧关卡铺设默认 `GROUND`）。
