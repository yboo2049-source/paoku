# paoku 全面重构任务计划与 Linear 索引

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 通过完整可玩样板验证整体品质，再完成全内容重构。

**Architecture:** 整体设计逐段替换；模拟、表现与应用分层，状态快照驱动 UI 与 3D。阶段交付按 Linear 前置关系推进。

**Tech Stack:** Vite + TypeScript + Babylon.js；Vitest + Playwright；Linear 管理待办。

2026-10-31：用户已批准推荐总体方案与明亮风格化城市轨道方向，要求本轮仅定方案及创建任务，不实际编写游戏代码。当前计划为任务级交接；开工者在每张任务内细化失败测试、实现、验证和提交步骤。

项目：[paoku 全面重构](https://linear.app/paoku-v1/project/paoku-全面重构-418b8d61c3d3)。总纲：[PAO-5](https://linear.app/paoku-v1/issue/PAO-5)。所有任务为 Backlog，未分配负责人、工期或周期。规范以 docs/superpowers/specs/2026-10-31-paoku-complete-rebuild-design.md 为依据。

| 阶段 | 任务 | 前置 |
|---|---|---|
| M0 | [PAO-6 建立真实试玩、截图与旧功能迁移基线](https://linear.app/paoku-v1/issue/PAO-6/m0-建立真实试玩截图与旧功能迁移基线) | 无 |
| M0 | [PAO-7 冻结明亮城市轨道的同屏风格与资产规范](https://linear.app/paoku-v1/issue/PAO-7/m0-冻结明亮城市轨道的同屏风格与资产规范) | PAO-6 |
| M0 | [PAO-8 确定目标设备、局内节奏与性能预算](https://linear.app/paoku-v1/issue/PAO-8/m0-确定目标设备局内节奏与性能预算) | PAO-6 |
| M0 | [PAO-9 统一坐标、事件、数据模型与模块契约](https://linear.app/paoku-v1/issue/PAO-9/m0-统一坐标事件数据模型与模块契约) | PAO-6 |
| M1 | [PAO-10 建立固定步长、输入tick与可复现模拟核心](https://linear.app/paoku-v1/issue/PAO-10/m1-建立固定步长输入tick与可复现模拟核心) | PAO-9、PAO-8 |
| M1 | [PAO-11 统一地面、斜坡、车顶支撑与连续连接](https://linear.app/paoku-v1/issue/PAO-11/m1-统一地面斜坡车顶支撑与连续连接) | PAO-10 |
| M1 | [PAO-12 实现相对运动扫掠碰撞与单次伤害结算](https://linear.app/paoku-v1/issue/PAO-12/m1-实现相对运动扫掠碰撞与单次伤害结算) | PAO-10、PAO-11 |
| M1 | [PAO-13 重建带种子与可达性验证的关卡编排](https://linear.app/paoku-v1/issue/PAO-13/m1-重建带种子与可达性验证的关卡编排) | PAO-11、PAO-12 |
| M1 | [PAO-14 分离状态机、幂等结算、商店交易与存档](https://linear.app/paoku-v1/issue/PAO-14/m1-分离状态机幂等结算商店交易与存档) | PAO-9 |
| M2 | [PAO-15 制作正式原创角色与完整动作资产](https://linear.app/paoku-v1/issue/PAO-15/m2-制作正式原创角色与完整动作资产) | PAO-7、PAO-8、PAO-9 |
| M2 | [PAO-16 制作场景、完整列车、真实斜坡与代表道具](https://linear.app/paoku-v1/issue/PAO-16/m2-制作场景完整列车真实斜坡与代表道具) | PAO-7、PAO-8、PAO-9 |
| M2 | [PAO-17 拆分渲染并建立主题场景、材质与灯光](https://linear.app/paoku-v1/issue/PAO-17/m2-拆分渲染并建立主题场景材质与灯光) | PAO-16、PAO-9 |
| M2 | [PAO-18 实现状态驱动的角色动作与镜头协同](https://linear.app/paoku-v1/issue/PAO-18/m2-实现状态驱动的角色动作与镜头协同) | PAO-15、PAO-11、PAO-17 |
| M2 | [PAO-19 重做开始、HUD、暂停、结算与响应式设计系统](https://linear.app/paoku-v1/issue/PAO-19/m2-重做开始hud暂停结算与响应式设计系统) | PAO-7、PAO-14 |
| M2 | [PAO-20 统一动作、道具、列车反馈与音频生命周期](https://linear.app/paoku-v1/issue/PAO-20/m2-统一动作道具列车反馈与音频生命周期) | PAO-9、PAO-18、PAO-19 |
| M2 | [PAO-21 集成并评审完整可玩样板](https://linear.app/paoku-v1/issue/PAO-21/m2-集成并评审完整可玩样板) | PAO-13、PAO-12、PAO-18、PAO-19、PAO-20 |
| M3 | [PAO-22 完成全部道具的机制、造型与反馈](https://linear.app/paoku-v1/issue/PAO-22/m3-完成全部道具的机制造型与反馈) | PAO-21 |
| M3 | [PAO-23 扩展主题段落、路线变体与速度难度曲线](https://linear.app/paoku-v1/issue/PAO-23/m3-扩展主题段落路线变体与速度难度曲线) | PAO-21 |
| M3 | [PAO-24 完成商店、设置、加载与任务成就全流程](https://linear.app/paoku-v1/issue/PAO-24/m3-完成商店设置加载与任务成就全流程) | PAO-21、PAO-14 |
| M4 | [PAO-25 真机性能、画质分档与首屏加载优化](https://linear.app/paoku-v1/issue/PAO-25/m4-真机性能画质分档与首屏加载优化) | PAO-22、PAO-23、PAO-24 |
| M4 | [PAO-26 全局回归、视觉验收与迁移交付](https://linear.app/paoku-v1/issue/PAO-26/m4-全局回归视觉验收与迁移交付) | PAO-25 |

每张 Linear 任务已包含职责、相关文件/建议白名单、交付物、验收标准及原生 blockedBy 关系。新文件路径属于规划，执行前结合契约冻结确认；跨职责内容必须拆分职责单一的子任务。

执行门禁：文档先行；逻辑重构先失败测试再实现；代码变更通过 npm run build、npm run test、npm run test:e2e，生成并查看真实截图。正式模型、动作、灯光、音效和 UI 的样板通过整体评审后再扩展。纯文档任务做内容审查及 git diff --check。使用真实输入和录像验证完整一局，单测成功不能代替视觉验收。

当前仅完成规划与任务创建，没有实现任务被标为完成。目标设备和量化预算由 PAO-8 确定；资产质量与性能实测仍待执行。

## 2026-11-01 远程GLB输入补充

上述任务创建状态为2026-10-31历史记录；最新执行/验收以Linear为准，PAO-10/11/12已验收Done。远程main提交622e7da新增21个GLB，详见[交付检查与PAO-13调整](../assets/2026-11-01-glb-handoff-review.md)。PAO-13补充模型语义显式绑定、组合prefab归属及数据测试，保持不生图/不改渲染；不按文件名或原始归一化尺寸推断玩法。普通车厢与带坡工程车的文件语义已实机导入核对，角色骨架动画、尺寸标定和资源优化留给对应资产/渲染任务。
