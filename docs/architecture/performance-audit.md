# paoku 性能剖析报告（Performance Audit）

> 作者：程基岩（技术负责人 / 引擎） · 阶段：Phase 6 打磨
> 引擎：Babylon.js 9（`@babylonjs/core` + `@babylonjs/loaders`），Web Audio 纯代码合成，DOM UI
> 目标帧率：60 FPS（帧预算 ≈ 16.6ms；移动端低端机目标 ≥ 30 FPS）
> 状态：**静态审计 + 代码走查**（未跑 Profiler；下文的量化数字为代码推导的估算值，标注「估算」）

---

## 1. 执行摘要（TL;DR）

本项目的渲染架构已完成 Three.js → Babylon.js 的迁移，但**性能热点高度集中在渲染层（`src/render/babylon.ts`）**，而非逻辑层（物理/生成/任务均为小数据量 O(n)，可忽略）。按优先级排序：

| 优先级 | 热点 | 一句话结论 | 预期收益 |
| :--- | :--- | :--- | :--- |
| **P0** | 静态环境网格未合并 | 启动时一次性创建 **≈1600 个独立 Mesh**（枕木约 1020 个），每个都是独立 draw call + 每帧参与视锥剔除遍历 | 大幅降低 CPU 剔除开销与 draw call，**最高优先级** |
| **P0** | 后处理双通道叠加 | `GlowLayer` + `DefaultRenderingPipeline`(bloom kernel=64 + FXAA) 同时开启，多轮全屏 pass | 降低 GPU 全屏带宽与填充率 |
| **P0** | 动态实体材质泄漏 | 障碍物/金币/道具每次生成 `new StandardMaterial`，`dispose()` 不回收材质 → 稳态内存泄漏 | 消除长时间游玩的持续内存增长 |
| **P1** | UI 每帧 `innerHTML` 重建 | `renderBuffs()` 每帧 `innerHTML = html`，无脏检查 | 消除 DOM 抖动/强制回流 |
| **P1** | 粒子纹理走公网 URL | `speedline` 粒子纹理来自 `raw.githubusercontent.com`，运行时网络依赖 + 单点故障 | 修复潜在运行时黑屏/无纹理 |
| **P1** | 骨骼 GLB 未压缩 | `player.glb` 2.8MB 无 Draco/meshopt | 降低首帧加载/解析/内存 |
| **P2** | 渲染层每帧对象分配 | `new Set()`、`new Vector3()`、`getMeshByName()` 每帧重复 | 减少 GC 压力 |

---

## 2. 逐模块剖析

### 2.1 渲染循环 `src/render/babylon.ts`（主要瓶颈）

#### 2.1.1 静态环境网格数量失控（P0）

`buildCyberEnvironment()` 在启动时一次性构建整条 1200 单位长度的赛道环境，**全部为独立 Mesh**（估算）：

| 元素 | 循环参数 | 单次网格数 | 总量（估算） |
| :--- | :--- | :--- | :--- |
| 轨道枕木 | 3 车道 × 每 3.5m 一根 × 全长 1190m | 1 | **≈1020** |
| 龙门架（立柱×2+横梁+3 警示灯+3 绝缘子） | 每 45m 一座 | 9 | ≈234 |
| 信号灯杆/控制柜 | 每 35m 一组 | 7 | ≈238 |
| 弧形路灯/配电箱 | 每 45m 一组 | 4 | ≈104 |
| 隧道洞口 | 每 250m 一个 | 4 | ≈20 |
| 基础（地面/钢轨/电缆/护栏/隔音墙/风管/展台） | — | — | ≈24 |
| **合计** | | | **≈1640** |

**影响分析（准确表述）**：
- Babylon 默认做逐 Mesh 视锥剔除，因此实际每帧 draw call 只包含可见的赛道切片（约 60~100 单位，估算 100~200 个 Mesh）——但 **全部 1640 个节点仍需每帧参与场景图遍历 + 视锥剔除计算**（CPU 侧）。
- `DirectionalLight` 阴影贴图（2048px）每帧会渲染**光照视锥内的所有投影体**，投影体覆盖范围远大于相机视锥，阴影 pass 的实际开销被显著放大。
- `GlowLayer` 会把所有发光（emissive）Mesh 再渲染一遍到独立 RT，进一步放大。

