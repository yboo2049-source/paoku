# PAO-18/19 类型修复接续及唯一完整门禁回执

2026-11-06，Asia/Shanghai。**本批未通过完整门禁：103/106通过、3项新增失败，exit1；全部WIP保留，未提交/推送。** HEAD仍为d303633e2539a26ca595438b51216a02900df92f。原树codex/pao18-font-diagnosis不变，无新worktree/reset/clean/stash/合并/Agent/Linear操作。

依据：[类型失败独立主审](D:/worker/paoku/docs/reviews/2026-11-06-pao18-pao19-integration-types-review.md)、[获批实施计划](D:/worker/paoku/docs/plans/2026-11-06-pao18-pao19-approved-integration-execution.md)。[首次停止记录](README.md)及其原始类型失败/RED文件保留；本文件为后续状态，不将旧记录覆盖为绿。

## 已修正的三类类型问题

- rebuild-ui的10处绝对动态导入在原浏览器回调中经局部URL参数导入；URL、vite-ignore、调用次序不变，无Node外层helper。
- mobile分支在按原构造关系必有CDP的位置显式收窄；缺失抛错，原触摸事件和等待不变。
- 新integration unit局部engine恢复真实Engine方法类型，setSize回调由真实签名推断；size捕获和返回true行为不变。未用类型忽略/伪造声明/降低检查。

TypeScript AST核对rebuild-ui固定B19与当前130个expect调用文本一致，所有/src/ URL列表一致，无类型忽略。见[validation-details.json](validation-details.json)。源生产四blob继续逐字匹配b474845，不因类型问题修改producer。

完整显式新测试tsc两次exit0，日志为[types-followup.txt](types-followup.txt)、[最终types-followup-final.txt](types-followup-final.txt)；目标5文件37/37通过，见[target-followup.txt](target-followup.txt)。

## 中间失败与有依据的修订

1. build与unit并行时，新integration unit首次实际导入Babylon超出默认5秒预算。将模块加载移到测试文件收集阶段，断言/预算不变。原[unit-followup.txt](unit-followup.txt)保留。
2. 后续unit与浏览器并行时，未修改的trackSegments 18m/s用例超时。未改旧文件/断言/预算；停止并行重检查后原命令串行复验，34文件352/352通过。两次失败及最终[unit-serial-followup.txt](unit-serial-followup.txt)均保留，不宣称从未失败，也不把负载相关性当游戏根因。
3. 首次新增浏览器目标组6/7通过，资源用例第二次快速重开超时。已有trace中两次restart点击开始时间36771.461/36986.302ms，间隔214.841ms；固定B19 UI有300ms triggerRestart防连点。只在本轮新增资源测试每次完成重开后等待该300ms保护，原断言/60秒预算不变，不动生产UI或其他旧测试。单项修改后复验1/1通过；不把6/7与1/1拼写为某次7/7。最终完整运行中的7项新增用例才是单次全部通过依据。

上述原始大输出均在D:/worker/paoku-diagnostics/pao18-pao19-integration-20261106，未覆盖。最终运行前重新显式tsc通过、镜像重新编目，之后没有改生产或测试代码。

## 唯一一次完整E2E

[完整回执/保护](followup-gate.json)、[三个原始错误](full-failures.json)、[原始工件索引及SHA256](artifact-manifest.json)。

| 项目 | 实际结果 |
| --- | --- |
| 实际列举/执行 | 20个E2E源文件、106项；清单与运行分开保存 |
| 固定条件 | 5198 strictPort、不复用、workers1、retries0、ANGLE D3D11；DEBUG=vite:time,vite:transform；原load/60000ms和错误收集保留 |
| 开始/耗时 | 2026-11-06 14:55:03.465 UTC（22:55:03.465本地）；945240.377ms |
| 总结果 | 103通过、3失败；exit1；skip/retry/flaky均0 |
| 新集成文件 | 7/7在本次完整运行中通过；包括桌面/390、最大HUD、dirty/异常事实交付、暂停旋转、DPR实际buffer及20轮/10reset/dispose |
| 原车尾用例 | 本次ramp-roof-jump-land通过；源码/等待/断言未改，不带B19额外reach(31)，不据单次通过关闭历史问题 |
| 发布资格 | 不符合。三项新增失败均不在已批准单项车尾例外内；未运行提交hooks、未提交/推送 |

先前聊天进度按末次成功用例的执行序号播报，不是精确累计通过数；最终以本表JSON统计103/3为准。

### 三项新失败的精确位置

