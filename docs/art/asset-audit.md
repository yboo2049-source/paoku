# paoku · Phase 6 美术资产审计与可访问性报告

> 角色：林绘澄（Art Director）
> 任务 ID：PP-03
> 项目：paoku（Web 3D 跑酷 / Subway Surfers 2.5D 风格）
> 技术栈：Vite + TypeScript + Babylon.js（渲染入口 `src/render/babylon.ts`）
> 视觉基线：霓虹赛博朋克 + 地铁轨旁环境（龙门架、信号灯、隔音墙、隧道入口、3D 发光展台、Bloom 后处理）
> 审计范围：`src/render/*`、`src/ui/*`、`src/style.css`、`public/` 全部资产、6 张根目录截图

---

## 0. 执行摘要（TL;DR）

| 维度 | 关键结论 | 等级 |
| :--- | :--- | :--- |
| GLB 骨骼模型 | 49,112 三角面 / 28,374 顶点 — **严重超预算**；缺少 `jump/slide/stumble` 三个动画；缩放 0.012 + 绑定姿态近乎扁平，存在轴向/缩放隐患 | 🔴 高风险 |
| Three.js 引擎 | `src/render/{three,models,particles,environment}.ts` 共 **1,233 行死代码**，`three`+`@types/three` 仍为生产依赖 | 🔴 高风险（工程债） |
| 着色器/VFX | `DefaultRenderingPipeline.bloom` + `GlowLayer` **双重辉光**；Bloom + FXAA + MSAA 三重抗锯齿堆叠；过度泛白致玩家剪影失真 | 🟠 中风险 |
| 粒子 / 特效 | 风阻拉线粒子纹理来自第三方 GitHub URL（`raw.githubusercontent.com/...line.png`），存在离线/CORS/可用性风险 | 🟠 中风险 |
| SVG / 道具资产 | `public/icons.svg`（5KB，社交图标）与 `public/favicon.svg`（12KB，紫色闪电）为 **脚手架残留**，风格与游戏霓虹调色板冲突；游戏 UI 实际用内联 SVG | 🟡 低风险（需清理） |
| 性能 / Draw call | 跑道全长 1200m，枕木 ~990 个、窗户 ~670 个、龙门架/信号灯/路灯 ~600+ 个独立 Mesh；**无 InstancedMesh / thinInstance / MergeMeshes / LOD**，单帧 draw call 估计 2,000–3,000+ | 🔴 高风险 |
| 材质复用 | 金币/障碍/火车采用 **每实例新建 Material**（`gold_${coin.id}`、`trainMat_${obs.id}` 等），材质对象数随场景线性增长 | 🟠 中风险 |
| 可访问性 | 无 `prefers-reduced-motion`、无 `:focus-visible`、无 `aria-label`/`role`、色盲无重映射、小号字（0.65rem/10.4px） | 🟠 中风险 |

---

## 1. 视觉身份与现状对照

### 1.1 美术基线（来自需求与截图）
- **调色板**：`--primary-cyan: #00f3ff` / `--secondary-pink: #ff007f` / `--accent-gold: #ffd700` / `--accent-green: #00ff66` / `--accent-purple: #a855f7`（`src/style.css:7-22`）。
- **场景**：地铁轨旁 + 龙门架 + 三色信号灯 + 隔音墙 + 隧道洞口 + 城市天际线 + 3D 发光环形展台。
- **后处理**：Bloom + GlowLayer + 世界弯曲（远景下沉）。
- **6 张截图核验**（`/Users/smzdm/ai/paoku/screenshot_*.png`）：霓虹粉/青线条 ✔、枕木 ✔、龙门架 ✔、Bloom ✔；玩家角色剪影被 Bloom 漂成"白盒"，辨识度不足；`screenshot_5` 与 `screenshot_6` 实际均为 `GAMEOVER` 画面（暂停屏未捕获）。

