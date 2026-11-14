# PAO-20 ~ PAO-26（M2 收口、M3 全内容扩展与 M4 性能回归交付）总体设计与契约规范

日期：2026-11-07（Asia/Shanghai）
基线提交：`7d7d69c278db992ed7defec1256ad2cd437de975`（`codex/pao18-font-diagnosis`，已包含 M1 `PAO-10..14`、`PAO-17` 明亮城市轨道主题、`PAO-18` 角色动作/镜头/事实桥/同源字体与 `PAO-19` 中文响应式 UI/动态安全区同帧集成，353 项单测与 106 项 E2E 全绿）。
授权状态：用户已授予主 Agent 与 Subagent 全权自主决策、并行开发、门禁验证、提交与远程推送权限（`pao-15-roof-diagnosis` 车尾碰撞诊断工作树保持延期不动）。

---

## 1. 范围与模块边界

### 1.1 M2 收口：PAO-20 & PAO-21
- **PAO-20（统一动作、道具、列车反馈与音频生命周期）**：
  - 在 [`src/systems/audio.ts`](file:///D:/worker/paoku-sessions/pao-18-font-diagnosis/src/systems/audio.ts) 与新增 [`src/systems/feedbackLifecycle.ts`](file:///D:/worker/paoku-sessions/pao-20-21/src/systems/feedbackLifecycle.ts) 中统一动作（起跳、翻滚、切道、落地）、拾取（金币、四类道具）、道具状态变化（激活、刷新、到期、滑板护盾破裂）及迎面列车（`MOVING_TRAIN` 接近预警鸣笛与交会呼啸声）的视听反馈生命周期。
  - 实现严格的音频生命周期控制（`pauseAll()`、`resumeAll()`、`resetLifecycle()`、`dispose()` 与只读 `getDiagnostics()`），确保在暂停、恢复、结算、返回主菜单、进入商店、重开及页面隐藏/销毁时无残留振荡器、无残留定时器、无重复实例（满足 `R-08`）。
- **PAO-21（集成并评审完整可玩样板）**：
  - 在 [`src/systems/verticalSlice.ts`](file:///D:/worker/paoku-sessions/pao-20-21/src/systems/verticalSlice.ts) 中定义 60–90 秒确定性完整可玩样板路线与物理见证器（`VERTICAL_SLICE_SEGMENTS`、`runVerticalSliceWitness`），完整覆盖：启动与简单换道 → 跳低障碍/滑铲过栏 → 上坡接车顶 → 车顶跨越 → 落回轨道 → 躲避迎面列车 → 四类道具拾取与到期/护盾抵消 → 碰撞终局、幂等结算与重开。

### 1.2 M3 全内容扩展：PAO-22、PAO-23 & PAO-24
- **PAO-22（完成全部道具的机制、造型与反馈）**：
  - 范围严格限定在已批准的四项既有道具（`MAGNET`、`DOUBLE_SCORE`、`SUPER_SNEAKERS`、`HOVERBOARD`），不引入未授权的 `jetpack`/`shield`/`mystery_box` 玩法。
  - 在 [`src/systems/powerupCatalog.ts`](file:///D:/worker/paoku-sessions/pao-22-23/src/systems/powerupCatalog.ts) 与 [`src/render/entityViews.ts`](file:///D:/worker/paoku-sessions/pao-22-23/src/render/entityViews.ts) 中将道具 3D 表现从单一纯色方块升级为具备颜色与几何形状双重辨识度的多部件组合造型（U 型磁铁、双星倍分徽章、带翼弹簧跑鞋、流线型推进器滑板），全部子网格挂接在实例 `TransformNode` 下并复用 `SharedMaterials`，确保拾取/重置/销毁时零网格与材质泄漏。
- **PAO-23（扩展主题段落、路线变体与速度难度曲线）**：
  - 保留 [`src/data/trackSegments.ts`](file:///D:/worker/paoku-sessions/pao-18-font-diagnosis/src/data/trackSegments.ts) 的 4 个 M1 基线段落与 `pao13-track-v1` 不变，确保既有 PAO-13 单测与 E2E 门禁零破坏。
  - 新增 [`src/data/extendedTrackSegments.ts`](file:///D:/worker/paoku-sessions/pao-22-23/src/data/extendedTrackSegments.ts) 与 [`src/systems/speedCurve.ts`](file:///D:/worker/paoku-sessions/pao-22-23/src/systems/speedCurve.ts)，提供 6 个扩展路线段落（覆盖多道穿插、双车峡谷、站台冲刺、检修区坡顶跨越、高低复合栏与风险奖励道具分支）、3 类明亮城市轨道主题区段（`STATION_PLATFORM` 站台区、`STREET_RAIL` 街区轨道、`MAINTENANCE_YARD` 检修区）以及动态加速曲线 $V(t) = \min(18 + 0.25t, 45)$ 与相对反应窗口校验。
- **PAO-24（完成商店、设置、加载与任务成就全流程）**：
  - 新增 [`src/systems/progressionFlow.ts`](file:///D:/worker/paoku-sessions/pao-24-25/src/systems/progressionFlow.ts)，在不破坏 `MissionSystem`、`AppService`、`SaveRepository` 及 `UIManager` 既有契约的前提下，补齐任务中文本地化与进度摘要（`MISSION_LOCALIZATION`、`getMissionProgressSummary`）、首屏资源/字体/存档加载状态机（`LoadingStateController`）以及完整设置偏好（音频、低动态反馈 `reducedMotion`、画质档位偏好）管理。

### 1.3 M4 性能与最终交付：PAO-25 & PAO-26
- **PAO-25（真机性能、画质分档与首屏加载优化）**：
  - 新增 [`src/render/qualityManager.ts`](file:///D:/worker/paoku-sessions/pao-24-25/src/render/qualityManager.ts)，实现 `Q2`（桌面高画质）、`Q1`（移动基线）、`Q0`（低配兼容）三档画质参数及 `AUTO` 自动升降档控制器（遵循 PAO-8 §6：连续 3 个 5s 窗口 p95 超阈值降一档、30s 冷却、连续 60s 留有 20% 余量回升、手动锁档优先），并提供帧耗时分位数（`p50`/`p95`/`p99`）与场景资源统计传感器。
- **PAO-26（全局回归、视觉验收与迁移交付）**：
  - 在统一交付分支上完成 [`src/main.ts`](file:///D:/worker/paoku-sessions/pao-18-font-diagnosis/src/main.ts) 与 [`src/render/babylon.ts`](file:///D:/worker/paoku-sessions/pao-18-font-diagnosis/src/render/babylon.ts) 的串行接线，暴露完整传感器接口，通过全部单测、`npm run build` 与完整 Playwright E2E 门禁，采集并核验桌面（`1440×900`）与移动（`390×844`）真实截图，完成 `R-01 ~ R-10` 与 `AC-PRD-01 ~ 24` 验收矩阵闭环。

