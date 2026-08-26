# paoku 音频打磨报告（Phase 6 · PP-04）

> 负责人：阮和鸣（音频方向 / 音效设计 / 实现策略）
> 项目：网页版《地铁跑酷》Subway Surfers 风格无尽跑酷
> 技术栈：Vite + TypeScript + Babylon.js + Web Audio API
> 审查对象：`src/systems/audio.ts`、`src/ui/dom.ts`（音频触发点）、`src/main.ts`（事件接线）、`src/systems/{input,physics,spawner,mission}.ts`、`src/render/babylon.ts`（警官/警犬/喷气背包视觉）、`src/types/index.ts`

---

## 0. 结论速览（TL;DR）

1. 现有音频是**纯代码合成（Oscillator / Noise 生成）**，无任何采样资产，音频资产目录 `assets/audio/` 为空。
2. 音效触发点**覆盖了 6 个核心动作**（跳跃、翻滚、金币、道具、护盾破裂、撞击），但**缺换道、落地、任务完成、新纪录、UI 点击、警官警犬、速度风阻、磁铁吸附、超级跑鞋、滑板拾取/飞行、喷气背包**等一长串关键声音。
3. BGM 是**单轨 8 音符低音循环 + `setInterval` 驱动**，不是真正的"音乐"，且存在**时序抖动、无淡入淡出、无分层**三大硬伤。
4. 混音层面**无主总线限幅器、无闪避（Ducking）、无独立 BGM/SFX 开关、无音量滑块**；`toggleMute` 用瞬时 `setValueAtTime` 会产生爆音。
5. 空间化**完全缺失**（全单声道居中），警官/警犬/火车/金币没有左右远近，削弱"追逐"张力。

整体结论：**音频系统是"可运行的功能骨架"，但距"打磨完成"有明确差距**。优先级最高的三项补齐为：换道/落地等高频反馈音、BGM 采样级调度与淡入淡出、主总线限幅 + 闪避混音。

---

## 1. 音频现状审计

### 1.1 技术形态：合成器，非采样

| 维度 | 现状 | 评价 |
| :--- | :--- | :--- |
| 声音来源 | 纯 Web Audio `OscillatorNode`（sine/triangle/square/sawtooth）+ `BiquadFilter` + 白噪声 `AudioBuffer` | 无采样文件，零加载成本，但音色单薄、缺少"质感" |
| 引擎形态 | `AudioEngine` 单例（`export const audioEngine`），懒加载 `AudioContext` | 符合 Autoplay 策略 ✅ |
| 总线结构 | `masterGain(0.3)` → destination；`bgmGain(0.15)` / `sfxGain(0.4)` → master | 有基本分轨 ✅，但缺限幅与闪避 |
| 背景音乐 | `startBGM/stopBGM` + `window.setInterval(220ms)` 逐拍触发 sawtooth 低音 | 见 §1.3 硬伤 |

### 1.2 事件触发点清单（现状核对）

`main.ts` 中已接线的事件与音效映射：

| 事件 | 触发时机 | 现有音效方法 | 状态 |
| :--- | :--- | :--- | :--- |
| `START_GAME` | 开始/重开 | `startBGM()` | ✅ 已接 |
| `TOGGLE_PAUSE` | 暂停/恢复 | `stopBGM()` / `startBGM()` | ✅ 已接（但无淡入淡出） |
| `TOGGLE_AUDIO` | 静音按钮 | `toggleMute()` | ✅ 已接（仅全局静音） |
| `PLAYER_ACTION` → `JUMP` | 跳跃 | `playJump()` | ✅ 已接 |
| `PLAYER_ACTION` → `ROLL` | 翻滚/滑铲 | `playRoll()` | ✅ 已接 |
| `PLAYER_ACTION` → `CHANGE_LANE` | 切道 | — | ❌ **未接**（`input.ts` 已 emit，`main.ts` 未处理） |
| `COIN_COLLECTED` | 拾金币 | `playCoin()` | ✅ 已接 |
| `POWERUP_ACTIVATED` | 拾道具 | `playPowerUp()` | ⚠️ 已接但 4 种道具同一声 |
| `HOVERBOARD_SHIELD_SHATTER` | 滑板护盾破碎 | `playShieldBreak()` | ✅ 已接 |
| `COLLISION` | 撞击死亡 | `playCrash()` + `stopBGM()` | ✅ 已接 |
| `MISSION_COMPLETED` | 任务完成 | —（`dom.ts` 只弹 Toast） | ❌ **未接** |

