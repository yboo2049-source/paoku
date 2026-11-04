# HUD 动态安全区候选契约

2026-11-04，v0.1，待主 Agent 统一/用户批准。配套 [设计](../superpowers/specs/2026-11-04-pao19-hud-safe-area-bridge-design.md)；本文接口为设计文本，未写入生产 TypeScript，所有新矩阵均待执行。

## 1. 门面与候选值结构

建议中立纯值模块 `src/presentation/hudSafeArea.ts`。几何使用有限浮点数，不暴露 DOM、业务可写对象、Babylon 实例或存档字段。以下 TS 仅为可评审候选：

```ts
type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;
type Insets = Readonly<{ top: number; right: number; bottom: number; left: number }>;
type Page = 'MENU' | 'PLAYING' | 'PAUSED' | 'SHOP' | 'GAMEOVER';
type LayoutKey = Readonly<{
  producerId: string; epoch: number; layoutRevision: number;
}>;
type MeasureBasis = Readonly<{
  sampleFrame: number; // 应用表现帧计数，非模拟 tick/事实 eventId
  page: Page; runId: string | null;
  viewport: Readonly<{
    layoutWidth: number; layoutHeight: number;
    visual: Rect; visualScale: number; // visual 的 x/y 是 layout-client 偏移
  }>;
  canvasRect: Rect; // layout-client CSS px，canvas 绘制内容框
}>;
type Surface = Readonly<{
  id: string;
  kind: 'readout' | 'control' | 'powerup' | 'toast' | 'feedback' | 'card';
  edge: 'top' | 'none'; // 显式登记；不以任意坐标猜所属边
  clientRect: Rect; // 已裁到滚动祖先、可视 viewport、canvas 的可见交集
}>;
type UiLayoutSnapshot = LayoutKey & MeasureBasis & Readonly<{
  status: 'READY' | 'UNREADY' | 'RELEASED';
  profile: 'gameplay' | 'menu' | 'modal';
  modal: 'none' | 'dimmed';
  deviceInsets: Insets; // 解析后的设备安全边界；与 UI padding 分开
  surfaces: readonly Surface[];
  reason: string | null;
}>;
type CanvasLayout = LayoutKey & Readonly<{
  page: Page; runId: string | null; sampleFrame: number;
  status: 'READY' | 'UNREADY' | 'RELEASED';
  profile: 'gameplay' | 'menu' | 'modal'; modal: 'none' | 'dimmed';
  width: number; height: number; // canvas 局部 CSS px
  safeInsets: Insets; // 设备安全矩形与 visualViewport 的可见交集换算
  reservedRects: readonly Rect[]; // 局部 CSS px，不含全屏 dimmer
  framingInsets: Insets; // 明示策略的保守构图包络，不能混称真实占区
  reason: string | null;
}>;
```

UNREADY/RELEASED 的尺寸/数组不得使用；可设零和空数组作可序列化占位，但不能被解释为“无 UI、safe”。候选原因集：NOT_MOUNTED、ZERO_CANVAS、NO_VISIBLE_CANVAS、DIRTY、INVALID_RECT、UNSUPPORTED_TRANSFORM、STALE_LAYOUT、DISPOSED；相机最终投影另报 FRAMING_CONFLICT/NO_SAFE_REGION/frozen，不能混为量测失败。

建议追加 `UIManager.measureOcclusion(basis): UiLayoutSnapshot`、`subscribeLayoutInvalidation(listener): unsubscribe`；listener 仅通知 dirty/释放，不在回调里量测。measure 由唯一应用帧读阶段调用，仅 READY 时复制冻结值；缓存读取不碰 DOM。候选 `resetLayout()`、`disposeLayout()` 只管理本桥租约及新增资源，不清命令重试或业务事务。UI 重建/应用销毁负责调用；现有 UIManager 没有完整 dispose，不能假称已有全部清理门面。

renderer 候选 `setHudSafeArea(layout: CanvasLayout | null)`；null 解除本桥覆盖，保留宿主原 presentationOptions。状态/revision 由这个外围入口处理，CameraInput 继续沿用固定 18 的形状。所有命名均待 Dispatcher 冻结，不从 I-18U 文档推断已有实现。

