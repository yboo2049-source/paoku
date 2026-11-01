# UI / main / audio 适配记录

只写 `src/main.ts`、`src/ui/dom.ts`、`src/systems/audio.ts` 及本任务证据。实施前读取本任务计划与架构规范；Dispatcher 的 `red-browser.log` 实际复现缺少 getAppSnapshot，再进入实现。

- DOM 不拥有钱包、持久化、应用状态、结算或交易；按钮提交意图，UI 从 AppSnapshot / SimSnapshot 读取。删除 HUD 文本反读与 ctx 写入。皮肤配置归应用目录，HTML 模板与基线在仅统一行尾后逐字节相同；未改样式/布局/selector。
- main 在命令接收边界捕获当前 runId，显式传入的 runId 不覆盖。服务批准应用状态后才投影模拟生命周期；非持久化开始/暂停/恢复保持同栈同步隔离，旧 PAO-10 assembly 测试保留。
- simulation.step 完成后观察一次 ENDED，创建不可变摘要并结算。退出/重开先封存摘要；QUIT 使用 Simulation.abandon 保留世界/账本，失败不清理也不新建局。成功释放旧局后才清世界，重开由应用提供唯一新 runId。
- app 状态/高分/钱包只作为渲染兼容视图字段，未回写模拟。旧 adapter 的无效赋值 setter 仍是 no-op，以兼容既有 UI mock；实际 DOM 已无写入。legacyView 每次固定一个 AppSnapshot，getter 不反复复制账本。
- 音频的生产单例禁用旧九键适配，应用版本化记录成功后通过 applySettings 注入五项设置。独立默认 AudioEngine 构造保留旧设置适配供已有客户端/单测；未改 DSP、音色、播放调度或效果生命周期。

已运行 `npx tsc --noEmit`（ui-types.log，exit 0）和既有 pao10-main/audio 单测（ui-unit.log，2 文件10项通过）。完整 build/unit/E2E、真实截图由 Dispatcher 在冻结源码后执行；本报告不冒充已执行浏览器视觉检查。待整合审查项通过与否以最终任务报告为准。

## 边界补验

独立审查发现两项真实边界，Dispatcher 的真实浏览器 RED 也予以复现：存档锁阻塞时暂停意图未立即阻止输入；COLLISION 同步监听器重入 GO_MENU 可能封存上一 tick。已增加 main 边界的暂停输入 barrier（不抢先发布应用状态），以及 tick 中终止意图的身份捕获/提交后延迟处理。完整 collision tick 先封存，再执行迟到的菜单命令。同步服务已接受暂停时立即释放临时 barrier，保留旧同栈恢复行为。

补充执行 `npx vitest run --config docs/evidence/PAO-14/ui-boundaries.config.ts`：ui-boundaries-red.log 记录2项真实失败，ui-boundaries-green.log 为2/2通过。probe 位于证据目录，单独显式执行，不混入既有默认测试集。首次探针的两次非诊断性通过（时钟基线/跨测试 mock 总线缓存掩盖路径）保留在 ui-boundaries-baseline-nondiagnostic.log，不算 RED；修正夹具后才记录真实失败。最终同一 probe 再验通过；整合期间曾出现临时暂停 barrier 未同栈释放导致旧恢复单测失败，已修复并由最终 ui-unit.log 的10/10覆盖，未修改旧断言。

新增浏览器 focused 回归又发现初始化视图缓存遗漏：旧余额250且仍选 cyan 时，迁移前后 revision 都为0，余额文本已更新但购买按钮仍沿用零余额 disabled 状态。真实失败见 focused-browser.log / runs/focused/e2e.log 与对应 error-context。修复为按钱包、全部所有权和选中皮肤生成商店视图 fingerprint，renderShop 使用同一个冻结快照；不依赖迁移时 revision 是否改变。修后 tsc 与上述10项相关单测通过，浏览器定向重跑由 Dispatcher 继续。

最后一轮 accepted 完整回归还暴露 native range 的异步时序：ArrowRight 已将原生控件从60调到61，而存档提交前的每帧渲染又将它覆盖为旧快照60。保存锁确定性浏览器 RED 和真实旧用例失败由 Dispatcher 保留；纯 UI 补充探针 ui-controls-red.log 也记录 expected61 / received60。最小修复为两个 range 聚焦期间保留原生编辑草稿，未聚焦才用已提交服务偏好回填；草稿不成为钱包/存档权威，不改音频 DSP 或外观。ui-controls-green.log 为1/1通过，最终 ui-types.log 和 ui-unit.log 再次通过，dom.ts 的 diff --check 通过。浏览器最终验收结果由 Dispatcher 报告。