### 1.3 音频引擎硬伤（代码级）

1. **BGM 用 `setInterval` 而非采样级调度**：`window.setInterval(tick, 220)` 受事件循环阻塞与后台节流影响，会产生可闻的节拍抖动/漂移，且浏览器切后台时定时器被节流，BGM 会"跑拍"。应改用 AudioContext 时钟 + lookahead scheduler。
2. **无淡入淡出**：`startBGM` 立即起音、`stopBGM` 立即 `clearInterval`（瞬时断音，有爆音风险）；`toggleMute` 用 `setValueAtTime` 瞬时切 0/0.3（必然爆音）。应统一 `linearRampToValueAtTime` / `setTargetAtTime`。
3. **无主总线限幅器（`DynamicsCompressorNode`）**：`playCrash` 的 sawtooth（gain 0.8）与多枚金币、多道具琶音叠加时会削波失真。
4. **无闪避（Ducking）**：BGM 不随 SFX 出现而自动压低，撞击/护盾破裂时 BGM 会"淹没"音效。
5. **无空间化 / 无立体声**：所有音效单声道居中。警官/警犬追逐、迎面驶来的 MOVING_TRAIN、三车道金币没有任何左右远近提示。
6. **白噪声缓冲每次重建**：`playShieldBreak` 每次 `createBuffer(sampleRate*0.3)` 重新填充随机数，可改为缓存复用。
7. **音量平衡偏低**：master 0.3 × sfx 0.4 = 实际 0.12；bgm 0.15 × 0.3 = 实际 0.045，BGM 几乎听不见。
8. **静音状态不持久化**：`toggleMute` 不写 localStorage，刷新即丢；且只有"全局静音"，无法单独关 BGM 或 SFX（PRD 明确要求"支持静音与音量调节"）。
9. **`ensureContext` 缺少移动端兜底**：iOS Safari 需要用户手势内 `resume()`；当前在 `START_GAME`（点击）里能触发，但若首次交互是键盘/触摸滑动则可能 `state` 停留在 `suspended`，BGM 的 `setInterval` 仍空转。

---

## 2. 完整 SFX 清单（应有 / 现有 / 缺失）

> 事件命名遵循统一约定：`category_action_variant`，例如 `sfx_jump`、`sfx_lane_change_left`、`bgm_chase`。
> 状态图例：✅ 现有 · 🟡 有但需改进 · ❌ 缺失 · ⏳ 依赖未实现玩法

