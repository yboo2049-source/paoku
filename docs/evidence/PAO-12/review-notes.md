# PAO-12 独立审查

日期：2026-11-01（Asia/Shanghai）。先写计划，按白名单分为物理、核心接线与 QA 三个隔离职责；Dispatcher 复核核心 diff，核心子 Agent 独立只读复核物理，不自行修改物理文件。

## 核心边界

Simulation 仅在输入之后、前进积分之前创建当前 tick 的 XYZ 值，再作为 physics 回调第三参数传递；没有新增跨 tick 历史、时钟、积分或持久缓存。main 仅包装转传第四参数，并在 podium/QA位置/QA车道/世界清空四处调用接触重置。原两参回调和直接 physics:updatePhysics 用法保留兼容。核心3项测试先 RED 后 GREEN，见 red-core-origin.log、green-core-origin.log。

## 发现与修复

1. Dispatcher 发现 departure 只看旧侧别与接触点，会把向内再入也豁免。物理先加 RED，再限定相对分离方向；扩展覆盖原移动车顶追上玩家的后缘再入。
2. 核心审查发现拾取监听器同步重入可让内层结束后外层再发一次 COLLISION。先补 RED，再在最终伤害阶段复核 GAMEOVER。普通碰撞回调重入与 standalone 通知去重亦有独立测试。
3. 核心审查发现 rollTimer==dt 时，只有整段滚动盒而遗漏最终站立盒。先补 RED，再增加 t=1 站立盒判定；dt=0 已到期与帧内到期均有覆盖。
4. 物理自验捕获 legacy 玩家无 invulnerableTimer 时错误不结伤，改为沿用缺省无无敌语义。保留现有 standalone 支撑/重力后续更新。

独立最终相关4套回归86/86、类型检查与限定 diff 检查通过，测试记录于 review-regressions.log；Dispatcher 的 build.log 亦包含最终 tsc 通过证据。Dispatcher 统一 build exit0、全量单测146/146通过后冻结源码/测试，交 QA 完整浏览器验收；最终结果以 README.md 及最终 runs 目录为准。

## 结论与限制

当前未发现剩余阻塞项。contacts 是纯几何查询，TOI/法向/稳定ID裁决与拾取后的单次伤害决定分开；无模块级运动 Map，不借旧 supportSample 作为运动起点。surfaces.ts 和所有既有测试保持原样。

本次仍沿用线段扫掠、离散支撑、端点范围拾取及旧事件桥，不声称完成 PAO-9 全部模型/事件契约。渲染与资产完全只读，正式模型代理对齐需主 Agent 协调后续验收。

## 浏览器发现后的第二次复核

首轮完整浏览器23/25中，旧PAO-6真实跳离路径暴露顶沿跨tick连续性缺口。物理先用真实两tick车尾及左右边缘轨迹新增RED，再延续已确认的下降顶接触：每障碍局部计算候选，按TOI/ID稳定提交既有singleowner departure，仅在身体仍重叠原owner且继续相对分离时有效。未放大尺寸/容差，未知初始重叠、向内再入和移动列车追上仍伤害。

核心独立复核相关4套93/93、类型和diff检查通过，见 review-airborne-edge-regressions.log。Dispatcher第二次统一 build-final.log exit0、test-final.log 153/153后重新冻结源码与测试，完整浏览器复验保存至 runs/verified-final。首轮23/25及全部失败原迹保留，不能作为最终通过证据。
