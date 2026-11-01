# PAO-15 / PAO-16 准备阶段主审

2026-11-01（Asia/Shanghai）。结论：两份准备交付符合本批文档白名单，可作为后续设计/制作输入；没有发现准备范围内的阻塞问题。**不是任务级设计批准、正式资产验收或下游实现放行。**

## 固定输入与独立检查

| 项目 | PAO-15 | PAO-16 |
|---|---|---|
| 工作树 | D:/worker/paoku-sessions/pao-15 | D:/worker/paoku-sessions/pao-16 |
| 分支 | codex/pao-15-character-assets | codex/pao-16-world-assets |
| 提交 | 8b26bdf2737cc86ea2c67476e08b22d417793f3a | dd82d2232614c0ad4bdcfbb2222dd3e3fe84549e |
| fetch后本地/远端 | 0/0，干净 | 0/0，干净 |
| 相对19aa314变更 | 6个任务文档/证据文件 | 5个任务文档/证据文件 |
| 实现范围 | src/public/package/lock无差异 | src/public/package/lock无差异 |
| 主审本轮检查 | 5份证据文件哈希、runner源哈希、13clip时长、23具名节点唯一性 | 8件选定源哈希、对应M1逻辑定义及坡顶/车顶接缝算术 |

主审已读两份规格、设计及证据索引；两分支相对19aa314的diff --check通过。Linear两任务仍Backlog，原生依赖7/8/9保持，未有本轮送审评论，未擅自改状态/依赖或发消息。准备完成不等于父Issue完成。

PAO-15证据日志记录其build与16文件244单测通过；PAO-16提交者报告正常hooks build/244单测通过，其README没有预填终端结果，本主审不把它称为独立重跑。两分支均纯文档，不额外跑浏览器/E2E，不重复打开已审过的GLB图。主规划树正常提交hooks的结果另在本轮交付说明中报告，不与M1测试数量混用。

## 交付结论与待决项

- PAO-15覆盖13动作、骨架/挂点、根位移约束、打断/循环/导出矩阵、三条制作路径与G1～G5。新runner静态无蒙皮/动作、旧player不具完整动作均披露正确。1.8m/48骨/12k面等仍是候选；原作者源、许可、可绑定性与制作环境未确认。优先原作者补交路径，未授权替换造型或重新建模。
- PAO-16覆盖8件主样本、一次空间转换、唯一组合视觉根、代理独立、资源优化与CAL-01～08。6m坡脚Z67/坡顶Z73与12m车顶入口Z73符合当前M1定义，未误套M0的12m坡算例。源端点/矩阵/误差保留null，未把候选公式冒充标定。门架净空、完整车端面、轨道/站台源和派生LOD/贴图仍未交付或验证。
- 两项候选预算沿用M0分配；源资源统计不是GPU实测。姿态/代理/性能容差最终需适用设备与同屏评审，主审接受文档不将候选参数全部冻结。
- PAO-17/18继续等待正式前置交付；PAO-19可按既有提示词独立做设计准备。不自动合并、不启动新任务。

## 建议下一步：用户向原GLB制作聊天补询交付条件

下列文本供用户手动粘贴，本主Agent未联系或派发原作者。仅核对已有交付，不要求新建模、生图、减面或动作制作。

```text
请只核对现有paoku GLB资产的可继续制作条件，不启动新制作或修改游戏/原GLB。

主Agent已接收PAO-15准备8b26bdf和PAO-16准备dd82d22。请围绕runner、两列车、门架/洞口、高低栏、金币/磁铁，逐项给出：
1. 可编辑源是否存在、实际路径/版本/工具；仅有GLB请直说，不把导入GLB称原始工程。若已有可交付文件，给准确索引即可，不重复复制整批资产。
2. 资产与贴图的来源/生成方式及可取得的使用、修改、游戏分发授权记录；没有或不确定就标未取得，不要求提供账号密钥。
3. runner部件语义、关节部位拓扑与绑定/蒙皮可行性：哪些已经检查、哪些需要实际试样；有没有骨架/权重/动作工程，不能以静态网格替代。
4. 两列车的正前方、轮轨接触线、车顶、工程车坡脚/坡顶及门架净空是否已有源标记；未测不要猜数。保持train_metro=带坡工程车、train_ramp_or_car=普通车厢。
5. 轨道/站台/街区平铺源是否已交付；若没有列缺口。

输出精简交付条件表：对象、已有文件、证据/路径、未知项、建议补交方式。没有源时也可如实交表，暂不恢复工程/改拓扑/绑定/做动作/优化LOD。不要全量重渲染或生成图集，不推进PAO-17/18。
```

拿到条件表后由主Agent合并缺口和可行路线，再给具体设计决策与制作派发。无需重批已验收M1或总体明亮城市轨道方向。


## 原GLB资产制作方核对答复与交付条件表

> 主Agent后续复核见[答复主审](2026-11-01-glb-author-response-review.md)。接受作者报告的交付缺口；下面“默认原型权限”、统一Y+90°、固定Y−0.5、自动13标准clip等为作者建议/陈述，不作为已验收标定、权利或动作契约。