### 1.2 视觉一致性偏差
- **玩家建模层级断裂**：承诺"高精 3D 骨骼 GLB（Idle/Run/Jump/Slide/Stumble）"，实际渲染仍为过程化几何盒子（详见 §2）。
- **图标资产调性冲突**：`public/icons.svg` 内含 bluesky/discord/github/social/x 等深紫 `#08060d` + 紫 `#aa3bff` 社交图标；`public/favicon.svg` 为紫色 `#863bff` 闪电。两者与游戏霓虹青/粉/金调色板完全不一致，属 Vite + PWA 脚手架残留。

---

## 2. GLB 骨骼模型审计（`public/models/player.glb`）

### 2.1 量化数据（GLB JSON chunk 解析结果）

| 指标 | 值 | 评估 |
| :--- | :--- | :--- |
| 文件大小 | **2.79 MB**（2930032 字节） | 🟠 偏大，首屏需 ~3MB 加载 |
| 顶点数（合计） | **28,374** | 🔴 超预算（建议 ≤ 10k） |
| 三角面（合计） | **49,112** | 🔴 **超 3-5 倍**（建议 ≤ 12k） |
| 网格数 | 2（`Mesh`, `Mesh.001`） | ✔ |
| 材质数 | 2（`Beta_Joints_MAT`, `Beta_HighLimbsGeoSG2`，PBR） | ✔ 但材质名暴露 Skeleton/Mixamo 命名 |
| 纹理/图片 | 0 | 🟡 纯色无贴图，体量本应更小但未压缩 |
| 骨骼 Skin | 1，**67 个关节** | ✔ 与动画通道数一致 |
| 动画数 | **7** | ⚠ 数量够但命名错位 |
| 动画名清单 | `["agree","headShake","idle","run","sad_pose","sneak_pose","walk"]` | 🔴 **缺失 jump / slide / stumble** |
| 通道/采样器 | 201 / 201（每个动画） | ✔ 关节覆盖完整 |
| Bind Pose BBox | X: -0.903…0.903 · Y: -0.003…-0.003 · Z: -0.144…0.177 | 🔴 **Y 维度近乎 0**，模型在绑定姿态下沿 X 轴平躺，疑为 Blender→glTF 轴向未修正或原点错位 |
| 生成器 | Khronos glTF Blender I/O v1.1.46 | 来源：Blender 导出 |

### 2.2 与骨骼动画状态机的匹配度（`src/render/babylon.ts:494-539`）

`playSkeletalAnimation(keyword)` 用 `ag.name.toLowerCase().includes(keyword)` 匹配：
| 状态机请求 | GLB 实际 | 命中？ | 后果 |
| :--- | :--- | :--- | :--- |
| `idle` | `idle` | ✔ | 正确 |
| `run` | `run` | ✔ | 正确 |
| `jump` | — | ❌ | 静默回退到 `animGroups[0]` = **`agree`**，角色做"同意"手势而非起跳 |
| `slide` | — | ❌ | 回退 `agree` |
| `stumble` | — | ❌ | 回退 `agree` |

> 截图 `screenshot_3_gameplay_chase.png` / `screenshot_5` 显示玩家呈"白盒+目镜+警灯"形象，亦与 GLB 高模应有形态不符，**强烈怀疑 GLB 未正确替换过程化玩家**：要么 `ImportMeshAsync` 异步加载未就绪时被截图，要么 `.catch(() => {})` 静默吞掉加载错误回退至过程化几何。

### 2.3 缩放与轴向隐患
- `glbPlayer.scaling.set(0.012, 0.012, 0.012)`（`babylon.ts:499`）。
- Bind Pose Y ≈ 0（角色平躺），叠加 0.012 缩放 → 即便加载成功，**世界空间高度约 2cm**，与 `CONSTANTS.PLAYER_HEIGHT = 1.8` 严重不匹配。
- 唯一救正路径是骨骼根节点在世界矩阵中旋转 90°/180° 拉起角色，**当前代码未发现此类修正**。