**优化（Babylon.js 最佳实践，按性价比）**：
1. **合并静态几何**：对不动的同类元素用 `Mesh.MergeMeshes(meshes, true, true)` 合并为单一大 Mesh（枕木合并为 1 个、龙门架合并为 1 个、信号灯合并为 1 个……）。这是收益最大的一步。
2. 若需保留独立元素以便后续单独操作，改用 `Mesh.CreateInstance()` / **thin instances**（`mesh.thinInstanceSetBuffer()`）复刻几何体，共享一次 draw call。
3. 静态 Mesh 标记 `mesh.freezeWorldMatrix()`、`mesh.isPickable = false`（本项目无拾取）、`mesh.doNotSyncBoundingInfo = true`。
4. 阴影侧：**仅让需要投影的物体 castShadows**（玩家、追捕角色、火车、斜坡），枕木/钢轨/护栏等纯地面装饰 **不要 `receiveShadows = true`**（当前 `ground/rail/sleeper` 全部开启了 receiveShadows）。
5. 阴影贴图从 2048 降档评估（1024 或 1536），或 `blurExponentialShadowMap` 的 `blurKernel` 从 32 降到 16。

#### 2.1.2 后处理双通道叠加（P0）

```ts
this.glowLayer = new GlowLayer('glow', this.scene);          // 独立发光 pass
this.pipeline = new DefaultRenderingPipeline(..., true, ...); // 默认管线
this.pipeline.bloomEnabled = true; this.pipeline.bloomKernel = 64;
this.pipeline.fxaaEnabled = true;
```

`GlowLayer` 与 `DefaultRenderingPipeline.bloom` 是**两套互相独立的发光实现**，同时开启意味着场景被额外渲染 2 次以上（GlowLayer 1 次 + bloom 的亮度抽取/模糊链），配合 `bloomKernel = 64`（高开销）与 FXAA，形成可观的 GPU 填充率负担。

**优化**：二选一。本项目视觉卖点以霓虹发光为主，建议 **保留 `GlowLayer` 走主发光、关闭 `DefaultRenderingPipeline.bloom`**（或反之）。若保留 bloom，`bloomKernel` 降到 16~32。FXAA 在 devicePixelRatio > 1 的高分屏上收益有限，可评估关闭。

#### 2.1.3 动态实体材质泄漏（P0）

`syncObstacles()` / `syncCoins()` / `syncPowerUps()` 每生成一个实体就 `new StandardMaterial(...)`，而清理时仅调用 `node.dispose()` / `mesh.dispose()`——**Babylon 的 `dispose()` 默认不回收 Material**（`disposeMaterialAndTextures` 默认 `false`）。跑酷玩法持续生成/回收实体 → **稳态内存泄漏**。

**优化**：
- 材质按类型**集中缓存复用**（`trainMat`、`rampMat`、`coinMat`、`powerupMat[MAGNET|DOUBLE_SCORE|...]` 各建一份，存模块级 Map）。
- 几何体同样复用（金币圆柱、道具方块、障碍物盒体可共享同一 `VertexData`/`Mesh.CreateInstance`）。
- `triggerShatterFX()` 中 `new StandardMaterial('shardMat')` 每次碎裂都新建一个同名材质且从不释放，同样改为缓存。

#### 2.1.4 渲染层每帧对象分配（P2）

`render()` 每帧的隐性分配：
- `syncObstacles/Coins/PowerUps` 各 `new Set<string>()`（每帧 3 个 Set）。
- `this.camera.setTarget(new Vector3(...))`（每帧 1~2 个）。
- `this.scene.getMeshByName('armLeft'|'armRight'|'legLeft'|'legRight'|'officerTorso')`（每帧 5 次字符串哈希查找）。
- `frag.vel.scale(dt)` / `frag.rot.scale(dt)`（碎片更新时临时 Vector3）。

**优化**：缓存引用（`getMeshByName` 结果在 `buildPlayerMesh` 后一次性存入字段）；`setTarget` 复用实例；`Set` 可复用或改用「脏标记 + 反向遍历」。

### 2.2 粒子系统 `src/render/particles.ts`（P1，另有死亡代码）

- 当前**活跃**的粒子系统只有 `babylon.ts` 内的 `speedlineSystem`（120 容量、`emitRate` 每帧按速度调节，属正常范围）。
- **P1 关键问题**：`particleTexture` 指向公网 `https://raw.githubusercontent.com/PatrickNode/assets/main/line.png`——运行时网络依赖 + 跨域 + 单点故障。应打包为本地资源（`public/textures/line.png` 或内联 base64）。
- 注意：`src/render/particles.ts`（旧 Three.js `ParticleEngine`）是**死亡代码**，见工程债报告 §2，不参与本报告的运行时开销，但会拖累 `tsc` 与打包。

### 2.3 PCG 生成器 `src/systems/spawner.ts`（低风险，微优化）

- 逻辑正确且数据量小：`while (lastSpawnZ - playerZ < 150)` 每次步进 40，实体总量稳定在几十个量级，无性能风险。
- 微优化/健壮性：
  - 清理落后实体用 `splice(i, 1)`，数组未按 z 排序，最坏 O(n²)。可改为「从尾部 swap-pop」或 `filter` 重建（n 小，非必须）。
  - PowerUp 的 id 用 `Date.now()`，存在同毫秒碰撞与不确定性。建议改为单调自增计数器。
  - `spawnPattern` 形参 `_powerUps` 以下划线前缀规避 `noUnusedParameters`，但实际有写入——语义不清晰，建议改名 `powerUps`。

