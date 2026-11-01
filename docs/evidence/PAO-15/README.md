# PAO-15 准备阶段证据索引

日期：2026-11-01（Asia/Shanghai）。本目录只证明文档准备、只读核验和提交检查，不证明正式角色已绑定、动作已制作或真实引擎验收通过。

## 1. 起点与输入

- cwd：`D:/worker/paoku-sessions/pao-15`；分支`codex/pao-15-character-assets`；起点`19aa31492ddce4c1c5e74ef1e49312ad41ec2dd6`。首次git status --short为空，无用户改动；不从main重建。
- 已读调度入口：`D:/worker/paoku/AGENTS.md`；`D:/worker/paoku/docs/plans/2026-11-01-m2-dispatch-preparation.md` §1–5。执行范围以用户本次“仅准备/不启动子Agent/只写专属文档”限定为准。
- PAO-7 [固定规格](https://github.com/yboo2049-source/paoku/blob/c66b59e190ee00ec7bc57eadf884d54c68a469a8/docs/art/rebuild-style-guide.md)：固定树`D:/worker/paoku-sessions/pao-7`，HEAD核对一致；角色/预算/动作/来源条目为候选。
- PAO-8 [固定规格](https://github.com/yboo2049-source/paoku/blob/be6c7d52dc02bb9aeb9e5f42114ab7b7e8ef4f89/docs/performance/target-device-budget.md)：固定树`D:/worker/paoku-sessions/pao-8`，HEAD核对一致；设备/预算未真机签收。
- PAO-9 [固定契约](https://github.com/yboo2049-source/paoku/blob/59fc682c33623150343f414b706e9771b8b6cbb4/docs/architecture/rebuild-contracts.md)：固定树`D:/worker/paoku-sessions/pao-9`，HEAD核对一致；坐标/单写权/原地动作沿M1已接受口径。
- glb-review只读树HEAD=`7a2fb2963deae061d15deae4019910a15f0dfbcf`；[结构化清单](https://github.com/yboo2049-source/paoku/blob/7a2fb2963deae061d15deae4019910a15f0dfbcf/docs/assets/glb-manifest.json)及[交接说明](https://github.com/yboo2049-source/paoku/blob/7a2fb2963deae061d15deae4019910a15f0dfbcf/docs/assets/glb-visual-notes.md)。资产本体来源622e7da与清单修订7a2fb29分开记录。
- 总设计只按需读`D:/worker/paoku/docs/superpowers/specs/2026-10-31-paoku-complete-rebuild-design.md` §5：原地动作、支撑事实与镜头权责。未读取全库源码或全图集。

## 2. Linear 本次只读查询

通过get_issue(includeRelations=true)及list_comments读取，未改Issue状态/评论/依赖，所有评论查询hasNextPage=false。

| Issue | 本次状态 / 原生关系 | 最新评论依据 |
| --- | --- | --- |
| [PAO-15](https://linear.app/paoku-v1/issue/PAO-15) | Backlog；blockedBy=7/8/9；blocks=18 | b2036965-8d46-47e5-b0dc-bb6ef1a7fe26，2026-11-01：纠正runner高0.9791/minY0，静态模型不能以正弦摆动替代动作；同时读d57523a8说明无skin/animation |
| [PAO-7](https://linear.app/paoku-v1/issue/PAO-7) | In Review | 5a18e4bb-bc85-48f8-b7f8-3a3d260cece2：修订技术复核通过，具体美术/真机/实机品质未批准，不启动制作 |
| [PAO-8](https://linear.app/paoku-v1/issue/PAO-8) | In Review | 6803173b-db43-493b-a90f-f0c399bcac2f：仅规划/有限采样技术审查，真机等未签收，预算不冻结 |
| [PAO-9](https://linear.app/paoku-v1/issue/PAO-9) | In Review | dc728779-8ee4-4313-8776-63fe3a525a88：一次转换修订可交接，不声称真实网格/碰撞验收 |

## 3. 资产、源文件与工具核验范围

从清单提取runner记录、旧player动画，并参照police/dog的无骨骼事实。未重新解析全体22 GLB，也未新建截图；历史engine_preview/parse是清单作者证据，不标本次实测。

本次直接Get-FileHash核对runner：`0f475ed22a2abfbbb9b4cb3069f5c9b131110847b23bd68fbcdff4b3baa797d9`，匹配清单；文件位于只读glb-review的`public/models/character_runner.glb`。规格没有按局部0.4205高计算生产比例，没有对新runner套旧player动画。清单外观与概念图未重新做美术判断。

限定清点`git ls-tree`的public/models、docs/assets、licenses、sources；找到GLB、runner概念图和真实预览文件名，未找到匹配的角色作者工程/专属许可；根sources/licenses目录不存在。没有检查仓库压缩包、用户其他目录或作者机器，因此结论是**未取得/待作者交付**，不能说全机无源或没有合法权利。未向原GLB Agent发送消息或制作指令。绑定、拓扑与授权条件当前未确认，缺口及接收字段见设计§4。

node/npm在PATH可用；blender在PATH未发现，只证明当前PATH不能直接调用，不证明整机未安装DCC。未安装/启动建模工具、生成图像或变更原GLB。常规npm依赖只为本树正常提交hook检查准备，安装结果与检查见[validation](validation.json)。

方法论：使用using-superpowers、brainstorming和art-animation-vfx，按用户要求交具体方案。`~/.workbuddy/skills/`两个技能路径未命中，已在`C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/`定位并读取using-superpowers/brainstorming/executing-plans；动画参考读取`C:/Users/Administrator/.codex/skills/art-animation-vfx/SKILL.md`及animation-spec。项目本次准备路径/30fps骨骼契约优先，未照搬通用2D帧动画档位、攻击态或无敌字段。

## 4. 交付和检查口径

- [角色规格](../../art/character-spec.md)：13clip、骨架/蒙皮、坐标/根、循环中断、挂点、包体与CA-01~11验收表。
- [设计提案](../../superpowers/specs/2026-11-01-pao15-character-design.md)：A/B/C路径、源与许可缺口、G1~G5门禁、共享文档建议。
- [结构化核验](validation.json)：输入摘要、文档检查/hash及正常hook结果。

纯文档做内容/引用/范围审查和git diff --check；保留正常hooks的build/test，不跳过。没有游戏代码改动，本轮不新跑E2E/截图/录屏；N自然输入=未执行，F夹具=未执行，正式动作/真机/导入预览=未执行。不以M1的244单测/43 E2E历史证据作为本轮运行数。

准备交付后仍待G1~G5；主Agent按设计§7审查共享建议。PAO-15不标Done，不自动执行PAO-18、不合并其他分支。
