# PAO-18 字体资源请求失败诊断（仅方案，待主审）

2026-11-03，Asia/Shanghai。诊断未实施字体修复，不代表 PAO-18 Done，不解除依赖，不进入 I-03、新 runner 或 PAO-19 UI 集成。

## 结论与置信度

原完整门禁的失败定位可信度高：旧 PAO-12 用例业务流程已到 RUNNING，afterEach:41 因两个 Google Fonts CSS 请求的 `net::ERR_CONNECTION_CLOSED` 及两条对应 console error 拒绝交付。它不是已记录的碰撞断言失败。固定现场只有错误列表、游戏 trace 和测试结果，没有请求级网络 trace；究竟由服务端、链路、中间代理或瞬时连接状态关闭，仍是 **unknown**。

本次自然网络未复现：原失败用例定向三次 3/3 通过，独立自然页面三组冷访问及各一次暖刷新均无网络错误。不能用本次绿覆盖原完整 **59/60**。双入口确有重叠，但仍在这些成功样本中存在；没有证据证明重叠会引发连接关闭。推荐另批实施“保留两族风格、核验许可后同源自托管”，作为消除外部字体可用性依赖的路线，而不是宣称已查明历史连接关闭的网络根因。

## 范围、依据与输入

- cwd / Git 顶层：`D:/worker/paoku-sessions/pao-18-font-diagnosis`；分支 `codex/pao18-font-diagnosis`；诊断时 HEAD / 固定起点均为 `5bd31cc06a44c1a2ac382809ea8eadb69df76984`；初始含未跟踪项 status 干净；common-dir `D:/worker/paoku/.git`。所有 shell 调用显式使用本树 workdir，没有 reset、合并、其他 Agent 或聊天。
- 先读主仓 AGENTS、诊断计划第 2/3/5 节、固定输入清单和当前架构/测试规范，再按单文件读取。使用 [systematic-debugging](C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/systematic-debugging/SKILL.md) 的现场→假设→单变量观测路径；旧声明位置不存在，已找到实际安装位置。没有进入实现阶段。
- [主审结论](D:/worker/paoku/docs/reviews/2026-11-03-pao18-controller-camera-review.md)、[诊断授权](D:/worker/paoku/docs/plans/2026-11-03-regression-diagnosis-prompts.md)、[输入清单](D:/worker/paoku/docs/evidence/QA/diagnosis-preparation/2026-11-03-inputs.json) 是本轮依据；完整门禁不是本轮重新执行。
- 四份字体输入（主审报告、full.json、用例 JSON、error-context）均存在且与清单 SHA256 匹配，读前/读后不变。具体绝对路径和 SHA 见 [input-integrity.json](../evidence/QA/font-request-diagnosis/v1/input-integrity.json)。没有读取车尾/其他活动任务；没有将 error-context 的自动修复提示当作授权。
- 只读 `index.html:7`、`src/style.css` 字体导入/变量/选择器、`tests/e2e/pao12-collision.spec.ts` 捕获与目标用例、package/锁文件、Playwright/Vite 配置、提交 hook、CONTRIBUTING 和忽略规则。为查 PWA 注册仅检索 main.ts 的相关标识（无命中），未读取其其他业务。

## 预登记与实际检查

[registration.json](../evidence/QA/font-request-diagnosis/v1/registration.json) 在浏览器实验前登记样本数与条件。端口 5198 启动前无监听；两个诊断 config 顺序执行，每次由 Playwright 启动本树 Vite，strictPort、不复用服务、1 worker、retries=0，ANGLE D3D11。Node v24.18.1 / npm 11.16.0，Chromium 151.0.7922.34；没有链接其他树依赖。

| 命令 / 组别 | 实际结果 | 解释 |
| --- | --- | --- |
| `npm ci` | exit0 | 本树锁文件安装；报告 18 个 audit 问题（3 low/10 moderate/5 high），未修依赖 |
| `npm run build` | exit0 | tsc/Vite/PWA 通过，既有 chunk 提示保留 |
| `npm run test` | exit0，27 文件 / 292 项通过 | 新树 baseline，不借用原树成绩 |
| `npx playwright test --config .pao18.local/font-diagnosis/original.config.ts --grep F-desktop-QA-teleport-and-world-recycle-do-not-sweep-old-position --repeat-each 3` | exit0，3 passed，0 retry/skip/flaky | 原目标断言不变，仅重定向证据输出 |
| `npx playwright test --config .pao18.local/font-diagnosis/network.config.ts` | exit0，5 个观测用例完成 | N1~3 各冷/暖访问；F-css、F-font 各一次。这里 pass 表示采集完成，**不是 F 请求成功** |
| 完整 `npm run test:e2e` | 本轮未运行 | 纯诊断不要求重复完整套件，继承首失败仍未关闭 |

