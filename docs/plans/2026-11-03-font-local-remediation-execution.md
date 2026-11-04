# 同源字体 A 方案实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在真实 paoku 页面用核验身份/许可的本地 Outfit / Orbitron 替换 Google 字体依赖，保留原错误传感器。

**Architecture:** 两个原始 variable TTF 分别注册 normal 字体及完整 weight range；不转换/子集化，不更改 fallback、font-display:swap 或 UI 布局。来源使用 google/fonts 固定 commit，原二进制、同目录 OFL 与 METADATA 建立 hash 关联。生产 PWA 沿用现有配置，实证漏缓存时停在配置扩围，不自行修改。

**Tech Stack:** CSS @font-face、Vitest、Playwright / Chromium D3D11、Vite-PWA。

批准依据：主规划 `docs/plans/2026-11-03-regression-remediation-execution.md` 第1/3/4节、`docs/superpowers/specs/2026-11-03-regression-remediation-design.md` 与诊断主审；本树固定起点 e6a52b1a88db911581c6b88b119d54c356ff9774，codex/pao18-font-diagnosis，初始干净。用户指定当前会话执行，不另选 Agent/会话，不合并。仅完成全部门禁后一次正常提交；本计划不要求提前提交 RED。

## Task 1：固定保护与基线（先于生产修改）

1. 核对顶层/分支/HEAD/status/common-dir；保存全部原跟踪普通文件 SHA 到忽略目录 `.pao18.local/font-remediation/`，原诊断与证据只读。
2. `npm run build`、`npm run test` 保存新 baseline 与 exit；不迁移旧成绩。
3. 审核 index/style 字体入口与使用：Outfit body/main（400、600、700、900），Orbitron display（500、700、900；默认 normal 需保留 400 匹配能力）。界面英文、数字/标点为字体主覆盖；汉字/字体不含字符仍使用已有 sans fallback，不删 Unicode 字形。记录所有实际声明字重，并在浏览器验证指定字重及缺字 fallback。

## Task 2：写真实应用 RED

Create: `tests/e2e/font-resources.spec.ts`、`tests/unit/fontResources.test.ts`。

1. E2E 在真实首页注册与旧 suite 等价的 pageerror/console warning,error/requestfailed 收集；独立 context 阻断 Google 两域但不响应成功。
2. N 期待 Google 请求列表为空；主动以 `document.fonts.load` 请求 Outfit 400/600/700/900、Orbitron 500/700/900，返回 face 必须 status=loaded 且 family 正确。用 CDP `CSS.getPlatformFontsForNode` 验证实际显示字形来自 custom font；HTTP 内容与清单 hash 相同。
3. 独立 F 让本地字体 URL 返回真实 404，期待 requestfailed 或 console error 与 font load rejection，并保留原完整错误列表；不把 F 拦截应用到完整旧回归。
4. unit 验证清单中的文件字节/hash、固定 revision、许可对应与 sfnt weight/字符表；无清单时首先得到具体资源缺失失败。E2E RED 必须因外部请求/本地 face 未建立而失败，不仅因缺文件。
5. 使用本机临时 config 5198 strictPort/reuseExistingServer=false/retries0/1worker/D3D11；执行 `npm run test -- tests/unit/fontResources.test.ts` 与 `npm run test:e2e -- --config .pao18.local/font-remediation/target.config.ts`，分别保留初次日志与结果。

## Task 3：具体来源/许可核验与最小 GREEN

Create: `public/fonts/` 原始 TTF、两族 OFL、`sources.json`、来源说明；只修改 `index.html` 字体 link 与 `src/style.css` 顶部字体导入/声明。

1. 官方 `https://github.com/google/fonts` 经 git ls-remote 固定 revision `2fe1e8c6b137fb13041a7cfca6fdcd8a910ea4dc`（本批读取所得）。GitHub contents API 首次被限流，保留失败；转用固定 raw URL，不使用镜像或可变 main。
2. 在忽略目录先取得同 revision 的 `ofl/outfit/Outfit[wght].ttf`、`ofl/orbitron/Orbitron[wght].ttf`、各自 OFL.txt / METADATA.pb，核对 sfnt name、fvar、cmap 与版权、OFL1.1/RFN；配套文本与二进制来自同路径/commit。不明文件不注册。
3. 清单记录 family/style/range/requiredWeights/Unicode 实际范围、upstreamURL/revision、原/output SHA256、byteSize、licensePath/hash、版权/RFN、no conversion 与缓存版本；文件名加内容 hash。源/输出字节必须相等。
4. CSS：两个 `@font-face`，normal、原范围、swap，src 同源 /fonts/内容hash.ttf；移除 HTML link 与 CSS @import。保留其余 CSS/HTML 字节与 UI。
5. 每次实现修改后 `npx tsc --noEmit`、`npm run test -- tests/unit/fontResources.test.ts`；跑新 E2E GREEN，并保留 RED。

## Task 4：生产 PWA 实证（先不扩配置）

