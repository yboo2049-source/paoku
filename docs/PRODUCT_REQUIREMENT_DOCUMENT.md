# 网页版《地铁跑酷》产品需求文档 (Master PRD)

## 2026-11-03 PAO-15/18 A方案已批准

本批已交付15@614179d及18@5bd31cc，主Agent独立检查：[15独立主审](reviews/2026-11-03-pao15-basic-motion-sample-review.md)build/269单测通过、完整E2E45/46（旧车尾下降碰撞）；[18独立主审](reviews/2026-11-03-pao18-controller-camera-review.md)build/292单测及新增7项E2E通过、完整59/60（旧字体网络错误）。两项最终验收暂缓，不重复派发已完成制作/工程批次，不以技术子集或旧成绩代替完整门禁；后续先调查/处理失败并完整复验，未授权新资产/I-03/HUD集成。以下为已批准范围及持续生效的技术契约。

用户在主Agent提出批准两A方案及准备下一轮提示词后回复“继续吧”。按[批准执行计划与完整提示词](plans/2026-11-03-pao15-pao18-approved-execution.md)由用户手动触发原任务聊天：15制作隔离Idle/Run/Jump/Slide四技术样本；18先做不依赖新资产/公共桥的角色控制器与镜头工程批次。技术样本不等于正式13动作，工具通过与美术品质分报；人工精修延期、无云上传，不重复绑定或17主题验收。新runner生产注册、I-03事实桥、HUD接线另定串行写权；父任务及依赖保留，不自动启动或合并。

## 2026-11-02 PAO-17明亮主题工程预览已批准

用户明确批准[路线A设计](superpowers/specs/2026-11-02-pao17-bright-theme-preview-design.md)：一个明亮程序几何主题、有界连续循环、局内隐藏菜单展台，以及依M1逻辑支撑的真实楔形坡/程序车顶接缝。按[新计划](plans/2026-11-02-pao17-bright-theme-execution.md)从536f54b继续；现有角色/玩法/本树旧UI兼容，四件GLB和新UI/正式动作尚未整合。可为路线可读性在批准色板方向内微调参数并记录，不逐值再审批，不据此冻结正式美术/真机预算或父任务Done。

## 2026-11-02 PAO-17首批结构实现已批准

用户明确批准[准备主审](reviews/2026-11-02-pao17-preparation-review.md)建议的路线A、I-01帧身份和I-02释放桥，执行以[新计划及提示词](plans/2026-11-02-pao17-approved-execution.md)为准。保留门面，先等行为拆分资源/环境/实体及修整生命周期，再串行最小接线；可独立于16生产资产交付推进本结构批次。既有玩法/UI保持兼容，未合入PAO-19、不接新生产GLB或主题套件、不做正式动作/镜头重设计；父任务完整验收和16/9整体依赖保留。

## 2026-11-02 PAO-16/17 下一批并行准备

[新提示词](plans/2026-11-01-pao16-pao17-parallel-prompts.md)限定PAO-16同四件资产的自动语义标定细化与PAO-17只读渲染方案准备，可在独立目录并行。16原探针已审、资产未正式签收；17仅设计，不写游戏实现。手工美术继续延期，不新增玩法；具体设计/所需资产验收和固定接续提交仍是正式接入前提。

## 2026-11-01 PAO-16 下一批技术探针准备

[车坡/障碍标定Spike](plans/2026-11-01-pao16-calibration-spike.md)限定两列车与高低栏的实际几何/端点/净空及对齐诊断，原源和M1逻辑只读，不制作新玩法或正式整批美术。可带不适配/待复核结论交阶段结果；正式PAO-16/17门禁不因探针准备自动解除，用户手动触发才执行。

## 2026-11-01 PAO-15 已批准局部绑定试样

最新执行偏好：本地自动流程先行，人工调权/拓扑/动作精修延期到[TODO](art/pao15-rigging-manual-todo.md)，不执行Tripo云端。自动诊断可带质量缺口交付，正式角色/动作标准不因此降低。

用户同意现有runner的[骨骼绑定可行性试样](plans/2026-11-01-pao15-rig-spike.md)：派生可编辑工程、肩肘髋膝变形、GLB导出与真实Babylon验证，交能否继续及返工结论。只做一个runner，不做正式13动作、追捕者或游戏接入；静态GLB不是已完成骨骼资产。用户随后询问Tripo能力，已核对其Auto Rig/基础动作支持，但未据此执行云调用或扩大制作范围。

