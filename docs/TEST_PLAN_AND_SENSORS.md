# 测试用例与传感器计划 (Test Plan & Sensors)

## 2026-11-01 PAO-15 骨骼绑定探针

[探针设计](superpowers/specs/2026-11-01-pao15-rig-spike-design.md)检查源/派生hash、骨架层级/IBM、≤48关节/≤4归一化权重与覆盖、真实关节顶点变形、左右肩90°/肘120°/髋90°/膝120°和组合姿态、root固定、一次轴向/单位变换、DCC与Babylon一致。原文件不改、工具阻塞不当模型失败、单个诊断clip不当正式动作库通过。

专属tests/unit/pao15-rig-spike.test.ts与tests/e2e/pao15-rig-spike.spec.ts；新增工具代码按build/test/完整E2E及独立真实预览验收。只同屏一角色，试样资源上限与正式预算区分；2～3关键截图配姿势索引/短录屏，异常扩看。工具/完整回归镜像/旧图留忽略目录，服务独占5185，原src和历史证据hash核对。本轮只是派发准备，未运行或声称试样成功。

## 2026-11-01 PAO-19 已批准验证门禁

[授权执行计划](plans/2026-11-01-pao19-approved-execution.md)以943aad1的UI规格R01～R09为本批验收矩阵，旧历史UI直接存档等条款不作为新实现契约。测试限定tests/unit/pao19-ui.test.ts与tests/e2e/rebuild-ui.spec.ts，保留全部历史断言，先RED再实现。

- 投影/单位/四道具、有限Toast与文本安全、summary和保存反馈；精确pending/result、递延去重、旧run迟到、成功失败收尾、同ID未知提交重试与音频字段操作，禁止重复TOGGLE/结算。
- 真实输入N完整四页流程、触摸/键盘；保存失败/锁等待等F分报，保留PAO-14完整事务回归。
- 桌面/390竖屏及小屏横屏、字体200%、长数值/错误、四道具、安全区、焦点/命中范围与对比度，实际DOM量测和稳定截图；主审默认抽看2～3图，异常扩看。viewport-fit声明/模拟inset不代表真机签收。
- 阶段A接口/UI与阶段B main串行接线各自完整build/test/E2E，确认5189独占strictPort且不复用服务；源码身份/hash与历史证据恢复。当前仅设计批准，所有新运行时结论待执行，不引用旧244/43作本批成绩。

## 1. 静态类型护栏 (Static Guardrails)
*   **验证指令:** `npx tsc --noEmit`
*   **验收标准:** 必须 0 Error，任何类型推断不明确（any）都不被允许。每次关键节点（Checkpoint）必须通过此检验。

## 2. 核心逻辑单元测试 (Unit Tests via Vitest)
### 2.1 Input System Tests
*   **用例 1: 正常切道** 
    *   输入：`lane 1`, 向左指令。 断言：返回 `lane 0`。
*   **用例 2: 越界防御 (边界保护)**
    *   输入：`lane 0`, 向左指令。 断言：返回 `lane 0`，不抛错。
    *   输入：`lane 2`, 向右指令。 断言：返回 `lane 2`，不抛错。
*   **用例 3: 动作冲突**
    *   输入：在 `Jumping` 状态下输入 `Rolling`。 断言：优先取消跳跃，进入 `Rolling` 状态。

### 2.2 Collision System Tests
*   **用例 1: 完美碰撞触发 GameOver**
    *   构造数据：Player 与 Obstacle 坐标完全一致，在同一 Lane。
    *   断言：执行 Collision System 后，`GameContext.state === GameState.GameOver`。
*   **用例 2: 高度规避 (跳跃/下蹲)**
    *   构造数据：Player 与低矮障碍物在同一(lane, y)，但处于跳跃状态且 `player.z` 高于障碍物高度。
    *   断言：不触发 GameOver。
