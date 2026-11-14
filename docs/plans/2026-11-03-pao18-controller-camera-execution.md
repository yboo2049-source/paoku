# PAO-18 Controller / Camera Implementation Plan

> 执行技能：writing-plans → executing-plans；按 test-driven-development 与 verification-before-completion 自验。用户已指定当前独立聊天串行执行，无需选择执行方式或另建 Agent。

**Goal:** 沿已审17门面/生命周期完成局部角色控制器与镜头工程，不接正式事实桥、新runner或19 UI。

**Architecture:** BabylonRenderEngine 保留场景、资源缓存/租约、皮肤和释放入口；CharacterView 只读快照并控制 visual child/实际动画组，CameraRig 消费同帧三角色实际bounds和显式局部安全区，只改相机。无 I-03 时仅连续contact边沿工程反馈，缺事件/时间/正式clip均明确降级。

**Tech Stack:** TypeScript / Babylon.js / Vite / Vitest / Playwright Chromium ANGLE D3D11。

## 授权与固定输入

- 主仓 `D:/worker/paoku/docs/plans/2026-11-03-pao15-pao18-approved-execution.md` 第3/4节覆盖原设计“仅准备”限制；A方案已批准，原技术缺口仍有效。
- 已显式Set-Location；cwd/top=D:/worker/paoku-sessions/pao-18，branch=codex/pao-18-motion-camera，HEAD=f2680f46ddef89a38c20496719a31abed9c3caf1，status干净。实施前保存全部已跟踪文件hash至本机 `.pao18.local`，终验分报批准三render变化及其余路径不变。
- 只写 `src/render/{characterView,cameraRig,babylon}.ts`、新 `tests/unit/pao18-*.test.ts` / `tests/e2e/pao18-*.spec.ts`、本计划和 `docs/evidence/PAO-18/controller-camera/v1/`。main/types/core/physics/总线/UI/HTML/public/依赖/旧测试及assets/environment/entityViews只读，不合并树、不读15活动产物。
- 沿用公开 constructor/render/applySkin/reset/dispose/triggerShatterFX；render局部可选项仅新增安全区/reducedMotion，main不接。RenderFrameIdentity无timeSec/stepSec，不把tick差换秒。15@8c4b09f只是已批准设计。

## Task 1：角色RED → 控制器GREEN

1. 创建 `tests/unit/pao18-character.test.ts`，使用真实NullEngine/Scene/AnimationGroup/Animation/TransformNode；测试实际骨局部采样、暂停冻结、恢复/重播、重复帧无重启、混合/失败中断、跳滑组合、滑板、无敌计时不伪造hurt、contact支撑边沿、root精确复制、只读Map、reset/dispose。
2. `npm run test -- tests/unit/pao18-character.test.ts` 先记录缺模块RED；创建模块后每项必须变为实际断言，不用mock组play计数替代游标/骨姿。
3. 创建 `src/render/characterView.ts`：局部Motion选择器；精确clip映射与legacy显式降级；持有非资源所有者的组引用；受控playhead + paused AnimationGroup采样，0.1s混合且失败立即终态；root只复制，视觉scale=1；切道轻倾和滑板中性姿态不写模拟。
4. legacy jump/run、slide/sneak仅工程兼容，缺正式pose稳定降级；不让clip尾帧决定contact/rollTimer。暂停不切idle且实际组暂停；first/reset不合成落地，SUPPORTED连续换surface不重复反馈。
5. 每次实现修改运行 `npx tsc --noEmit` 和该专属unit，保存RED/GREEN结果；不修改共享字段。

## Task 2：相机RED → 独立镜头GREEN