### 2.4 与过程化 fallback 的关系
- `buildPlayerMesh`（`babylon.ts:419-520`）以 Box 拼出躯干/胸甲/头部/目镜/臂/腿/背包，并显式 `isVisible = false` 隐藏过程化部件以"让位"给 GLB。
- 然而：① 第 705–714 行继续对 `armLeft/armRight/legLeft/legRight` 施加 sin 摆动，即便它们隐藏仍每帧 `getMeshByName` 查询 + `rotation.x =` 写入，是 **纯浪费**；
- ② 若 GLB 加载失败（`.catch(() => {})` 吞错），过程化角色永久显示，截图所见正是如此。

---

## 3. SVG 与道具资产审计

### 3.1 `public/icons.svg`（5,031 B）
- 内容：6 个 `<symbol>`：`bluesky-icon` / `discord-icon` / `documentation-icon` / `github-icon` / `social-icon` / `x-icon`。
- 填充色：`#08060d`（黑）/ `#aa3bff`（紫）— **不属于游戏霓虹调色板**。
- 使用情况：**未被任何代码引用**（`grep` 全仓 0 命中 `icons.svg`）。
- 结论：脚手架/Vite 默认素材残留，建议删除或替换为游戏品牌 SVG。

### 3.2 `public/favicon.svg`（12,222 B）
- 内容：紫色闪电图形 + 多层高斯模糊滤镜（`#863bff`/`#7e14ff`/`#ede6ff`）。
- 与游戏调色板冲突（紫色为主，游戏强调青/粉/金）。
- 使用情况：作为 PWA / 浏览器 tab 图标使用（`<link rel="icon">` 隐式）。
- 结论：建议替换为游戏 LOGO（跑酷 + 霓虹元素）。

### 3.3 `src/` 内 SVG / 道具纹理
- 任务简报提及"贴图/道具纹理在 `src` 内以 SVG 代码绘制"，**与现状不符**：当前 `src/` 完全使用 Babylon 程序化几何（`MeshBuilder`）生成所有道具，**没有任何 SVG 道具纹理**。
- 仅 UI 使用内联 SVG 图标：`src/ui/dom.ts:189-211` 内联了 `path d=...` 作为 SCORE / COINS / 音量 / 暂停按钮图标。
- **风格一致性**：UI 内联 SVG 与 `style.css` 的霓虹调色板一致 ✔，但未抽出为可复用 `<symbol>`，跨屏复用需要重复路径字符串。

### 3.4 GLB 关联的"道具"与场景元素
- `syncObstacles`（`babylon.ts:833-936`）：5 种障碍（STATIC_TRAIN / MOVING_TRAIN / RAMP / LOW_OBSTACLE / HIGH_OBSTACLE），均过程化生成 ✔。
- `syncCoins`（`babylon.ts:938-983`）：金币 cylinder + 星标 box。
- `syncPowerUps`（`babylon.ts:985-1030`）：4 种道具（cyan / magenta / gold / green）box。
- **缺口**：无任何 3D 粒子发射器、无贴花（decal）、无场景广告牌 prop。

---

## 4. 着色器 / VFX / 后处理审计

### 4.1 后处理流水线（`src/render/babylon.ts:90-98`）

```ts
this.glowLayer = new GlowLayer('glow', this.scene);   // Bloom-Lite on emissive
this.glowLayer.intensity = 0.65;
this.pipeline = new DefaultRenderingPipeline('defaultPipeline', true, this.scene, [this.camera]);
this.pipeline.bloomEnabled = true;
this.pipeline.bloomWeight = 0.45;
this.pipeline.bloomThreshold = 0.6;
this.pipeline.bloomKernel = 64;
this.pipeline.fxaaEnabled = true;
```