| 玩法动作 | 应有音效 | 现有 | 缺失/问题 |
| :--- | :--- | :--- | :--- |
| 跳跃 Jump | 起跳 whoosh（音高上扬） | ✅ `playJump` sine 180→520 | 起跳音偏"哔"声，缺空气感；无落地声 |
| 落地 Landing | 落地闷响 + 震屏联动 | ❌ | 落地（`landingShakeTime` 已触发视觉）无声音 |
| 翻滚/滑铲 Roll | 衣料/金属摩擦下坠 | ✅ `playRoll` triangle 320→100 | 可用，建议加一层噪声摩擦 |
| 切道 Lane Change | 快速 whoosh（带左右 pan） | ❌ | `CHANGE_LANE` 已 emit 未接线，且无立体声 |
| 拾金币 Coin | 清脆双音 + 连击音阶 | ✅ `playCoin` B5→E6 | 建议加"连击数"音阶爬升（combo pitch） |
| 道具拾取 PowerUp | 4 种道具差异化 | 🟡 `playPowerUp` 单一琶音 | MAGNET/DOUBLE_SCORE/SUPER_SNEAKERS/HOVERBOARD 全同声 |
| 磁铁吸附 Magnet | 持续吸附 loop + whoosh | ❌ | 吸附期无声，需 loop 音 + 音量随金币距离 |
| 超级跑鞋 Super Sneakers | 加速冲刺音 | ❌ | 缺冲刺风阻/引擎音 |
| 双倍得分 Double Score | 得分翻倍特殊提示 | ❌ | 可复用 powerup 但需变体 |
| 滑板拾取/飞行 Hoverboard | 拾取 + 悬浮 loop | ❌ | 只有护盾破裂声，无激活/飞行 loop |
| 护盾破裂 Shield Break | 玻璃碎裂 | ✅ `playShieldBreak` 高通噪声 | 可用，建议加低音金属碎片 |
| 撞击死亡 Crash | 低频撞击 + BGM 骤停 | ✅ `playCrash` sawtooth 150→30 | 可用，建议加"死亡 stinger"下坠音 |
| 喷气背包 Jetpack | 喷气火焰 loop + 彩虹粒子联动 | ⏳ | 玩法未实现（仅视觉 `pack` mesh），预留 |
| 警官追逐 Officer | 警笛 siren loop（距离衰减） | ❌ | 警官实体已渲染且紧贴玩家，无警笛 |
| 警犬 Dog | 犬吠（间歇，距离衰减） | ❌ | 警犬实体已渲染，无犬吠 |
| 迎面火车 Moving Train | 呼啸 + 风压 Doppler | ❌ | MOVING_TRAIN 无声音，缺压迫感 |
| 静态火车/斜坡 | 环境提示（可选） | ❌ | 低优先级 |
| 任务完成 Mission | 完成提示音 + 奖励金币 | ❌ | `MISSION_COMPLETED` 只弹 Toast |
| 新纪录 New High Score | 破纪录 fanfare | ❌ | GAMEOVER 有 badge，无声音 |
| 游戏开始 GO cue | "GO!" 倒计时/提示音 | ❌ | 无起跑 cue |
| 暂停/恢复 Pause | 菜单开合提示音 | ❌ | 无 UI 音 |
| UI 点击 Click | 按钮 hover/click | ❌ | 菜单/商店全无 UI 音 |
| 风阻/速度层 Wind | 随速度升高的风噪声 loop | ❌ | 有 `speedline` 粒子视觉，无对应音 |

**统计**：核心反馈音 6 个已覆盖；**缺失/待改进 15+ 项**，其中高频可感的"换道、落地、任务完成、新纪录、UI 点击、警官警犬、磁铁吸附"为 P0/P1 优先补齐。

---

## 3. 音乐基调建议（BGM）

### 3.1 风格定位
对齐项目"赛博朋克 / Synthwave 霓虹"视觉（`cyber-title`、霓虹皮肤、辉光城市）与 `SKINS` 文案（"Neon Synthwave Pulse"），BGM 应采用 **Synthwave / Outrun 电子乐**：脉冲低音（pulsing bass）、琶音合成器（arp）、怀旧 pad 与门控混响鼓点。避免写实管弦，保持"街机跑酷"的轻盈与"追逐"的张力。

### 3.2 分层与紧张度曲线（动态混音）
建议把 BGM 拆成**可独立增益的 4 层**，随 `ctx.speed`（18→45）与 `ctx.state` 动态增减，形成"紧张度曲线"：

| 层 | 内容 | 触发/强度 |
| :--- | :--- | :--- |
| L0 基底 | 稳定脉冲 bass + 底鼓 | 始终播放 |
| L1 琶音 | 16 分音符合成器 arp | 速度 > 30% 进入 |
| L2 鼓组 | 军鼓/踩镲/clap | 速度 > 55% 进入 |
| L3 危险层 | 警笛垫底 / 高音 lead + 噪声 riser | 警官贴近（`invulnerableTimer>0`）或速度 > 80% |

- **循环点**：以 8 或 16 小节为一个 loop（约 4 秒×2），loop 首尾波形与节拍对齐，避免"接缝"。
- **情感曲线**：菜单（轻 ambient loop）→ 起跑（cue + 进入 L0）→ 加速（L1/L2 逐层叠入）→ 受击护盾破裂（短暂 duck + 危险层顶起）→ 死亡（骤停 + stinger）→ 结算（fanfare 或低落音）。
- **变奏触发器**：`MISSION_COMPLETED` 可短暂叠入一段上行琶音庆祝；`HOVERBOARD` 激活可切换为更空灵的 pad 变体。

