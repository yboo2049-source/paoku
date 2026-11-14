# PAO-19 安全区 producer 阶段交付

2026-11-05（Asia/Shanghai），基于 `ff02092344fcef2f5a96f29f9762a01ea5043907`。本阶段仅 UI 测量/布局租约和中立纯值几何；**main/render 未接线，未验证镜头动态避让**。

## 输入与范围

执行依据是主仓 `docs/plans/2026-11-04-pao18-pao19-approved-bridge-execution.md` 的第1/3/4节（实际最后修改提交 `17790f223873b6d322ce3690131904368391ade8`）、AGENTS 和本树 ff02092 的已批准 [设计](../../../../superpowers/specs/2026-11-04-pao19-hud-safe-area-bridge-design.md)/[契约](../../../../ui/pao19-hud-safe-area-contract.md)。原UI主审末节仍为 ed39cb9 已验收，两项P2未重开。

起始 cwd/顶层=`D:/worker/paoku-sessions/pao-19`，分支=`codex/pao-19-ui`，HEAD与远端均ff02092，common-dir=`D:/worker/paoku/.git`，status含未跟踪项为空。复用原树，无reset/merge/新Agent，不读取18活动产物，不改变Linear/依赖。

实施计划见 [producer执行计划](../../../../plans/2026-11-04-pao19-hud-safe-area-producer-execution.md)。生产白名单只有改 `src/ui/dom.ts`、新 `src/presentation/hudSafeArea.ts`；专属新unit/E2E独立于旧测试。main、所有render、views/CSS/HTML、application/types、事务/音频/模拟/输入/物理、资产/依赖/默认配置、旧测试及历史证据保持只读。

首次保护表涵盖1259个跟踪普通文件，另登记gitlink `scratch/temp_learn_harness`（未进入/修改）。构建前保护脚本初次遇gitlink目录时退出；随后区分普通文件与gitlink后成功建立清单，生产编辑尚未开始。基线build exit0，17文件/252单测通过，不引用为新能力成绩。

## 实际 producer 门面

- `measureOcclusion(basis: MeasureBasis): UiLayoutSnapshot`：调用方显式提供sampleFrame、page/runId、canvas绘制内容框和layout/visual viewport；无生产帧订阅者。每个sampleFrame最多一次DOM量测；同帧晚dirty返回UNREADY，缓存命中不读布局。
- `readOcclusion()`：读最近深冻结快照，首样本前为null。状态为READY/UNREADY/RELEASED，不以空数组代表已证明无遮挡。
- `invalidateLayout(reason?)`、`subscribeLayoutInvalidation(listener)`：同步撤销可用性，同批dirty合并；订阅仅值通知，退订幂等。外部canvas/viewport/宿主偏移失效由未来调用方显式提供，本轮未在main监听。
- `resetLayout()`、`disposeLayout()`：只清本桥observer、所属监听、env探针和租约；producerId/epoch/revision隔离旧结果。重建自动释放前实例布局资源，晚到font promise/observer无权复活；不声称治理了旧UI的全部全局监听。

登记独立成绩/金币/速度面、声音/暂停控件、实际可见道具、兄弟Toast、非空HUD反馈背景和整个可见实体卡。透明全屏结构/模态dimmer不作为普通占区；inert背景HUD仍绘制就保留。滚动按逐轴裁剪祖先、visualViewport和canvas交集；卡片登记背景全框，不登记scrollHeight/内部重复按钮。公开量测不改业务、存档或音频事务。

中立模块公开不可变类型、`normalizeOcclusion`、`toBufferGeometry`、矩形裁剪/向外量化及`LayoutLease`。client CSS→canvas CSS只减canvas原点；buffer按实际宽高比适配，DPR/visualScale不再乘。原始rect与4px间隙后的消费rect分别输出；仅edge-top形成保守上包络，设备安全边界用max而非相加。坐标space标记防二次buffer适配，非法量/不支持的变换/比例不匹配显式不可用。

没有运行时 `setHudSafeArea`、CameraInput扩展、相机solver更改或事实事件接缝；纯buffer函数仅独立测试。H13真实角色投影、H14/H16的render消费/冻结策略及生产UI写→读→render顺序留后续集成。

## RED、修复与验证区分

- 纯几何首RED：12项因无行为API脚手架的数值/状态/租约结果不符失败，非导入拼错；随后GREEN。
- 浏览器首RED：桌面/390两例在真实UI实例上断言measureOcclusion门面，收到undefined；生产基线确无此能力。
- 追加RED覆盖首读重入reset/dispose、倒退sampleFrame缓存、reset订阅者重入释放/递归reset、量测异常及纯适配器非法输入；逐项修复后目标unit通过。
- 测试工具问题另记：只读Map代理不能structuredClone，F副本改用JSON后显式重建Map；透明零高HUD根不适合toBeVisible，改测其实际暂停按钮；Vite `?raw`返回JS字符串模块时只解码export default再逐字比较；Windows npm命令的管道grep改用直接Node CLI。均未改旧断言/过滤旧错误。
- 新测试类型检查使用本机已有runtime的@types/node；没有安装依赖或改tsconfig。TypeScript6显式文件模式用ignoreConfig，命令及具体typeRoots见执行计划。

