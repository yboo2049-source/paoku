# 已交付 GLB 资产 · 结构化交接说明

> **文档版本**：2.0.0（按主 Agent 复核意见重写，替代 v1.0.0 `173fbf4` 与 v1.1.0 `d87aad6`）
> **资产基线**：`622e7da` 交付的 21 个模型 + 历史 `player.glb`，共 22 个 `.glb`
> **机器可读清单**：[`glb-manifest.json`](glb-manifest.json)（逐条含 SHA-256、解析结果、证据等级、未验证项、更正记录）
> **复核来源**：主 Agent 复核意见。其原文路径 `D:/worker/paoku/docs/reviews/…` 与曾引用的 `docs/reviews/`、`docs/evidence/` 在本仓库均不存在，故不再挂链接，更正内容内联在第 1 节与清单的 `corrections` 字段。

---

## 1. 本版更正了什么

| # | 此前说法 | 本版结论 | 原因 |
| :-- | :--- | :--- | :--- |
| 1 | 只有一份「包围盒」，混用作尺寸与摆放依据 | 拆成 `object_space_geometry_only` 与 `scene_world_after_node_trs` 两个字段 | 前者不含节点变换，不能用于摆放或推算尺寸 |
| 2 | runner「高 0.42、原点在身躯中点、需放大 4.28 倍」 | **世界高 0.979、原点在脚底中心、等比系数约 1.84** | 把局部几何范围当成了世界尺寸 |
| 3 | 5 个模型「必须再绕 X 轴 +90°」 | **撤回**。这 5 个模型根节点已带四元数 `[0.7071, 0, 0, 0.7071]`（+90° X），世界包围盒 Y 轴为最长边，实际已立起 | 只看对象空间 `Z∈[-1,0]` 就下结论；再转会把它们推倒 |
| 4 | 概念原画当 preview，并标「实际预览确认」 | 概念图独立放 `concept_art` 并注明「非渲染结果」 | 设计意图 ≠ 模型事实 |
| 5 | 引用 `twin_rocket.png`、`pink_magnet.png`、`star_badge.png`、`sneaker.png`、`obstacle_hurdle_barrier_inspect.png` | 这 5 个文件**不存在**，已改为 `null` 或指向真实存在的截图 | 链接未校验存在性 |
| 6 | 「用代码正弦波模拟跑动」；各类致死碰撞盒、缩放 0.45、磁铁悬浮自转、「MAX HT 2.5M」 | 全部删除。无骨骼即无动作资产；碰撞与道具配法不属于本文档；牌面实际是 **WARNING** | 程序摆动不是动作交付；文档不预设玩法 |
| 7 | 引用「PAO-11/12/13 已验收契约」「PAO-15 动作交付」；`player.glb` 场景尺寸 1.45/1.81/0.39 | 不再引用这些编号（仓库内无对应文档）；`player.glb` 对象空间为 **1.81/1.81/0.32**，场景空间因蒙皮 IBM 不适用 | 无法核实的契约不能写成既定事实 |

---

## 2. 证据分级（读清单前先看这节）

| 等级 | 含义 | 能证明什么 |
| :--- | :--- | :--- |
| `parse` | GLB 解析确认 | 面数、贴图尺寸、skins/animations、材质、包围盒——可复现的硬数据 |
| `engine_preview` | 实际预览确认 | 有真实引擎导入截图，可证明外观与朝向；**不等于视觉验收通过** |
| `texture_atlas` | 贴图图集推断 | 只能支撑配色，撑不起轮廓与结构 |
| `concept_art` | 概念原画 | 设计意图，不是该 GLB 的渲染，不作外观/尺寸证据 |
| `unverified` | 待验证 | 无证据的部分，逐条写入 `unverified` 字段 |

22 个资产中**仅 8 个有真实引擎截图**，其余 14 个的外观描述基于「图集主色 + 包围盒比例」，已在 `appearance.note` 标明。所有记录的 `status.visual_acceptance` 一律为 `not_performed`——本清单不是美术验收结论。

---

## 3. 三条硬结论

**3.1 两列车的文件名与内容互换（引擎截图已确认）**

| 文件 | 实际内容 | 说明 |
| :--- | :--- | :--- |
| `train_metro.glb` | 带黄色斜面大板的**轨道工程/维修车**（1.00×0.31×0.32） | 黄板由车顶前缘延伸到地面，形似坡道；坡道板与车体同属一个网格 |
| `train_ramp_or_car.glb` | **地铁客车车厢**：3 窗 + 2 组双开门 + 双转向架四轮（0.98×0.44×0.38） | 无坡道 |

