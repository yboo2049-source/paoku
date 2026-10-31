# PAO-9：重构数据、坐标与模块契约

日期：2026-10-31（Asia/Shanghai）。契约版本：`rebuild-v1`，状态：**提交评审，尚未批准实施**。

本次只执行 [PAO-9](https://linear.app/paoku-v1/issue/PAO-9)。以 `e8d3101` 为工作树基线，游戏实现基线为 `fa9d67b`。遵循该 Issue 2026-10-31 最新评论，独立交付本文；不修改共享文档、`src/`、资产、依赖或测试实现，不创建工作树、不合并其他分支。本文冻结建议的字段语义、边界和适配规则；主聊天审查通过后才成为实现依据。固定步长数值、补步上限、设备预算由 PAO-8/10 验证，不在此冒充已测结论。

## 1. 依据与方案选择

已读 AGENTS.md、CONTRIBUTING.md、架构/工作流/测试主文档、PRD、Harness 与 Superpowers 工作流、[整体设计](../superpowers/specs/2026-10-31-paoku-complete-rebuild-design.md)、[阶段任务索引](../plans/2026-10-31-paoku-rebuild-linear-plan.md)、[PAO-6 实测报告](../TEST_PLAN_AND_SENSORS.md#pao-6-实测报告2026-10-31asiashanghai)及[证据索引](../evidence/PAO-6/README.md)。PAO-6 已 Done；其证据等级 N/F/S/H 保留，不将夹具可达性扩展为随机路线保证。

| 方案 | 收益 | 代价与选择 |
| --- | --- | --- |
| A：单一目标契约、模块逐段替换、单向临时适配 | 每批可验证/回退，兼容旧表现，符合已批准总路线 | 需要显式退出条件；采用 |
| B：一次替换所有模块 | 短期无适配层 | 跨职责风险大，回归难定位；不采用 |
| C：长期维护新旧两套可写 Context | 可分散开发 | 双重计分、状态漂移、事件重复；不采用 |

PAO-6 的坡体遮挡角色（F）要求模型和支撑面共用几何；30 个拾取币触发 50 奖励、余额 80（F）要求拾取计数与收益分账；速度直接标 KM/H（S）要求单位换算；空中 isJumping/isRolling 同时为真（N）要求正交运动/姿态；DOM 结算、九键无版本存档（S）要求应用服务拥有持久化。本文只解决契约，不修复这些现状。

## 2. 坐标、时间与几何

| 项目 | 唯一语义 | 约束 |
| --- | --- | --- |
| X / Y / Z | 横向 / 世界高度 / 前进，+X 右、+Y 上、+Z 前 | 逻辑为 Babylon 当前方向；相机、资产局部方向只在表现导入边界转换 |
| 长度、速度、加速度 | m、m/s、m/s²；1 世界单位 = 1 m | HUD 若显示 km/h，使用 `speedMps * 3.6`，显示取整只在 UI；18 m/s = 64.8 km/h |
| 时间 | 模拟 `tick` 为非负整数；`timeSec = tick * stepSec` | 所有计时器按模拟时间；渲染/墙钟不能推进道具/任务；stepSec 为本局配置 |
| 位置原点 | 玩家位置为脚底中心；出生点 `(0,0,0)` | 车顶 y=3 即绝对世界高度3，不能写成“0代表地面/车顶” |
| 车道 | `Lane = 0 | 1 | 2`，中心 X `[-3,0,3]` m | lane 是目标选择，碰撞看实际 X，不看目标 lane |
| 尺寸 | width=X、height=Y、depth=Z，严格正有限数 | 实体 position 为底面中心；AABB 为 X/Z 中心±半尺寸，Y 从底到顶 |
| 模板局部空间 | 段内 Z 从0至length，Y 为相对段基准高度 | 只在实例化时加 segment origin；旋转/缩放后的碰撞代理由定义显式给出 |
| 运动物 | velocity 为世界 m/s，迎面列车 velocity.z < 0 | 支撑/碰撞使用相对运动；不可把玩家前进距离与列车里程混为一体 |

坡面局部范围 `zMin < zMax`，`u = (localZ-zMin)/(zMax-zMin)`。仅在 X/Z 范围有效时求 `heightWorld = origin.y + startHeight + u*(endHeight-startHeight)`。返回平面法线与表面速度；车顶为起止高度相同的面。不能在范围外 clamp 后提供无限支撑；横向离开、上升跳离时立即清除支撑；下降扫过支撑面才落地。坡顶与车顶连接使用共同端点，不能额外加一次车高。

建议接缝误差 `1e-4 m`、数值比较误差 `1e-6`，与玩法宽容距离分开配置。PAO-11/12 通过边界测试确定最终误差；不沿用旧高度豁免作为新几何规则。装饰、镜头弯曲、震动和骨骼动画不得改逻辑几何。

## 3. 目标数据模型（规范草图，非现有导出）

所有数值必须有限；所有计数为非负安全整数；ID 是非空字符串。静态定义加载后不可变；运行实例由模拟独占写；跨层快照为深只读值对象，数组不暴露 Context/Map/Scene 引用。序列化按 ID 排序，事件按序号排序。

```typescript
type Lane = 0 | 1 | 2;
type Vec3 = { x: number; y: number; z: number }; // m 或 m/s，依字段
type PowerUpType = 'MAGNET' | 'DOUBLE_SCORE' | 'SUPER_SNEAKERS' | 'HOVERBOARD';
type RunPhase = 'RUNNING' | 'PAUSED' | 'ENDED' | 'ABANDONED';
type InputAction = 'LEFT' | 'RIGHT' | 'JUMP' | 'ROLL';
type InputCommand = {
  runId: string; tick: number; sequence: number;
  action: InputAction; source: 'KEYBOARD' | 'TOUCH' | 'REPLAY' | 'QA';
};
type Effect = { type: PowerUpType; expiresAtTick: number | null; charges: number };

interface PlayerMotion {
  position: Vec3; velocity: Vec3; // 脚底世界位置 m；世界速度 m/s
  targetLane: Lane; targetX: number; // targetX 由车道配置推导
  verticalPhase: 'GROUNDED' | 'RISING' | 'FALLING';
  stance: 'STANDING' | 'ROLLING'; // 与 verticalPhase 正交，允许空中急坠翻滚
  stanceUntilTick: number | null;
  verticalPhaseStartedTick: number; stanceStartedTick: number;
  laneChangeStartedTick: number;
  supportSurfaceId: string | null;
  contact: 'SUPPORTED' | 'AIRBORNE';
  invulnerableUntilTick: number | null;
  effects: readonly Effect[];
}

interface Surface {
  id: string; ownerEntityId: string; // 地面也有稳定实体 ID
  kind: 'GROUND' | 'RAMP' | 'ROOF';
  localBounds: { xMin: number; xMax: number; zMin: number; zMax: number };
  startHeight: number; endHeight: number; // owner 底面原点以上 m
  entrySurfaceIds: readonly string[]; exitSurfaceIds: readonly string[];
}

interface ObstacleDefinition {
  id: string; revision: number; assetId: string;
  kind: 'LOW_OBSTACLE' | 'HIGH_OBSTACLE' | 'STATIC_TRAIN' | 'MOVING_TRAIN' | 'RAMP';
  size: Vec3; // x=width,y=height,z=depth，m；资产按此归一化
  collisionProxies: readonly { id: string; min: Vec3; max: Vec3 }[]; // 局部 AABB
  surfaces: readonly Surface[]; // 此处 ID/owner 是模板符号，实例化时命名空间展开
  interaction: 'SOLID' | 'SUPPORT_ONLY';
}
interface ObstacleInstance {
  id: string; definitionId: string; definitionRevision: number;
  position: Vec3; velocity: Vec3; segmentId: string;
}
interface PickupInstance {
  id: string; segmentId: string; position: Vec3;
  kind: 'COIN' | PowerUpType;
  status: 'AVAILABLE' | 'CONSUMED';
  consumedAtTick: number | null;
}

type TrackPort = { lane: Lane; height: number; surfaceId: string };
interface TrackSegment {
  id: string; revision: number; length: number; // m，局部 Z
  speedRange: { minMps: number; maxMps: number };
  entry: readonly TrackPort[]; exit: readonly TrackPort[];
  placements: readonly (
    { localId: string; kind: 'OBSTACLE'; definitionId: string;
      definitionRevision: number; position: Vec3; velocity: Vec3 } |
    { localId: string; kind: 'COIN' | PowerUpType;
      position: Vec3; velocity: Vec3 }
  )[];
  routes: readonly {
    id: string; entryIndex: number; exitIndex: number;
    commands: readonly { offsetTick: number; action: InputAction }[];
  }[]; // 速度配置下的候选见证，不是对全速域的安全证明
}

interface RunState {
  schemaVersion: 1; runId: string;
  seed: number; rngState: number; rngAlgorithmVersion: string;
  simulationVersion: string; configId: string; contentRevision: string;
  stepSec: number; tick: number; phase: RunPhase;
  inputLog: readonly InputCommand[];
  player: PlayerMotion;
  distanceM: number; speedMps: number; score: number;
  pickupCount: number; pickupCoins: number; rewardCoins: number;
  rewardedMissionIds: readonly string[];
  actionCounts: { jumps: number; rolls: number };
  end: null | {
    tick: number; reason: 'COLLISION' | 'QUIT'; obstacleId: string | null;
  };
}
```

RunState 是每局聚合根；世界实体集合、任务进度、生成器游标和事件序号归属同局模拟状态，完整检查点必须同时包含它们，不能只存上面最小 RunState 然后宣称可恢复。`inputLog` 是追加日志，快照只输出最后确认的输入序号，避免每帧复制全局日志。完整回放需初始种子、算法/模拟/内容/配置版本及有效输入；不保证跨不兼容版本或不同数学实现逐位一致。

Surface 实例 ID 采用 `runId/segmentInstanceId/entityLocalId/surfaceLocalId`，拾取/障碍亦同；重用对象池内存不能重用该局 ID。移动面变换与速度从 owner 实例读取，禁止 Surface 自有另一份可写世界位置；水平/纵向移动面成立，旋转/倾斜动态面本版不支持，加载校验拒绝。实例回收时撤销所有支撑引用；定义热更新不能改变正在跑的一局。

`contact=SUPPORTED` 当且仅当 supportSurfaceId 存在、面有效且脚底贴合，此时 verticalPhase=GROUNDED。RISING/FALLING 必为 AIRBORNE。ROLLING 不自动免除碰撞；碰撞盒按姿态计算。动画的起跳/落地/滑铲进退阶段由各阶段 startedTick、接触和事件派生；空中翻滚只重置姿态起点，垂直阶段变化独立记录，不让动画完成回调推进物理状态。拾取 placements 不引用 ObstacleDefinition，其资产/拾取体积由按 kind 查找的只读 pickup 配置提供；实例化时统一校验该配置存在。

HOVERBOARD 用 `charges=1, expiresAtTick=null` 表达一次护盾，消费后移除；其余效果 `charges=0`、有到期 tick。重复同类拾取采用刷新期限、护盾不叠层的兼容建议，具体持续时间由玩法配置提供；旧事件的 duration=10 不能给护盾虚构10秒寿命。到期判定为 `tick >= expiresAtTick`，当 tick 开始先过期再消费输入，拾取本 tick 新增效果从拾取阶段起生效，不追溯改变本 tick 已执行的跳跃。

## 4. 分数、金币、任务与应用数据

- `score` 为浮点跑动积分：`deltaDistanceM * 0.1 * multiplier`；DOUBLE_SCORE 只影响积分，不能翻倍金币。显示用 floor，历史高分也以 floor 后整数比较。数值是兼容基线，后续调参须版本化。
- `pickupCount` 为成功消耗 COIN 实体次数，当前每实体价值1；`pickupCoins` 为拾取币收益，`rewardCoins` 为任务奖励收益。`earnedCoins = pickupCoins + rewardCoins` 仅为派生量，禁止第三份可写总额。30拾取+50奖励 => count30、pickupCoins30、rewardCoins50、earned80，不是80次拾取。
- 金币任务只看 pickupCount；跳/滚任务只看模拟已接受的动作开始次数，无效输入和按键重复不计。“穿过高障碍”若要计数必须新建独立 mission 类型；旧文案 under obstacles 不能继续描述按 ROLL 次数计数的任务。奖励按 missionId 每局一次，不通过表现事件监听器发钱。
- 拾取 status 是唯一消耗状态，不再有 collected/isCollected 双口径。先 `AVAILABLE -> CONSUMED` 并记录 tick，再更新账本、发布事实；CONSUMED 不能再次生效，之后回收实体。磁吸/飞 HUD 是位置或表现变化，不能提前入账；飞行特效结束不决定是否拾取。

应用拥有 `AppState`（MENU/SHOP/PLAYING/PAUSED/GAMEOVER；未来加载/错误页由 PAO-14/19 扩展）、`SaveData` 与交易。RunPhase 不含菜单/商店：无 activeRun 时才进菜单/商店；Playing↔Running，Paused↔Paused，GameOver↔Ended。UI 不写 RunState。

结算请求携带 runId，服务使用不可变 RunSummary `{runId, scoreInt, pickupCoins, rewardCoins, earnedCoins, endReason}`，以存档账本中的 settledRunIds/幂等记录判重。撞击结束和有收益退出均走同一入口；建议兼容当前“回菜单保留已赚收益”，记录 ABANDONED/QUIT，重开产生新 runId。单次写入包含余额、高分和幂等记录，失败返回可重试结果，不能先更新 HUD 再读 DOM 追账。多标签页并发、账本压缩和异常退出恢复由 PAO-14 明确验证后实现，不宣称 localStorage 单键写就解决所有事务。

存档目标为单个版本化记录 `{schemaVersion, revision, walletCoins, highScore, ownedSkinIds, selectedSkinId, audio, settledRunIds}`，不保存局内状态。PAO-14 先读旧九键再验证、在内存生成新对象、成功写新版本后才标记迁移完成；保留旧键备份直到迁移验收。不得从当前 DOM 或旧局 ctx.coins 推算历史拾取/奖励构成。

| 旧键（PAO-6盘点） | 目标字段/校验建议 |
| --- | --- |
| paoku_high_score / paoku_total_coins | highScore / walletCoins；非负安全整数，损坏值回退0并报告恢复，不传播 NaN |
| paoku_unlocked_skins | ownedSkinIds；字符串白名单、去重，至少默认皮肤 |
| paoku_selected_skin | selectedSkinId；必须拥有；cyan/pink/gold/green/purple 到新资产映射未冻结前保留 legacy ID，禁止丢失已购权利 |
| paoku_audio_master_muted | audio.masterMuted；旧“1”为 true，其余按旧默认 |
| paoku_audio_bgm_enabled / paoku_audio_sfx_enabled | audio.bgmEnabled / sfxEnabled；旧“0”为 false，其余按旧默认 |
| paoku_audio_bgm_volume / paoku_audio_sfx_volume | audio.bgmVolume / sfxVolume；有限且 clamp[0,1]，缺省0.6/0.9，损坏值恢复策略由 PAO-14 测试锁定 |

## 5. 指令、模拟、快照与表现边界

数据单向流动：设备输入 → InputCommand队列 → 固定步模拟 → 提交快照与事件批 → 渲染/动画/音频/UI。应用命令另经状态/交易服务，成功后输出 AppSnapshot；表现总线不能回写模拟。

| 层/责任方 | 可写权威 | 输入 → 输出 | 禁止/生命周期 |
| --- | --- | --- | --- |
| 输入采集（core） | 输入队列与序号 | 键盘/触摸 → tick命令 | 不直接改 player，不触发奖励/音效；装载注册、卸载注销，失焦清空未消费输入 |
| 模拟调度（core） | tick、RunState、RNG | 上一状态+有效输入+配置 → 下一状态 | 不读 DOM/Scene/Date.now/Math.random；每 tick 只提交一次 |
| 运动/接触/生成（physics） | 模拟分配的角色与世界实体 | 几何/种子 → 接触/拾取/伤害结果 | 不直接结束 UI 或播放音频；多碰撞聚合后一次伤害决定 |
| 应用/交易（application） | AppState、钱包、所有权、存档 | 用户命令/RunSummary → AppSnapshot/结果 | 不反读 HUD；显式状态校验、幂等交易 |
| 渲染/动画（render） | Scene、动画混合、相机、视觉对象池 | 只读 SimSnapshot+事件 → 画面 | 不修正模拟脚底、不用 root motion 加位移；释放所有实例与订阅 |
| DOM / 音频（presentation） | DOM、声音实例、Toast队列 | App/SimSnapshot+事件 → 展示/音效 | UI只发命令；暂停冻结局内循环，结束/退出/重开清理句柄与旧局事件 |

InputCommand 在运行中分配 `tick=currentTick+1`、单调 sequence，同 tick 按 sequence 消费。迟到旧 tick、旧 runId、已消费序号丢弃并记诊断；录制保存已接受命令。暂停时不接受动作，不留待恢复爆发；Escape 等应用命令不进入运动回放。相同 tick 的相反换道按序执行并钳制，最终位置只在模拟中推进；JUMP/ROLL 是否有效由当前阶段判定，不由事件监听顺序决定。

模拟 tick 顺序：效果到期 → 消费输入 → 移动障碍 → 角色积分 → 相对扫掠/支撑 → 拾取 → 伤害/护盾 → 积分与任务奖励 → 结束判定 → 发布只读快照和有序事件批。若同 tick 拾取护盾且碰撞，按此顺序可抵挡；多道具同 tick 按实体 ID 排序，最多一次护盾消耗/一次终局。最终扫掠细节和运动残余时间归 PAO-12 测试，不因本文免测。

SimSnapshot 含 `{contractVersion, runId, tick, timeSec, phase, player, obstacles, pickups, missions, chase, distanceM, speedMps, score, pickupCount, pickupCoins, rewardCoins, lastInputSequence}`；字段为已提交状态的深只读副本。chase 含 distanceM、isNear，由模拟保护状态派生。AppSnapshot 含 appState、activeRunId、walletCoins、highScore、ownedSkinIds、selectedSkinId、audio、settlementStatus。展示只能用这两类快照。

渲染保留前后两个同 runId 的快照，只插值位置/朝向，`alpha in [0,1]`；离散接触、金币消耗、phase 与账本用最新快照，不能插值。首帧/重开/传送无插值；暂停恢复清空墙钟累积，不能补跑后台时间。步长/补步数/超时丢弃策略由 PAO-10 结合 PAO-8 实测冻结并记录诊断。

## 6. 事件契约

### 6.1 当前实际事件（只读事实）

`src/core/eventBus.ts` 是 string/any 同步调用，并非类型化消息协议。主架构表的 STATE_CHANGED 当前无对应 emit；BACK_TO_MENU/PAUSE_GAME/RESUME_GAME/COLLISION_DEATH 只是旧图名，实际使用下表命令。不得仅凭主文档假定这些已存在。

| 当前名称 | 实际 payload | 当前发出方 → 消费方/问题 |
| --- | --- | --- |
| START_GAME / RESTART / GO_MENU / OPEN_SHOP / TOGGLE_PAUSE / TOGGLE_AUDIO | 无 | DOM→main；RESTART转START_GAME，输入/应用命令与事实混用 |
| PLAYER_ACTION | JUMP/ROLL: `{action}`；换道: `{action:'CHANGE_LANE',lane,direction}` | input→main任务/音效；不是旧表的 value 字段 |
| PLAYER_LANDED | `{y}` | physics→main音频；无 surfaceId、runId、tick |
| COIN_COLLECTED | `{value:1,total:ctx.coins}` | physics→main音频；total含任务奖励，不是拾取计数；可选ctx缺省total0 |
| POWERUP_ACTIVATED | `{type,duration:10}` | physics→main音频；护盾也发10，但实际分支是布尔护盾 |
| HOVERBOARD_SHIELD_SHATTER | `{position:{x,y+0.8,z}}` | physics→main渲染/音频；是特效位置，非脚底 |
| COLLISION | `{targetType:obs.type,position:{x,y,z}}` | physics→main/audio；实际为无护盾致命碰撞，非金币/道具通用碰撞 |
| MISSION_COMPLETED | `{title,reward}` | mission→DOM；缺稳定 missionId |
| CHASE_STATE_CHANGED | `{distance,isNear}` | main→audio；distance为世界长度 |
| SKIN_CHANGED | `getSelectedSkin()`皮肤对象 | DOM→render；表现选择与持久化耦合，目标改 asset/skin ID |

### 6.2 目标事件封套、payload 与所有权

`PresentationEvent = {contractVersion:1, eventId:string, runId:string, tick:number, sequence:number, timeSec:number, type:K, payload:PayloadMap[K]}`，K/PayloadMap 为下表判别联合。eventId=`runId:tick:sequence`，sequence 为局内单调序号；每 tick 事件在状态提交后才可见。位置均为世界 m、速度 m/s、durationSec 为模拟秒。事件是已发生的事实，不接受“请求播放后再完成模拟”的回调。

| type | payload（必填，null须显式） | 唯一发布权威 / 时机 |
| --- | --- | --- |
| ACTION_STARTED | `{action:'JUMP'|'ROLL'|'CHANGE_LANE', fromLane:Lane, toLane:Lane, position:Vec3}` | 模拟输入处理；动作有效且状态已变更；非换道时 from=to |
| PLAYER_LANDED | `{surfaceId, position:Vec3, relativeImpactSpeedMps:number}` | 支撑解析；AIRBORNE→SUPPORTED 一次，持续贴面不重复 |
| SUPPORT_CHANGED | `{fromSurfaceId:string|null,toSurfaceId:string|null,position:Vec3}` | 支撑解析；换面/离面/接触时一次，不等同每次都落地 |
| PICKUP_CONSUMED | `{pickupId,kind:'COIN'|PowerUpType,position:Vec3,value:number,pickupCount:number,pickupCoins:number}` | 拾取系统；value为币值，道具为0；状态和账本更新后一次 |
| POWERUP_CHANGED | `{type:PowerUpType,change:'ACTIVATED'|'REFRESHED'|'EXPIRED'|'CONSUMED',expiresAtTick:number|null,charges:number}` | 效果系统；不凭墙钟过期，不用duration猜测护盾寿命 |
| SHIELD_BROKEN | `{obstacleId,position:Vec3,invulnerableUntilTick:number}` | 伤害系统；消费一次护盾后，position为脚底，特效偏移由表现配置 |
| RUN_ENDED | `{reason:'COLLISION'|'QUIT',obstacleId:string|null,position:Vec3}` | 终局聚合；RUNNING/PAUSED→ENDED或ABANDONED一次 |
| MISSION_COMPLETED | `{missionId,titleKey:string,rewardCoins:number,pickupCoins:number,totalRewardCoins:number}` | 任务系统；rewardedMissionIds登记后一次；titleKey只供本地化 |
| CHASE_CHANGED | `{distanceM:number,isNear:boolean}` | 追逐逻辑；状态变化后，位置持续变化从快照读取 |

应用命令为 `AppCommand={commandId, type, payload}`，每种 type 与 payload 构成判别联合，逐项定义如下。均由应用服务校验，成功结果不再双向冒充运动事件。

| type | payload | 前置状态与结果 |
| --- | --- | --- |
| START_RUN | `{}` | MENU且无活动局；创建新runId |
| RESTART_RUN | `{runId:string}` | PAUSED/GAMEOVER且匹配该局；暂停重开先以QUIT封存旧局，完成/确认旧局结算后创建新runId，不能重开别的局 |
| GO_MENU | `{runId:string|null}` | SHOP时null；有局时须匹配该局，按§4终止/结算；已在MENU且null则无操作 |
| OPEN_SHOP | `{runId:string|null}` | MENU时null直接进入；GAMEOVER时须匹配终局并确认结算后释放活动局进入SHOP；保留旧失败页商店入口 |
| PAUSE_RUN / RESUME_RUN | `{runId:string}` | 分别仅匹配的PLAYING/PAUSED局有效 |
| SET_AUDIO | `{masterMuted:boolean,bgmEnabled:boolean,sfxEnabled:boolean,bgmVolume:number,sfxVolume:number}` | 全状态可用，音量有限且[0,1] |
| BUY_SKIN / EQUIP_SKIN | `{skinId:string}` | SHOP；校验余额/所有权，BUY已拥有返回幂等成功，不再扣款 |

应用事实另用 `AppEvent={eventId,commandId,revision,type,payload}`，无伪造模拟 tick：STATE_CHANGED `{from,to,runId:string|null}`，SKIN_EQUIPPED `{skinId,assetId}`，AUDIO_CHANGED `{masterMuted,bgmEnabled,sfxEnabled,bgmVolume,sfxVolume}`，SETTLEMENT_CHANGED `{runId,status:'PENDING'|'COMMITTED'|'FAILED',summary,errorCode:string|null}`。这些由应用服务发布，UI/渲染/音频订阅；失败命令返回 `{commandId,ok:false,errorCode}`，不发布虚假成功事实。相同commandId返回原结果，重放不重复交易。

### 6.3 投递与生命周期

模拟每 tick 创建事件批，按§5系统阶段产生：输入阶段严格保持 InputCommand.sequence 顺序；实体遍历阶段按稳定实体 ID 顺序；同一处理产生多条事实保持产生顺序。顺序确定后才分配局内单调 event.sequence 并构造 eventId；最终投递只按数值 sequence，禁止以 eventId 字符串重排。批内不可变。输出与快照带相同 runId/tick；音频/动画/FX 各自保存消费游标，重复 eventId 不重播。监听器异常隔离记录，不回滚模拟、不阻止其他消费者；订阅返回 dispose，退出页面/重开销毁订阅和旧局队列。丢事件时从快照恢复持续状态，历史金币声不补播。

首次装载不回放历史动作；暂停冻结局内声音循环和动画计时，恢复按当前快照重建；ENDED/ABANDONED 停BGM/追逐循环并允许单次终局声。重开换 runId、清空游标及旧局回调；静音设置不清空权威事件日志。回放拖动时默认仅更新状态，不重放音频。账本/任务不能消费 PresentationEvent 作为权威输入，避免渲染帧率影响收益。

## 7. 字段迁移和适配退出

| 旧接口/文档 | 目标 | 适配及禁止事项 |
| --- | --- | --- |
| 文档 player.y 前进、player.z 高度，entity.y位置、length=Y | position.z前进、position.y高度、depth=Z | 只改文档语义；当前src已是Y高度/Z前进，绝不能对现有位置再次交换轴 |
| PlayerEntity x/y/z/vy/lane/targetX | PlayerMotion position/velocity/targetLane/targetX | x/y/z数值直拷；vy→velocity.y；lane仅目标，不作碰撞代理 |
| isJumping/isRolling/rollTimer | verticalPhase/stance/stanceUntilTick | 新快照派生旧布尔供表现；秒剩余=`max(0,until-tick)*stepSec`，不能反向写回 |
| activePowerUps Map、hasHoverboard/hoverboardActive、invulnerableTimer | effects、charges、invulnerableUntilTick | Map只在旧消费者边界派生；重复护盾布尔合一；不要导入Scene或共享可写Map |
| ObstacleEntity type/width/height/depth/speedZ | definitionId+revision / size / instance.velocity.z | 静态尺寸进入定义；实例位置保持底面中心，旧渲染中心偏移仅一次 |
| CoinEntity/PowerUpEntity collected，旧文档isCollected | PickupInstance status/consumedAtTick | 兼容视图可导出 collected=(status==='CONSUMED')；新模型禁止两种布尔 |
| ctx.coins / totalCoins / score | earnedCoins派生 / App.walletCoins / Run.score | 旧getCoins保持“本局收益含奖励”，新增getSnapshot明确分项；不能从旧总额倒拆奖励 |
| ctx.state / GameContext | AppState + activeRun + RunPhase + SimWorld | 只保留一个可写源；每替换模块交接写权限，不双写同步 |
| PLAYER_ACTION / COIN_COLLECTED 等 | ACTION_STARTED / PICKUP_CONSUMED 等 | 新事实→旧表现监听单向桥，或旧模块输出→新接口按阶段二选一；同一事实不能双发 |
| resetToPodium / RESTART / DOM结算 | application.startRun/finishRun/settleRun | runId新建，结束快照先封存再清理世界；去除DOM文本反读；不丢退出收益 |

适配阶段：①保留原游戏可玩及 PAO-6 对照；②新契约与纯逻辑测试先行，逐模块交接唯一写权；③为仍旧表现构造只读 LegacyView/事件桥；④新应用结算和快照消费者接通；⑤迁移测试全绿、无旧接口引用后删除桥。每批可单独回退代码；存档升级后回退需保留旧键和迁移标记，不以重新跑迁移覆盖新余额。

旧COLLISION只能映射为致命 RUN_ENDED，不能再生成拾取事件；缺少 surfaceId 的旧PLAYER_LANDED不能伪造已知支撑，只在旧模式播放音效。旧事件无 tick/runId 时只能由适配入口附加当下已知上下文，不可用来证明历史确定性；新模拟启用后关闭对应旧发布者。兼容清单明确记录每模块处于 legacy/new 哪一侧，混用同名接口不作为渐进迁移。

## 8. 后续文件白名单建议与责任交接（未授权实施）

本任务写入白名单仅本文及 `docs/evidence/PAO-9/` 文档验证记录。以下为**待 Dispatcher 审查**的后续路径，非本次新增接口承诺。先同步核心文档/PROGRESS，再分发实现；共用文件串行修改。

| 任务/角色 | 建议新增路径 | 需串行审查的旧入口 |
| --- | --- | --- |
| PAO-10 core | src/types/contracts.ts、src/core/simulation.ts、src/core/inputQueue.ts、src/core/snapshot.ts、tests/unit/simulation.test.ts | src/types/index.ts、core/gameLoop.ts、systems/input.ts、main.ts |
| PAO-11/12 physics | src/systems/surfaces.ts、src/systems/contacts.ts、tests/unit/surfaces.test.ts、tests/unit/contacts.test.ts | systems/physics.ts；不可擅改渲染/UI |
| PAO-13 physics | src/systems/track.ts、src/data/trackSegments.ts、tests/unit/track.test.ts | systems/spawner.ts；模板必须通过契约加载验证 |
| PAO-14 application | src/application/runService.ts、settlement.ts、storage.ts、shop.ts、tests/unit/application.test.ts | ui/dom.ts、main.ts、types/index.ts；跨职责拆开交接 |
| PAO-17/18 render | src/render/legacyAdapter.ts、snapshotAdapter.ts、animationController.ts | render/babylon.ts；临时桥达到退出条件即删 |
| PAO-19/20 UI/audio | src/ui/viewModel.ts、src/presentation/eventConsumer.ts、tests/unit/presentation.test.ts | ui/dom.ts、systems/audio.ts、core/eventBus.ts |
| QA 各阶段 | tests/unit/contracts.test.ts、tests/e2e/rebuild-contracts.spec.ts | 现有传感器与pao6测试保持可对照，不能悄悄改断言掩盖旧缺陷 |

## 9. 必要验证与后续传感器规格

本次是文档交付，运行内容审查、链接/数据示例一致性检查与 `git diff --check`。依 AGENTS.md 第9条，不因纯文档改动强制浏览器测试；PAO-6 的截图、测试结果是引用证据而非 PAO-9 新实测。本次提交钩子若执行 build/test，记录真实结果，不跳过 hooks。不声称新契约已编译进游戏。

| 编号 | 后续先失败测试 / 通过条件 | 负责阶段 |
| --- | --- | --- |
| C-01 | X切道/Y跳高/Z前进；18m/s显示64.8km/h；实体底面中心、宽高深一致 | PAO-10/17/19 |
| C-02 | 相同版本/种子/输入tick在不同rAF节奏给出同状态摘要；暂停无tick推进/无输入积压；旧局/迟到命令拒绝 | PAO-10 |
| C-03 | 带非零origin.y的坡→车顶→跳离→落地；出X/Z范围不吸附；升空不提前贴面；移动面速度唯一来源 | PAO-11 |
| C-04 | 最高配置速度+薄障碍/迎面列车扫掠；空中翻滚按真实盒；多碰撞单次伤害；同tick护盾拾取可抵挡 | PAO-12 |
| C-05 | 同币重复检测仅计1；30币+50奖励=count30/收益80；DOUBLE_SCORE只翻倍分；失效动作不计任务；到期tick边界 | PAO-10/14/22 |
| C-06 | 同runId多次结束/退出/重试仅入账1次；保存失败后可重试；九键损坏/旧皮肤权利/迁移中断不丢余额 | PAO-14 |
| C-07 | 事件ID唯一有序，重复消费无重复声效；落地一次、换面不假落地；暂停/恢复/退出/重开清理；异常监听不阻塞 | PAO-18/20 |
| C-08 | 段端点/速度范围/ID唯一/有限数/尺寸验证；相同种子同布局；合法路线按速度抽样并保存失败种子 | PAO-13 |
| C-09 | 冻结快照不能改模拟；UI改文本不改余额；插值不插账本；QA setter门控、动作与接触可观测 | PAO-10/14/19 |
| C-10 | build/test/e2e+查看真实截图，固定路线录屏检查脚底/斜坡/动作与HUD；无空白/遮挡/控制台错误 | 每批实现与PAO-21/26 |

新版只读 sensor 建议提供 getSnapshot（runId/tick/position/phase/support/contact/coins分项/score）、getAppSnapshot、getRecentEvents（只读有界窗口）、getDiagnostics（积压/丢步/拒绝输入计数）。兼容 getPlayerPos/getScore/getCoins 等不得改名偷换口径；getActiveObstaclesCount 为活跃实例数，不是全程累计数。QA注入只在现有门控内做结构验证、清理插值/旧事件并记录fixture标记；自然输入采集不能调用写传感器。

## 10. 交主聊天统一整合的逐项修改建议

此表是修改清单，不声称已经清除共享文件中的旧文本。按最新评论，本次不写这些文件；主聊天审查后顺序整合，不覆盖 PAO-6 历史事实与证据。

| 共享文件/位置 | 精确建议 | 引用本文 |
| --- | --- | --- |
| docs/ARCHITECTURE_DESIGN.md §1/2 | 图中PAUSE_GAME/RESUME_GAME等改应用命令；区分现有事件与目标判别联合，移除不存在的既成实现声明 | §5/6 |
| 同文 §4/5/全局状态树 | GameState补全五态并归应用；移除Y前进/Z高度、length=Y、isCollected；替换为六模型与单写权；消除重复§3编号 | §2/3/7 |
| docs/SYSTEM_WORKFLOW_SPEC.md §2.1/2.2 | 输入改tick队列；player.y前进改position.z，跳高改position.y；列出提交顺序与暂停策略 | §2/5 |
| 同文 §2.3/2.4 | 生成/回收改Z范围；拾取不得score+=10，改status与三项币账；碰撞返回结果，终局/结算分离 | §3/4/5 |
| docs/TEST_PLAN_AND_SENSORS.md §2.2/3 | 旧跳跃player.z改Y；金币增加分数/isCollected改C-05；传感器动作高度/币收益语义对齐；追加C-01~10，不改PAO-6历史 | §9 |
| docs/PRODUCT_REQUIREMENT_DOCUMENT.md §1/AC-03/传感器 | 修正“y=0表示地面/车顶”“Z轴高度”；补PlayerMotion/支撑面与绝对高度；单位m与km/h；任务拾取数与奖励分账 | §2/3/4 |
| 同文 AC-02/09/22 | 高栏按真实姿态盒判定而非全局isRolling免撞；任务文案匹配有效动作次数；Jetpack标未实现待决策，不加到四道具枚举 | §3/4/9 |
| PROGRESS.md（根）及docs/PROGRESS.md | 主聊天确认权威进度文件后追加PAO-9规划交付、待审状态/证据与分支提交；不标实现完成 | 本次验证记录 |
| 总体设计§7/9及阶段索引 | 六模型草案指向本文、注明待审/批准版本；更新PAO-6状态与PAO-9交付，不修改其他任务状态 | §1/8 |

审查要点：坐标/单位、六模型、事件payload、单写权、收益/任务、幂等结算、九键迁移、临时桥退出与新增文件白名单逐项确认。评审确认前本文为 review candidate；PAO-9 交付设 In Review，不把文档自审等同用户批准，也不自动开始 PAO-10 等任务。