## 2026-11-01 PAO-19 用户批准口径

用户已批准[PAO-19具体三点范围](plans/2026-11-01-pao19-approved-execution.md)：UI方案A及943aad1规格v0.1、PAO-7适用UI风格、命令回执I-01与安全区/中文语言I-02。四页采用浅实体卡片、桌面侧卡/手机底卡、边缘HUD；48px触摸、四态/焦点、安全区、m/s、四道具名称图标/剩余秒数、有限Toast及保存/命令反馈均纳入实现目标。

数据保持PAO-14权威，UI不发币/算结算/直接存档；商店和音频兼容保留。已批准设计不等于新UI、真机安全区或性能已验收。角色/场景风格和真机预算不随UI批准冻结，其他任务不自动启动。当前旧版条款与霓虹表述不覆盖本节新UI范围。

> 2026-10-31 规划补充：用户已批准全面重构总体方案及明亮风格化城市轨道方向，范围覆盖场景、人物动作、渲染、完整 UI、斜坡、火车及道具和底层系统。目标、现状证据、数据契约草案、M0–M4 路线图及 R-01–R-10 验收见 [整体重构设计稿](superpowers/specs/2026-10-31-paoku-complete-rebuild-design.md)，[Linear 任务索引](plans/2026-10-31-paoku-rebuild-linear-plan.md)记录全部待办。本轮仅方案和任务管理；下文旧版功能条款不代表新方案已验收。执行 PAO-9 时统一 Y 高度/Z 前进、支撑面和事件契约并逐项替换旧口径。