| 原目标文件 | 失败位置/实际结果 | 已知与未判定 |
| --- | --- | --- |
| tests/e2e/pao18-fact-bridge.spec.ts:75用例 | :92点击pause-restart后等待PLAYING，60000ms总预算超时 | 最后可见页面仍PAUSED。未改该旧测试，未重跑、未恢复车尾调查；故障恢复/实际重开交付原因未定位 |
| tests/e2e/pao19-hud-safe-area.spec.ts:70键盘生命周期 | :76回到MENU后ready()；:50预期READY，实际UNREADY/reason=DIRTY | 生产分支改为读host缓存后未在该处获得READY；不能据此直接判producer或业务故障 |
| 同文件:191触摸生命周期 | :198暂停后ready()；同样预期READY，实际UNREADY/DIRTY | 原CDP触摸流程及断言保持；主机发布时序/失效时序待主审裁定 |

现有trace、网络请求、error-context和服务日志全部保留；具体绝对路径及hash见artifact-manifest。按用户要求，完整结果出现新运行时失败后停止，不为以上三项追加修复、扩大旧测试写权、加等待/retry或再次完整运行。后续可先只读审这三个trace，明确重开是否实际提交、缓存读取与下一次host量测的先后，再决定最小修复窗口；以上只是审查入口，不声称已建立根因。

## 本轮图、视频及投影/资源证据

已实际查看本次完整运行的三张原始截图：[桌面最大HUD](visual/F-maximal-1440.png)、[390最大HUD](visual/F-maximal-390.png)、[暂停旋转](visual/F-paused-rotation.png)。N真实键盘/390 CDP触摸与F长数字/四buff/Toast、故障/QA命令/显式buffer分报；UI-only最大HUD夹具不冒充模拟真实道具或自然分数。

对应完整原始数值在根外full-final/integration/：F-maximal-1440/390、N-production-1440/390、F-paused-rotation、F-buffer-DPR2和F-resources.json。普通/最大HUD的三实体最终projection.front/safe通过；模态只诊断且pose/FOV和实际组保持冻结，不承诺模态旋转后仍重新构图避让。

视觉额外观察：390的15位数字压力夹具中，Toast与速度卡背景有14 CSS px纵向相交（数值文字仍可读）；桌面无此相交。该固定19布局压力表现如实记录于validation-details，不改已验收UI设计，不将“角色投影safe”扩大为HUD彼此不重叠的证明。

原视频保留于根外full-final/artifacts/，含新N输入、F暂停旋转以及旧F-ramp-jump-slide-pause.webm。对新N桌面与F旋转视频按明确时间点抽帧实际查看；原始文件hash与抽帧时间在根外visual-review/。本机精简ffmpeg不支持所尝试的fps/tile组合，失败输出保留；随后仅用原生单帧解码，未修改视频。抽帧不能替代完整动作自然性验收，当前仍是旧角色/旧clip别名，不签收正式runner或新动作。

暖机实测：[F-resources.json](F-resources.json)。20轮失效与10次原UI重开后：
- 新增host监听4、observer1、订阅1、probe1均不增长；mesh102/material26/texture8/group7/skeleton1前后相同。
- dispose后新增host监听/observer/订阅均0、probe0、renderer RELEASED、scene已释放；重复dispose和迟到font/resize不复活。
- 不把本桥释放扩称UIManager所有旧全局监听已全部治理。

## 保护、源码与当前边界

- 四份生产TS的Git blob全部匹配固定B19；87项非白名单可写文件SHA256不变。
- 20个full-final测试镜像可逆还原并匹配当前批准目标字节；仅输出重定向和已批准录像导航5188→5198，无过滤/skip/预算改动。
- 收尾全量Git检查发现输出隔离漏项：旧gameplay.spec.ts:101/106/114/119/125/131仍向根目录六个screenshot_*.png写入，本次完整运行暂时覆盖了同名历史图片。它们未被92项关键SHA清单覆盖，故87项通过不能代替全量历史保护。已先将本次生成图完整备份根外root-output-preserved，再仅将六个历史图片恢复为d303633原字节；源代码WIP未动，未使用reset/checkout/clean。原/新/恢复后hash和路径见[root-output-restoration.json](root-output-restoration.json)。当前全量tracked差异仅剩六个获批可写路径。此次full仍有输出隔离缺口，是否触发重载或与三项失败相关未建立因果；不能宣称整个运行满足“全部产物根外”，也没有据此重跑。下一窗口须先补这六个本机镜像输出映射。
- raw/HTTP身份用例均通过，具体源hash和通过用例清单见followup-gate。
- 当前tracked git diff --check通过，暂存仍为空；所有WIP和本机失败产物保留。
- 5198已无本次实际监听；没有停止其他服务、安装依赖或改默认配置。
- 未合并、不标父18 Done、不解除15/17依赖，不接新runner/正式资产或恢复车尾/预览。

本轮不是“仅类型通过后等待”：已继续build、完整unit、浏览器目标组、唯一完整106项及本轮图/视频/保护。因最终三项新失败主动停止，交Dispatcher独立主审；没有新的固定实施提交可交付，HEAD/远端同步起点仍为d303633。