| 项 | 现状 | 评估 |
| :--- | :--- | :--- |
| `Engine` 第 2 参 `antialias: true` | 启用 MSAA | 与下方 FXAA 重复抗锯齿 |
| `DefaultRenderingPipeline.bloomEnabled` | ✔ weight 0.45 / threshold 0.6 / kernel 64 | 中等强度，**截图已出现明显过曝白盒** |
| `GlowLayer`（独立 emissive 辉光） | intensity 0.65 | 🔴 **与 Bloom 叠加造成双重辉光**，PBR 物体的 emissive 通道被两层后处理各采样一次，能耗翻倍且细节被擦白 |
| `FXAA` | ✔ | 🟡 与 MSAA 重复，建议二选一 |
| **世界弯曲（World Bending）** | `babylon.ts:776-778` 仅靠 `camera.setTarget` 的 Y 偏移 `−pow(15,2)*0.0008` 模拟 | ⚠ 实为"摄像机俯角假弯曲"，无顶点位移 Shader；建议补一个 Vertex Shader 沿跑道 Z 轴二次下弯，与"速度感"协同 |
| Tone Mapping | 默认（HDR 未启用） | 🟡 建议启用 ACES Filmic 以匹配霓虹高动态范围观感 |

### 4.2 雾与大气
- `scene.clearColor = (0.04, 0.06, 0.12, 1)` 深深沉浸夜场 ✔；
- **未启用 `scene.fog`**：与 `environment.ts`（Three 死代码）`FogExp2` 不一致。Babylon 场景无深度雾，远景隧道口缺乏大气透视。

### 4.3 光照系统
- 半球光 `(0.3, 0.95, 1.0)` diffuse + `(1.0, 0.2, 0.6)` ground — 青/粉撞色 ✔；
- 平行光强度 1.8，ShadowGenerator 2048×2048 + `useBlurExponentialShadowMap` + `blurKernel = 32` — 🔴 **开销大且接受阴影面众多**；
- 阴影 caster：`torso/armor/head` + 每一辆 `STATIC_TRAIN` 车身（`syncObstacles` 中 `addShadowCaster(body)`）— 火车数量随场景线性增长，shadow map 多次重绘。

### 4.4 粒子 / 动效

| 系统 | 文件 | 评估 |
| :--- | :--- | :--- |
| **Speedlines 风阻拉线** | `babylon.ts:649-666` `ParticleSystem` 容量 120，emitRate 50–100 | 🔴 纹理来自 `https://raw.githubusercontent.com/PatrickNode/assets/main/line.png`：**第三方 GitHub URL，离线/CORS/失效风险**；无 fallback |
| **碎片 shatter** | `babylon.ts:798-815` 每次碰撞生成 12 个 polyhedron | 🟡 无对象池，每碰撞产生/销毁 material；建议 pooling |
| **悬浮滑板尾气** | `babylon.ts` 未实现（Three 死代码 `particles.ts` 有 `spawnHoverboardTrail`） | 🔴 **主引擎缺少此特效** |
| **金币拾取爆破** | 同上（仅 Three 死代码） | 🔴 **主引擎缺少此特效** |
| **护盾破裂环** | 同上 | 🔴 **主引擎缺少此特效** |
| **摄像机落地震屏** | `landingShakeTime` + sin shakeY 0.12 ✔ | ✔ |
| **摄像机 Bank Tilt** | `camera.rotation.z = lerp(...)` ✔ | ✔ |
| **FOV 速度冲程** | `camera.fov = 0.85 + speedRatio*0.25`（弧度） | ✔ 但弧度值与 Three 版（60°+15°）不一致，跨引擎对比需校正 |

> 🔴 **关键缺口**：随着 Three.js 引擎被弃用，`spawnHoverboardTrail` / `spawnCoinPickup` / `spawnShieldShatter` 三个核心粒子特效在主引擎（Babylon）**完全不存在**，HUD 中"HOVERBOARD ACTIVE" Buff Pill 高亮却无可视反馈。

---

## 5. 性能视角的资产规格