> **范式说明**：本项目严格遵循 [Superpowers Framework & Harness Engineering](https://github.com/obra/superpowers) 范式。主 Agent 仅作为**任务调度者 (Dispatcher)** 与系统边界约束者。具体的 3D 渲染、物理引擎、UI 逻辑与测试由职责单一的独立 **Subagent** 协作完成。

---

## 0. 版本与架构规划声明
本项目旨在构建一款具备商业大作标准的无尽 Web 3D 跑酷游戏。数据与渲染完全解耦：底层采用极简纯函数进行逻辑状态（State）计算，视觉表现交由商业级 3D 引擎 **Babylon.js** 驱动，实现具有 GlowLayer 辉光、PBR 湿滑金属反射与高精阴影的专业级渲染表现。

---

## 1. 数据模型与契约规范 (Data Schemas)

```typescript
export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'SHOP';

export type ObstacleType = 'LOW_OBSTACLE' | 'HIGH_OBSTACLE' | 'STATIC_TRAIN' | 'MOVING_TRAIN' | 'RAMP';

export type PowerUpType = 'MAGNET' | 'DOUBLE_SCORE' | 'SUPER_SNEAKERS' | 'HOVERBOARD';

export interface PlayerEntity {
  lane: number;          // 跑道编号: 0(左), 1(中), 2(右)
  targetX: number;       // 目标 X 轴世界坐标
  x: number;             // 当前 X 轴世界坐标
  y: number;             // 当前 Y 轴高度 (0 表示地面/车顶)
  z: number;             // 当前 Z 轴纵深位置
  vy: number;            // Y 轴垂直速度 (重力模拟)
  isJumping: boolean;    // 是否处于跳跃状态
  isRolling: boolean;    // 是否处于翻滚状态
  rollTimer: number;     // 翻滚剩余帧数/时间
  activePowerUps: Map<PowerUpType, number>; // 生效中的道具及剩余时间
}

export interface ObstacleEntity {
  id: string;
  type: ObstacleType;
  lane: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  speedZ?: number; // 针对动态驶来的火车 MOVING_TRAIN
}
```

---

## 2. 核心数值与物理公式 (Quantitative Formulas)

### 2.1 基础物理常数
*   **跑道间距 (`LANE_WIDTH`)**: `3.0` 单位世界距离。跑道 X 坐标分别对应 `-3.0`, `0.0`, `3.0`。
*   **重力加速度 (`GRAVITY`)**: `-38.0` 单位/秒²。
*   **基础跳跃初速度 (`JUMP_VELOCITY`)**: `13.5` 单位/秒。
*   **翻滚持续时间 (`ROLL_DURATION`)**: `0.8` 秒。翻滚时包围盒高度从 `1.8` 缩减为 `0.9`。

### 2.2 动态加速曲线
游戏速度 $V(t)$ 随着奔跑时间 $t$（秒）线性上升，达到上限后保持匀速：
$$V(t) = \min(V_{\text{base}} + a \cdot t, V_{\text{max}})$$
*   $V_{\text{base}} = 18.0$ （初始基础速度）
*   $a = 0.25$ （加速度，单位/秒²）
*   $V_{\text{max}} = 45.0$ （最大限制速度）

---

## 3. 核心玩法机制与 Acceptance Criteria (AC)

### 3.1 立体轨道与障碍物交互
*   **AC-PRD-01 (低矮障碍)**：玩家翻滚无法避开 `LOW_OBSTACLE`，唯有跳跃（`y > 1.2`）可以通过。
*   **AC-PRD-02 (高空障碍)**：玩家跳跃会碰撞 `HIGH_OBSTACLE`，唯有翻滚（`isRolling === true`）可以通过。
*   **AC-PRD-03 (斜坡与车顶)**：踏上 `RAMP` 后玩家平滑过渡到 Z 轴高度 `y = 3.0`（火车顶部）；在车顶跑动时下落重力平面更新为 `y = 3.0`。

### 3.2 道具系统 (Power-Ups)
*   **AC-PRD-04 (磁铁吸附)**：激活 `MAGNET` 时，半径 `15.0` 单位范围内的所有金币以 $25.0$ 单位/秒的速度平滑吸向玩家。
*   **AC-PRD-05 (超级跑鞋)**：激活 `SUPER_SNEAKERS` 时，跳跃初速度提升至 $1.5 \times JUMP\_VELOCITY$ ($20.25$ 单位/秒)，起跳更高更远。
*   **AC-PRD-06 (双倍得分)**：激活 `DOUBLE_SCORE` 时，奔跑过程中得分累计速度翻倍 ($2.0 \times$).
*   **AC-PRD-07 (悬浮滑板免死护盾)**：激活 `HOVERBOARD` 后，玩家获得一层抵御死亡碰撞的免死护盾；发生致命碰撞时消耗滑板，并触发粒子护盾破裂特效与短暂停顿保护。

### 3.3 Web Audio 音频引擎 (Web Audio Sound Engine)
*   **AC-PRD-08 (合成音效与BGM)**：使用 Web Audio API 生成单例音频系统，包含背景音乐 (BGM) 循环，以及跳跃 (JUMP)、翻滚 (ROLL)、金币收集 (COIN)、道具拾取 (POWERUP)、滑板护盾破裂 (SHIELD_BREAK)、撞击 GameOver (CRASH) 等内置音效。支持静音与音量调节。

### 3.4 任务与成就系统 (Missions & Achievements)
*   **AC-PRD-09 (任务监控与奖励)**：系统提供单局任务监控（例如：“单局拾取 50 个金币”、“完成 10 次跳跃”），达成后触发任务完成通知弹窗，并实时结算给予奖励金币。

### 3.5 赛博视效与动态环境美化 (Cyber Visuals & Dynamic Environment)
*   **AC-PRD-10 (赛博城市背景与质感升级)**：跑道两侧构建高低错落的赛博朋克大楼天际线剪影与全景渐变天空盒；铁轨材质加入真实光泽与枕木线条细节；速度提升时动态微调镜头 FOV 视角产生冲击感。
*   **AC-PRD-11 (3D 骨骼角色与动态动作)**：使用 Babylon.js 的 SceneLoader 加载高精度 3D 动漫/赛博角色模型以及骨骼动画网格 (Skeletal Mesh)，角色形象包含头身结构、运动服装与肢体；实现奔跑 (Run)、跳跃 (Jump)、翻滚下蹲 (Roll/Slide) 动作的平滑过渡与视觉跟随。

*   **AC-PRD-12 (3D 场景组件精细化重塑)**：
    - **火车 (TRAIN)**：包含立体车头、发光前照车灯、车身黄色警示线条、车顶风口与立体车轮细节。
    - **斜坡 (RAMP)**：含有双侧发光加固轨与高亮 Yellow 冲刺指示箭头。
    - **障碍栅栏 (OBSTACLE)**：增加双侧红/黄闪烁警示灯与黄黑斜纹拉线。
    - **立体金币 (COIN)**：包含凹凸五角星标与发光外环，悬浮旋转并伴随吸收光斑。

*   **AC-PRD-13 (地铁轨旁多元环境元素升级 Trackside Elements)**：
    - **跨轨龙门架与高压电缆 (Catenary Gantries & Cables)**：轨顶架设立体网架龙门架，附带发光绝缘子与沿轨道纵深延伸的高压接触网电缆。
    - **轨旁信号灯杆与控制箱 (Signal Lights & Control Cabinets)**：跑道侧边布设带红/黄/绿 LED 镜头与高光发光罩的信号灯杆，以及带有黑黄防撞斜纹与状态灯的轨旁控制柜。
    - **巨型工业通风管道与隔音墙 (Ventilation Ducts & Noise Barrier Walls)**：轨旁沿线构建弧形顶盖、霓虹发光拉线隔音板以及高光泽金属通风巨管。
    - **弧形赛博霓虹路灯与配电箱体 (Cyber Neon Streetlamps & Utility Boxes)**：轨旁两侧延伸高杆弯曲路灯，投射柔和补光，并摆放危险提示贴牌与配电控制箱。

*   **AC-PRD-14 (镜头切道侧倾与落地震屏 Camera Bank Tilt & Shake)**：切道动作触发摄像机 15° 侧倾角与 0.15s 平滑延迟；起跳落地与撞击触发瞬间镜头下沉震屏。
*   **AC-PRD-15 (速度感风阻粒子与光条 Speedline Particles)**：奔跑加速与冲刺状态下，屏幕四周生成向后飞逝的高速白色/彩色风阻拉线粒子。
*   **AC-PRD-16 (果冻挤压拉伸与受击摔倒 Squash & Stretch)**：起跳起飞纵向拉伸，重重落地与铲地下蹲触发形态挤压弹回。
*   **AC-PRD-17 (经典警官与恶犬追赶 Inspector & Dog Chase)**：角色身后保持跟随 3D 警官与警犬追捕实体，失误切道或绊脚时警官紧逼贴身。
*   **AC-PRD-18 (后处理 Bloom 辉光与高精管线 Advanced Post-Processing Pipeline)**：集成 DefaultRenderingPipeline，开启 GlowLayer、Bloom 散致辉光与 FXAA 抗锯齿。
*   **AC-PRD-19 (3D 展台与主菜单 3D 环绕镜头 3D Stage & Menu Orbiting Camera)**：主菜单模式下，角色与警官位于发光赛博展台之上，摄像机以 3D 轨迹围绕展台进行 360° 动态平滑旋转视角。
*   **AC-PRD-20 (3D 金币飞入 UI 轨迹与拾取爆裂 3D Coin Attraction Trail)**：吃金币瞬间产生 3D 贝塞尔曲线轨迹，金币在空中划出平滑弧线飞向镜头左上角 HUD 金币槽。
*   **AC-PRD-21 (3D 地铁隧道入口与火花粒子 3D Tunnel Portal Arch & Sparks)**：轨旁每隔 250 米布设拱形地铁隧道入口与“METRO STATION 01”发光标牌，动态列车车轮触发熔铁火花粒子。
*   **AC-PRD-22 (3D 喷气飞行模式与滑板破裂碎片 Jetpack Flight & Hoverboard Shatter)**：拾取 Jetpack 后升至 y=8.0 高空并喷射彩虹粒子尾焰；滑板碰撞破裂时触发 12 块 3D 晶体碎片向外爆炸飞散。
*   **AC-PRD-23 (弯曲世界 World Bending Curvature Shader)**：通过 $Z$ 轴深度二次方下沉公式，使远方地形、列车与建筑呈经典球形弧线下沉视效。
*   **AC-PRD-24 (全套 3D 骨骼动画状态机 Skeletal Animation State Machine)**：基于纯代码驱动与 3D GLB 资源，实现 Idle（站立待机）、Run（高速奔跑）、Jump（高空跳跃）、Slide/Roll（下蹲翻滚）与 Stumble（受击绊倒）的平滑过渡与实时按键响应。

---

## 4. 前端视听与测试传感器 (Sensors Guardrails)

系统必须暴露隐藏调试变量 `window.__GAME_SENSOR__` 供 Playwright / Subagent 进行自动化断言：
```typescript
window.__GAME_SENSOR__ = {
  getGameState: () => string,
  getPlayerPos: () => { x: number; y: number; z: number },
  getScore: () => number,
  getCoins: () => number,
  getActiveObstaclesCount: () => number,
};
```



