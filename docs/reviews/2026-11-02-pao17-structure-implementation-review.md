# PAO-17 首批结构与生命周期主审

2026-11-02（Asia/Shanghai）。**已批准A→B首批阶段验收通过，未发现该范围内阻塞缺陷。** 输入 `codex/pao-17-render@536f54b41866e2819d21cd674e64af2cb4d70f80`，接续fcddba1。只验收渲染所有权拆分、内部生命周期、I-01/I-02，不将父PAO-17标Done或放行18/生产资产。

## Git、白名单与依赖

- 本地/远程任务分支SHA一致；跟踪内容无未提交改动，任务方`.pao17-local/`临时证据仍未追踪，未纳入提交。主审工具/输出只放本机忽略目录`.pao17-parent.local/`，未改实现分支。
- 相对fcddba1变更限批准文件及任务文档/证据。main只改类型导入、同次render取样/legacyView应用投影参数和disposeGame幂等释放桥；types/core/systems/application/modelBindings/DOM/HTML/CSS/public、依赖/默认配置和旧测试均未修改。diff检查通过。
- 独立复核初始999项保护清单：仅main、babylon和两份任务设计/接口状态文档改变，其余995项原件一致；主审本轮1078个跟踪文件前后hash一致。gitlink不遍历其内容，保留原提交身份。
- Linear PAO-17仍Backlog，16/9的整体依赖保留。本次为用户明确批准的结构子范围；未合入15/16/19、未联系其他聊天/派发/合并或更新父状态。

## 实现审查

assets持renderer级加载/容器和实例租约，entityViews管理原有动态几何/材质/阴影差分，environment迁移旧环境。独立抽取旧/新buildCyberEnvironment及mergeStaticEnvironment两个方法，换行规范化后函数文本完全一致；旧600m循环和冻结矩阵的主题算法缺口继续递延，不把结构拆分描述成新主题完成。

I-01经实际main调用测试和源码复核：一次presentation(alpha)提供context/runId/tick/discontinuity，同回调一次应用快照提供appState与legacy投影；渲染只同步给定插值位置，同run/tick断点只消费一次。帧类型局部定义，Map对抗写入使用原immutableCopy防护，模拟不新增权威。

I-02实际调用renderer.dispose，注销相同skin/resize回调，清理实例/caster/租约、特效、共享缓存与Scene/Engine，保留外部Canvas。故障/晚到请求、空几何和部分挂载失败的回滚均有专属测试，生产绑定与正式组合仍未启用。合成RAMP/ROOF测试只证明显式key去重与非零基点，不是实际生产工程车组装或真实RH/LH标定。

## 独立运行与视觉

- build通过；21文件261/261完整单测通过；完整48/48 E2E通过（旧43＋专属N2/F3），315.045秒，0重试、skip、flaky、unexpected。
- 五个实际实现模块raw字节及legacy player磁盘/HTTP hash匹配；12份测试镜像仅重定向证据输出，可反向逐字节还原全部原断言。5187独占strictPort、无复用，Windows Chromium ANGLE D3D11，保留全部原始输出。
- 原专属真实main浏览器用例从生产模块入口调用disposeGame，Engine/Scene资源归零；实际renderer的404 fallback、20轮实体创建/删除、10次reset、旧回调/晚到替身及宿主Canvas用例通过。
- 主审另补真实legacy GLB成功加载检查：确认renderer缓存1、租约1、7个动画组、1个骨架；充分暖机后20次真实reset/render资源计数稳定，最终全部归零。独立补充F最终1/1通过，7.318秒，0重试。完整回归与补充F分报，不把它算进原48项。
- 真实HTTP延迟故障：GLB请求未完成时销毁renderer，引擎实际发出net::ERR_ABORTED；活动请求/缓存/租约和全部Scene资源归零，无pageerror。该取消路径的上游loader Promise没有结算；本检查证明取消与资源所有权释放，**不证明任意请求Promise均会结算或浏览器堆内存完全回收**。晚到成功容器的释放另由原受控测试覆盖。
- 仅抽看本轮桌面、390触摸、390重开三张自然输入图：角色/跑道/HUD可见，无新空白画面或横向溢出。保留旧Glow过强、追逐者裁边及重开首帧菜单展台占下部取景；环境/相机参数未重设计，旧KM/H界面也未合入PAO-19修订。上述是兼容验收，不作为明亮主题/新UI/正式动作/真实车坡品质签收。

[主审精简证据](../evidence/pao17-structure-parent-review-536f54b.json)记录结果、raw/保护和真实GLB故障。全部主审日志、可逆镜像与截图位于任务树`.pao17-parent.local/`；三图在`output/PAO-17/structure-lifecycle/parent/`。

## 首次失败与限制保留

任务交付保留A首次45/47、加载夹具等待/自然路线修订、B真实释放RED、root-only/挂载回滚RED及正常hook冷启动超时；本轮不抹去这些记录。主审复核最终测试仍执行真实main入口、完整旧断言和明确故障，未见删断言、skip、放宽物理/模拟时钟的过关方式。正常hook冷启动修正只在专属main单测预载真实Babylon依赖，不是运行时性能承诺。

主审新增F亦保留两次探针修正：首次只渲染一帧就立基线，观察到阴影纹理8→9，改为8帧实际暖机后20次重开恒定；另一次等待引擎取消后的loader Promise结算超时，结合本机scene/loader实现及真实ERR_ABORTED改为检查请求终止/资源归零。两次日志/JSON留本机，未改生产实现或掩盖持续增长，也不把未结算限制写成已修复。

## 剩余范围

本批可作为后续技术基线；正式生产元数据/四件GLB、I-03事实事件/I-04生产绑定、真实组合实例、城市主题段/灯光/预算、正式角色动作/镜头、15/16/19最终汇合仍待专门设计/批准与固定接续提交。PAO-16自动候选不因本次主审升级为生产合格；PAO-18也不因结构子阶段通过自动启动。
