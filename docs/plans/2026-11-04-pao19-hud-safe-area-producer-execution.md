# PAO-19 HUD 安全区 producer 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 交付可独立验证的 UI 占区 producer 与中立纯值几何；不接生产 main/render。

**Architecture:** UIManager 拥有绘制面登记、失效、显式批量量测和可释放布局租约；中立模块只处理不可变数值、裁剪与坐标适配。测试通过只读量测夹具调门面，不把它当生产帧接线。

**Tech Stack:** TypeScript、Vitest、Playwright/Chromium、现有 Vite。

## 1. 输入、授权和保护

工作树 `D:/worker/paoku-sessions/pao-19`，`codex/pao-19-ui`；开始 cwd/顶层/登记/common-dir 均核对，本地与远端 HEAD=`ff02092344fcef2f5a96f29f9762a01ea5043907`，status 含未跟踪项为空。复用原树，不 reset/merge/建树。

主仓 AGENTS 与 `docs/plans/2026-11-04-pao18-pao19-approved-bridge-execution.md` 全文已读，执行说明实际最后修改提交 `17790f223873b6d322ce3690131904368391ade8`。本树安全区设计/契约沿用 ff02092；批准参数为4 CSS px间隙、向外1/64 px量化、仅edge-top包络。旧规格“待批”由本次批准覆盖；本阶段不实现相机消费。原UI主审 ed39cb9 末节继续生效。

唯一生产改动 `src/ui/dom.ts`；新增 `src/presentation/hudSafeArea.ts`、`tests/unit/pao19-hud-safe-area.test.ts`、`tests/e2e/pao19-hud-safe-area.spec.ts`、本计划和 `docs/evidence/PAO-19/hud-safe-area-producer/v1/`。main、全部render、views/CSS/HTML、application/types、业务/音频、public/资产/依赖/配置、旧测试/历史证据只读。无其他Agent，不读18活动树，不改Linear或共享总纲。

首次修改前将跟踪文件 SHA256/原字节保护表留 `.pao19-hud.local/`；运行 build/unit 保存当前基线。旧证据及根截图不作为输出目标。完整旧 E2E 镜像只替换输出路径，反向检查逐字一致；镜像放 `tests/e2e/.pao19-hud.local/`，日志/批量图留忽略目录。

## 2. Task 1：纯几何 RED→GREEN

Files：新增中立模块及新 unit。

1. 先写断言，再用无行为的最小API脚手架确认行为RED，避免缺失导入/拼写导致假RED：normalize/适配未输出正确坐标、拒绝状态或冻结值。
2. `npm run test -- tests/unit/pao19-hud-safe-area.test.ts`：应因数值/状态不符合失败，保留首日志。
3. 实现 Rect/Insets/MeasureBasis/Surface/UiLayoutSnapshot/CanvasLayout、校验、逐轴裁剪、outward量化、deep freeze、normalizeOcclusion、toBufferGeometry。纯函数不导入DOM/Babylon/业务。
4. 数值断言：C=(30,20,390,844)、R=(46,44,100,48)，CSS=(16,24,100,48)，buffer780×1688后=(32,48,200,96)；visual偏移和scale不二次扣乘；比例来自buffer而非DPR。非法/零尺寸/不支持变换整批UNREADY；安全区与top包络max合并，4px仅扩一次；侧列不变整边。
5. `npx tsc --noEmit` 与目标unit到GREEN，再进入UI；不提前接main或新CameraInput。

## 3. Task 2：UI producer RED→GREEN

Files：dom.ts、新 unit/E2E。

1. 新浏览器RED先断言真实UIManager实例公开量测门面存在，并通过实际DOM卡片/HUD对照要求READY、几何正确；原基线应因缺producer门面/行为失败，不修改旧测试。
2. 公开候选门面：`measureOcclusion(basis)`、`readOcclusion()`、`invalidateLayout()`、`subscribeLayoutInvalidation(listener)`、`resetLayout()`、`disposeLayout()`。同一sampleFrame最多一次DOM读，dirty后同帧不重读；缓存读取不碰DOM。应用级canvas/viewport数据由调用者显式提供，本轮没有生产订阅者。
3. 登记 score/coins/speed/audio/pause、四种可见pill、兄弟Toast、非空背景反馈、活动卡片；不登记全屏空容器/模态dimmer，不丢inert但仍绘制的HUD，卡片包含其背景全框并去重内部控件。沿overflow裁剪祖先/visual/canvas求交，透明或隐藏规则按批准契约；unsupported transform/非法面整批UNREADY。
4. UI实际文本/页面/道具/Toast/反馈变化置dirty；必要ResizeObserver、所属scroll/toggle/交互态/转场、font回调只置dirty。无新rAF循环，不量测每个render。producer/epoch/revision防旧回调复活；重建先释放旧布局资源。新增监听/探针/订阅释放幂等，不动旧业务生命周期。
5. 真实应用N桌面/CDP触摸完整流程加只读测量调度（F），不写业务；F隔离UI fixture覆盖长数字/四道具/200%/可见性/滚动/非法/重建和迟到。fixture不是相机消费或生产主循环。
6. 每组修改后 `npx tsc --noEmit`、新unit、新E2E到GREEN。保留原全部断言、原PAO-6单行。

## 4. Task 3：完整门禁和证据

1. 新测试显式类型检查：`npx tsc --ignoreConfig --noEmit --target ES2023 --module ESNext --moduleResolution bundler --lib ES2023,DOM --skipLibCheck --typeRoots C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@types,./node_modules/@types --types node tests/unit/pao19-hud-safe-area.test.ts tests/e2e/pao19-hud-safe-area.spec.ts`，期望exit0。TypeScript 6显式文件模式须加ignoreConfig；本树没有@types/node，使用已有本机runtime类型，不安装依赖/修改tsconfig。
2. 最终 `npm run build`、`npm run test`、`npm run test:e2e -- --config .pao19-hud.local/playwright.config.ts`，完整旧+新增suite，workers1/retries0。配置仅本机忽略目录；5189独占、strictPort、reuseExistingServer=false、ANGLE D3D11。不启动/停止其他任务服务。
3. HTTP raw源码逐字核对，验证前后source及受保护旧文件hash；历史输出若意外写入只按保护表恢复原字节。镜像反向路径还原须与旧spec逐字相同。
4. 记录首次失败、实际版本/计数/时长/skip/retry/flaky；若完整旧suite有延期问题或其他继承失败，保留首现场不skip/不重复跑到绿、不扩修，未通过不提交生产批次。
5. 本轮查看稳定桌面HUD、390最大HUD、暂停/旋转量测叠加三图；DOM/发布值与输入N/F分报。H13真实投影、H14/H16的render策略和生产写→读→render留后续，真机未测如实写。
6. 仅小量关键图、结果JSON/报告入新证据目录。内容审查与diff --check，暂存仅白名单，正常hooks提交/push，ls-remote核SHA。所有门禁通过才提交；交主Agent主审，不自动合并/接线。