### 3.3 落地建议
- **短期（纯合成）**：用 Web Audio 合成 4 层 loop（bass/arp/drum/pad），由 `startBGM` 的 lookahead scheduler 驱动，替代现有单音符 `setInterval`。
- **中期（采样）**：若允许引入音频资产，可放置 1–2 条版权可控的 synthwave loop 至 `assets/audio/bgm/`，用 `AudioBufferSourceNode` + `loop=true` 播放，显著提升质感。**注意**：新增采样需同步更新 `assets/audio/` 资产清单，并与工程负责人核对打包体积（见 §4.6 性能预算）。

---

## 4. 音频实现策略（Web Audio 优化建议）

### 4.1 推荐节点图（总线结构）

```
AudioContext
 └─ masterGain (0.8)                        // 主音量，linearRamp 平滑
     ├─ masterCompressor (DynamicsCompressor)  // 限幅，防削波
     │   └─ destination
     ├─ bgmBus (GainNode, 默认 0.6)
     │   ├─ bgmLayer0..3 (GainNode ×4)        // 分层动态混音
     │   └─ BGM 合成/采样源
     ├─ sfxBus (GainNode, 默认 0.8)
     │   ├─ sfxOneShot (一次性音效)
     │   └─ sfxLoop (磁铁/滑板/喷气 loop，可复用池)
     ├─ voBus (GainNode)                       // 预留 VO 旁白/犬吠警笛
     └─ (可选) SpatialPanner → 环境音(火车/警笛)
```

- 在 `sfxBus` 与 `bgmBus` 之间加一个**闪避侧链**：SFX 触发时，把 `bgmGain` 用 `setTargetAtTime` 降到 0.35，SFX 结束 200ms 后恢复 0.6（ducking），让撞击/任务提示不被 BGM 掩盖。
- `masterCompressor` 参数建议：`threshold -6dB`、`knee 12`、`ratio 4`、`attack 0.003`、`release 0.25`。

### 4.2 采样级调度（替换 setInterval）
- 用 `ctx.currentTime` + lookahead（如每 25ms 检查一次，提前 0.1s 排期）驱动 BGM 音符与分层，彻底消除抖动。
- 若改采样 loop，则直接用 `AudioBufferSourceNode.loop=true` + `loopStart/loopEnd` 精确循环。

### 4.3 淡入淡出与防爆音
- `toggleMute` / `startBGM` / `stopBGM` / 音量滑块统一用 `linearRampToValueAtTime(目标, now + 0.05~0.2)`，禁止瞬时 `setValueAtTime` 切 0。
- `stopBGM` 先 ramp 再停 source，避免 `clearInterval` 断音。

### 4.4 空间化与立体声
- 用 `StereoPannerNode`（廉价）做左右切道：`CHANGE_LANE` 左→`pan=-0.5`、右→`+0.5`。
- 警官警笛、迎面火车用 `PannerNode`（HRTF）+ 距离衰减：警官 `chaseDistance`（1.5/2.8）越近音量越高、警笛越尖锐，营造追逼感。
- 金币可按 `lane`（-3/0/3）做轻微左右 pan，拾取时向对应声道偏移。

### 4.5 实例化与池化
- 一次性 SFX：当前"每次 new Oscillator"可接受（本项目规模小），但建议抽 `playTone(freq, type, dur, gain, pan)` 通用函数，统一处理 gain 包络与资源释放。
- 持续 loop（磁铁/滑板/喷气/风阻）：**预建并缓存** source/gain，用"启动→改 gain→停止"复用，避免反复创建。
- 白噪声 buffer（`playShieldBreak`）：缓存一份 `noiseBuffer`，多次复用。

### 4.6 性能与移动端兼容（预算）
- **同发语音数预算**：≤ 16 个并发 oscillator（金币连击+道具+环境 loop），超限时丢弃低优先级 SFX（如连击金币音做节流，每秒最多 8 发）。
- **内存预算**：纯合成 ≈ 0 采样内存；若引入采样 BGM，单条 ≤ 1.5MB（44.1kHz 单声道 OGG 可到 ~200KB），总音频内存 ≤ 3MB。
- **移动端**：`AudioContext` 须在用户手势内 `resume()`；监听 `visibilitychange`，页面隐藏时暂停 BGM 调度、恢复时续播；iOS 用 `webkitAudioContext` 前缀（已兼容）；关闭标签页 `ctx.close()` 释放。