*   **用例 3: 金币收集**
    *   构造数据：Player 与 Coin 碰撞。
    *   断言：分数增加，金币的 `isCollected` 标志变为 true。

## 3. 视觉传感器 (Debug 面板)
*   在前端页面左下角固定 `<pre id="debug-panel">`。
*   **输出内容 (每帧 JSON.stringify):**
    *   `FPS`
    *   `Game State (Menu/Playing/GameOver)`
    *   `Player State (lane, z, Action)`
    *   `Entities count` 

## PAO-6 现状基线采集计划（2026-10-31）

范围仅为真实浏览器试玩、固定场景截图录像、旧功能和存档盘点，不修改游戏实现。自然输入局与 QA 固定场景分开记录；固定场景可使用现有 QA 传感器和浏览器内的生成器夹具，必须披露，不作为随机路线自然可达性的证明。

采集菜单、商店、开局、换道、跳跃、滑铲、坡接车顶、四种道具、暂停/恢复、失败/重开及移动端模拟。保存 console/pageerror/requestfailed、传感器快照、设备/浏览器/分辨率和步骤至 docs/evidence/PAO-6；测试脚本位于 tests/e2e，报告补充于本节。发现旧版问题仅登记，不在 PAO-6 修复。证据按普通输入、夹具实测、静态代码事实、推断/待验证分类。

## PAO-6 实测报告（2026-10-31，Asia/Shanghai）

### 范围、环境与证据等级

