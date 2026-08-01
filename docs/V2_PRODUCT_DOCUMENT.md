# 网页版《地铁跑酷》V2 版本产品执行文档 (Harness PRD) - 全景版

## 0. 版本规划声明
V2 版本的核心目标是实现**全面进化**。将囊括道具、动态环境、外围养成、极致视效等所有大作级跑酷元素，同时继续坚守纯粹的 Vite + Vanilla TS + Canvas 2D 护栏（依靠极简算法实现复杂视觉）。

## 1. V2 系统边界与意图提升 (System Boundaries & Intent)

### 1.1 核心玩法机制全开 (Gameplay)
*   **三大经典道具系统 (Power-ups)**：
    *   `MAGNET` (磁铁): 限时自动吸附一定距离内其他跑道的金币至玩家身上。
    *   `SHIELD` (护盾): 抵挡一次致命碰撞，触发后产生碎裂特效。
    *   `DOUBLE_SCORE` (双倍积分): 限时状态下，获得的任何分数均翻倍。
*   **环境与障碍物多样化 (Rich Environment)**：
    *   `MOVING_TRAIN` (火车): 会随时间主动向玩家方向移动（相向而行），逼迫玩家快速反应。
    *   `DAY_NIGHT_CYCLE` (日夜交替): 随着游戏时间推移，全局光照和背景色将平滑地在清晨、正午、黄昏和午夜之间过渡。

### 1.2 局外系统与商业化雏形 (Meta Game)
*   **数据持久化**：使用浏览器的 `localStorage` 记录历史最高分。
*   **货币与商城 (Skin Shop)**：
    *   玩家收集到的金币会跨局累计存储。
    *   在 Menu 界面新增 `Shop` 入口。允许消耗金币解锁不同颜色的 `Player Skin`。

### 1.3 状态机与视觉表现进阶 (State & Visuals)
*   **游戏状态**：新增 `PAUSED`（暂停）状态，允许在游戏中按 `ESC` 键触发。
*   **极致 Canvas 视效 (Particles & Shadows)**：
    *   引入纯手工打造的粒子发射器 (Particle Emitter)，处理金币拾取、护盾破裂和高速奔跑时的气流拖尾。
    *   引入更为顺滑的伪3D阴影投射和跳跃缩放曲线。

## 2. 模块重构与增量脚手架 (Task Scaffolding)

### 模块 A：全局状态更新 (Types)
*   `GameState`: 增加 `'PAUSED' | 'SHOP'`。
*   `EntityType`: 增加 `'MAGNET_ITEM' | 'SHIELD_ITEM' | 'DOUBLE_SCORE_ITEM' | 'MOVING_TRAIN'`。
*   `Player`: 增加 `buffs: { magnetTimer: number; shield: boolean; doubleScoreTimer: number }`，以及当前佩戴的 `skinColor`。
*   新增 `GlobalSaveData`: 存储 `{ highscore, totalCoins, unlockedSkins }`。

### 模块 B：核心系统演进 (Systems)
*   **Input System**: 补充 `ESC` 拦截，以及商城界面的点击购买事件。
*   **Magnet System (New)**: 基于距离阈值的吸附寻路算法。
*   **DayNight System (New)**: 根据 `context.time` 计算并输出当前环境光色值 `ambientColor`。
*   **Collision System**: 加入双倍积分乘数逻辑与免死销毁逻辑。

### 模块 C：粒子与渲染引擎升级 (Render & Particles)
*   分离出 `ParticleManager` 单例，Render 系统每帧读取并更新粒子坐标（模拟抛物线和重力）。
*   基于 `ambientColor` 混合渲染物体的材质颜色。

## 3. V2 验证传感器 (Sensors & Tests)
*   所有新系统必须依然遵循纯函数要求，且不直接操作 DOM。
*   新增 `Shop System` 的购买扣费逻辑单元测试，严防金币溢出或负数。
