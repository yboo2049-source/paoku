# PAO-19 HUD安全区producer独立主审

2026-11-05，Asia/Shanghai。结论：**接受producer阶段**。仅审本轮producer阶段；生产帧、相机消费者及跨分支集成尚未接线，不将本阶段结果算作角色避让或真机验收。

## Git与范围

复用D:/worker/paoku-sessions/pao-19，分支codex/pao-19-ui，HEAD及指定远端均为b474845a972005b83f1278884b7dbe02c8af9615，工作树干净。设计基线ff02092344fcef2f5a96f29f9762a01ea5043907为祖先。未新建树、合并、移植或启动其他Agent。

审查本批15个文件：生产修改仅src/ui/dom.ts和新增src/presentation/hudSafeArea.ts，另有两份专属测试、计划及证据。main/render、旧布局CSS/视图及旧测试未改。API包括measureOcclusion/readOcclusion/invalidateLayout/subscribeLayoutInvalidation/resetLayout/disposeLayout。

核对不可变值、CSS viewport与buffer单位转换、顶部包络及4px扩张、1/64量化、revision/epoch/generation租约、同帧读缓存、未就绪回退、reset/dispose和重入通知；未发现当前阶段阻断项。宿主仍须显式驱动量测，不能因此声称生产帧已发布可用占区。

## 验证与证据

- 任务方完整70/70 E2E、270单测、build及新测试类型检查通过；其512857.041ms完整成绩保留，与主Agent结果分报。
- 主Agent独立build、18文件270/270单测、新测试显式tsc通过。使用12个E2E文件的输出重定向镜像，未改请求、断言、时钟或跳过条件。
- 主Agent首份临时配置testDir相对层级写错，返回No tests found，未执行测试；原配置/日志保留，修正配置后才执行实际套件。这是主审工具配置错误。
- 实际完整运行的日志已完成58项通过，随后验证会话退出，末12项未执行，没有该段最终成绩JSON（同配置--list随后生成的70 skipped为列举元数据，非执行成绩）；不能记成单次70/70或用该日志推断退出原因。另以固定剩余标题补跑12项，12/12通过，124286.225ms，0 skip/retry/flaky，进程exit0；没有重跑已通过项或失败重试。
- 源码保护清单30项hash均未变。主审证据留本树忽略目录.pao19-hud.local/main-review-b474845/，不覆盖原交付证据。

实看本次独立运行桌面1440、390长文本/四buff、暂停旋转200%三张F量测图；占区边界对应可见卡片/按钮，暂停模态按诊断边界处理。F背景残留模糊属于隔离量测场景，额外查看N桌面HUD图确认自然页面，角色在画面内且HUD可读；该树沿用自身旧场景，不进行PAO-17主题重验。未据F图声称新相机避让成功。

## 后续边界

PAO-18仍是未提交且有两处已复现缺陷的本地实现，见[18独立预审及修复提示词](2026-11-05-pao18-fact-bridge-local-review.md)。先由18原任务修正、完整门禁后交固定SHA独立验收，再规划唯一集成者串行接线。当前不自动合并两树、开放19的main/render写权、标父18 Done或调整依赖。车尾/预览继续延期。

收口：主Agent累计70个不同用例均通过（58＋12分段，非单次完整70/70），30项保护hash仍一致，Git仍干净。接受b474845的producer限定交付，生产帧/相机接入继续待串行集成。