镜像逆替换逐字相等，只替换 `resolve('docs/evidence/PAO-12/runs', phase)` 为本树忽略目录；没有改 afterEach、过滤错误、拦截成功或增加重试。[镜像证明](../evidence/QA/font-request-diagnosis/v1/mirror-check.json) 和 [三次结果](../evidence/QA/font-request-diagnosis/v1/targeted-results.json) 保留各次时间/状态。旧用例相同标题会覆盖本机状态 JSON/截图，故该本机文件只保留最后样本；三次状态均由原始 reporter JSON 留存，不将它们伪称三套独立状态附件。

实验时间为北京时间 21:10~21:11；证据 ISO 时间使用 UTC（加 8 小时）。临时 QA/config/输出/新截图均在已用 git check-ignore 确认忽略的 `.pao18.local/font-diagnosis/`。没有改默认测试收集或生产插桩。JSON reporter 相对 config 目录输出，实际原始结果在该目录下的嵌套 `.pao18.local/font-diagnosis/original-results.json`；精简逐次结果已纳入跟踪。

## 请求链观察（事实）

HTML link 请求 A：`https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap`。

CSS @import 请求 B：`https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&family=Orbitron:wght@500;700;900&display=swap`。

两 URL 不同，重叠 Outfit 400/700/900；B 额外 Outfit 600 及 Orbitron 500/700/900。`--font-main` 为 Outfit → Apple 系统字体 → sans-serif，作用于 body/html；`--font-display` 为 Orbitron → sans-serif，作用于标题、按钮、数值等。字体失败会改变实际字形/尺寸；computed font-family 仍显示声明族，不能单独证明实际字体已加载。

自然组 CDP 发起者显示 A 来自本地文档 parser，B 来自 `/src/style.css` parser；ResourceTiming 分别为 link/css。Vite 转换后的 CDP 行号并不等于磁盘行号，以源文件 7/5 为入口依据。返回 CSS 的 @font-face 再发起 gstatic 文件请求：本菜单观察到 Outfit v15 latin WOFF2 `QGYvz_MVcBeNP4NJtEtq.woff2`，Orbitron v35 `yMJRMIlzdpvBhQQL_Qq7dy0.woff2`。CSS 还声明其他 unicode-range；未使用的 face 是 unloaded，不是请求失败。字体依赖按使用字符/样式懒加载，不能把本菜单的两个文件当全游戏完整清单。

| 组别 | 导航数 | 字体域请求事件 / HTTP 响应 | 字体域 cache 事件 | requestfailed |
| --- | ---: | ---: | ---: | ---: |
| N1 | 2 | 9 / 9 | 5 | 0 |
| N2 | 2 | 9 / 9 | 5 | 0 |
| N3 | 2 | 9 / 9 | 5 | 0 |
| F-css | 1 | 2 / 0 | 0 | 2（CSS URL） |
| F-font | 1 | 4 / 2 | 0 | 2（WOFF2 URL） |

N 冷访问每组 2 CSS + 2 字体，暖刷新每组 2 CSS + 3 字体请求事件（Outfit 相同 URL 有重复事件）；不是 9 次网络传输。暖刷新对应 5 个 `requestServedFromCache`，`fromDiskCache=false`，与内存缓存命中一致；不能只看 HTTP 200 或 disk flag 推断重新下载。N 没有观测到重定向、失败、service worker 控制/响应；冷请求 h2/TLS1.3，返回证书 issuer WE2，未忽略 TLS 错误。CSS cache-control 为 private/max-age86400，WOFF2 为 public/max-age31536000。这只能说明本次路径，不证明原失败时缓存/TLS/代理正常。