1. `npm run build`，核对 dist 字体 hash / sw.js precache 条目；5198 启动 `npm run preview -- --host 127.0.0.1 --port 5198 --strictPort`，不复用服务。
2. 生产页面实际字体请求/身份、worker activated/controller、缓存键及字体条目；清 HTTP cache 后 offline 刷新必须仍加载实际 face。首次未缓存离线不承诺。
3. 若字体不在 precache 或离线失败，保存新证据，向 Dispatcher 提 `vite.config.ts` 最小 `includeAssets: ['fonts/**/*.ttf']`（按实际文件/匹配核定）扩围；不更改默认配置，未获批不继续依赖它的验证/交付。
4. 通过后才测 A→B→A 部署/回滚（仅本机忽略的生产输出拷贝，改测试版本 marker 与对应 sw revision，保留字体原字节；F 部署生命周期不冒充发布）。确认旧 worker/cache 失效及回滚后实际字体/缓存版本，原 dist 保护/恢复。

## Task 5：视觉与完整门禁

1. N 自然菜单/开始/HUD/暂停/商店/结束流程；F 长数字/缺字与200%字体文本不写生产源码。矩阵：桌面1280×720、390×844、横屏844×390；每页量测溢出/矩形/命中区域，标注旧布局异常，不改字号凑图。默认打开三张关键图，异常扩看。
2. 读取全部原 suite 建本机 `.pw.ts` 镜像，**仅可逆替换证据输出路径**，每份反向替换逐字校验，旧断言/时钟/超时不变，加入新专项。默认配置不改。
3. 最终 `npm run build`、`npm run test`、`npm run test:e2e -- --config .pao18.local/font-remediation/full.config.ts`；1 worker/retries0/D3D11。新增测试显式 tsc（复用可用 @types/node，若需本机 typeRoots 不改依赖）。raw index/CSS 与 HTTP 字体/hash 比对磁盘。
4. 另一项车尾失败/其他继承失败保存首现场，禁止重试换绿、修改物理或旧用例；不提交未过门禁生产修复，交 Dispatcher。

## Task 6：保护、证据与交付

Create: `docs/evidence/QA/font-local-remediation/v1/` 专属新证据，允许本计划更新实际结果。原诊断证据不变；共享总纲/依赖/配置/旧测试/main/render/physics/19UI只读。

1. 内容/来源/许可/引用审查、JSON/hash/文件白名单/原件保护、git diff --check，真实打开新图并记录范围。
2. 全绿后暂存仅本批白名单，正常 hooks `git commit`，`git push` 与 ls-remote 核 SHA；可沿用本机 sh→原 node/npm-cli 入口解决原 Git Bash npm 路径问题，不能跳 hooks。
3. 返回真实 RED/GREEN/完整计数、字节/缓存/离线/视觉限制/固定SHA。无完整门禁则只保留本地成果并报告具体扩围/依赖，不声称修复验收。

## 执行扩围回执
2026-11-03用户批准最小配置扩围：vite.config.ts 的 VitePWA 新增 includeAssets: ['fonts/*.ttf', 'fonts/*-OFL.txt']。依据生产实证：两字体在线200/正确字节，但sw/cache均无字体，清HTTP缓存后离线两族NetworkError。其余配置不开放。首次PWA QA把浏览器Request.url属性误作方法，已保存原脚本/日志；改观测后才取得真实缓存失败。


字体匹配细化：原 Google CSS 只声明 Orbitron 500/700/900，未显式设置字重的400样式实际匹配500。为保留该行为，完整原TTF仍保留400–900，但CSS注册范围设500–900；Outfit注册100–900。清单分开binary weightRange与cssWeightRange，E2E补测Orbitron 400样式的真实字形匹配。


镜像最小扩围回执：用户批准仅本机PAO-18镜像第161行导航URL从5188适配5198。原测试只读，逆转换包括输出路径及该单一导航字面量。旧证据中baseURL字段保留历史字面量，不能当实际执行端口，实际由config/新HTTP证据证明为5198。
首次完整为63/65，保留N-mobile导航上下文销毁及PAO18硬编码端口拒绝。生产/public清单变更期间Vite可能触发导航，该轮不作冻结验收。六根目录截图遗漏输出重定向，已保留新图并从固定Git对象按起始hash恢复；最终镜像补齐，不改旧原件。


## 2026-11-04收尾回执
字体A方案完成本树验证：build/293 unit/新测试显式tsc通过；冻结完整65/65、skip/retry/flaky均0，原车尾旧用例本次通过不外推原树修复。PWA字体预缓存/清HTTP缓存后离线/真实Vite构建A→B→A验证通过；缺字平台回退通过。首轮63/65与全部首失败保留；六根截图曾被旧suite写入，已按起始hash恢复。200%长文本/横屏旧布局裁切及离线GLB未缓存的限制不隐藏。详见 docs/evidence/QA/font-local-remediation/v1/README.md。等待正常hooks/提交推送与Dispatcher独立验收，不改变父状态。

收尾diff门禁发现上游两OFL含行尾空格。仅规范化许可文本尾空白/LF，完整保留版权/许可字句，清单分别记录licenseSourceSha256与本地licenseSha256；原始许可仍存本机固定revision获取目录，TTF原字节不变。原日志在本机保留，跟踪日志仅移除行尾空白及多余EOF空行；最终再执行完整冻结门禁。
