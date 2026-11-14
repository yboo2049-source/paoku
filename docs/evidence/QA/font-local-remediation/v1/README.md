# 同源字体 A 方案交付记录（待独立主审）

本树 `codex/pao18-font-diagnosis` 接续 `e6a52b1a88db911581c6b88b119d54c356ff9774`，工作区 `D:/worker/paoku-sessions/pao-18-font-diagnosis`。实施与初轮完整回归发生于2026-11-03；2026-11-04规范化许可文本后重新build/unit/PWA及完整回归，原测试ISO时间不改写。字体修复已完成本树验证，等待Dispatcher独立验收；不表示原渲染树已移植或父PAO-18 Done。

## 实现与写权

- index.html仅移除Google字体link；src/style.css仅移除Google @import并新增两族本地@font-face。Outfit/Orbitron、fallback与font-display:swap保留，UI布局/字号不改。
- 新public/fonts包含原始TTF、对应OFL和METADATA、来源清单与说明；新fontResources.test.ts和font-resources.spec.ts验证二进制、加载/真实字形、HTTP身份、独立404传感器及页面矩阵。
- 用户在本聊天另批两项最小例外：vite.config.ts新增 `includeAssets: ['fonts/*.ttf', 'fonts/*-OFL.txt']`；忽略目录PAO-18镜像仅将第161行导航字面量5188改5198。原测试文件、断言、时钟、超时不改。
- 旧证据的若干baseURL字段仍保留历史字面量；实际端口以config/导航与新HTTP身份为准，均为5198。

## 文件与许可身份

官方仓库固定revision：`2fe1e8c6b137fb13041a7cfca6fdcd8a910ea4dc`，通过官方Git引用取得；GitHub API首次限流后使用固定raw URL，不使用镜像或可变main作为具体文件的依据。

| 字体 | 原文件字节 | SHA256 | 原轴 / CSS注册轴 |
| --- | ---: | --- | --- |
| Outfit | 110884 | fc7287273e66929776e2ba54f144fe699080bec29f61bf649d70d871468aeade | 100–900 / 100–900 |
| Orbitron | 38576 | f42db2dd16e642258e35782916eceb1dcdbea06fb958d77ad71dc5963587e8fd | 400–900 / 500–900 |

[原始来源清单](../../../../../public/fonts/sources.json)、[来源核验](font-source-verification.json)记录同revision的具体二进制、同目录OFL/METADATA URL/hash、嵌入版权/名称、fvar及cmap。两份字体均为原字节拷贝，无转换、子集化或内部重命名；Outfit有360、Orbitron有207个映射Unicode码点，原覆盖完整保留。

两族均为SIL OFL1.1，版权及完整许可随文件提供；Orbitron保留名称仍为Orbitron。保留许可/版权，不单独销售字体，修改/转换/子集化需另核名称和分发条件。本批未生成修改版字体；容器文件名加入内容hash，内部名字不变。文本许可/元数据验证将checkout CRLF规范回上游LF，字体二进制始终按原始字节计算SHA。

原API只声明Orbitron 500/700/900，因此未显式设置的normal 400样式实际选择500；本地CSS保留这一匹配。CDP实测Orbitron 400样式使用Orbitron-Medium自定义字形。Outfit内部旧族名为Outfit Thin，按已核SFNT name验证，不将CSS族名与内部旧族名混淆。

字体负载合计149460字节；两许可8813字节，新增字体及许可预缓存负载158273字节；整个public/fonts目录174454字节。这些是本批文件/解码后字节，不是全游戏包体或传输性能预算。未加预加载。

## RED、修正与最终检查

| 阶段 | 实际结果 |
| --- | --- |
| 本树新baseline build / unit | exit0；27文件292项通过 |
| 新unit RED | exit1，缺本地资源清单 |
| 真实应用E2E RED | exit1，2失败：实际请求两Google CSS；独立本地404夹具没有本地字体URL |
| 初次字形观测 | 错将Outfit Thin内部族名当CSS族名且未等待排版，已保留失败；修正观测后定向2/2通过 |
| 原配置生产PWA | 字体在线200，但SW/cache无字体；清HTTP cache后两族NetworkError，exit1 |
| 批准includeAssets后生产PWA | exit0，2字体/2许可进入预缓存，清HTTP cache后离线实际face加载成功 |
| 实际Vite构建A→B→A | exit0；各阶段离线face加载、切换壳版本、清理旧字体cache key并回滚通过 |
| 最终build | exit0，既有chunk提示保留 |
| 最终完整unit | exit0，28文件293项通过 |
| 新测试显式tsc | exit0，使用本机Node类型目录；未改依赖/锁文件 |
| 首轮完整E2E | exit1，63/65，0 skip/flaky/retry；首失败保留 |
| 冻结版完整E2E | exit0，65/65，0 skip/flaky/retry，502291.093ms |
| 缺字实际平台回退补充 | exit0；两族均有自定义及系统字形参与，无Google请求/正常网络错误 |

命令与结果见[checks.json](checks.json)及对应日志。最终完整命令为 `npm run test:e2e -- --config .pao18.local/font-remediation/final-full.config.ts`；全部15个旧suite和1个新suite共65项，镜像可逆验证见[mirror-check.json](mirror-check.json)。5198独占、strictPort、不复用服务、1worker、retries0、ANGLE D3D11。新测试类型检查使用 `tsc --ignoreConfig --noEmit --target ES2023 --module ESNext --moduleResolution bundler --lib ES2023,DOM --typeRoots C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@types --types node --skipLibCheck tests/unit/fontResources.test.ts tests/e2e/font-resources.spec.ts`。