`docs/PROGRESS.md` 目前按文件名把两者写反了（「地铁车厢/车头」↔「斜坡工程爬坡车」），接入时勿以其为准。

**3.2 `622e7da` 的 21 个模型全部是静态网格**
`skins = 0`、`animations = 0`，逐个复核无例外。唯一带骨骼的是历史 `player.glb`（67 关节、7 个 Mixamo 动画，缺 jump/slide/stumble）。角色类资产要有跑跳滑动作，只能补正式骨骼动画或重新绑定——**没有便宜的替代方案**。

**3.3 五个「疑似躺平」的模型其实已经立好**

| 模型 | 对象空间 size | 场景空间 size | 根节点旋转 |
| :--- | :--- | :--- | :--- |
| obstacle_slide_barrier | 0.13 × 0.63 × 1.00 | 0.13 × **1.00** × 0.63 | `[0.7071,0,0,0.7071]` |
| obstacle_utility_box | 0.79 × 0.65 × 1.00 | 0.79 × **1.00** × 0.65 | `[0.7071,0,0,0.7071]` |
| prop_jetpack | 0.34 × 0.41 × 1.00 | 0.34 × **1.00** × 0.82 | `[0.7071,0,0,0.7071]` |
| prop_mystery_box | 1.00 × 0.88 × 0.94 | 1.00 × 0.88 × 0.94 | `[0.7071,0,0,0.7071]` |
| prop_sneakers | 1.00 × 0.64 × 0.98 | 1.00 × 0.64 × 0.98 | `[0.7071,0,0,0.7071]` |

实测合影见 [`inspections/upright_check_5fbx_models.png`](inspections/upright_check_5fbx_models.png)：五个模型都落在地面上，无倾倒。**不要再叠加 X+90°。**

---

## 4. 尺寸与原点怎么读

- **`object_space_geometry_only`**：顶点原始范围，不含任何节点变换，只用于看几何本身。
- **`scene_world_after_node_trs`**：按节点 TRS 逐级相乘后的 AABB，判断朝向/落地/比例一律用这份。
- 21 个新资产在场景空间高度收敛：X/Z 居中、底面 `Y=0`、最大边≈1.0（归一化单位，**不是米**）。
- **包围盒不能当碰撞代理**，也不能直接换算物理尺寸。`player.glb` 尤其要注意：变换后仅 0.018，是蒙皮 IBM（100×）未参与计算的结果，须按蒙皮后世界高度约 1.8 处理。
- **朝向全部未标定**：清单里统一 `orientation: unverified`。`train_*` 已知长轴沿 X，但行进方向 ±X 未定。

---

## 5. 22 个资产速查

尺寸为场景空间值；证据列见第 2 节。

