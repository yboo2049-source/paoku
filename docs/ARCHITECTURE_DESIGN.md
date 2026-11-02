# 系统架构与模块隔离设计 (Architecture Spec)

## 2026-11-02 PAO-17批准后A→B串行写权

[本批计划](plans/2026-11-02-pao17-approved-execution.md)固定pao-17@fcddba1495a27436de64971720aad67624bc4420，由原17聊天单一实现方执行。A独占babylon/assets/environment/entityViews及专属测试，先保留门面并明确加载容器/实例/共享材质/阴影/订阅的归属、失效与幂等释放；完成完整验证检查点后B独占main的render/legacyView必要取样参数和disposeGame最小接线。Dispatcher仍只写文档与验收。

只读帧身份`{runId,tick,discontinuity,appState}`类型在渲染模块定义，复用现有类型，shared types只读；context和模拟身份取自同一次presentation(alpha)，应用状态在同次同步调用投影，位移不再次插值。disposeGame调用幂等renderer.dispose，eventBus回调保存身份后off；只移除自己创建的Canvas。main其他业务、application/core/physics/modelBindings/DOM/public/依赖和共享配置不开放。合成夹具与生产绑定分开，renderer缓存与旧消费者资格分开，18角色/相机路径继续递延。

## 2026-11-02 PAO-16/17 并行写权

[并行交接](plans/2026-11-01-pao16-pao17-parallel-prompts.md)：16接续3de6e54，只改专属标定工具/测试及新refinement诊断证据，原src/public/首批诊断证据只读；17从19aa314分析实际渲染门面，只写任务级设计/接口验收方案。17目录已建立，但不是正式实现基线或运行环境签收；两树互不写入/合并，main/types/共享总纲无并行写权。

## 2026-11-01 PAO-16 标定探针边界

[独立标定工具](plans/2026-11-01-pao16-calibration-spike.md)只读取既有GLB和M1逻辑，输出有证据/置信度的测点、候选矩阵与误差分类，不改src/public或生产模型绑定。source节点/loader手性/asset→logic重基各转换一次；工程车组合单视觉根，逻辑RAMP/ROOF仍独立。非等比/不可拟合须诊断，不能反改物理或拿外框匹配当表面对齐通过。

## 2026-11-01 PAO-15 试样隔离

[已批准局部试样](plans/2026-11-01-pao15-rig-spike.md)保留pao-15@8b26bdf，不合并PAO-19。原GLB只读，派生DCC/导出/校验工具分别在专属目录，独立Babylon预览不修改src/public/main/render。数据记录source/derived hash、骨架/权重/逆绑定矩阵、源→引擎变换及姿势证据；动画仅变形，不获得模拟位移或碰撞权威。试样不是正式运行时资产注册或PAO-18接线放行。

## 2026-11-01 PAO-19 已批准实现边界

用户已批准[UI方案A、适用UI风格与I-01/I-02](plans/2026-11-01-pao19-approved-execution.md)，本节对PAO-19优先于旧准备白名单。单一PAO-19实现方在原独立工作树串行A→B：A写dom/views/style、专属测试及HTML仅viewport-fit/lang；接口与完整回归检查点后，B独占main.ts的命令生命周期最小接线。其他聊天不得并写main，Dispatcher只写文档与验收。

UIManager保留现有公开门面；新增只读pending/result接收接口与原commandId/type/runId关联，复用既有CommandResult。业务事务/存档schema/共享types/模拟与渲染不开放修改；UI无application实例或钱包权威。递延命令去重、旧局回执隔离、失败显式重试身份与字段音频意图须由测试证明，不能凭新反馈重做事务。

## 2026-11-01 M2 调度准备边界

[M2分工/白名单/手动提示词](plans/2026-11-01-m2-dispatch-preparation.md)以已验收M1实现19aa314为接续基线；本规划树旧源码不作为M2实现起点。15角色资产、16场景标定、19DOM UI先独立准备，17待16、18待15/17，均不因目录准备而自动放行实现。

- 模拟/应用保留唯一权威；M1实际AppSnapshot/AppCommand及PAO-13显式模型绑定优先于历史接口示例。资产scene bounds不成为碰撞参数，标定在表现边界转换一次。
- 渲染17拥有assets/environment/entityViews与babylon入口，18接续其characterView/cameraRig；两者不同时写babylon.ts。19限DOM/views/CSS，经现有应用意图桥接入，application服务、main/types只读。
- 共享入口若确需修改，由Dispatcher先明确契约与互斥白名单，再串行派给单一实现方；主Agent不编写游戏实现。跨分支资产/代码由专门集成任务汇合，不自动合并main。
- 本节是调度契约，不宣称正式风格/真机预算/新GLB标定已冻结。具体设计及共享文档先批准、同步，再进入任务实现。

## 2026-10-31 M1 审查生效口径（限定 PAO-10）

[PAO-7/8/9 一致性审查](reviews/2026-10-31-pao-7-8-9-consistency.md)允许规划 PAO-10；本节为本批技术契约，优先于下文历史示例。正式美术、机型/帧率承诺与玩法假设仍待人工冻结。总体方案已批准，本次仅文档交接，未实现新接口。