本轮只执行 [PAO-6](https://linear.app/paoku-v1/issue/PAO-6)。对照基线提交 `fa9d67b`，未修改游戏实现、资产或依赖。读取 AGENTS.md、PRD、整体重构设计和测试规范后采集；旧版缺陷和设计差异仅登记，不实施 PAO-7 至 PAO-26。

设备：Windows 11 专业版 10.0.26300，Intel i5-12400，约 32 GiB RAM，NVIDIA GeForce GTX 1650。浏览器：Playwright Chromium 151.0.7922.34（headless，真实 WebGL 页面）；实测 renderer 为 ANGLE NVIDIA D3D11。桌面 1440×900、DPR 1；竖屏 390×844 为同一桌面浏览器的 viewport/CDP 触摸模拟，不是手机真机。夹具视频以 960×600 编码，手机录像有留边；自然局录像 1440×900、25fps、75.72 秒，无音轨。未测帧时间/加载/长跑内存，也未人工听音，不宣称达到 60fps 或音频品质验收。

- **N（自然输入实测）**：新浏览器上下文，无 QA 模式，无写传感器，仅 UI 点击/键盘和只读传感器。随机生成器未设种子，具体路况不可逐帧重放。
- **F（固定夹具实测）**：现有 QA 门控 + 浏览器内临时替换 spawner.update 注入已知实体数组，使用真实键盘/CDP touch；未改磁盘实现，未启用 godMode/额外免死。证明具体几何和机制路径，不证明随机生成可达性。护盾产生的免死帧是游戏效果。
- **S（静态事实）**：代码只读盘点，不能写成已试玩通过。
- **H（观察/推断/未测）**：主观视觉观察、风险和后续待验证，不能当成已复现故障或冻结的新规格。

### 自然输入步骤与结果（N）

1. 打开 `http://127.0.0.1:5174/`，等待传感器和菜单稳定；进入商店，再返回。
2. START RUN → A 左换道 → D 回中道 → W 起跳；传感器读到 lane=0，再回 lane=1，跳跃 y≈0.97。
3. 空中 S 下滑，随后 Escape 暂停；记录到 isJumping/isRolling 同时为 true 的瞬间，随后落地且滚动持续。此为当前行为，不据此宣称缺陷。
4. RESUME RUN 后保持中道，无后续规避输入，最终 GAMEOVER：z≈198.67、score≈19.87（界面19）、金币22。该数值仅本次随机局；失败具体实体类型未由自然局传感器输出，不能凭画面猜定。
5. REBOOT & RUN AGAIN 后 score=0、coins=0、speed=18、位置归零；暂停回菜单。
6. MUSIC 和 SFX 均从 ON 切 OFF，刷新页面，读取最高分19、总币22以及音频开关 OFF 的存档值。

截图 `evidence/PAO-6/01-menu.png` 至 `08-natural-restart.png`；`natural-session.json` 保存带时间戳快照、九键存档与 console/requestfailed/pageerror。该会话未收集到 warning/error/pageerror/requestfailed。`07-natural-gameover.png` 采于弹窗进入动画，透明度不能用来认定稳定界面可读性；稳定结算参考 `fixture-failure.png`。自然录像为 `video/natural-desktop.webm`，包含操作间停留；从录像解码的 `video/natural-frame-4s.png` 已查看以验证文件可解码且内容对应页面。

### 固定场景证据索引（F）

脚本：`tests/e2e/pao6-baseline.spec.ts`；专用配置 `tests/e2e/pao6.config.ts`。运行 `npm run dev` 后执行 `npx playwright test -c tests/e2e/pao6.config.ts`（配置也可自动启服务）。专用配置使用 Windows D3D11；默认旧配置中的 Metal 参数保留。本次原有 E2E 亦通过且查看过其真实截图，不能据其启动参数推定实际使用 Metal。

| 场景 | 固定输入/几何与证据 | 结论边界 |
|---|---|---|
| 坡道→车顶→跳离→落地 | 中道坡中心z18、长12、高3；车中心z33、长18、高3；`fixture-ramp-*`、`fixture-roof-*` | 记录坡高上升、车顶 y=3、W 跳离以及后方 y=0；不同于随机模板原始几何的普遍保证 |
| 跳低栏、滑高栏 | 低栏z9高1.2；高栏z9基准y1.4高1.2；z3处分别W/S，经过障碍 | `fixture-low-obstacle-*`、`fixture-high-obstacle-*`；无免死穿过，不能外推所有速度/薄障碍 |
| 四道具拾取 | 中道z6/13/20/27 放 MAGNET/DOUBLE_SCORE/SUPER_SNEAKERS/HOVERBOARD | `fixture-magnet.png`、`fixture-double-score.png`、`fixture-super-sneakers.png`、`fixture-hoverboard.png`；事件/trace 验证激活 |
| 磁吸、任务奖励 | 左道x=-3放30币，由中道磁吸 | 拾取30次并发任务完成，奖励后币80；奖励与拾取数量必须分开解读 |
| 跑鞋跳、护盾 | 拾取跑鞋后真实W；滑板后在前方5单位放低栏 | `fixture-super-jump.png`、`fixture-shield-break.png`；护盾碎裂事件+短时保护+存活，不是QA授予免死 |
| 失败、重开 | 无护盾时地面撞静态列车，点击重开 | `fixture-failure.png`、`fixture-restart.png`，传感器及事件跟踪；无游戏实现修复 |
| 手机竖屏与触摸 | 390×844，CDP touch 左划/上划/下划；菜单、商店、暂停 | `fixture-mobile-*.png`；仅模拟器结论，真机浏览器、手势冲突和安全区待测 |

每类夹具的 `fixture-<test-title>.json` 含 console、事件、状态与逐帧 trace。四份 `fixture-results/<test-name>/video.webm` 为连续录像，`fixture-test-results.json` 为机器可读执行结果。测试是特征采集，部分断言只验证采集成功；通过数不等于全部 PRD 已满足，具体机制结论须结合本报告、事件和 trace 审查。

### 旧功能迁移清单（S，标明额外实测处）

“保留”是保留能力；实现和视觉仍可替换。建议不是冻结设计。

| 能力 | 现有内容/来源 | 保留 / 替换 / 待决策 |
|---|---|---|
| 五态与页面 | MENU/PLAYING/PAUSED/GAMEOVER/SHOP；types/index.ts:1；N/F走通过主要流转 | 保留开始、暂停、恢复、失败、重开、回菜单、商店；替换页面风格，补加载/失败等状态另立实现 |
| 输入与三车道 | input.ts:48/73/100；A/D/左右，W/上/空格，S/下；触摸主方向>30px | 保留能力和边界；N键盘与F触摸已记录；提示文案/触摸真机待统一 |
| 动作与碰撞 | physics.ts、input.ts:109；低/高障碍、静/动列车、坡道、跳跃/翻滚 | 保留玩法；替换支撑面、接触和动作阶段契约；F局部验证不覆盖动态列车/高速漏判 |
| 速度与得分 | main.ts、scoring.ts；初速18、加速0.25、上限45 | 保留递增与成绩能力；数值与显示单位待决策，HUD直接 floor(speed) 标KM/H不能视为已完成单位换算 |
| 金币与结算 | dom.ts:410/487；结束入账，回菜单反读HUD文本 | 保留收益和最高分；替换为局ID幂等结算；N单次结算/刷新已记录，未覆盖重复交易攻击 |
| 四道具 | types/index.ts:5；磁铁、双倍分、跑鞋、滑板 | 保留能力；替换立方体表现、名称/图标/倒计时；F已记录四次激活及代表效果 |
| Jetpack | 旧PRD AC-22有宣称，当前 PowerUpType 无该项 | 待决策；不列为已实现旧功能 |
| 任务与Toast | mission.ts:5/59/90；30币奖50、10跳奖40、8滚奖40、500分奖100 | 保留任务奖励；替换有上限提示队列；F验证金币任务，其他任务仅S |
| 任务口径 | 翻滚任务文案“under obstacles”，实际每次ROLL输入计数；金币任务读含奖励的ctx.coins | 静态风险；待新版明确拾取数/奖励数、有效动作口径，不固化为验收规则 |
| 商店和皮肤 | dom.ts:15/551/602；cyan免费、pink50、gold150、green300、purple500 | 保留余额、所有权、装备能力；N看过零余额商店，购买交易未实测；旧ID到原创资产映射/价格待决策 |
| 音频 | audio.ts、dom.ts:385/626；主静音、BGM/SFX独立开关音量、动作/追逐反馈 | 保留偏好；N开关刷新已测；人工听感、残留/重复播放未验收 |
| 视觉与动作资产 | Babylon场景、模型、追捕实体、轨旁物、光效、镜头、动作等 | 按已批准明亮城市轨道方向替换视觉；保留玩法反馈语义；本次不做资源许可证或全动画资产审核 |
| 调试与测试 | main.ts只读传感器及QA门控写控制 | 保留可观测性；新契约再升级，不把夹具可通行当作生成器质量证明 |

### 存档字段盘点（S，共九键）

存储位置为当前 origin 的 localStorage，UI键定义 `src/ui/dom.ts:58`、载入`:115`、保存`:144`；音频键 `src/systems/audio.ts:10`、载入`:98`、保存`:112`。没有独立 storage.ts 服务。

| 键 | 格式 / 缺省 | 迁移建议 |
|---|---|---|
| paoku_high_score | 整数字符串 / 0 | 保留历史最高分，补合法范围验证 |
| paoku_total_coins | 整数字符串 / 0 | 保留余额，负数/异常值修复策略待决策 |
| paoku_selected_skin | ID字符串 / cyan | 保留选择意图，校验合法ID和所有权；新资产映射待决策 |
| paoku_unlocked_skins | JSON数组字符串 / ["cyan"] | 保留拥有集合，补元素、去重和ID验证 |
| paoku_audio_master_muted | "1"/"0" / false | 保留，仅"1"为true |
| paoku_audio_bgm_enabled | "1"/"0" / true | 保留，仅"0"为false |
| paoku_audio_sfx_enabled | "1"/"0" / true | 同上 |
| paoku_audio_bgm_volume | 浮点字符串 / 0.6 | 保留，现有clamp[0,1]、NaN归0 |
| paoku_audio_sfx_volume | 浮点字符串 / 0.9 | 同上 |

UI四键在结算/有币回菜单/购买装备时整组写入；音频五键在设置变化时整组写入。当前无版本号、局ID、结算记录、种子/回放、任务进度存档；局内位置、道具和追逐状态不保存。JSON损坏有catch，但UI载入非原子回退；高分和余额无非负范围校验，选中皮肤未验所有权，解锁数组仅检查非空数组。以上为代码事实与迁移风险，未伪称已运行损坏数据测试。

### 观察、已知边界与后续审查（H）

- 桌面菜单主要按钮完整，角色被中央大卡片/背景模糊遮住；局内人物在中下部，警官实体在右下方较大，截图中可见其局部出框；需在新版取景规范中审查，不把主观构图评价记作碰撞缺陷。
- 轨道、金币、车灯发光强，细节轮廓发白；与批准的明亮风格目标不同。当前照片证明旧视觉现状，不代表新风格验收。
- 坡面可通行由F证明；当前坡道模型是否与通行面一致，应结合运行态截图与整体设计已登记的未倾斜盒体代码事实审查，不能从单一暂停截图宣称物理完全正确。
- 道具HUD内部枚举、速度单位、任务口径及结算耦合属于明确的静态改造依据；不在本任务修改。
- 未覆盖：真实移动硬件、音频听感、四道具完整到期生命周期、购买/装备交易全矩阵、动态列车高速接触、长跑/后台恢复/全随机组合、旧损坏存档迁移、资产许可证。后续任务可据此补验；PAO-6不冻结性能预算或实施新架构。

### 本轮门禁与审查方式

`npm run build` 退出0（有主包约6.33MB及500kB chunk提示，未在本任务优化）；`npm run test` 5文件56测试通过；原有 `npm run test:e2e` 6/6通过且真实截图已查看。原有测试生成根目录截图在检查后恢复，避免覆盖历史证据。新增固定场景测试及最终审查数字见证据目录 README 与 fixture-test-results.json。本次新增仅文档、测试和采集证据，不改 src/、public/、依赖及默认浏览器配置。

### 最终截图复核与补充盘点

- 固定夹具截图使用 Playwright `animations: disabled` 将有限CSS动画快进到终态，以排除弹窗过渡；没有停用 Babylon 模拟。视频保留页面动态，不用截图终态取代动作录像。自然输入截图保留原始动画相位。
- **F已复现的视觉问题**：`fixture-ramp-ascent.png` 中黄色坡体遮住角色躯干，只露头肩；同时trace显示角色沿数学坡面升高。这说明“有可通行坡面”不能等同“可见几何与脚底一致”。复现：运行专用脚本的 ramp-roof-jump-land，用上述中道坡/车几何，无跳跃走到坡中。PAO-6仅登记，后续斜坡与渲染任务修复。
- 手机竖屏菜单和商店稳定截图已查看，主要按钮可见，页面宽度未超viewport；商店是局部滚动列表，未实测逐个购买或滚动到最后皮肤。桌面稳定失败弹窗无进入动画时的透明问题。
- 旧PRD还列出世界弯曲、速度线、金币飞HUD、菜单环绕、隧道入口/列车火花、护盾碎片、全骨骼动作状态机。它们应保留在迁移检查清单中；本次不逐项确认存在、完整性或品质，不能由旧PRD声明直接勾选通过。滑板碎裂事件有F证据，碎片数量和美术品质未验。
- 最终专用采集4/4通过（机器结果 startTime=2026-10-31T08:39:54.201Z，约30.97秒）；补断言覆盖车顶y=3、退出落地y=0、低高栏后存活、重开分币复位、无pageerror、触摸动作和手机页面无横向溢出。双倍积分仅核验激活与HUD，未独立断言倍率；跑鞋记录跳高样本，未验完整到期。所有已收集自然/夹具日志无warning/error/pageerror/requestfailed。
