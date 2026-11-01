# PAO-16 第一批技术标定 Spike

2026-11-01，Asia/Shanghai。用户手动授权dd82d22之后的有限技术探针；非正式美术制作、非游戏接入、非真机预算签收。PAO-16与父任务不标Done，下游未放行。

## 输入与方法

固定树 `D:/worker/paoku-sessions/glb-review@7a2fb2963deae061d15deae4019910a15f0dfbcf`。仅普通车厢train_ramp_or_car、带坡工程车train_metro、hurdle低栏、slide高栏；副本在忽略目录`.pao16-local/inputs`，与manifest/旧原件按SHA256核对。输入无新增源文件、手工编辑、烘焙或贴图优化。

实施设计见主仓 `docs/superpowers/specs/2026-11-01-pao16-calibration-spike-design.md`，本树[实施计划](../../../plans/2026-11-01-pao16-calibration-implementation.md)。使用writing-plans、executing-plans、TDD及verification-before-completion；按AGENTS职责分派几何、独立预览与QA，主Agent审查代码、真实截图和交付结果。未引入PAO-15/19代码。

离线解析完整scene节点矩阵，三角形交点量测带node/mesh/primitive/triangle/局部点与重心权重，AABB仅诊断/取景；未验证语义或歧义的点保留null/TODO。刚性轴向与等比拟合先行，不实施非等比修改。逻辑表面/盒由既有M1定义只读镜像到独立工具，不能改变物理容差。

预览显式RH scene，glTF不再转换成默认LH；真实loader世界顶点与离线scene点比较。源TRS只应用一次，候选scene→asset→logic→world另记，RH预览不证明未来默认LH游戏加载已校准。工程车只一个模型根，对应RAMP/ROOF两个逻辑调试目标，不重复加载黄坡。

## 可复现入口

工具与测试的具体命令、诊断JSON和TODO见工具目录及本次结果；本地服务独占5186、strictPort，Playwright reuseExistingServer=false，ANGLE D3D11。完整回归镜像和本地配置、保护清单、完整日志与批量旧图保留`.pao16-local/`，通过本机info/exclude忽略，不改共享.gitignore。

新单测RED：[red-unit.txt](red-unit.txt)（模块尚不存在）；预览RED：[red-preview.txt](red-preview.txt)（入口尚未实现）。这些失败不属于交付通过结果，后续GREEN与完整回归单独记录。

## 结果索引

- [诊断数据](../../../assets/pao16-calibration-spike.json)：四件源哈希、实测点、候选矩阵、残差/分类；不是生产绑定配置。
- [技术TODO](../../../art/pao16-calibration-todo.md)：源几何歧义、需要派生修整/作者确认、正式美术与性能缺口。
- `regression-summary.json`：完整旧E2E镜像与保护核对，原断言不删改。
- `preview-verification.json`：四件HTTP/raw源码/loader点一致性与浏览器状态。
- 三张新技术图：工程车坡顶叠加、高栏净空、普通车轮廓；只看指定关键图，不全量重渲染其他资产。

本探针为F技术夹具，不是自然输入N玩法证明。完整旧E2E结果也不代表新资产已进入游戏；未做角色脚底自然跑坡或新玩法验收。具体美术、许可、移动真机预算及正式派生资产仍未获签收。

## 实测与候选诊断

| 文件 | 本批技术分类 | 实测 / 候选诊断 |
| --- | --- | --- |
| train_ramp_or_car | 测点待复核 | 原始三角形车顶中央交点sceneY=0.419346454；长轴X；无可靠语义前后标记，±90°均保留。按长度等比的显示探针使中央车顶约5.140m，高于3m逻辑目标；这是比例诊断，不是车顶物理尺寸 |
| train_metro | 暂列需派生修整，同时端点待复核 | 沿源X=-.42/-.25/-.08的顶面交点Y=.072966161/.170851002/.268735843，证实向+X上升；RH Y=-90°映射向+Z。临时内点对应：固定轴刚性RMS6.353m、等比RMS1.910m；精确坡脚/坡顶/车顶边界仍null |
| obstacle_hurdle_barrier | 暂列需派生修整 | 中央杆底/顶sceneY=.607910156/.735351563；两脚交点近Y=.0021/.0018。按外宽等比显示时杆顶约1.619m，不能直接接当前1m高逻辑；此处只报告显示试配与实际几何点 |
| obstacle_slide_barrier | 暂列需派生修整，全宽净空待复核 | 既有节点X旋转后，中央梁底sceneY=.511088780、两柱底≈0；中央净空约.511089源单位。临时柱脚/梁底对应：刚性RMS.759m、等比RMS.300m；全宽/全深通行证书仍null，Y旋转面向符号未批准 |