### 5.1 场景 Draw Call 估算（`babylon.ts:140-414` `buildCyberEnvironment`）

| 元素 | 数量公式 | 单次计数 | 备注 |
| :--- | :--- | :--- | :--- |
| 跑道地面 plane × 3 lane | 3 | 3 | ✔ |
| 钢轨 box × 3 lane × 2 side | 6 | 6 | ✔ |
| 枕木 box × 3 lane × (1200-50+40)/3.5 | ≈ 3 × 340 | **≈ 1,020** | 🔴 全部独立 Mesh |
| 防撞屏障 box + 霓虹条 × 2 side | 4 | 4 | ✔ |
| 高压电缆线 × 3 lane | 3 | 3 | ✔ |
| 龙门架（柱 2 + 梁 1 + 警示灯 3 + 绝缘子 3）× ~27 间隔 | 9 × 27 | **≈ 243** | 🔴 |
| 信号灯杆 + 灯箱 + 3 镜头 + 控制柜 + 警示条 × ~34 间隔 | 7 × 34 | **≈ 238** | 🔴 |
| 隔音墙 + 顶霓虹 + 通风管道 × 2 side | 6 | 6 | ✔ |
| 高杆路灯（杆 + 横臂 + 灯头 + 配电箱）× ~27 间隔 | 4 × 27 | **≈ 108** | 🟠 |
| 3D 展台 cylinder × 2 | 2 | 2 | ✔ |
| 隧道洞口（左右柱 + 横梁 + 名牌）× 5 间隔 | 4 × 5 | 20 | ✔ |
| **单次构造总 Mesh（静态）** | | **≈ 1,650+** | |

> 再叠加动态：玩家（过程化 8 + GLB ~）+ 障碍（每帧最多 4-12 个，各 2-9 子 Mesh）+ 金币（5-24 个 × 2 子 Mesh）+ 道具（0-4 × 3 子 Mesh）+ Inspector/Dog（程序化 ~10）。
> **首帧估计 1,800–2,200 draw call**，移动端/Safari 帧率难以稳定 60fps。

### 5.2 优化建议
1. **InstancedMesh / `thinInstance`**：枕木 1,020 + 龙门架 243 + 信号灯 238 + 路灯 108 + 霓虹条 + 钢轨/电缆 — 全部适合用 `Mesh.createInstance` 或 `thinInstanceAdd`。
2. **材质共享**：从 `groundMat/railMat/sleeperMat/gantryMat/neonStripeMat/wireMat/insulatorMat/beaconMat/signalBoxMat/redLens/yellowLens/greenLens/wallMat/ductMat/lampHeadMat/podiumMat` 中复用 `scene.getMaterialByName()`，删除 `new StandardMaterial(`gold_${coin.id}`)` / `new StandardMaterial(`trainMat_${obs.id}`)` 等每实例新建。
3. **合并静态 Mesh**：同材质、同变换的 `Mesh.MergeMeshes` 后转为静态冻结算（`freezeWorldMatrix`）。
4. **LOD**：把轨道沿线元素分为「远景（LOD1，枕木间距 7m）」与「近景（LOD0，3.5m）」两档。
5. **远裁剪 / Frustum Culling**：开启 `scene.fogEnabled` + 雾密度即可天然裁剪远景，不必每帧渲染 1,000 个远端枕木。
6. **GLB 减面至 ≤ 12k 三角面**：使用 `meshoptimizer` 或 Blender decimate，文件可压至 ~500KB。

### 5.3 纹理与材质预算
- **纹理**：当前项目 **零外部纹理**，粒子贴图除外（详见 §4.4 风险）。
- **材质对象数**：场景启动即约 30 个；若不做共享，每局额外 +30（金币）+ 9（火车）≈ 70 个，多局累积引发 GC。
- **着色器编译**：`StandardMaterial` ≈ 30、`PBRMaterial` ≈ 5，编译可接受；但 Babylon 在 WebGL2 上 PBR 比 StandardMaterial 慢 1.5-2×，目前 PBR 仅用于地面/枕木/护栏/管道/展台/玩家躯干，建议明确划分"PBR 必要区" vs "Standard 足够区"。

