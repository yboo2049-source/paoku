# 已交付 GLB 3D 资产结构化审查与交接说明

> **文档版本**：1.0.0  
> **基线提交**：[`622e7da`](https://github.com/yboo2049-source/paoku/commit/622e7da) (main 分支)  
> **受检资产**：`public/models/` 共 22 个 `.glb` 文件（含 21 个 622e7da 新交付模型 + 1 个历史 player.glb）  
> **机器可读元数据清单**：[`docs/assets/glb-manifest.json`](glb-manifest.json)  

---

## ⚠️ 核心核验发现与接入避坑警告（主 Agent 必读）

在正式将模型接入 `src/render/babylon.ts` 前，请务必注意以下三项经本地真实引擎验证的重大事实：

### 1. 列车资产内容与文件名完全对调
- **`train_metro.glb`**：**实际为带黄色长坡道的工程爬坡车（Ramp Train）**！前端有延伸至地面的黄色防滑斜坡，用于跑上车顶。
- **`train_ramp_or_car.glb`**：**实际为标准复古现代地铁车厢（Standard Metro Train）**！带有双车灯、挡风玻璃与平车顶，正面为致死碰撞。
- *接入要求*：代码引用时需交换变量指向，或在配置层明确映射，切勿仅凭字面名称绑定！

### 2. 622e7da 新交付的 21 个 GLB 均为静态网格（Skins:0, Animations:0）
- 所有 21 个新模型（包含 `character_runner.glb`、`character_police.glb`、`character_dog.glb`）**均无骨骼蒙皮与骨骼动画**。
- *接入要求*：若要作为跑动角色，需在 Babylon.js 逻辑层通过代码正弦波/程序化位移模拟颠簸摆动；原有带骨骼动画的只有历史基线资产 `player.glb`（含 67 关节、7 个 Mixamo 动画）。

### 3. FBX 转换模型存在局部轴向旋转（躺平于 Z 轴）
- `obstacle_slide_barrier.glb`、`obstacle_utility_box.glb`、`prop_jetpack.glb`、`prop_mystery_box.glb`、`prop_sneakers.glb` 共 5 个由 FBX 转换而来的模型，包围盒 Z 轴全为负数（-1.0 到 0），**模型在世界空间处于“平躺/倒置”状态**。
- *接入要求*：进入 Babylon 场景容器时，**必须在父级 TransformNode 施加 X 轴 +90 度旋转校准**，绝不可直接放置。
- **原始静态包围盒不能直接当米制物理碰撞代理**，必须按下方规格配置独立的简化 Box/Cylinder 碰撞盒。

---

## 📋 全量 22 款 GLB 资产交接速查表

| 文件名 | SHA-256 (前8位) | 大小 | 面数 / 顶点 | 真实内容与建议用途 | 标定/旋转状态 | 关键已知问题与接入要求 |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| **`character_runner.glb`** | `0f475ed2` | 7.72M | 26k / 26k | 主角跑酷少年手办 | 原点在身躯中点，高0.42 | 静态无骨骼；需放大4.28倍对齐1.8m高，底对齐Y=0 |
| **`character_police.glb`** | `ca0b85b1` | 14.11M | 147k / 228k | 追捕卡通警官手办 | 原点在脚底，高0.98 | 静态无骨骼，面数较高；需放大1.95倍至1.9m高 |
| **`character_dog.glb`** | `43a53514` | 2.23M | 10k / 9.5k | 追捕卡通警犬四足 | 原点在四足着地面，高0.91 | 静态无骨骼；需缩放至0.65单位，代码模拟颠簸跑动 |
| **`player.glb`** | `48f9ecf4` | 2.79M | 49k / 28k | 旧版科幻发光骨骼装甲 | 历史Armature绑定，高1.81 | 含67关节/7动画；缺跳/滑动作回退agree，风格不搭 |
| **`prop_coin.glb`** | `b6048d3d` | 1.71M | 9.8k / 8.2k | 纯金奔跑者徽章金币 | 原点在底部切线，直径1.0 | 原点非圆心；需缩放至0.45并在挂载点偏移Y-0.5实现自转 |
| **`prop_magnet.glb`** | `2173cef9` | 7.65M | 115k / 91k | 洋红U型吸金磁铁 | 原点在底部，高0.98，宽0.81 | 需缩放至0.5单位，开口微倾朝上悬浮自转 |
| **`prop_hoverboard.glb`** | `2e35d1da` | 11.29M | 117k / 78k | 赛博流线型磁浮滑板 | 长轴沿X轴 (长0.98, 宽0.37) | **长轴横置**；作为脚下载具需绕Y轴旋转90度朝向+Z |
| **`prop_sneakers.glb`** | `e0e61648` | 2.92M | 10k / 11k | 薄荷绿高帮厚底跑鞋(双只) | FBX转换，Z向负值，宽1.0 | 轴向有偏移，成对模型不能直接作为单脚穿戴，缩放0.5 |
| **`prop_jetpack.glb`** | `54ac8501` | 2.24M | 10k / 8.2k | 双筒黄色火箭喷气背包 | FBX转换，沿Z躺平，长0.99 | **沿Z轴躺平**；必须绕X轴旋转+90度使喷管朝下，缩放0.45 |
| **`prop_multiplier_2x.glb`**| `4c72cbba` | 10.25M | 118k / 93k | 菱形金边“2X”得分牌 | 原点在底边，尺寸0.98x0.95 | 原点非中心；需缩放至0.5单位并偏移中心自转 |
| **`prop_shield.glb`** | `22667c31` | 10.57M | 114k / 108k | 六边形力场青蓝能量晶球 | 原点在底面，球径约0.7~0.98 | 护盾罩需放大至2.2单位并上移Y+1.0使其包裹角色胸膛 |
| **`prop_mystery_box.glb`** | `5cda16b1` | 2.08M | 9.0k / 8.7k | 木质包金“?”问号宝箱 | FBX转换，Z向负值，长1.0 | 轴向微倾需对齐水平；合拢模型无开箱骨骼动画 |
| **`train_metro.glb`** | `721bb182` | 2.58M | 9.0k / 11k | **带黄色长坡道爬坡工程车** | 长轴沿X轴 (长1.0, 宽0.32) | **【与ramp对调】**需Y轴旋转90度正对玩家；禁止用AABB碰撞 |
| **`train_ramp_or_car.glb`**| `b561449f` | 11.30M | 112k / 114k | **标准青绿复古地铁列车** | 长轴沿X轴 (长0.98, 宽0.38) | **【与metro对调】**需Y轴旋转90度迎面玩家，配置致死正面盒 |
| **`env_gantry.glb`** | `88be31b7` | 9.51M | 110k / 130k | 跨轨工业钢管桁架龙门架 | 跨度沿X (0.98)，高0.67 | 原始尺寸偏小；需放大横向跨度至7.5m以跨越三条轨道 |
| **`env_tunnel_arch.glb`** | `353a5b37` | 17.19M | 130k / 232k | 霓虹发光圆角通透隧道门 | 宽0.86，高0.98，深0.85 | 已重绘100%全通透门洞；放大覆盖三轨，仅门框设碰撞 |
| **`obstacle_hurdle_barrier.glb`**|`4f8d4756`| 2.77M | 8.9k / 10k | 金属工业闸门/矮路障 | 宽1.0，高0.76，厚0.27 | 实际为金属单轨闸门非木跨栏；高度0.76m仅支持起跳飞跃 |
| **`obstacle_slide_barrier.glb`** |`471b24a3`| 2.98M | 9.7k / 8.7k | MAX HT 2.5M限高下滑门架 | FBX转换，**立柱躺在Z轴** | **【严重躺平】**必须绕X轴旋转+90度立起；顶部横梁设阻挡 |
| **`obstacle_signal_light.glb`**| `7189e914` | 9.83M | 117k / 78k | 细长铁路三色凸透镜信号灯 | 竖直沿Y轴立起，高0.98 | 柱身太细(0.2m)防穿模需加粗碰撞盒；建议放大至3.5m高 |
| **`obstacle_utility_box.glb`**| `8c3526dc` | 1.83M | 9.4k / 8.3k | 灰绿带百叶窗电气机柜 | FBX转换，**高度躺在Z轴** | **【躺平】**需绕X轴旋转+90度正立，缩放至1.2m高单轨障碍 |
| **`obstacle_buffer_stop.glb`**| `6da940e0` | 11.48M | 116k / 99k | 铁轨死路终端防撞缓冲墩 | 宽1.0，高0.87，深0.87 | 完美匹配单轨宽度，直接配置全阻挡致死碰撞盒放置于死轨 |
| **`obstacle_traffic_cone.glb`**|`f4bc094be` | 7.23M | 119k / 79k | 亮橙方底座交通施工警示锥 | 方底0.97x0.97，高0.98 | 原始尺寸偏大；需等比缩放至0.5单位（高0.5m），半径0.2m |

---

## 🔍 推荐主 Agent 抽看的关键验证截图（最多 3 张）

为最大程度节省主 Agent 上下文与避免重复全量看图，推荐仅抽查以下 3 张具有判别性意义的引擎实际核验图：

1. **[`docs/assets/inspections/train_metro_actual_ramp.png`](inspections/train_metro_actual_ramp.png)**  
   *核查目的*：亲眼确认 `train_metro.glb` 确为黄色斜坡爬坡车，而非平头地铁车厢。
2. **[`docs/assets/inspections/train_ramp_actual_metro.png`](inspections/train_ramp_actual_metro.png)**  
   *核查目的*：亲眼确认 `train_ramp_or_car.glb` 确为标准复古地铁车厢，证明与前者完全对调的事实。
3. **[`docs/assets/inspections/obstacle_slide_barrier_inspect.png`](inspections/obstacle_slide_barrier_inspect.png)**  
   *核查目的*：确认限高下滑架的实际外观（MAX HT 2.5M 标志）、底部通透区以及躺平旋转轴向问题。

---

## 🛠️ 后续接入代码模式建议（供渲染子代理使用）

在 `src/render/babylon.ts` 接入时，建议采用以下标准模式包装所有静态 GLB：

```typescript
// 标准 GLB 资产包装容器工厂模式示例
function instantiateProp(glbMesh: AbstractMesh, scale: number, rotX: number, rotY: number, rotZ: number): TransformNode {
  const root = new TransformNode("prop_root", scene);
  glbMesh.parent = root;
  glbMesh.scaling.setAll(scale);
  glbMesh.rotation.set(rotX, rotY, rotZ);
  return root;
}
```

- **统一单根原则**：所有由 FBX 转换而来的模型及对调模型，一律挂在新的独立 `TransformNode` 根下，在其内部进行旋转与原点偏移，对外暴露纯净的坐标系。
- **碰撞体解耦原则**：逻辑层 `physics.ts` 保持纯数学米制 Box/Ray 检测，渲染层 GLB 仅作为视觉展示跟随物理刚体节点更新，切勿直接读取未标定的 GLB 顶点网格做碰撞！