## 2. 登记和可见性

| 已验收节点/绘制面 | 登记粒度 | 排除/裁剪 |
| --- | --- | --- |
| `.hud-badge` 两块分数/金币卡 | 各自整个实体卡，edge=top | 不登记 `.hud-top-bar`/`.hud-readings` 的透明空白，不重复登记内部图标文字 |
| `.speedometer-wrap` | 整个实体速度卡，edge=top | 动态进度条只是卡内内容，不另占区 |
| `#audio-toggle-btn`、`#hud-pause-btn` | 各自可见控件框，edge=top | 禁用仍绘制，仍占区；透明按钮图案也按控件绘制边界保守登记 |
| `#hud-buffs .buff-pill` | 各道具实体，稳定 id 按道具语义登记 | 裁到 `.buffs-wrap` 的滚动视口；空容器和项间空隙不占区；不能登记整个全屏 HUD |
| `.cyber-toast` | 当前唯一可见 Toast 的实际框 | 它是 container 下的兄弟节点，不能只扫描 ui-layer；排队但无 DOM 的通知不登记 |
| `.hud-feedback` | 非空且绘制的整个背景面 | 有背景时按父面登记，不只登记错误红线；空反馈 display:none 不登记 |
| 活动 `.ui-screen .ui-card` | 整个不透明可见卡片 | 包括卡内空白/滚动区域；不把 scrollHeight 当屏幕高度；内部按钮/错误/文字去重 |
| `.ui-screen` 遮罩 | modal 语义 | MENU 透明屏幕不登记；暂停/商店/结算半透明全屏遮罩不作普通 reservedRect |

登记在 UI 建立和已知动态项替换时维护；不全库扫描、不按文字反推角色。只对本 UI 所有的节点注册，不读取调试面板/其他聊天产物。Surface id 可固定为 score/coins/speed/audio/pause、powerup 的枚举、toast、hud-feedback、page-card，禁止直接把任意用户文案作为标识。

可见性规则：

1. 未连接、display:none、hidden（且实际样式隐藏）、visibility:hidden/collapse、祖先 opacity=0 或无有效绘制盒时不占区。不能只看 offsetWidth 或 aria-hidden；inert/aria-hidden 本身不决定视觉遮挡。
2. 只登记已知有背景、边框、文字或控件绘制的面；全透明结构容器不登记，有文字的透明控件仍登记。祖先 opacity 在 0 与 1 之间时仍保守占区；阈值不用于提前放过淡出物。
3. 取 border-box 轴对齐边界，沿实际 overflow 裁剪祖先逐层求交，再与 visualViewport 和 canvas 绘制框求交。圆角按矩形保守占区，不做像素 mask。overflow 的裁剪轴分别处理；滚动不等于隐藏整个元素。
4. 不透明卡本身的可见框全部占区，即使其内容只滚出一个按钮；透明道具滚动容器只保留实际可见 pills。裁完无面积才移除。阴影不作为无限扩张矩形。发布的 clientRect/reservedRects 保留原始可见边界；消费时统一向外扩一次候选 4 CSS px 可读间隙，再裁边，焦点轮廓超过它时取实际样式扩张。top 包络也只从原始底边加这一次间隙，不能在已扩张矩形上再加。
5. 模态上方被卡片盖住的 HUD 不要求做复杂矩形减法，可保守保留底层 HUD 作为诊断；profile=modal 禁止驱动普通避让。这不等于把全屏容器当实际 HUD。精确 z-order 差集另行评估。
6. 转场元素直到视觉退出才退休；显现期也登记。位置变换持续期间每帧合并采样一次，结束补采样；快照原子替换。首批已验收 UI 无需新增转场。

## 3. 坐标契约与唯一换算

所有 clientRect、canvasRect、viewport、env 解析值均为 **CSS px**，x 向右/y 向下，以 layout viewport 左上为共同基准；不使用 pageX/screenX，不加 window.scrollX/Y。canvasRect 必须是绘制内容框；当前 canvas 无 border/padding，未来引入时须扣出内容框，不能直接把 border-box 当图像。DOM bounding box 包含适用变换，但首批只支持正向轴对齐平移/缩放。