---

## 6. 可访问性分级评估

> 行业通行分级：**Basic / Standard / Comprehensive / Exemplary**。当前定级 **Standard（含若干 Basic 项缺失）**。

### 6.1 现状矩阵

| 维度 | Basic | Standard | Comprehensive | 当前 | 改进建议 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 文字最小字号 | ≥ 12px | ≥ 14px（body） | 可缩放至 200% | 🟡 `.hud-val-title` **0.65rem ≈ 10.4px**、`.key-cap` 0.7rem | 升级到 0.75rem+，提供 UI 字号开关（75/100/125/150%） |
| 配色对比度（正文） | AA 4.5:1 | AA 7:1 | AAA 7:1 | 🟢 主文 `#f3f4f6` on 深底 ~15:1 ✔；`#9ca3af` on 暗底 ~6.8:1 ✔ | 维持 |
| 配色对比度（小字 muted） | AA 4.5:1 | AA 4.5:1 | AAA 7:1 | 🟡 0.65rem muted ≈ 10.4px AA 边界 | 提字号 |
| 色盲（红绿）支持 | 形状冗余 | 图案冗余 | 三色盲全面重映射 | 🔴 红绿信号灯 + 粉/青 hazard/safe 是色盲雷区 | 为红绿信号灯加形状（▲停 / ◯行）；为 hazard 加斜纹/纹理 |
| 动效强度可调 | 关闭动效 | 减弱 | 完全替代 | 🔴 **无 `prefers-reduced-motion` 处理**；FOV 变化、震屏、Buff 脉冲、Bloom 闪烁 | 增加"动效强度"开关（off/light/full）并监听 `matchMedia('(prefers-reduced-motion: reduce)')` |
| 焦点可见 | 默认轮廓 | `:focus-visible` 自定义 | 多模态焦点 | 🔴 **CSS 无任何 `:focus` / `:focus-visible` 规则**，键盘 Tab 不可见 | 增加 `*:focus-visible { outline: 2px solid var(--primary-cyan); outline-offset: 2px; }` |
| ARIA / 语义 | 仅按钮 | 屏读标签 | 完整地标 + live region | 🟡 仅 `title` 属性，无 `aria-label`/`role`/`<main>`/`<nav>`；分数无 `aria-live` | 为图标按钮加 `aria-label`；分数区 `aria-live="polite"` |
| 输入替代 | 键盘 | 手柄 | 全键位重映射 | 🟡 键盘 WASD/方向键 ✔，但 HUD 内按钮无 `tabindex` 顺序 | 验证 Tab 顺序，提供手柄/触屏 fallback |
| 屏幕阅读 | 替代文本 | 完整朗读 | 关卡/任务旁白 | 🔴 无 | 加 `sr-only` 描述 HUD 与 Game Over 信息 |
| 字幕 | 音效字幕 | 完整 | 多语言 | 🔴 无 | 给 `COIN_COLLECTED`/`COLLISION` 等音效加视觉字幕 + `prefers-captions` |
| 大字体模式 | 1 档 | 2 档 | 用户字体堆叠 | 🟡 仅 1 档 | UI 字号开关 |
| 颜色自定义 | — | HUD 主题 | 多套主题 | 🟡 仅赛博深色 | 至少提供"高对比"主题（白底黑字） |
| `prefers-reduced-motion` | 必须 | 必须 | 必须 | 🔴 **缺失** | 立即补 |
| `prefers-contrast` | — | 可选 | 必须 | 🔴 缺失 | 监听并强化对比 |

