# PAO-19 正式实现送审记录

## 范围、授权与阶段
本树 codex/pao-19-ui，从943aad1接续（含19aa314），开工工作区干净；没有reset、合并或启动其他任务/Agent。正式授权、主审及主规划PRD/架构/系统流程/测试/PROGRESS固定输入38b4f34；AGENTS实际提交604685b。writing-plans计划位于 docs/plans/2026-11-01-pao19-ui-implementation.md。PAO-7仅本任务适用UI条目获准，角色/场景及机型预算不随之冻结。

A先实现dom/views/style与HTML两处声明，保持main只读；A-checkpoint.md记录build、249单测及48 E2E全通过、原main无差异、接口和截图主观自查。其后才进入同聊天B接线。B的main改动限于生命周期通知、同身份在途去重、失败/未知命令原样保留及旧Toast协调；原暂停屏障、封存时机、应用服务、schema、模拟/输入/物理/渲染/资产/依赖未改。

## 最终行为
- 桌面侧卡、竖屏底卡，浅实体卡片与系统字体；中文四页，旧商店与音频入口/关键id保留。原商店的EQUIPPED文案保留以兼容既有断言。
- m/s真单位；结算只读summary，缺失不借ctx填币或分；钱包、权益、偏好均取AppSnapshot。
- 四道具独立SVG/名称/只读剩余秒数；滑板同时检查active布尔值，失效板不因残留timer显示保护。
- 小屏四道具采用获准的靠边紧凑列回退。原底部两列会压住人物脚部，已用浏览器断言及截图改为边缘列；大字体时该列可独立滚动，触摸不会同时进入游戏输入。
- 48px目标、按钮四态/焦点、safe-area及dvh、长数值换行、短屏卡片滚动、reduced-motion；初始弹窗聚焦对话框容器以保留暂停输入拒绝诊断和标题读取，Tab进入首按钮并限制在活动弹窗，背后HUD inert。
- Toast最多1可见+3等待，去重、溢出、textContent、旧页/旧局清理；页面隐藏时暂停展示计时。错误为活动卡片/局内固定反馈，不从Toast字符串反推事务，也不随出队重复播音效。
- pending发生在dispatch前；300ms/5秒仅等待文案，不自动重发。旧run结果不清新run等待；成功失败均回收匹配身份。递延同ID命令只建立一次等待；初始化/finish无pending时不伪造一般命令等待。
- 音频连续明确点击各自排队，不吞第二次操作；失败后原样重试复用原ID/字段目标；修改同字段值创建新意图并淘汰旧视觉重试目标。main缓存失败/未知命令的值，重试复制外壳而不改冻结摘要；UI不发币、不存档、不改业务事务。

## RED→GREEN 与证据
- red-models.log：新投影模型不存在；red-browser.log：旧英文开始按钮未满足新页要求。
- red-B-receipts.log：main未接通时无pending/result，随后集成单测通过。
- red-B-terminal.log：未知结束命令重试复用冻结对象无法结束；复制命令外壳后 green-B-unknown.log 两项通过。
- red-hoverboard.log / red-buff-layout.log：失效板/中央遮挡；green-final-fixes.log验证四道具、未知提交及音频连点回归。
- red-modified-volume.log：丢失UI确认后先改值再回原值，错误复用旧ID；已通过按字段区分修改与重试修正。此夹具只注入UI回执丢失，不宣称服务写入丢失；另有真实存储确认故障用例。
- 最终build/test/E2E以 final-build.log、final-test.log、final-e2e.log 实际结尾为准；最终结论在检查完成后补入下节。
- 完整回归镜像只重定向证据输出路径；全部原断言保留，旧测试除用户新增批准的PAO-6单行起跳触发外不改。prepare-regression.mjs及final/mirror-manifest.json记录来源/镜像哈希。默认配置未改；本机忽略配置使用5189 strictPort/reuseExistingServer=false与ANGLE D3D11。
- 原始尝试中Windows对旧证据文件写入报UNKNOWN；改为本任务新目录。曾见外部资源连接关闭和旧PAO-6截图时序敏感的尾部碰撞；失败与重试均留日志，不把重试后通过伪称首次通过。未删断言、跳hooks或改物理。