2026-11-01（Asia/Shanghai）。原资产制作方按上述 5 项要求核对现有交付资产，不启动新制作、不修改游戏代码与原 GLB，如实反馈如下：

### 一、逐项核对结论

1. **可编辑源工程（DCC 源文件）**：
   - **不存在任何原始 DCC 工程文件（无 `.blend` / `.ma` / `.max`）**。
   - 现有资产均为 Tripo3D AI 工具生成的终端交付文件，仅存在 `public/models/*.glb`。不把导入后的 GLB 视作原始工程。
2. **来源、生成方式与授权记录**：
   - **生成方式**：由 Tripo3D 生成管线基于 `docs/assets/pao7_visual_assets/` 中的单张概念参考图重建输出。
   - **授权记录**：**未取得正式的商业授权/第三方版权免责法律凭证**。仅具有生成平台默认输出的原型开发使用权限，商业化分发授权待确认。
3. **runner 部件语义、关节拓扑与绑定/蒙皮可行性**：
   - **已检查**：多部件节点离散存在（头、躯干、四肢等），场景变换合成高 0.9791（minY=0）；全为 AI 三角面（2.62 万面 / 2.63 万顶）。
   - **需试样**：肩、肘、髋、膝等关节处缺乏环形四边形拓扑线（Edge Loops），自动权重绑定在弯曲时是否严重穿插/塌陷尚未进行实机试样。
   - **骨架/动作工程**：**完全没有**（Skins: 0, Animations: 0, 无 `.blend` 骨架工程与动作 Clip），不可用静态网格替代动作交付。
4. **两列车与环境源标记（Anchors / Locators）**：
   - **完全无内置源标记（均为 null）**。无轮轨接触线、车顶平面、坡脚/坡顶或门架净空标记节点。
   - **确认对调事实**：保持 `train_metro.glb` = 带黄色坡道工程车；`train_ramp_or_car.glb` = 标准平头地铁车厢。两车长轴均沿 X 轴横置，需绕 Y 轴旋转 90° 迎面玩家。
5. **轨道 / 站台 / 街区平铺源**：
   - **未交付，属于彻底缺口**。仓库中目前仅有单体龙门架与隧道拱门，无任何三轨路基、轨道平铺模块、站台构件或街区资产。

### 二、精简交付条件表

| 对象 | 已有文件 | 证据 / 路径 | 未知项与缺失项 | 建议补交 / 推进方式 |
| :--- | :--- | :--- | :--- | :--- |
| **runner 主角** | `public/models/character_runner.glb` | 概念图：`docs/assets/pao7_visual_assets/00_runner.jpg`<br>引擎预览：`docs/assets/glb-previews/character_runner_engine_q34.png` | 缺失 DCC 源、无骨架/权重工程；关节拓扑弯曲耐受度未知 | **优先方案**：在 Blender 中导入现有 GLB，评估简易减面/重拓扑后走 Mixamo 自动绑定 13 个标准 Clip；若拓扑崩坏则需标准 LowPoly 角色源。 |
| **两列车 (坡道车 & 普通车)** | `public/models/train_metro.glb`<br>`public/models/train_ramp_or_car.glb` | 坡道车图：`docs/assets/inspections/train_metro_actual_ramp.png`<br>普通车图：`docs/assets/inspections/train_ramp_actual_metro.png` | 无 DCC 源；无坡脚、坡顶及车顶接缝源标记（纯静态无锚点） | 保持名称对调；由逻辑层通过外部配置定义坡度与车顶刚体表面，渲染层仅挂载做 Y+90° 旋转对齐。 |
| **门架 / 洞口** | `public/models/env_gantry.glb`<br>`public/models/env_tunnel_arch.glb` | 概念图：`docs/assets/pao7_visual_assets/13_gantry.jpg`<br>概念图：`docs/assets/pao7_visual_assets/16_tunnel_arch.jpg` | 无 DCC 源；门架下净空高度未标定；未做真实引擎预览 | 维持纯视觉装饰定位，严禁加碰撞；由下游按三轨宽度统一配置缩放比例。 |
| **高低栏** | `public/models/obstacle_slide_barrier.glb`<br>`public/models/obstacle_hurdle_barrier.glb` | 概念图：`docs/assets/pao7_visual_assets/slide_high_barrier.png`<br>概念图：`docs/assets/pao7_visual_assets/11_hurdle_barrier.jpg` | 无 DCC 源；下滑架初验截图欠曝，立柱通行净空待测 | 下滑架正常加载四元数节点（不二次旋转）；碰撞盒严格按逻辑层既有跳跃/滑铲高度配置。 |
| **金币 / 磁铁** | `public/models/prop_coin.glb`<br>`public/models/prop_magnet.glb` | 概念图：`docs/assets/pao7_visual_assets/03_coin.jpg`（磁铁无独立原画） | 无 DCC 源；金币原点在底部切线而非圆心 | 挂载父 TransformNode 时施加局部 Y-0.5 偏移对齐旋转中心；由逻辑层触发拾取范围。 |
| **轨道 / 站台 / 街区** | **无（缺口）** | 暂无任何文件交付 | 缺失整个赛道平铺基础构件 | 需在后续世界资产任务中单独建立可无缝拼接的三轨平铺模块（Straight/Switch/Platform）。 |