N：真实新上下文桌面键盘、390 CDP触摸的开始/动作/暂停/恢复/自然结束/重开/回菜单；几何采样是单独标明的F只读调度，量测不写业务。F：隔离UI副本的15位数字、四道具、Toast/错误条、200%字体、滚动裁片、隐藏/半透明/inert、旋转、显式inset、偏移canvas/DPR1和2、租约重建/释放和晚到回调。模拟inset和CDP不能签收真机刘海/系统手势。

## 最终门禁与保护结果

| 检查 | 本轮实际结果 |
| --- | --- |
| build（tsc/Vite） | exit0 |
| 默认unit | 18文件、270/270通过，含新增18项；8.65秒 |
| 新unit/E2E显式类型检查 | exit0，使用执行计划中的TS6独立命令及既有外部Node类型 |
| 新producer E2E目标集 | 10/10通过，118.124秒，0 skip/retry/flaky |
| 完整旧+新增E2E | **70/70，exit0，512.857秒**；旧60+新10，0 skip/unexpected/retry/flaky；全部仅一个结果记录 |
| 服务与配置 | 5189独占、strictPort、reuseExistingServer=false、workers1/retries0、ANGLE D3D11；旧suite默认60秒不变；未停止其他任务服务 |
| raw/HTTP身份 | 两种DPR上下文各核对dom、纯几何、main、style、screens五文件，解码raw模块后逐字一致 |
| 源码保护 | 30个源码文件在最终验证前后SHA256一致；相对原1259文件保护清单仅dom为获准改动，1258个已有只读文件不变；旧证据未变化，无需恢复字节 |
| 旧测试保护 | 11个旧spec及新增spec的回归镜像只重定向输出；反向替换逐字一致；旧断言、时钟、超时、错误收集及PAO-6已批准reach31单行保持原样 |

完整门禁本轮首跑即通过，未出现需要重复跑到绿的继承失败。结构化结果、30个源码hash、五文件HTTP身份、镜像与配置见 [verification.json](verification.json)；首RED/修复概要见 [red-green-summary.txt](red-green-summary.txt)，N真实输入步骤的页/布局租约快照见 [N-flows.json](N-flows.json)。源代码在最终回归期间保持冻结，没有将target子集或旧验收成绩代替完整门禁。

## 实际查看的截图与边界

已查看本轮最终完整回归产生的三张量测叠加图，粉框是公开producer的实际可见占区，底部标记明确写出F夹具与no camera bridge：

- [桌面最大HUD](F-hud-1440.png)及[发布值](F-hud-1440.json)：成绩/金币/速度卡和两个控件分别登记，中间透明区不合并，四道具与唯一可见Toast边框对齐。
- [390最大HUD](F-hud-390.png)及[发布值](F-hud-390.json)：15位数字换行后的真实卡高、四道具侧列和Toast被完整量测，没有把全屏HUD根作为障碍。
- [暂停/旋转/200%字形](F-paused-rotated.png)及[发布值](F-paused-rotated.json)：暂停实体卡全框及仍可见inert HUD保留，背景dimmer不生成全屏reservedRect；卡内滚动/可见交集按实际边界量测。

这三张F图来自停止真实主循环后建立的隔离UI副本，canvas背景是原渲染的遗留帧，可能保留角色加载/景深状态；**不用于人物投影或镜头构图验收**。因最终F背景出现虚化，额外查看同轮旧N真实桌面HUD图 `.pao19-hud.local/runs/full/PAO-19/A/key-desktop-hud.png`：自然流程HUD清晰、原角色/场景仍在，不扩大到渲染修复；额外图与批量旧图继续留忽略目录，不随本批提交。

本阶段未改旧UI布局、相机/资产或字体；不能用上述几何和图片声称H13投影、生产调度或动态相机避让已通过。实体手机、真实刘海、软键盘/pinch跨浏览器与设备性能尚未签收。下一步是主Agent独立审查；公共接线须等18固定交付审查后另排，不自动合并/继续实现。

日志/镜像/批量图留`.pao19-hud.local/`及`tests/e2e/.pao19-hud.local/`；本目录仅提交三张关键图及少量数值/检查摘要。正常提交hook和push的最终固定SHA在交付回复报告，不在提交自身写入自引用SHA。