三个“需派生修整”均为调查优先级，不是对所有刚性/等比适配可能性的数学否定。内点未被证明是端点，因此临时对应残差不能冒充正式端点残差；没有一件被标为可生产接入。`semanticEndpoints`显式null，实际三角形采样/轮廓证据仍保留。车厢显示采用-90°不等于已确认前向；未来同一RH数值搬入LH游戏须另验手性，不能照抄。

## 工具审查与保护

初始RED后补充审查发现无效数值可能不抛错，新增[red-review.txt](red-review.txt)复现；修复后[green-unit.txt](green-unit.txt)8/8通过，包含真实合成GLB的显式父matrix/子TRS/交错索引顶点测试、往返/重复转换、非零Y、空交点和等比残差。本轮完整252项单测的结果来自完整运行，非引用历史244项。

几何子代理因执行额度中断，主Agent接手补完审查、数值防护、分阶段矩阵、刚性对照与验证；另外两代理未完成的中途日志也不作为通过结果，完整回归在当前会话重跑。未跳检查或更改物理解决工具问题。

保护清单初始950文件覆盖src/public/旧测试/旧证据；最终核对以`regression-summary.json`为准。旧游戏截图抽看`.pao16-local/regression-output/screenshot_3_gameplay_chase.png`：人物位于中央路线、HUD可见，仍是既有霓虹场景，非新风格/新GLB验收。

## 最终验证与视觉复核

`npm run build`退出0；工具独立tsc退出0；完整`npm run test`为17文件252/252通过。完整旧E2E最终43/43通过，命令含`--retries=1`，实际零重试、零flaky、零跳过，退出0；独立预览四资产检查为1/1通过（更新诊断文案后又完整通过一次）。两次早先完整回归各42/43，分别遇PAO-14传感器读取为空和PAO-6跑坡夹具GAMEOVER，原始JSON/日志保留忽略目录；原因未证实，旧夹具/传感器时序稳定性仍为限制，不声称本探针已修复。未改旧断言、模拟时钟或物理。

最终950个受保护文件全部未变；四原GLB、输入副本、HTTP字节哈希一致，游戏raw源码身份一致。完整镜像10个旧测试文件的反向还原均逐字节匹配，只有证据输出位置重定向。数据见[regression-summary.json](regression-summary.json)与[preview-verification.json](preview-verification.json)。完整日志、原始输出JSON、批量旧图保留`.pao16-local/`，不挪进正式资产。

主Agent已打开下列三张真实技术图，观察见[visual-review.json](visual-review.json)：

- [工程车坡顶叠加](1-train_metro.glb.png)：单完整车含自带坡，青色逻辑目标与橙色采样面不一致，红线仅临时对应残差。
- [高栏净空](2-obstacle_slide_barrier.glb.png)：柱脚下沉、梁底偏高；当前朝向牌面反向/不可读仍为TODO，不据此艺术修正。
- [普通车轮廓](3-train_ramp_or_car.glb.png)：可见驾驶室、车灯和完整轮廓；按长度等比后宽高明显超过目标。自动几何未识别语义前向；单视图推断source -X为头、+90°可作为后续假设，尚未采纳或冻结，并非证明模型对称。

工程车中心剖面采样角约29.933°、M1目标26.565°，提示坡/平车顶相对夹角风险；精确边缘/坡脚仍待复核，不能将剖面估计扩大为全表面证书。上述图不替代运行时脚底连续性、移动真机或正式美术签收。

正常hooks保持开启（本机Git缺bash时仅在忽略目录加临时npm入口，直接执行现有Node npm-cli，未改hook/未跳build/test）。提交暂存区仅白名单，推送与远端SHA以最终交付报告为准；不合并、不标PAO-16 Done、不自动解锁下游。
