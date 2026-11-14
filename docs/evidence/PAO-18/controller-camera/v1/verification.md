# PAO-18 角色控制器 / 镜头工程批次验收记录

2026-11-03（Asia/Shanghai）。本批依据主仓已批准执行计划第3/4节，从 `f2680f46ddef89a38c20496719a31abed9c3caf1` 接续，仅工程链路，非 PAO-18 父任务 Done。

## 实现与边界

- 保留 BabylonRenderEngine 门面、I-01/I-02、17缓存/租约与主题。新增 CharacterView 控制局部姿态、精确clip兼容映射、实际 AnimationGroup 的受控游标和100ms骨姿混合；根位置只复制 presentation，视觉整体scale=1。组始终pause，由表现时间显式采样，因此引擎场景动画钟不会在暂停时继续推进。过渡从当前已显示骨姿快照开始，浮点/向量线性插值、四元数Slerp/矩阵分解插值；重新打断不退回未混合旧pose。
- 跑/上升/下降/空中收身/滑铲进入保持退出/失败/滑板模式与切道轻倾只读现有字段。无敌计时不合成hurt；失败立即切终态。正式起跳/落地/受击/滑板clip缺失，本批仍是legacy别名或中性姿态；不以自然度、脚底贴合或完整13动作交付。
- 新增 CameraRig：独立支撑/相机位置/目标高度缓存、指数过滤、有限空中跟随、夹紧FOV/roll和低动态局部选项；按同帧三角色实际CPU蒙皮/网格世界bounds，用实际view/projection求屏幕范围，只移动相机，不改追逐者位置规则或模拟坐标。
- `setPresentationOptions` 是局部显式输入，没有main/UI/设置页/持久化接线。默认旧CSS profile为top140/bottom240/left8/right8 CSS px；候选112px不足以覆盖道具栏，改为经真实CSS量测覆盖最大五行（187px高、底部30px，共217px）。核对390×667、390×844、1440×900；不外推到动态19 UI、任意字体/放大或所有设备。
- I-03仍未接：contact连续边沿只作工程落地反馈，不保证多tick不漏事件；无新run/tick事件envelope、真实action身份或真实事件去重。没有从render tick伪造事件或换算秒数。timeSec/stepSec透传另批。
- 皮肤、旧请求/新局同资产ID、reset/discontinuity一次消费和dispose沿17所有权。CharacterView只持组引用，lease/缓存仍门面独占；停止/断开组引用不重复销毁共享资源。

## RED / 修复记录

1. `red-character.txt`、`red-camera.txt`：新模块未存在，先记录导入RED，再用真实NullEngine/组/骨姿断言GREEN，非声明这些导入错误是运行时行为断言。
2. `red-facade.txt`：旧门面滑铲整体scaleY=0.55，断言期望1失败；`red-browser.txt`：真实legacy浏览器尚无CharacterView，RUN状态缺失。接线后通过。
3. `pause-red.txt`：真实骨姿/游标已冻结，但旧警官躯干因暂停animSpeed=0被重置到0角。限制暂停/终局不重算程序追逐者摆动后，`pause-green.txt`通过；不是只将本地dt置零冒充实际组冻结。
4. `red-root-hud.txt`：恶意合成clip直接改世界root到104.2而非presentation的1.25，且底部112px不足。拒绝针对world root/视觉容器/板容器的动画组、扩固定HUD预留后，`root-hud-green.txt`通过。正式导入骨架root轨道仍需资产侧独立验收。
5. 门面批量替换首次因CRLF边界不匹配未完成，tsc指出剩余旧字段引用；规范化匹配后完成有限替换并通过tsc/15项专属测试。未扩大文件范围。
6. 新测试显式类型检查首先遇TS6需`--ignoreConfig`，随后锁文件没有@types/node；复用本机既有Codex运行时@types，不改依赖。修正两处fixture any参数和NullEngineOptions必需字段后通过；不假设主tsc覆盖tests。
7. 首次完整E2E在状态询问的会话中断后止于23项，无最终结果，保留 `e2e-interrupted.txt`，不算完整通过；重新从头运行，最终结果另见下节。没有以skip/重试/改时钟修复。
8. 审查追加 `red-interrupted-blend.txt` 复现过渡中切回旧clip的真实骨姿跳变。核对本机Babylon 9.19的AnimationGroup.goToFrame默认忽略weight，原测试只检查区间不够严格；改为实际采样骨姿并从当前显示值混合，`final-fixes-unit.txt`包含严格0dt中断连续性通过，不只看group权重参数。
9. 第二轮完整检查59/60通过，`e2e-before-final-fixes.txt`保留真实失败：Babylon在销毁scene时可能取消外部加载而不结算原SDK Promise。新增 `red-dispose-consumer.txt`断言本renderer拥有的pending消费者必须结束；只在babylon门面添加dispose取消适配，立即结算自有消费者、清自有取消引用，外部若晚交付资源则dispose。未改assets缓存，不宣称SDK所有Promise都会结算，也没有删除/放宽原浏览器pending结算断言。修复后重跑完整suite。

## 检查与证据