---

## 5. 音频侧缺口清单（Gap List）

> 按优先级排序，P0 = 打磨阶段必须补齐。

**P0（高频可感，缺失即"半成品"）**
1. 切道 whoosh（`CHANGE_LANE`，含左右 pan）——目前切道完全无声，是高频操作。
2. 落地声（与 `landingShakeTime` 联动）——跳跃落地无反馈。
3. 任务完成提示音（`MISSION_COMPLETED`）——目前只有 Toast。
4. 新纪录 fanfare（GAMEOVER 的 `isNewRecord`）——破纪录无声。
5. 主总线限幅 + 闪避（Ducking）——防削波、保音效可闻。
6. 独立 BGM/SFX 开关与音量滑块（`localStorage` 持久化）——PRD 要求"静音与音量调节"。
7. BGM 采样级调度 + 淡入淡出——修掉抖动与爆音。

**P1（张力与氛围）**
8. 警官警笛 loop + 警犬吠（距离衰减，利用 `chaseDistance` 与 `invulnerableTimer`）。
9. 磁铁吸附 loop + 超级跑鞋冲刺音。
10. 迎面火车（MOVING_TRAIN）呼啸 Doppler。
11. 4 种道具拾取差异化（MAGNET/DOUBLE_SCORE/SUPER_SNEAKERS/HOVERBOARD）。
12. 金币连击音阶（combo pitch climb）。
13. 速度风阻噪声层（随 `ctx.speed` 升降，对齐 `speedline` 粒子）。

**P2（体验打磨 / 延后）**
14. UI 点击/hover 音（菜单、商店、暂停）。
15. 起跑 "GO!" cue 与倒计时。
16. 滑板飞行 loop / 喷气背包 loop（后者依赖玩法未实现，预留）。
17. 菜单与商店的环境 BGM（区别于 in-game loop）。
18. 移动端 `visibilitychange` 暂停/续播、`ctx.close()` 生命周期管理。

---

## 6. 与引擎/中间件相关的风险与待确认项

1. **中间件选型**：当前是裸 Web Audio，无 Wwise/FMOD 等中间件。若后续要上采样与复杂交互，建议评估 **Howler.js**（轻量封装，支持 spatial、fade、loop、sprites）或继续原生 Web Audio。**本项目规模建议先保持原生**，仅做上述重构，避免引入新依赖。
2. **采样资产引入需同步资产清单**：一旦改用采样 BGM/SFX，需在 `assets/audio/` 下建立命名规范与索引，并与工程负责人核对打包体积与缓存策略（Service Worker 已存在）。
3. **`assets/audio/` 当前为空**：无孤立引用可清理，但需要建立规范（命名、格式、响度 -14 LUFS 归一）以便后续落地。
4. **警官/警犬追捕逻辑在 `render/babylon.ts`（视觉层），非逻辑层**：若做"距离衰减警笛"，需要把 `chaseDistance` 或追逐状态提升为可读的上下文（或新增事件 `CHASE_STATE_CHANGED`），避免音频层去读渲染层状态——**此项需与工程负责人（程基岩）对齐**。
5. **Jetpack 玩法未实现**（仅 `pack` 视觉 mesh，`types` 里无 JETPACK 类型），喷气背包音效列为"预留"，不进入本轮 DoD。

---

## 7. 下一步建议

1. 主理人确认本报告后，我可产出**音效事件命名规范 + 音频事件清单（事件表）**（触发条件/优先级/变体/分层/衰减/立体声 pan），作为工程落地的规格输入。
2. P0 项（切道/落地/任务/新纪录/限幅+闪避/独立音量/采样级调度）建议单独立项实现，我可给出每个音效的具体合成参数（频率/包络/时长/pan）。
3. 空间化与警官警笛依赖第 6.4 条的追逐状态暴露，需先与工程负责人对齐接口。
4. 音乐基调（Synthwave 4 层动态混音 + 紧张度曲线）待用户拍板后，再细化到逐层合成参数或采样选型。

---
*报告完*