以 N1 为例，ResourceTiming 的 A 约 611ms、B 约 248ms；实际 CDP 起止/响应 timing、cache、依赖与返回 CSS hash 见 network-N1~N3.json。跨域 ResourceTiming 的 responseStatus=0 不能当 HTTP 失败，实际状态由 CDP 的 200 支持。无凭据的代理环境变量存在性检查四项均 false；没有输出全环境/代理地址。OS/PAC/VPN、网络设备、历史代理与服务器连接日志 unknown；本轮没有切换代理/TLS/网络来归责。

F 在独立诊断页面使用 route.abort('connectionclosed')，只失败一个指定域，其他请求继续；不作用于原失败用例或完整回归，不返回空 CSS/200。F-css 的两条 requestfailed 和两条 console error 与原记录形态一致，未取得字体 CSS，因此无 gstatic 依赖。F-font 的 CSS 均 200，但 WOFF2 失败，五个使用中的 FontFace 状态为 error。两者没有 pageerror，菜单仍展示。F 注入会禁用该页 HTTP cache，故不与 N 做缓存性能比较；它证明传感器可见和降级形态，不证明真实链路发生相同故障。

所有样本的 document.fonts.ready 都曾 resolve；F-css 没有注册 face，F-font 存在 error face，故 ready 不是成功判据。早期 ResourceTiming 快照可能早于部分字体完成，CDP 全程继续记录到页面关闭；本报告不依据单一快照宣称网络完全静止。没有生成或保存字体二进制资产。

## 可证伪假设与未排除项

| 假设 | 证据/裁定 |
| --- | --- |
| 双入口必然导致连接关闭 | 三次旧用例及三组自然页面仍有双入口而成功，反驳“必然”；没有去重对照，因果关系未证实 |
| 本地缺失资源/碰撞逻辑直接导致该错误 | 原失败 URL 均为外部 CSS，游戏已到最后 RUNNING 截图；不支持此解释；未据此验收所有游戏行为 |
| CSS 连接失败会让原错误传感器报错 | 原现场和独立 F-css 同形态，高置信支持；不是对历史网络根因的归责 |
| 字体文件层失败等同 CSS 层失败 | F-font 显示 CSS 200、字体 error；原记录是 CSS URL，层次不同 |
| 缓存、TLS、代理或外部链路瞬时问题 | 本次正常 TLS/暖 cache 不足以排除历史异常；缺少原网络时序与链路日志，unknown |

复现率只描述这些小样本：原目标自然网络失败 0/3，独立 N 页面 0/6 导航（暖访问与冷访问相关，不能当六个独立网络样本）；F-css 1/1、F-font 1/1 按注入产生故障。原完整首失败仍是 1 个用例/60，不转写为自然网络总体故障概率。

## 修复路线比较（均未实施）

| 路线 | 价值 | 代价与限制 | 建议 |
| --- | --- | --- | --- |
| 同源自托管 Outfit/Orbitron，合并为一套本地 @font-face | 去掉运行时 Google 字体域依赖，保持原字体风格，版本可固定 | 许可/来源/hash、包体与缓存更新由项目负责；同源服务器失效仍会报错 | 推荐提交主审，获批后实施 |
| 保留外链但只保留覆盖两族/字重的一个入口 | 减少 CSS 请求和重叠声明，改动小 | Google 不可达仍失败；不能称为连接故障修复或离线方案 | 可作为清理或短期选择，不能单独关闭本问题 |
| 全部采用系统字体栈 | 无字体下载，字体离线可用，新增包体近零 | 平台字形/字宽/换行不同，Orbitron 风格丢失，视觉变化最大 | 产品接受外观变化时的替代方案；不可提取 OS 字体冒充可分发资产 |
| 只增加重试、改断言或过滤网络错误 | 不能消除依赖 | 会掩盖首失败或降低传感器约束 | 不推荐，也未实施 |

来源/许可初核（2026-11-03，通过官方仓库文本读取）：[Outfit OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/OFL.txt) 标明 Outfit Project Authors / 2021，[Orbitron OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/orbitron/OFL.txt) 标明 Orbitron Project Authors / 2018，均为 SIL OFL1.1，后者有保留名称 Orbitron。分发应保留版权与许可证；转换/子集化需核对修改版与命名条件，字体本身不能单独售卖。这里只初核 upstream 文本，不等于已核准某个二进制文件；main URL 可变。Google FAQ 跳转到 fonts.google.com/faq 且无可读正文，未用它作为许可结论。批准后必须固定仓库 revision、原文件、衍生过程和 hash，再作具体许可验收；不从第三方镜像猜测许可。