- 坐标为 X 横向向右、Y 世界高度向上、Z 前进；1单位=1m，速度m/s、加速度m/s²。玩家位置是脚底中心，实体是底面中心；禁止按旧示例交换当前实现轴向。车道中心为[-3,0,3]，碰撞使用实际位置。
- 数据目标为 PlayerMotion、Surface、ObstacleDefinition、TrackSegment、RunState、PresentationEvent；完整字段依据[PAO-9固定契约](https://github.com/yboo2049-source/paoku/blob/2eac04b317bbda3e3a97d8fad694926fcfd43ae0/docs/architecture/rebuild-contracts.md)。PAO-10仅引入其必需子集，其余模块在对应任务迁移，不一次替换全库。
- 设备输入只生成带runId/tick/sequence的命令；模拟拥有唯一可写状态，渲染/UI/音频读取深只读快照。RunPhase与应用页面状态分开。时间为tick×stepSec，不从渲染帧推进游戏计时。
- 目标事实事件带contractVersion/eventId/runId/tick/sequence/timeSec/type/payload，ACTION_STARTED、PLAYER_LANDED、PICKUP_CONSUMED等以PAO-9第6节为准。下文STATE_CHANGED/value等为旧设计示例，不是当前实际emit或新版承诺；旧桥只能单向且同一事实不得双发。
- COIN拾取统一status；pickupCount、pickupCoins、rewardCoins分账，收益为后两者之和；任务不从表现事件发钱。积分兼容0.1×里程×倍率，不因固定步改玩法。存档与交易仍归PAO-14。
- PAO-10路径限于JSON prompt白名单；main.ts/types/index.ts只做核心接线，不整合应用交易、物理重构或渲染。PAO-14共享入口串行，待PAO-10审查交接；三份送审分支只读、不合并。

完整差异裁定、来源行号及人工待决项以审查报告为准；不把本批技术交接等同PAO-7/8/9最终人工验收。

## 1. 模块解耦与状态机图 (State Machine Diagram)

```mermaid
stateDiagram-v2
    [*] --> MENU
    MENU --> PLAYING : 开始游戏 (START_GAME)
    MENU --> SHOP : 进入商店 (OPEN_SHOP)
    SHOP --> MENU : 返回菜单 (BACK_TO_MENU)
    PLAYING --> PAUSED : 按下 ESC (PAUSE_GAME)
    PAUSED --> PLAYING : 恢复游戏 (RESUME_GAME)
    PLAYING --> GAMEOVER : 发生碰撞 (COLLISION_DEATH)
    GAMEOVER --> PLAYING : 重新开始 (RESTART)
    GAMEOVER --> MENU : 返回主菜单 (GO_MENU)
```

---

## 2. EventBus 事件通信契约 (Event Bus Contracts)

系统核心逻辑与 UI/音效完全基于发布-订阅模式（EventBus）脱耦：

| 事件名称 | 触发时机 | Payload 负载说明 |
| :--- | :--- | :--- |
| `STATE_CHANGED` | 游戏状态发生变更时 | `{ oldState: GameState, newState: GameState }` |
| `COLLISION` | 玩家击中障碍物/金币/道具时 | `{ targetType: string, position: {x,y,z} }` |
| `COIN_COLLECTED` | 拾取金币时 | `{ value: number, total: number }` |
| `POWERUP_ACTIVATED` | 激活磁铁/滑板等道具时 | `{ type: PowerUpType, duration: number }` |
| `PLAYER_ACTION` | 触发跳跃/翻滚/换道时 | `{ action: 'JUMP' | 'ROLL' | 'CHANGE_LANE', value?: number }` |

---

## 3. 目录与职责划分 (Directory Boundaries)

*   `/src/core`：主循环 (`gameLoop.ts`) 与全局事件总线 (`eventBus.ts`)。
*   `/src/entities` 或 `/src/types`：纯 TypeScript 数据接口定义与状态 Context。
*   `/src/systems`：无状态纯函数逻辑层（`physics.ts`, `input.ts`, `spawner.ts`, `audio.ts`, `mission.ts`）。
*   `/src/render`：Babylon.js 商业 3D 场景、Glow 辉光、PBR 材质、阴影与视效 (`babylon.ts`)。
*   `/src/ui`：DOM 覆盖层与交互控制 (`dom.ts`)。

## 4. 核心状态机 (State Machine)
```typescript
export enum GameState {
  Menu = 'MENU',
  Playing = 'PLAYING',
  GameOver = 'GAMEOVER'
}
```

## 5. 实体数据结构 (Entities)
```typescript
export type Lane = 0 | 1 | 2; // 左中右三条跑道

export enum PlayerState {
  Running = 'RUNNING',
  Jumping = 'JUMPING',
  Rolling = 'ROLLING'
}

export interface Player {
  lane: Lane;
  y: number; // 逻辑前行距离
  z: number; // 高度（用于跳跃/下蹲逻辑）
  state: PlayerState;
  stateTimer: number; // 状态持续时间倒计时
}

export enum EntityType {
  Obstacle = 'OBSTACLE',
  Coin = 'COIN'
}

export interface GameEntity {
  id: string;
  type: EntityType;
  lane: Lane;
  y: number; // 实体在跑道上的逻辑位置
  width: number;
  length: number; // Y轴深度
  height: number; // Z轴高度
  isCollected?: boolean; // 金币专属标记
}
```

## 3. 全局游戏状态树 (Global Game State)
```typescript
export interface GameContext {
  state: GameState;
  score: number;
  time: number;
  speed: number;
  
  player: Player;
  entities: GameEntity[];
}
```