1. 创建 `tests/unit/pao18-camera.test.ts`：真实TargetCamera矩阵+mesh bounds，地面/坡/空中独立位置/目标高度、30/60/120fps、暂停/断点、低动态、390三角色角点投影、HUD矩形/不可行诊断。
2. 先跑新unit确认缺模块RED；创建 `src/render/cameraRig.ts`，指数缓冲支撑高度/目标高度，有限空中权重和夹紧FOV、切道/边沿落地反馈。
3. 从每个visible mesh当前世界bounds角点取得同帧三角色bounds；在保持模拟和追逐者视觉位置规则不变前提，解相机后退/高度/目标/FOV，使三者在8 CSS px及保留区内；最终实际矩阵再验。不直接遍历HUD；安全区冲突返回明确诊断。
4. 显式局部安全区输入，默认旧UI profile候选 top=140px/bottom=112px；根据只读style.css HUD/top/pills/speedometer及真实浏览器测量核实适用viewport/状态，不能匹配时声明未知，不声称动态HUD通过。局部reducedMotion关roll/摇动/速度FOV/环绕/速度线。
5. 每次修改立即tsc+专属unit；相同时间误差按设计候选≤0.03m/0.3°验证。

## Task 3：门面接续RED → GREEN

1. 新 `tests/unit/pao18-facade.test.ts` 从既有17 host策略建立真实门面（仅Engine替NullEngine），验证无整模伸缩、实际组pause、epoch新旧同ID、skin、discontinuity一次处理/幂等释放；写失败断言后再改门面。
2. 修改仅 `src/render/babylon.ts`：构造CharacterView/CameraRig，替换旧组别名/整模拉伸/直接相机段；追逐者位置规则原样保留；角色动画/视觉bounds在镜头前更新。缓存/租约/skin只在门面持有，实例销毁先detach组引用，再entries.dispose，reset委派不重复释放。
3. `npx tsc --noEmit` + `npm run test`，保持17既有断言，不因工程提取改变主题参数/资源归属。资源等实测再冻结结论。

## Task 4：真实浏览器RED / 回归与证据

1. 新 `tests/e2e/pao18-controller-camera.spec.ts`，实际门面+legacy GLB；F覆盖暂停实际骨姿、root只读、地面/坡/车顶contact反馈、390/桌面实际投影、暖机20轮回收/10reset、自有资源dispose、延迟/失败fallback/旧局skin。N真实键盘和390触摸切道/跳滑/暂停恢复/失败重开分报。
2. 先在门面接线前执行新E2E的关键断言，确认实际缺口RED；录屏使用Playwright recordVideo或canvas捕获真实渲染，不用静图序列冒充自然动作。
3. 本机 `.pao18.local` 生成独占5188 config：strictPort、reuseExistingServer=false、1worker、retries=0、ANGLE D3D11。端口先核实，无冲突才起服务；不复用/杀其他任务服务。旧suite完整镜像仅重定向输出，字节比对原断言/时钟不变；旧输出放本机忽略路径、不覆盖历史。
4. 完整 `npm run build`、`npm run test`、`npm run test:e2e -- --config .pao18.local/playwright.config.cjs`（完整旧套件+新suite），记录计数/时长/skip/retry/首失败及修复；额外测试代码tsc显式检查。
5. raw源码与当前运行模块、GLB HTTP与磁盘SHA匹配；保护清单前后核对。实际打开桌面高速、390近追逐者、坡顶/车顶2–3图并检查遮挡、UI溢出；配高速/跳滑/坡顶短录屏。N/F及仅夹具/待事实桥/待正式资产边界清晰。

## Task 5：审查与交付

检查diff/保护结果和暂存白名单，正常hooks（仅进程PATH前置已有PortableGit避免WSL bash），明确commit与push当前分支，ls-remote核SHA。用户已授权完整本批，不在中间停待重复审批。仅在真实跨边界必需改动时提出最小请求；不改Linear、不标18 Done、不自动桥接/集成。

## 结果记录

实施与每次失败/验证的实际结果写入本批 `docs/evidence/PAO-18/controller-camera/v1/verification.md`；矩阵未执行项不填通过。计划参数若依据真实bounds/UI量测调整，只限批准范围并记录原因。

2026-11-03执行补记：固定旧HUD底部由候选112px改为240px，实际五行CSS量测占217px；无动态DOM桥。过渡采用当前已显示骨姿快照→新clip采样的100ms局部插值，绕开Babylon goToFrame默认不应用weight的问题，确保中途切回旧clip连续。门面增加自有加载消费者的dispose取消结算；不改assets缓存，也不声称外部SDK任意Promise均结算。两项新增RED和一次59/60完整失败均保留，修复后重新执行全部检查，正常提交前以最终记录为准。