- 主源码编译/构建：`npm run build`，日志 `build.txt`。
- 完整单元测试：`npm run test`，日志 `unit-final.txt`，27文件/292项通过，9.04秒；其中本批3个新unit文件/19项。
- 新测试单独tsc：`npx tsc --ignoreConfig --noEmit --target es2023 --module esnext --moduleResolution bundler --lib ES2023,DOM --skipLibCheck --typeRoots C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@types,./node_modules/@types --types node node_modules/vite/client.d.ts tests/unit/pao18-character.test.ts tests/unit/pao18-camera.test.ts tests/unit/pao18-facade.test.ts tests/e2e/pao18-controller-camera.spec.ts`，exit0；空错误输出见 `test-typecheck.txt`。依赖及锁文件未修改。
- 浏览器：本树5188、strictPort、reuseExistingServer=false、Windows Chromium ANGLE D3D11、1 worker、retries=0。配置与15份完整镜像在本机 `.pao18.local/`；14份原suite仅输出路径变化，可逆hash在 `mirror-manifest.json`，新增suite原样复制。未覆盖原源码/测试/历史证据。
- 7项新增专项：`engineering-browser.txt` 7/7，43.9秒，之后对销毁后完成检查加强为等待实际加载promise结算，再参加最终完整suite，不拿500ms等待当完成证明。
- `F-lifecycle.json`：真实legacy GLB与阴影、物料暖机后20轮创建/回收、10reset，逐轮mesh/node/动画/骨架/材质/纹理/粒子/caster/缓存计数严格回同一基线。`F-dispose.json`：自有可枚举资源/缓存归零；不外推浏览器堆、任意Promise或全部设备。
- `F-delayed.json`：真实HTTP GLB跨A→B局，同资产ID缓存只请求一次、单lease/单骨架、最新红色皮肤；dispose后等待renderer/cache所拥有的pending消费者结算再检查归零，未把它称作外部SDK Promise必定结算。
- `F-projection-cases.json`：390实际legacy三角色、三车道×chase1.5/2.8×高度0/3/8，投影含最终roll/反馈。unit另覆盖390×667/844与1440×900、30/60/120fps、高度阶跃、低动态和无解安全区。未声称已验证19 HUD。
- `identity.json`：运行端口5188，main及三个render模块raw与磁盘文本一致；legacy GLB HTTP字节SHA与磁盘一致。旧回归自己的raw/HTTP断言也完整保留。
- `protection.json`：1147个既有跟踪普通文件，1146字节不变，唯一既有变更为批准的babylon.ts；新character/camera和新测试另列。gitlink `scratch/temp_learn_harness`仅登记，不读取其目录或改其内容。

## N / F / 视觉与媒体

- N：`N-desktop.json`、`N-390.json`，实际键盘/CDP触摸切道/跳/滑、实际骨姿暂停、恢复和暂停菜单重开；不注入模拟快照。失败后重开的既有N用例在完整suite另验。
- F：固定渲染帧、延迟/错误、contact边沿、最大buff DOM fixture分别标明。`F-ramp-trace.json`使用既有QA门控构造固定坡/车顶，之后真实physics支撑与自然按键，不冒充N。
- 三张图：`F-desktop-high-speed.png`、`F-390-near.png`、`F-roof-HUD.png`。检查角色/警官/犬未裁屏、HUD不溢出遮挡；警官与犬仍部分投影重叠，犬外侧身体可见，不称正式追逐者造型通过。角色仍为legacy而非runner。
- `F-high-speed-presentation.webm`：45m/s夹具轨迹、换道/跳滑，仅表现链路；`F-ramp-jump-slide-pause.webm`：生产main与实际物理坡顶/跳滑/暂停。静图不证明动作自然，录屏不把legacy别名验收为正式动作。
- 两段WebM用真实Chromium播放至ended，检查解码无error并抽帧查看，`media-decode.json`记录时长/分辨率/解码回调数量；抽帧在本机 `.pao18.local/media-review/`，不把抽帧等同完整正式动作自然性签收。
- `runtime-DPR2.json`额外实测390×844、DPR2、canvas390×844、三角色投影safe；运行适配器为NVIDIA GTX1650 Direct3D11、WebGL2，Chromium151.0.7922.34。不是仅用启动参数推定D3D11生效。

## 最终结果 / 交付

- 最终build exit0、独立测试代码tsc exit0、单测27文件292/292；完整E2E **60/60**（53旧+7新），351263.119ms，exit0，skipped=unexpected=flaky=retries=0。见 `full-summary.json` 与原始 `e2e-full.txt`，不是先前59/60或中断轮次的成绩。
- Git空白审查发现工具stdout自带行尾空格/末尾空行。提交版txt只裁行尾空白和多余终止空行，不改报错/结果；原始字节归档本机 `.pao18.local/raw-transcripts`，转换前后SHA见 `log-normalization.json`。完整结构化报告在本机 `.pao18.local/.pao18.local/full-e2e.json`，并非省略旧用例的子集。
- 完整15份镜像在运行后再次逆转换核对source/mirror hash，全部一致，原断言/时钟/超时未改；当前raw身份报告也再次对磁盘hash确认。1146个保护普通文件仍不变，唯一已有修改是批准的babylon.ts，新文件均在白名单。
- 最终三张新图已实际打开检查：390、桌面高速、实际坡/车顶HUD；三角色未出屏，UI无明显溢出，犬与警官部分重叠仍如实保留。最终两段录屏重新播放至结束并抽帧查看：2.941552秒/390×844，5.16秒/960×600，均无解码错误；它们只支持本批工程表现结论。
- 已实现：本地角色派生选择/实际骨姿混合与暂停、root权威隔离、镜头缓冲与三角色取景、门面生命周期取消/晚到保护。仅夹具：合成clip/恶意root轨道、显式局部低动态、固定渲染轨迹和故障投递。待后批：I-03权威事实去重/不漏接触、timeSec/stepSec接线、新runner/正式动作及其自然品质、19动态HUD/UI/偏好持久化。
- 本记录完成后，仅暂存本批白名单，正常hooks提交并push当前任务分支；固定commit与远端SHA核验以最终交付回执为准，不预写尚未发生的推送结果。保持PAO-18非Done，15/17父依赖保留；不自动进入main/types/I-03/动态HUD/新资产注册或20/21。