### 2.4 物理碰撞 `src/systems/physics.ts`（低风险）

- 障碍物遍历做了 3 趟（MOVING_TRAIN 位移 / targetGroundY 支撑面 / 碰撞判定），金币、道具各 1 趟。数据量 n≈20~40，**当前规模下无性能问题**。
- 磁铁吸附对全部金币做距离平方判定，金币 <100 时开销可忽略。
- 未来若实体量级增长，再引入空间哈希/分桶（broad-phase）；当前**不建议**为此增加复杂度。

### 2.5 核心循环 `src/core/gameLoop.ts` + `src/main.ts`（P2）

- `dt` 被钳制为 `min(..., 0.1)`（即 10 FPS 下限），高负载下表现为「慢动作」而非跳帧，对本玩法可接受。
- **双时钟不一致**：逻辑 `update(dt)` 使用 rAF 时间戳差值，渲染 `render()` 内又用 `engine.getDeltaTime()`——二者在标签页被节流/恢复时可能短暂背离。建议统一由 `GameLoop` 下发同一个 `dt`。
- `render()` 在 `PAUSED`/`MENU`/`SHOP` 状态下仍每帧执行 `this.scene.render()`。可在 `PAUSED` 时跳过渲染（或 `engine.stopRenderLoop` 式管理），省电。

### 2.6 UI `src/ui/dom.ts`（P1）

- `renderBuffs()` **每帧**执行 `this.hudBuffsEl.innerHTML = html`，即使 Buff 内容未变——强制 DOM 重建 + 样式回流。
- `update()` 每帧写 `textContent` 与 `style.width`，未做脏检查。
- **优化**：对分数/金币/速度/Buff 做「值变更才写」；Buff 列表用 `requestAnimationFrame` 节流到 ~10Hz 或仅在 `activePowerUps`/`hoverboardActive` 变化时重建。分数文本可缓存上次写入值比较。

---

## 3. 量化优化清单（可执行）

> 标注「预期收益」为定性/经验估算，落地后应以 DevTools Performance / Babylon Inspector / `EngineInstrumentation` 实测校准。

| # | 动作 | 文件 | 预期收益 | 风险 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 静态环境 `MergeMeshes` / thin instance 合并 | `babylon.ts buildCyberEnvironment` | draw call 从数百降至数十，CPU 剔除开销大降 | 低（纯视觉，需视觉验收） |
| 2 | 关闭 `pipeline.bloom` 或 `GlowLayer` 二选一，`bloomKernel`≤32 | `babylon.ts` 构造器 | GPU 全屏 pass 显著下降 | 低（需视觉验收） |
| 3 | 动态实体材质/几何缓存复用 + `dispose(true)` 显式回收 | `babylon.ts sync*` | 消除稳态内存泄漏 | 低 |
| 4 | 枕木/钢轨关闭 `receiveShadows`，阴影 2048→1024 | `babylon.ts` | 阴影 pass 开销下降 | 低（视觉验收） |
| 5 | 粒子纹理本地化 | `babylon.ts initSpeedlines` | 消除运行时网络依赖 | 无 |
| 6 | UI 脏检查 + Buff 节流 | `dom.ts` | DOM 抖动/回流下降 | 低 |
| 7 | 统一 dt 来源、PAUSED 跳帧 | `gameLoop.ts`/`main.ts` | 减少无用渲染 | 低 |
| 8 | GLB 加 Draco/meshopt 压缩 | `public/models/player.glb`（美术侧） | 首帧加载/内存下降 | 需美术协作 |

---

## 4. 建议的后续测量手段

落地优化前先建立基线，避免「凭感觉优化」：

1. **Babylon Inspector**（`scene.debugLayer.show()`）查看 draw call、材质数、网格数。
2. **`EngineInstrumentation`**（`@babylonjs/core`）采集每帧 `renderFrameTimeCounter` / `gpuFrameTimeCounter`。
3. **Chrome DevTools → Performance**：录制 10s 游玩，看 `requestAnimationFrame` 内 `scene.render()` 与 `updatePhysics` 的占比。
4. 移动端用真机 + `remote debugging` 复测低端机 ≥30 FPS 预算。

---

## 5. 结论

性能风险**不在逻辑层**（物理/生成/任务均为小数据量），而集中在 Babylon 渲染层的三类问题：**静态网格未合并（≈1640 个独立 Mesh）、后处理双通道、动态实体材质泄漏**。这三项是 Phase 6 打磨期「可量化、可落地、低回归风险」的优先改造项；UI 每帧重建与远程粒子纹理次之；双时钟与 dt 统一作为收尾健壮性改进。

> 关联交付：工程债治理方案见 `docs/architecture/engineering-debt-plan.md`。