visualViewport 存在时：V=(offsetLeft,offsetTop,width,height)，scale 单独记录；不存在时 V=(0,0,documentElement.clientWidth,documentElement.clientHeight)，scale=1。其偏移用于构建可见裁剪区域，**不再对每个 DOM rect 减一次 offset**。CSS→canvas 只减 canvasRect 原点；pinch scale 不再乘到 CSS 坐标，不能连同 DPR 重复放大。浏览器页面缩放会改变实际 CSS 视口与 buffer 比率，必须重新采样。[CSSOM View 的矩形与 VisualViewport 定义](https://drafts.csswg.org/cssom-view/)是 API 依据；具体跨浏览器行为仍在 F 矩阵验证。

记 C 为 canvas 绘制内容框、R 为已裁剪绘制面：

```text
Rvisible = intersection(Rborder, clippingAncestors, V, C)
xCSS = Rvisible.x - C.x; yCSS = Rvisible.y - C.y
wCSS = Rvisible.width; hCSS = Rvisible.height
sx = renderWidth / C.width; sy = renderHeight / C.height
xBuffer=xCSS*sx; yBuffer=yCSS*sy; wBuffer=wCSS*sx; hBuffer=hCSS*sy
```

前两行由应用边界纯归一化，最后两行由 renderer 同帧、当前 engine 宽高适配；两处各做本阶段的一次转换。DPR 只用于记录，不直接乘，hardwareScaling/引擎缩放以实际 sx/sy 为准。CameraInput 的 width/height 必须与所有 rect/insets 同为 buffer 单位，不用现有 Partial 展开混合 CSS 与 buffer，也不让迟到 options.width 覆盖新 engine 宽度。

假设验算（**非浏览器实测**）：C=(30,20,390,844)，Rvisible=(46,44,100,48)，buffer=780×1688。局部 CSS=(16,24,100,48)，buffer=(32,48,200,96)。DPR=1 且 buffer390×844 时仍是(16,24,100,48)。若 visualViewport.offsetLeft=10，且 R 完整落在 V 内，不把 xCSS 再变成6。若 buffer 与 CSS 非等比，按实际 sx/sy 换算并记录比例/相机 aspect 不一致；超过渲染尺寸舍入容差时 unavailable，先等 resize 配套完成，不改人物补偿。

设备安全区：UI 拥有一个不显示、不交互的探针，用 `padding-*:env(safe-area-inset-*,0px)` 的 computed px 值读取；不能 parseFloat 未展开的 `env(...)` 自定义属性。探针与尺寸同批读取，不把业务卡片已有的 16/24px padding 当 inset。设备安全矩形 D 以同一 layout viewport 基准收缩；有效边界 Q=C∩V∩D。换为局部：left=Q.left-C.left、top=Q.top-C.top、right=C.right-Q.right、bottom=C.bottom-Q.bottom，均 clamp≥0。Q 空则 NO_VISIBLE_CANVAS。设备 inset 的归属和 pinch/软键盘下 D 的浏览器语义列入待验证，不能保证刘海真机已适配。[CSS env 安全区定义](https://drafts.csswg.org/css-env-1/#safe-area-insets)仅提供边界语义。

HUD 的 rect 已包含它自身为避刘海施加的 padding 位移，不再把 env 加到它的 x/y。safeInsets 与 HUD 包络按 max 合并，不能相加重复扣除。仅 edge=top 的实际可见面参与候选 top 构图包络；侧列 buff/toast/卡片保持 reservedRects，不把中间大片空白扩为整边。

## 4. revision、原子性与可用状态

| 字段/状态 | 规则 |
| --- | --- |
| producerId | 每个 UI 构建实例唯一；替换后旧实例永远不能覆盖新实例 |
| epoch | 同实例 reset/重建登记时递增；取消旧异步任务。它不是 runId、命令 ID 或事件序号 |
| layoutRevision | 同 epoch 语义页型、模态、基准、可见面集合/数值或可用状态变化时单调递增；相同值不涨。排序按稳定 id，不按 observer 到达顺序 |
| READY | 已挂载、有效同批量测、所有必要面有效、基准一致；不等于投影 safe |
| UNREADY | 首帧、dirty 未重新量测、非法输入、不可见/零 canvas、后台恢复或基准不一致；撤销旧 READY 租约，不把空数组当无障碍 |
| RELEASED | reset 旧 epoch 或 dispose 终态；退订后重复释放无副作用；旧回调无权重新 READY |

每次失效同步撤销可用性；revision 变化在原子快照提交时发生，不按每帧计数。sampleFrame 每次实际采样记录，可与 revision 不同。抑制细微浮点抖动使用候选向外量化 1/64 CSS px：左/上向下、右/下向上；对量化后的完整内容比较，不因微移漏出遮挡。量化误差纳入 4px 间隙，具体数值待批。

应用只接受当前 producer/epoch 的值；同 revision 重送须内容相同，否则 INVALID_RECT/协议诊断。新旧不同实例不能单凭 revision 大小排序，由显式订阅租约切换决定。页面/runId 必须匹配本次应用快照。renderer 尺寸变化也使适配缓存失效，即使 DOM revision 未变；结果诊断绑定 `(producerId,epoch,layoutRevision,renderWidth,renderHeight,renderFrame)`。

同帧顺序：采同次 AppSnapshot/展示视图→UI 写和 dirty→读阶段采 canvas/viewport/env/各绘制面→校验并复制值→应用归一化→renderer 读当前 buffer、适配、调用相机并记录最终投影。任何关键基准在这期间失效，拒用该样本，不拼两页 rect。异步字体/observer 在读阶段后到达时，下一帧先采样；当前帧 diagnostic=DIRTY，不宣称安全。

## 5. 失效源与资源归属

| 失效源 | 所有者和合并方式 |
| --- | --- |
| 页面、HUD数值换行、道具添加/移除/秒数宽度、Toast出现/替换/消失、错误/等待文案 | UI 在真实 DOM 写变化时置 dirty；不因无变化的 update 每帧失效 |
| 节点/容器尺寸变化 | UI 单一 ResizeObserver 观察登记绘制面/必要裁剪容器；回调只置 dirty，避免 observer 写读循环 |
| 滚动、details 开合、转场 | UI 仅监听所拥有的 scrollports、toggle、transition/animation 生命周期，必要时捕获祖先 scroll；合并为下个读阶段一次 |
| 焦点轮廓、按钮按下位移等CSS交互态 | UI 所有控件的 focusin/out、pointer/键盘状态变化只置 dirty；覆盖现有 active 的1px位移，不新增游戏输入处理或修改按钮行为 |
| canvas尺寸/容器定位、window resize/旋转、visualViewport scroll/resize | 应用边界管理；canvas/相关布局祖先观察和外部宿主显式 invalidate 覆盖“位置变而尺寸不变”；不能仅靠 ResizeObserver 检出偏移 |
| 字体首次就绪和后续加载 | UI 的 document.fonts.ready / loadingdone / loadingerror，只置 dirty，晚到先验租约；未支持字体 API 时保留 resize+显式内容失效 |
| visibilitychange / 页面隐藏恢复 | 应用边界停量测；恢复先 UNREADY，重新读后 READY，不追跑表现/模拟时间 |

ResizeObserver 的交付可与布局循环相关，不拿回调顺序当游戏帧锁；[规范](https://drafts.csswg.org/resize-observer/#delivery-of-resize-notifications)支持只作失效来源的安排。只注册必要集合，不扫整 DOM，MutationObserver 不是必需依赖；未知宿主位移需显式 invalidate，而不是每 render 全量强制布局。

UI 的新增监听、observer、探针和一次性采样任务均归布局租约；应用只拥有 canvas/viewport 监听和 producer 订阅。resetLayout 取消旧epoch任务，重新登记并 UNREADY；disposeLayout 断开 observer、移除事件/探针、取消待排读任务、一次 RELEASED 后清订阅。Promise 不能取消时以 producer/epoch/disposed 守卫丢弃结果。重复 reset/dispose、dispose后measure/subscribe 应返回明确不可用/空退订，不复活实例。对旧 UI 其他监听的全面治理不默认扩围。

## 6. 页面消费和现有相机能力边界

只有 gameplay 的 READY 样本进入动态 safeArea/reservedRects。设备/可视 safeInsets 与 top 包络 max 合并后，再按当前 buffer 比例转换；CameraInput.reservedRects 使用消费时只扩一次间隙的矩形，外围诊断同时保留原始面，区分实际遮挡与间隙冲突。modal 标志独立于 ui-screen 的全屏矩形，不能将其作为相机无解区域。

暂停/结算严格保持 rig 变换和 time/dt 状态，renderer 可以利用固定 18 已导出的 projectActors 计算新 aspect 下的投影诊断；不得以一次 dt=0 的 sync 假定“不会动镜头”（现有 sync 也会求解/初始化）。MENU/SHOP 和 modal 的卡片仅作诊断，不启用新的菜单重构图。camera 已冻结而 resize 改变投影时，以 frozen+safe/conflict 如实报告；恢复 PLAYING 后先取新布局，才继续原 rig 的既有表现。

空间无解时保留相机原有有界算法和最终 pose，如实报 conflict，不额外推进迭代或改 actor/追逐距离/字号。首次 UNREADY 保持既有初始 pose，后续 UNREADY 保持当前 pose；这期间不能报通过布局/可见性验收。只有未启用新桥的旧 UI 宿主走 legacyHudProfile。setHudSafeArea(null)/释放只清本桥覆盖，不覆盖已有 reducedMotion，也不复活旧页矩形。

## 7. 待 Dispatcher 冻结的接缝

- 中立模块和门面最终名称；renderer 租约是否由唯一宿主注入；禁止与 PAO-18 事件桥命名/共享入口写权冲突。
- 批量读阶段与既有 main render 顺序的精确位置；只在获批独占窗口实施。
- top 构图包络、4px 间隙、向外1/64px量化；任意矩形仅检测的限制如何进入验收口径。
- 首帧/过期保持 pose、菜单/模态只诊断、暂停 resize 不动 pose 的产品边界；需要新 solver/菜单取景时另提请求。
- visualViewport/env 在目标浏览器与真机的坐标实测；不先承诺所有 pinch/系统刘海形态。

没有待决项要求本轮重开 PAO-19 原 UI 或修改任务状态；更不要求重批 M1/总体方向。批准设计后才允许 writing-plans 和生产白名单解锁。

## 8. 后续 RED 与验收矩阵（全部待执行）

以下是**预期失败断言/测试建议，不是已经运行的 RED**。当前基线没有新门面，接口/几何测试应先以缺能力失败；已有不变性用例可能本来已绿，须如实保留。建议单测命令分别为 `npx vitest run tests/unit/pao19-hud-safe-area.test.ts` 和 `npx vitest run tests/unit/pao19-hud-camera-adapter.test.ts`；浏览器追加到 rebuild-ui.spec.ts，在批准后的独占服务配置上执行。不得本轮创建测试或实验。

| ID / 层次 | 输入/流程 | 必须先写的失败断言与后续证据 |
| --- | --- | --- |
| H01 F / 纯值 | canvas偏移(30,20)、DPR1/2、buffer缩放非DPR；visual偏移/scale | 本文数值例正确；只减一次 C 原点；scale不重复乘；混合单位拒绝；保存转换前后值 |
| H02 F / DOM | 桌面1440×900/1280×720、390×844 HUD | 卡片/按钮/速度完整登记；不登记全屏透明容器和间隙；DOM rect与发布交集一致 |
| H03 F / DOM | 15位数字、200%字体、0→4道具、倒计时位数变化 | wrap/尺寸变化产生新revision；未变缓存不涨；道具增减和可见滚动裁片完整，不只数按钮 |
| H04 F / DOM | Toast突发队列、显示/消失、短/长错误、等待反馈 | 只登记可见Toast；兄弟节点不遗漏；空反馈不占区，有背景按整个面；不改变原队列/音频/重试事务 |
| H05 F / DOM | display/visibility/opacity0、半透明转场、inert背景HUD、focus/pressed | 隐藏不占区、半透明仍占区、inert仍绘制；按下位移/轮廓失效；卡片去重；转场结束清旧面；未稳定不截验收图 |
| H06 N / 页面 | 开始→商店→返回→真实开局→暂停→继续→失败结算→重开 | profile/页型匹配；菜单重访不复用旧lease；完整流程原commandId/音频/暂停屏障断言保留 |
| H07 F / 布局 | 844×390/568×320短横屏；390↔844旋转，含暂停 | canvas/visual变化先失效；暂停pose/time不变，诊断可更新，恢复不用旧比例；空间无解明示 |
| H08 F / 安全区 | inset0与top47/bottom34、横屏左右44；canvas不贴原点 | env和padding不双扣；Q求交正确；buffer比例一致；记录实际CSS viewport/样本，不冒称真机 |
| H09 F / 滚动 | 390开始底卡音频滚动、商店/结算卡、道具侧列 | 实体卡始终登记可见全框；pills只取裁剪交集；滚到最后控件后仍同批正确，无整张scrollHeight矩形 |
| H10 F / 生命周期 | UI重建、reset两次、dispose两次、晚到font/observer/读任务 | 旧producer/epoch不能覆盖；新实例首帧UNREADY；订阅/探针归零，不重开命令/业务租约 |
| H11 F / 非法输入 | NaN/Infinity/负尺寸、零canvas、脱挂、空可视区、unsupported transform | 整批UNREADY/明确reason；不丢坏矩形后报safe，不传非法量到CameraInput，无无限重试 |
| H12 F / 调度 | 同帧多失效、读后再dirty、后台恢复、外部容器只移位置 | 每帧最多一次成批读；稳定render无DOM测量；迟失效不能混页/基准；恢复先采样，不补模拟步 |
| H13 F / 真投影 | 新旧角色加载状态、三实体bounds、最大HUD/侧道具/Toast | 最终投影与同revision矩形真实相交检查；safe才断言三实体可见；现有solver解不了须conflict，不以输入已传入判通过 |
| H14 F / 模态和无解 | MENU/PAUSED/SHOP/GAMEOVER、满屏模态、过大文字留不出空间 | full dimmer不驱动逃离；只诊断策略、冻结pose；冲突报告而非缩actor/藏犬/改距离；不假称菜单solver已有 |
| H15 N / 实际输入 | 桌面键盘与390 CDP touch开局/换道/跳/滚/暂停/返回 | 原交互可达且不穿透；桥只读不改变AppSnapshot/ctx、存档调用数或字段音频事务；正常流程截图 |
| H16 F / 集成释放 | 缺producer旧UI、激活新桥未READY、撤销新桥、reducedMotion | 旧profile仅明确兼容路径；新桥未ready不假报safe；null清覆盖不清原options，不残留modal页 |

DOM量测报告与相机真实投影/稳定截图报告分开，纯纸面验算不能代替其中任何一类。N 为新上下文真实输入、无QA业务写入；F 的长数值、布局、存储/延迟、投影固定状态和只读诊断均标明，不伪称自然成绩。真实存储和原未知提交/命令回执回归不能删除。

未来总门禁：`npm run build`、`npm run test`、`npm run test:e2e` 全部通过，保留原全部断言/PAO-6已批准单行；5189先核空闲，strictPort/reuseExistingServer=false，不误连其他任务服务。逐项记录新桥源码raw身份、前后src hash、旧证据恢复；批量回归镜像/图留忽略目录。默认主审只看稳定桌面最大HUD、390最大HUD、暂停旋转诊断三张，异常才扩看；390菜单作为几何回归保留，不重做已关闭P2。截图等字体/模型及有限转场结束，诊断与实际使用布局身份对应。真机/系统手势/真实刘海未测另列，不能由模拟器签收。
