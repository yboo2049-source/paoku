# PAO-18角色控制器与镜头工程批次独立主审

2026-11-03（Asia/Shanghai），固定提交`5bd31cc06a44c1a2ac382809ea8eadb69df76984`。本轮只审工程批次，不接受正式动作或完整父任务。

## 结论

本批工程检查通过，但**完整E2E为59/60，因字体网络错误暂缓最终验收**。新增7项专项全部通过；不能把它们或交付方60/60替代本轮完整门禁。未发现本轮新增控制器/镜头行为断言失败，不将外部字体请求错误误报为碰撞算法失败。保持18非Done，不解除15/17依赖，不合并或启动I-03/新runner/19 UI接入。

## Git、写权与源码审查

- 本地/远端`codex/pao-18-motion-camera`同为上述完整SHA，起始/结束工作树干净。相对f2680f4仅56个批准路径；已有游戏文件只改babylon.ts，新增characterView/cameraRig、3个unit文件、1个E2E、计划/新证据。main/types/physics/总线/DOM/assets/environment/entityViews/依赖/旧测试不变，diff --check通过。
- 主Agent读取两个新模块及babylon差异、专项测试与交付记录，核对既有main帧身份/physics落地事实。角色世界root复制presentation，局部组暂停并受控取样，混合从已显示姿态继续；精确legacy映射明确降级。镜头消费三角色同帧CPU蒙皮bounds/实际矩阵，只改相机；共享缓存/lease仍归门面。dispose取消适配只结算自有加载消费者，不承诺外部SDK任意Promise结算。
- I-03身份/真实动作实例和不漏落地、timeSec/stepSec、15新runner、正式动作/足接触、19动态HUD与持久化未接。连续contact边沿、合成clip与局部选项不能外推为上述真实桥已通过。

## 独立重新执行

| 检查 | 本轮结果 |
| --- | --- |
| build | exit0，TypeScript与Vite通过，既有chunk提示保留 |
| 完整unit | 27文件292/292，exit0；含本批19项 |
| 新测试显式tsc | exit0；复用已记录本机typeRoots，未改锁文件 |
| 完整E2E | 59通过/1失败，378798.466ms，skip/flaky/retries均0，exit1 |
| 本批新增E2E | 7/7，包括实际组暂停、三角色取景/支撑边沿/资源、raw/HTTP身份、键盘/390触摸、坡顶录制、延迟跨局及旧HUD CSS量测 |
| 原件保护 | 本轮1202个跟踪普通文件前后SHA一致；gitlink不遍历；结束status干净 |

主审从全部15个原suite建立`.pao18.local/main-review-5bd31cc/suite/`独立镜像，逐份反向替换证明仅证据输出路径不同，断言/时钟/超时不变。5188 strictPort、不复用服务，Chromium ANGLE D3D11、1worker/retries0完整运行53旧+7新。包含17用例是18的完整继承回归，不重复启动17任务或另做已审主题验收。原任务证据未覆写。

真实legacy GLB及阴影暖机后20轮回收/10reset的资源计数断言通过；dispose及真实延迟HTTP跨局、同资产ID和最新皮肤断言通过。相机投影覆盖三车道/chase1.5和2.8/高度0、3、8；旧HUD五行profile按真实CSS量测。主Agent另用本提交相机源码在390×667的同轨迹下比较30/60/120fps最终实际相机：最大位置差0.00013884m、旋转差0.00229685°，在候选阈值内；仅该轨迹，不是全设备舒适度或性能证明。

## 完整门禁失败

失败为旧`tests/e2e/pao12-collision.spec.ts:201`的`F-desktop-QA-teleport-and-world-recycle-do-not-sweep-old-position`。实际报错位置是afterEach第41行`expect(record.errors).toEqual([])`，捕获Google Fonts两条CSS请求的`net::ERR_CONNECTION_CLOSED`及对应资源错误，不是该用例的位移/碰撞/暂停断言失败。

本轮不屏蔽Google Fonts、不改断言/请求失败过滤、不换字体或放宽测试，不通过重试将首失败抹去。保留完整JSON/log、error-context和用例证据，需由后续明确范围处理外部资源可用性并完成原断言不变的完整复验。当前不能宣称所有设备/环境网络可靠，也不能根据一次字体失败推断本批控制器逻辑有错。

本轮18继承的`ramp-roof-jump-land`通过；[15本轮相同旧用例失败](2026-11-03-pao15-basic-motion-sample-review.md)仍保留，不因另一树一次通过宣称根因修复。

## 视觉、媒体和边界

实际打开本轮重新生成的桌面高速、390近追逐者、生产坡顶HUD三张图：三个角色未明显出屏，旧UI无明显溢出或遮住主体。警官/犬仍部分重叠，犬外侧可见；旧legacy角色不是新runner，静图不证明正式动作自然或所有遮挡组合通过。旧HUD固定profile不能外推到19新UI、任意字体缩放/动态矩形。

交付两段WebM在真实Chromium以4倍速解码至ended（2.941552s/390×844/89帧、5.16s/960×600/129帧，无解码error），该检查只证明文件可播放；本轮新E2E亦重新生成两段实际渲染录屏。动作自然度/舒适度与正式脚底接触继续待正式资产验收。

本机完整主审证据：`D:/worker/paoku-sessions/pao-18/.pao18.local/main-review-5bd31cc/`；根目录保护/镜像/完整结果、raw身份、资源、投影和首失败均保留。主规划只存精简结论，未改游戏实现、自动派发Agent、更改Linear或合并。