| 文件 | 世界尺寸 (X×Y×Z) | 长轴 | 面数 | 骨骼/动画 | 证据 | 内容与建议用途 |
| :--- | :--- | :-- | --: | :-- | :-- | :--- |
| character_runner.glb | 0.61×0.98×0.19 | Y | 26,268 | 0 / 0 | parse+atlas+**预览** | 主角壳体，34 段静态网格需合并 |
| character_police.glb | 0.60×0.98×0.24 | Y | 147,371 | 0 / 0 | parse+atlas | 警官形象候选 |
| character_dog.glb | 0.55×0.91×1.00 | Z | 10,396 | 0 / 0 | parse+atlas | 犬形 NPC，长轴与其它角色相反 |
| player.glb（历史） | 蒙皮后≈1.8 高 | Y | 49,112 | **1 / 7** | parse | 当前代码唯一引用的角色 |
| env_gantry.glb | 0.98×0.67×0.14 | X | 109,871 | 0 / 0 | parse+atlas | 跨轨龙门架，厚偏薄 |
| env_tunnel_arch.glb | 0.86×0.98×0.85 | Y | 130,478 | 0 / 0 | parse+atlas | 隧道洞口，灰白混凝土色 |
| obstacle_buffer_stop.glb | 1.00×0.87×0.87 | X | 115,890 | 0 / 0 | parse+atlas | 轨道尽头车挡 |
| obstacle_hurdle_barrier.glb | 1.00×0.76×0.27 | X | 8,894 | 0 / 0 | parse+atlas | 低障碍候选，结构类型待验证 |
| obstacle_signal_light.glb | 0.21×0.98×0.22 | Y | 117,376 | 0 / 0 | parse+atlas | 三色信号机，灯色在贴图内 |
| obstacle_slide_barrier.glb | 0.13×1.00×0.63 | Y | 9,711 | 0 / 0 | parse+atlas+**预览** | 限高门架，WARNING 牌 |
| obstacle_traffic_cone.glb | 0.98×1.00×0.98 | Y | 119,424 | 0 / 0 | parse+atlas | 施工警示锥 |
| obstacle_utility_box.glb | 0.79×1.00×0.65 | Y | 9,352 | 0 / 0 | parse+atlas+**预览** | 轨旁配电柜 |
| prop_coin.glb | 1.00×1.00×0.16 | X | 9,767 | 0 / 0 | parse+atlas | 金币 |
| prop_hoverboard.glb | 0.98×0.17×0.37 | X | 117,165 | 0 / 0 | parse+atlas | 悬浮滑板 |
| prop_jetpack.glb | 0.34×1.00×0.82 | Y | 10,133 | 0 / 0 | parse+atlas+**预览** | 喷气背包，无玩法槽位 |
| prop_magnet.glb | 0.23×0.98×0.81 | Y | 115,095 | 0 / 0 | parse+atlas | 马蹄磁铁 |
| prop_multiplier_2x.glb | 0.98×0.96×0.15 | X | 118,625 | 0 / 0 | parse+atlas | 得分牌，字样待验证 |
| prop_mystery_box.glb | 1.00×0.88×0.94 | X | 9,015 | 0 / 0 | parse+atlas+**预览** | 宝箱，箱盖不可分离 |
| prop_shield.glb | 0.67×0.98×0.70 | Y | 114,233 | 0 / 0 | parse+atlas | 护罩，材质不透光 |
| prop_sneakers.glb | 1.00×0.64×0.98 | X | 10,034 | 0 / 0 | parse+atlas+**预览** | 并排双鞋，合并在一个网格 |
| train_metro.glb | 1.00×0.31×0.32 | X | 8,968 | 0 / 0 | parse+**预览** | **工程车 + 黄坡道** |
| train_ramp_or_car.glb | 0.98×0.44×0.38 | X | 112,516 | 0 / 0 | parse+**预览** | **客车车厢**，无坡道 |

**体积构成**：21 个资产共 156.7 MB（= 149.5 MiB），其中约 94 MB 是 4096² 贴图（多为每模型 3 张）。减面做过，**贴图没减**——这是后续优化真正的着力点。

---

## 6. 未验证清单（别当成已验证）

- 22 个资产的**朝向**均未标定；`train_*` 行进方向 ±X 未定。
- 米制尺寸未定：只知「最大边≈1.0 单位」，未知 1 单位等于多少米。
- 15 个资产无引擎截图，轮廓与结构依据图集与比例推断。
- `train_metro` 的黄斜板是坡道还是铲雪板，单视角无法定论。
- `obstacle_hurdle_barrier` 是木质跨栏还是金属闸门未验证。
- `prop_multiplier_2x` 的「2X」字样是否在贴图内未验证。
- `obstacle_slide_barrier` 的通行净空、`prop_shield` 的包裹范围未测量。
- 与玩家身高、车道宽度、跳跃弧线的匹配度未做接入测试。

---

## 7. 建议主 Agent 抽看的 3 张图

| # | 图 | 看什么 |
| :-- | :--- | :--- |
| 1 | [`glb-previews/train_metro_engine_q34.png`](glb-previews/train_metro_engine_q34.png) | `train_metro.glb` 是带黄色坡道的工程车，不是地铁车厢 |
| 2 | [`glb-previews/train_ramp_or_car_engine_side.png`](glb-previews/train_ramp_or_car_engine_side.png) | `train_ramp_or_car.glb` 是标准客车车厢，两文件用途互换 |
| 3 | [`inspections/upright_check_5fbx_models.png`](inspections/upright_check_5fbx_models.png) | 五个模型实际都立在地面上，**不要再加 +90° 旋转** |

其余截图（`glb-previews/` 内 1 张、`inspections/` 内 2 张为上一版 Blender 出图）画面偏暗、构图偏小，**不建议作为判据**。

---

## 8. 本文档不做什么

- 不修改任何 GLB、贴图或游戏代码；
- 不定义碰撞体、不新增道具机制、不替代美术验收；
- 不为「无骨骼」资产提供程序化动作替代——那是资产缺口，需要正式动画或重新绑定；
- 不把解析结果、图集推断或概念原画表述为「已验收」。
