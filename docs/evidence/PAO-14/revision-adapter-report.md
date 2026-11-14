# PAO-14 主审 P2：音频意图适配

2026-11-01。先读 revision-plan.md 与主 Agent 的 2026-11-01-pao-14-review.md，等待真实浏览器 RED 完成并恢复历史后实施。只修改 main.ts/dom.ts；未改 HTML/CSS、布局、音频 DSP、渲染、物理或其他任务。

DOM 的 MUSIC/SFX 按钮改为 UPDATE_AUDIO 的 TOGGLE 字段操作，range 的原生 input 事件改为 SET_VOLUME 字段/数值操作；不再在点击时从旧 AppSnapshot 计算完整 audio。main 将操作装入 AppCommand.audioOperation，并明确不为 UPDATE_AUDIO 填入局 runId。HUD 主静音的旧 TOGGLE_AUDIO 事件仍保留，由 main 转成 masterMuted 切换操作。旧 SET_AUDIO 事件及其完整设置 payload 桥保持兼容。

操作的串行化、校验和受锁事务由应用角色实现，本适配不提前发布未提交设置。暂停输入 barrier、终局封存/迟到命令处理及 focused range 的原生编辑草稿逻辑未更改。

自验通过：revision-adapter-types.log（tsc exit0）、revision-adapter-unit.log（旧 main/audio 10项）、revision-adapter-boundaries.log（独立边界2项）、revision-adapter-controls.log（focused原生草稿1项）；main/dom 的 git diff --check 通过。仅新的修订日志被更新，不覆盖原release证据。

真实浏览器 RED、完整E2E及截图验证由 Dispatcher 统一执行；本角色未运行浏览器或查看截图。源码已冻结，未提交。
