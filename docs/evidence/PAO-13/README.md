# PAO-13 送审证据

日期：2026-11-01（Asia/Shanghai）。基线 `6efdd1f7ef975a8910340e5f1ca39a9078621ad3`，分支 `feat/pao-13-seeded-tracks`。只执行 PAO-13；最终交付 In Review，不设 Done。

先写 [实施计划](implementation-plan.md)，再由关卡、核心接线和 QA 隔离实施。种子生成已接入实际固定步主循环，记录 run/seed/RNG/contentRevision/游标并随快照提交；重开及菜单/商店清理覆盖实际入口。保留原数组接口、QA 冻结和替换入口。四个冻结段定义、八种有限变体，坡车共端点、一个组合视觉根；金币和四种既有道具绑定经物理执行的路线。

模型是纯数据交接：普通车厢显式绑定 train_ramp_or_car，带坡工程车绑定 train_metro，固定资产提交 `622e7daa2262015f34e511e59628a3653273994d`。均为 UNCALIBRATED / LEGACY_PRIMITIVES 回退；不加载新模型，不用原始 GLB 尺寸替换已验收逻辑尺寸。不修改 GLB、render/UI/public、动画、相机、材质、灯光、物理算法、依赖或共享主文档。

## 实现与有限覆盖

[逻辑报告](logic-report.md)记录算法、复杂度、回收与限制；[核心及独立审查](core-review.md)、[QA 核心复核](qa-core-review.md)记录职责边界和修复项。单测使用真实 PAO-12 updatePhysics / applyInputAction，携带支撑、姿态和道具状态跨段执行，不以几何端点代替可达性，不允许护盾消费救活无效路线。实际生成不执行会向全局事件总线发事实的离线验证器。

物理矩阵：96 个单段见证、384 个有序相邻段见证（4 定义、8 同步变体、18/30/45m/s），另有 128 个 45m/s 道具跨段见证；32 种种子 × 32 次更新 = 1024 次重复生成抽样。后者验证确定性、内容覆盖与有界元数据，不算额外物理路线。总单测包含旧 153 项与新增 25 项。

首轮 13 个关卡及 3 个核心 RED、实际生成/主入口 RED、后续变体/冻结/组合/尺寸 RED 均保留。种子 13 的超级跑鞋跨段路线曾跳过 Z90 地面金币；移除这个未证实奖励点，保留障碍及物理参数。精确复现输入、原变体映射和负例变更见 [失败种子](failed-seeds.json)。中间失败日志不算最终验收通过；核心测试初期位于证据目录，最终仅存在于白名单 `tests/unit/trackSegments.test.ts`。

## 最终验收

- `build-final.log`：Dispatcher 独立运行 npm run build，exit0（含 tsc）；既有大 chunk 提示保留。
- `test-final.log`：Dispatcher 独立运行 npm run test，12 文件、178/178，exit0。
- 完整 npm run test:e2e（任务专用 config）：旧 25 + 新 3 = **28/28**，159.342s，0 skipped / unexpected / flaky。见 `runs/verified/e2e-results.json`、`e2e.log`。
- `runs/verified/source-stability.json`：整个 src 前后 hash 一致；`browser-source-identity.json`：独占 5184 实际 raw 源与当前 checkout 精确匹配。
- `runs/verified/history-restoration.json`：673 份历史文件全部逐字节恢复；90 个刷新输出的完整镜像仅存于本机忽略目录。Git 核对 PAO-6/10/11/12 历史目录无差异。
- Dispatcher 已亲看全部 5 张本任务新截图及旧回归的桌面车顶、竖屏坡面/落地、桌面离顶落地。HUD、稳定暂停框和中道人物未见新增明显异常；黄色坡体仍遮挡上坡角色，右侧追捕角色局部出框，均为旧表现限制。

**N** 新增自然键盘/触摸用例无 QA 写入：实际主循环读取生成状态、真实按钮重开验证新 runId/同 seed/首批布局及输入清空。`N-desktop-seeded-restart.png` 是重开后主动暂停的稳定证据，非运行帧。**F** 在浏览器导入真实物理验证器，于应用 MENU/tick0 执行 60 个单段/相邻段样本（默认变体、18/30/45），60/60 成功且应用保持 MENU；它不是渲染的自然局。三份新增用例日志 errors 均为空。

新截图及 SHA-256 见 `runs/verified/screenshot-manifest.json`；[桌面运行](runs/verified/screenshots/N-desktop-seeded-jump.png)、[竖屏运行](runs/verified/screenshots/N-portrait-seeded-jump.png)、[竖屏暂停](runs/verified/screenshots/N-portrait-seeded-paused.png)。全部验收通过后才提交；正常 hooks 仍运行 build/test，不跳过。

复现：先运行 npm run build、npm run test；再按 [浏览器协议](browser-validation.md)设置 PAO13_PHASE 并执行 browser-runner.mjs。配置独占 5184、strictPort、禁止复用，运行旧 25 项及新增 3 项；校验实际服务 raw 源与整个 src 前后 hash。历史证据原件逐字节备份/恢复，完整回归镜像仅在本机忽略目录 `.pao13-local/`，提交任务摘要、日志、关键新截图及 manifest。

## 局限与交接

当前所有段从中道地面接入/接出，每段只有一条候选路线；移动列车保留在侧道，中道为已验证避让路线。矩阵是有限采样，不证明所有中间速度、加速历史、8×8 混合变体、长期道具历史、任意输入及未来新段安全。相邻段验证提前实例化整个序列，因此后段列车的预运行时间与逐段生成不完全相同；当前侧道运动不穿过认证中道路线，不能外推到任意动态关卡。

固定种子不等于旧存档完整回放或断点恢复。离线 witness 调用者须保留 variant/spawnLead/maxSteps 等输入参数；结果本身不是完整回放包，失败种子文件保存了这些选项。运行时生成上限为每次 2 段，离线验证上限 4 段/3600 步；未做真机帧时间或内存性能签收。

浏览器竖屏为桌面 Chromium 触摸模拟。GLB 朝向/缩放/通行面标定、正式模型加载、旧黄色坡体遮挡及侧道取景交后续美术/渲染任务；截图仅作回归，不代表代理与新模型已对齐。提交号、推送核验及最终 Linear 状态在最终回写中记录。