## N/F与视觉覆盖
N：新上下文、无QA模式、真实键盘和CDP触摸完整开始→操作→暂停/继续→自然失败→重开→返回；final/N-keyboard.json、N-touch.json与key-*.png记录。触摸版本按钮也用CDP触点激活。F：只读UI布局投影、长数值/四道具/200%字形、模拟inset、错误/等待、保存/锁/旧run、未知提交、音频字段排队与重入重复命令各自独立，不混作自然成绩。F-runtime-four-buffs为实际运行世界拾取四道具后的竖屏截图，区别于静态UI投影夹具。

矩阵1440×900、390×844、320×568、844×390，保存DOM命中框/溢出量测layout-*.json。普通文字对比约10.04:1/5.82:1，禁用文字4.76:1，按钮hover6.998:1，边框/紫/危险边线均>3:1，见contrast.json；语义色不用于浅底小字。截图均无未完成进入动画（目前不使用进入位移动画），自然结果等待保存状态完成再采集。

待主审的关键图：final/key-desktop-hud.png、final/key-mobile-start.png、final/key-mobile-result.png。另附final/F-runtime-four-buffs.png检查侧列与人物，异常时扩看四视口布局图。旧场景/角色仍为M1表现，不在本任务重做，也不宣称已达到PAO-15/16/17/18美术品质。

## 尚未验证与交接
模拟inset与桌面Chromium触摸模拟不是iOS/Android真机签收；未验证系统手势、刘海设备、移动GPU品质。外部字体link是旧HTML遗留，本次HTML只改lang和viewport，不扩大白名单。旧报告内硬编码518x字段保留历史测试文本，实际服务身份以本任务raw源码/hash及配置5189为准。

历史原件恢复与哈希结果见historical-restoration.json；最终只暂存任务白名单。主规划共享文档/PROGRESS仍由Dispatcher同步，实施方未改。完整交付只送Linear In Review，主Agent独立验收后才能Done；不自动合并或启动17/18/20/21。

## 后续明确授权与触摸修正
用户明确批准PAO-6旧测试在跳跃前增加await reach(page,31)，全部原断言保留，详见单行diff及pao6-scope-request.md。此前原夹具在19aa314旧UI/CSS对照中也有1/3失败，固定触发方案3/3通过。新增授权已经先记录到本任务实施计划。
真实CDP触摸曾出现touchend后没有兼容click；保留touch-debug日志，UI层对移动小于10px的单指按钮触摸在touchend中取消兼容点击并只激活一次原按钮，移动/取消不激活，滑杆/滚动仍走原生行为。键盘/鼠标与业务桥不变，避免漏操作或重复TOGGLE。

## 最终验证结论
- 最终npm run build exit0；npm run test：17文件、251项全部通过；完整npm run test:e2e：56项全部通过，exit0，本轮无重试项，历时5.7分钟。
- 真实触摸完整流程额外连续两次通过且不启用重试（touch-adapter-green.log）；最终完整回归再次覆盖键盘和CDP触摸N流程。
- 最终十个源码文件在完整回归后哈希与运行前一致，独占5189新服务raw源码逐一匹配；横屏左右模拟inset各44px时实际外边距各68px，底部45px，scrollWidth=844，无横向溢出（final-source-after.json、final/F-landscape-insets.json）。
- 已查看最终三张主审关键图及实际四道具竖屏图；未见UI遮住中央人物或前视路线。开始页音频区按方案在有限高度卡片内滚动；短屏/200%文本可滚到最后操作。继续/重开后释放原按钮焦点，保留游戏键盘动作。
- historical-restoration.json确认892个历史证据原件逐一哈希相同，旧根截图与已跟踪test-results元数据恢复；新增回归写本任务目录。暂存范围须再次机械检查，仅任务白名单与用户新批准的PAO-6单行。
- 仍未测实体手机及其系统手势/真实刘海。当前送审是UI实现和桌面浏览器验证，不是全部美术或真机签收。提交后更新Linear In Review，不标Done。