[N字体/字形](N-fonts.json)验证Outfit 400/600/700/900、Orbitron 400/500/700/900的真实FontFace加载及CDP自定义字形，原始HTML（仅排除Vite注入）和raw CSS与磁盘相符，[HTTP身份](N-http-identity.json)验证实际本地响应字节/SHA256。没有以ready或声明族单独判成功。外域不可达约束下实际Google请求为0；完整旧回归未安装字体拦截器。

[F本地404](F-local-404.json)在独立页面返回真实404并保留全部console/requestfailed及FontFace拒绝，不作用于原回归；[缺字回退](fallback-glyphs.json)证明系统字体实际参与。没有过滤旧afterEach、返回空CSS或成功响应掩盖错误。

## 缓存、更新与离线边界

[pwa-final.json](pwa-final.json)记录生产preview有实际worker控制、字体cache条目、在线HTTP和清HTTP cache后的离线加载；不是dev模式缓存推测。首次未缓存浏览器完全离线无法获取应用，不承诺首次离线安装。

[update-clean.json](update-clean.json)使用两个真实Vite输出：B在本机忽略副本中改变字体版本URL和壳标记，字体字节保持已核原件。A→B激活后A字体cache key清除；回滚A后B key清除，每阶段均清HTTP cache并离线加载。它验证部署缓存生命周期，不冒充真实新字体版本的视觉验收或外部发布。

离线F同时保留既有 `/models/player.glb` 未预缓存造成的错误；只证明字体离线通过，不宣称完整游戏资产离线。未扩围缓存GLB。

手工改壳的早期夹具分别遇到：body外comment被应用重建删除、过宽的全应用无错误期待、只换CSS而漏掉JS预加载依赖导致的旧CSS请求失败。相关首次日志/数据保留。最终改用真实Vite构建，未据这些夹具失败修改游戏或过滤原传感器；干净B构建检查通过。

## 视觉与矩阵限制

桌面1280×720、390×844、横屏844×390，菜单/HUD/暂停/商店/结算分别正常及F 200% root字体+长数字/中文/Ω/emoji，共30份状态截图/量测，见matrix-1280/390/844.json。F使用去ID可视克隆，避免实时UI更新抹去合成文本，截图后恢复；没有改变模拟、时钟或生产UI。部分导航通过DOM分发，不能当原生触摸命中区验收。

实际查看最终桌面菜单、390 HUD、390压力菜单及原CSS对照；此前亦扩看横屏/结算等异常。正常桌面/竖屏字体可读，原风格保留；横屏和200%长文本存在裁切，原CSS对照也有相同形态，未修改布局来隐藏。外层card矩形受max-height约束，不能仅凭其在viewport内就断言内部内容无裁切。[原CSS对照](original-menu-comparison.json)通过，但未声称全矩阵视觉完美或逐像素相等；截图文件hash不同，不作像素等同结论。已选图及SHA见[visual-index.json](visual-index.json)。

## 首失败、执行偏差与保护

首轮完整63/65的两项均保留于full-first-results.json/full-first.txt：N-mobile-production-touch发生执行上下文被导航销毁；当时生产/public清单仍被调整，可能触发Vite刷新，未取得独立导航trace，不把它确认为继承物理问题。另一个PAO-18录屏硬编码5188导致连接拒绝，有明确现场，随后用户批准仅镜像导航适配5198。最终固定13个输入hash后重新完整执行，期间hash不变；没有retry覆盖首失败。

首轮镜像还遗漏六个gameplay根目录截图输出重定向，覆盖了本树原截图。新输出先保留在忽略目录，再从固定Git对象恢复，并逐一匹配起始SHA；没有reset或清理其他成果。该执行失误明确保留在[root-screenshot-incident.json](root-screenshot-incident.json)，最终镜像已逐条重定向这些输出。不能将本轮过程描述为所有原件从未被写入。

最终1219个原跟踪普通文件中，只有已授权index.html/style.css/vite.config.ts改变，其余1216字节hash与起点相同；原诊断及原始四输入仍不变。Gitlink不遍历。HTML/CSS排除字体段后与固定起点一致，Vite排除批准includeAssets行后一致。[保护检查](protection.json)、[原输入](original-inputs-integrity.json)、[冻结输入](frozen-inputs.json)保留核对结果。没有修改旧测试/main/render/physics/19 UI/依赖/共享总纲或其他树。

本机QA脚本、生产副本和全部其余媒体留在`.pao18.local/font-remediation/`，只纳入专属证据与选图，未新增交付工具。来源于[批准实施计划](../../../../plans/2026-11-03-font-local-remediation-execution.md)及本聊天的两项明确扩围。正常hooks后提交、推送及远端SHA核验结果以最终交付回复为准；保留树供主审，不创建Agent/聊天、PR或合并，不自动改变父任务状态。

收尾许可文本各去除一个上游行尾空格，字句/版权/分发条件完整保留；public清单及来源核验分别记录原始licenseSourceSha256与规范化licenseSha256，TTF原字节未改变。原日志保留本机，跟踪文本只做LF/尾空白/EOF规范化；raw与规范化SHA见[log-normalization.json](log-normalization.json)。许可规范化前的65/65及旧冻结输入保留在full-before-license-normalization-results.json/frozen-before-license-normalization.json，最终表格对应规范化后再次完整执行的结果，并重新通过生产PWA及A→B→A检查。