### 6.2 推荐分级目标
- **最低交付**：**Standard**（补齐 `:focus-visible` + `aria-label` + `prefers-reduced-motion` + 字号 0.75rem+）。
- **理想交付**：**Comprehensive**（再加色盲形状冗余 + 动效强度开关 + 完整 ARIA live region + 高对比主题）。

### 6.3 立即可改项（成本/收益比最高）
1. `src/style.css` 末尾追加：
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
     .cyber-toast, .buff-pill, .new-record-badge, .ui-card { animation: none !important; }
   }
   :focus-visible { outline: 2px solid var(--primary-cyan); outline-offset: 2px; border-radius: 4px; }
   ```
2. 所有图标按钮加 `aria-label="Pause"` / `"Toggle sound"` 等。
3. HUD 分数/金币容器加 `aria-live="polite" aria-atomic="true"`。
4. 信号灯 mesh 旁加形状（如绿色圆盘/红色三角）作为冗余编码。
5. 在 `style.css` 增加 `html { font-size: clamp(14px, 1vw + 12px, 18px); }` 并把所有 rem 字号上调一档。

---

## 7. 资产缺口与风险清单（RAG 汇总）

| # | 类别 | 描述 | 严重度 | 影响范围 |
| :--- | :--- | :--- | :--- | :--- |
| R1 | GLB 动画 | 缺 `jump` / `slide` / `stumble` 三个动画 | 🔴 高 | 跳跃/翻滚/受击动作错误回退 `agree` |
| R2 | GLB 几何 | 49,112 三角面 + 2.79MB 超预算 | 🔴 高 | 加载耗时、首帧卡顿 |
| R3 | GLB 轴向/缩放 | Bind Pose Y≈0，缩放 0.012，可视呈"迷你躺姿" | 🔴 高 | 玩家建模无法正确显示，过程化回退 |
| R4 | 死代码 | `three.ts/models.ts/particles.ts/environment.ts` 共 1,233 行 + `three` 依赖 | 🟠 中 | 包体、维护性、编译时间 |
| R5 | 双重辉光 | Bloom + GlowLayer + FXAA + MSAA 堆叠 | 🟠 中 | 玩家剪影被漂白 |
| R6 | 粒子缺口 | Babylon 主引擎缺 hoverboard trail / coin pickup / shield shatter | 🟠 中 | 关键反馈缺失 |
| R7 | 远程纹理 | speedline 纹理走 `raw.githubusercontent.com` | 🟠 中 | 离线/CORS 风险 |
| R8 | Draw call | 静态 ~1,650 mesh，无 InstancedMesh/Merge/LOD | 🔴 高 | 中端机帧率 |
| R9 | 材质复用 | 金币/火车每实例新建 StandardMaterial | 🟠 中 | 材质数线性增长 |
| R10 | 着色器/弯曲 | 世界弯曲为摄像机俯角近似，无顶点 Shader | 🟢 低 | 视觉保真度 |
| R11 | 雾 | Babylon 场景无 fog，远景缺乏大气透视 | 🟢 低 | 远景扁平 |
| R12 | 资产残留 | `public/icons.svg` / `favicon.svg` 调色板冲突 | 🟡 低 | 品牌一致性 |
| R13 | 道具贴图 | 全程序化几何，缺 SVG/PNG 道具贴花 | 🟢 低 | 风格化扩展空间 |
| R14 | 可访问性 | 无 `prefers-reduced-motion` / `:focus-visible` / `aria-label` | 🟠 中 | 残障玩家体验 |
| R15 | 色盲 | 红绿信号灯 + 粉青 hazard/safe 仅靠颜色 | 🟠 中 | 8% 男性玩家不可辨识 |
| R16 | 字号 | `.hud-val-title` 0.65rem（约 10.4px）低于 12px | 🟡 低 | 阅读舒适度 |
| R17 | 截图 | `screenshot_5/6` 实为 Game Over，暂停/跳跃画面缺失 | 🟡 低 | 视觉验收不全 |
| R18 | 相机 FOV 不一致 | Babylon 用弧度 0.85→1.10，Three 用度数 60°→75° | 🟢 低 | 跨引擎对比失真 |
| R19 | `preserveDrawingBuffer` | 引擎开启保留缓冲（仅截图需要） | 🟢 低 | 每帧微开销 |
| R20 | `backFaceCulling=false` | 地面/钢轨/枕木禁用背面剔除 | 🟢 低 | 过度 overdraw |

---

## 8. 建议优先级路线图

### P0 · 必须修复
1. **R1**：补齐 GLB 三套动画（jump/slide/stumble），或在 `playSkeletalAnimation` 中显式 `console.warn` 并强制回落至合法动画，避免静默错误。
2. **R3**：修正 GLB 轴向（导出时 Z-up→Y-up）+ 缩放至 ~0.012 → 视实际高度调整；验证 `babylon.ts:495` 的 `ImportMeshAsync` 是否成功（添加 `.then` 日志）。
3. **R4**：删除 `three.ts/models.ts/particles.ts/environment.ts` 与 `package.json` 的 `three`/`@types/three` 依赖，运行 `npm run build` 验证。
4. **R8 / R9**：枕木/钢轨/电缆/霓虹条全部改 `thinInstance` 或 `InstancedMesh`；金币/火车材质池化。
5. **R14 / R15**：补齐 `prefers-reduced-motion`、`:focus-visible`、`aria-label`、信号灯形状冗余。

### P1 · 重要打磨
1. **R5**：移除 `GlowLayer`（保留 Bloom），bloomKernel 64→48、threshold 0.6→0.75，关闭 FXAA（保留 MSAA）。
2. **R6**：把 Three 死代码的粒子（hoverboard trail / coin pickup / shield shatter）迁移至 Babylon 引擎。
3. **R7**：把 `line.png` 落入 `public/textures/`，构建期固化。
4. **R2**：GLB 减面至 ≤ 12k tris，导出时启用 Draco 压缩（目标 < 500KB）。

### P2 · 增强
1. **R10**：补顶点 Shader 实现 World Bending（沿 Z 二次下弯）。
2. **R11**：启用 Babylon `scene.fogMode = FOGMODE_EXP2`，density ~0.008。
3. **R12**：重制 `favicon.svg` 与品牌 LOGO（青/粉/金调）。
4. **R13**：抽出共享 `<symbol>` 图标为 `src/ui/icons.svg` 雪碧图，跨屏复用。
5. **R16**：字号上调一档；新增 UI 字号开关（75/100/125/150%）。

---

## 9. 结论

- **美术技术债最重的两块**：① GLB 角色模型（动画/几何/轴向三连失配）；② Three.js 死代码 + Babylon 粒子特效缺失。
- **性能瓶颈最重的一块**：跑道沿线 ~1,650 个静态 Mesh 无任何 InstancedMesh/Merge/LOD，需在 P0 阶段重写 `buildCyberEnvironment` 的生成策略。
- **可访问性需从 Standard 提至 Comprehensive**：最低交付前需补齐 reduced-motion、focus-visible、aria-label、色盲形状冗余、字号 ≥ 14px 五项。
- **资产口径**：当前无任何 SVG 道具贴图，全部为程序化几何；`public/icons.svg` 与 `favicon.svg` 为脚手架残留，建议清理或品牌重制。

> 与其他成员的衔接：
> - 与 engineering-lead：R1/R3 需修 GLB 加载与动画映射；R4 删除死代码；R8/R9 需 InstancedMesh 重构；
> - 与 quality-lead：建议把 §5 Draw call 与 §6 可访问性矩阵作为 E2E 测试用例（截图回归 + axe-core 扫描）；
> - 与 audio-director：R7 速度线纹理已转交建议目录 `public/textures/`，请同步确认音频资产是否同样存在外部 URL 风险。

---

*报告生成：林绘澄（Art Director）· pp-03 · 报告路径：`docs/art/asset-audit.md`*