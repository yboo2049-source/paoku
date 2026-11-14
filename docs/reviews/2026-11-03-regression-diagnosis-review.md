# 车尾连续接触与字体请求诊断主审

2026-11-03（Asia/Shanghai）。本轮接收诊断，不代表修复通过；原15完整45/46、18完整59/60保持未关闭。

## 固定提交与范围

- 车尾：`8af24af083b369f3f8dc8bb883a861975b9972af`，codex/pao15-roof-diagnosis，本地/远端一致，干净，614179d为祖先；新增30份报告/纯文本证据。
- 字体：`e6a52b1a88db911581c6b88b119d54c356ff9774`，codex/pao18-font-diagnosis，本地/远端一致，干净，5bd31cc为祖先；新增17份报告/纯文本证据。
- 两树均未改生产源码、旧测试/断言、资产、依赖或共享总纲。两份diff --check通过；独立核对车尾SHA256SUMS和字体manifest共44条文本hash（各自约定LF字节），全部匹配。原报告分别为[车尾](D:/worker/paoku-sessions/pao-15-roof-diagnosis/docs/reviews/2026-11-03-roof-exit-diagnosis.md)、[字体](D:/worker/paoku-sessions/pao-18-font-diagnosis/docs/reviews/2026-11-03-font-request-diagnosis.md)。跨树链接用于本机审查，不声称报告已合并入主规划。

## 车尾：根因机制接受，高置信，修复未实施

主Agent对照physics.isSupportSweep、surfaces.resolveSupport及既有sweptCollision边缘离开/重入/未知重叠测试。诊断指出的缺口存在于“顶面交点在有限面内、同一步终点已在车尾外”：支撑采样按终点不落到车顶，碰撞在顶面交点给免伤，但离开记录又按交点判断未建立；下一步仍重叠却无同owner连续性，成为time0致死。

独立临时QA从本提交实际Simulation、updatePhysics、sweepAABB导出建立96/97/98三个固定输入，不运行或修改交付方采集脚本。相同起始速度18.020833333333332下：96与98运行至z62仍RUNNING；97在tick138免伤且supportDeparture=null，139记录time0/normalY+1碰撞并ENDED。事件位置z42.11395833333329/y2.9183333333333388与原现场严格数值匹配。与诊断的逐tick机制一致，不是只接受文字推断。

首次主审QA误将物理回调中已经递增的sim.tick再加1，定位138记录时sweep=null导致TypeError；原始脚本保存为本机replay-first-error.mjs.txt。核对Simulation步序后仅修QA标签，未改模拟、输入、断言预期或游戏源码，重新执行三对照断言通过。主审结果位于`D:/worker/paoku-sessions/pao-15-roof-diagnosis/.pao15-local/main-diagnosis-review-8af24af/`。

诊断方31个跳跃tick扫描中97失败、其余30成功，以及继承重建和202tick观测重放作为补充证据接受；本主审没有重新执行全部扫描。原浏览器镜像3/3、观测1/1成功不覆盖既有首失败；重建局部tick97不能冒充原浏览器缺失的绝对输入身份。截图/按键时序是触发边界的因素，不足以否定固定步机制。保留合法正面碰撞、未知初始重叠和向内重入致死的既有契约。

## 字体：错误层定位接受，历史网络根因仍未知

独立读取N1/N2/N3、F-css、F-font结构化记录和定向结果：N三组共6次冷/暖导航无错误；F-css保留两个CSS URL requestfailed及对应console error，F-font区分CSS成功与字体文件失败。原定向3/3属于本次样本，不替换原完整59/60。重复入口在成功样本仍存在，不能当作连接关闭的已证根因；历史代理/TLS/外链瞬时状态没有原请求trace，继续unknown。

接受“固定来源/许可后自托管保持两族风格”作为待批准的可用性改进路线；不将它包装成历史网络归因。报告对上游许可仅文本初核，具体二进制、revision、来源、分发/修改条件仍待实施前逐项核验，本主审不作商业许可批准。去重外链无法单独消除外部不可达，系统字体路线会带来视觉变化。

## 视觉与检查边界

实际打开车尾观测run4的roof-contact与roof-exit-land两图、字体N1与F-css两图；旧页面主体可读且无明显溢出，字体失败的字形/尺寸变化可见。车尾成功截图不能证明原失败修复，旧霓虹/legacy画面不是新主题或新runner验收。

本轮为文本诊断主审，独立检查Git/hash/源码与固定步反例；未重复完整游戏E2E、两任务build/unit或自然网络采集。交付方正常hooks/269与292基线单测成绩保留为交付记录，不改写成主Agent本轮重跑。没有游戏实现改动、Agent启动、树合并/删除或Linear变更。

## 下一步

接收两份诊断，生产修复尚未批准。已整理[最小修复设计](../superpowers/specs/2026-11-03-regression-remediation-design.md)供具体范围审批；不重做角色样本、控制器或17主题。批准后复用两棵现有诊断树，重新核验HEAD与写权，再准备实施计划/手动提示词，不新建树。真正修复须先行为RED→GREEN、保留原断言与首次失败、完整build/test/E2E及独立视觉验收；父任务/依赖不随诊断通过解除。