## 拟修最小范围与验证计划

另批建议白名单：`index.html` 移除 Google link，`src/style.css` 移除 @import 并声明本地 @font-face；新增 `public/fonts/` 对应字体文件、许可证/来源清单及专属新测试/证据。不需要改 main、渲染、物理、公共 afterEach、依赖或 PAO-19 UI。若离线验收证明既有 PWA precache 未包含字体，再单独申请 vite.config.ts 最小 glob 扩展，不先修改配置。初步字重覆盖 Outfit 400/600/700/900、Orbitron 500/700/900；先审实际全页使用和所需字符，不凭本菜单删字重/字形。

新增来源数据建议为 family、style、weightRange、unicodeCoverage、upstream URL+revision、source/output SHA256、licensePath、RFN、转换工具与参数、byteSize、缓存版本。优先选有明确来源的原始可分发文件；若需转 WOFF2/子集化须单列许可核验和可复现步骤。当前菜单实际请求的 WOFF2 Content-Length 合计 44,092 字节，仅是观察量，不是自托管包体预算；全字符/其他平台/生产压缩成本待量测。采用带 hash 文件名、明确缓存版本和更新回滚，不依赖过期远端 CSS；预加载只考虑实际首屏必需文件并测重复传输。

获批后先写新 RED：两外部字体域不可达时，本地首屏与指定字重仍加载、无 Google 请求，旧 requestfailed/console 传感器不变；本地字体 404 的独立 F 测试必须仍报告错误，禁止空响应掩盖。再实施单一方案，量测 document.fonts 的加载结果/实际字形而非只看 ready 或声明族。冷缓存在线应通过；应用和字体已缓存后的离线刷新应通过；全新未缓存浏览器完全离线无法取得应用，应明确不承诺。生产 build/preview 上验证 Service Worker precache 清单、升级/旧缓存失效/回滚；本轮仅 dev 页面，没有验收 PWA 离线行为。

视觉对照至少菜单、HUD、暂停、商店、结算，桌面/390竖屏/小屏横屏、200% 字体、长数字/缺字；量测换行、按钮命中区、溢出/遮挡和加载前后布局位移。必须真实截图独立查看，保留 2~3 关键图及异常扩看。随后 build、完整 unit、原断言不变完整 E2E、专项 N/F、独立视觉验收全部通过，保留首失败和逐次参数。跨树移植前由 Dispatcher 审查此固定文本提交，批准实现白名单、确认目标基线及 PAO-19 CSS 单一写入者；不直接合并两个活动树。

## 交付保护与限制

本轮实际打开 N1、F-css、F-font 三张 1280×720 菜单截图：无明显溢出/遮挡，字体失败后的标题/数值字形和控件纵向位置可见变化。不外推游戏中角色取景、竖屏或新 UI 已验收。新图只存本机忽略目录，绝对路径/hash 见 [visual-index.json](../evidence/QA/font-request-diagnosis/v1/visual-index.json)。

全部 1202 个原跟踪普通文件 SHA256 前后相同，四份原始只读输入不变；gitlink 不遍历。新增跟踪内容仅本报告及 `docs/evidence/QA/font-request-diagnosis/v1/` 纯文本。内容/引用/JSON/diff/白名单/敏感字段检查后正常 commit，hook 的 build/unit 不跳过；首次 push -u origin HEAD 并核远端 SHA，具体固定交付 SHA 以本次提交/最终回复为准。检查摘要见 [checks.json](../evidence/QA/font-request-diagnosis/v1/checks.json)，保护结果见 [protection.json](../evidence/QA/font-request-diagnosis/v1/protection.json)。未实施、未关闭历史首失败、未更新共享总纲或任务状态。

首次正常 commit exit1：hook 在执行 npm 前遇到 `/bin/bash: C:/Program Files/nodejs/npm: No such file or directory`，没有形成提交。核查发现 bundled Git 有 sh/dash 而无 bash，PATH bash 为系统 WSL 入口。仅在本树忽略目录创建 npm 的 sh 启动入口，逐参调用同一安装的 node.exe / npm-cli.js，并只为提交进程前置 PATH；不改 hook、不跳过 build/unit、不改系统/仓库配置。最终正常 hook 与推送结果在最终交付回复中报告。
