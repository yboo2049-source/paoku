# PAO-16 准备阶段证据

日期：2026-11-01（Asia/Shanghai）。仅文档准备交付，不是资产制作、运行时接入或父Issue完成证据。

## 输入与边界

- 起点核对：cwd=`D:/worker/paoku-sessions/pao-16`，branch=`codex/pao-16-world-assets`，HEAD=`19aa31492ddce4c1c5e74ef1e49312ad41ec2dd6`；初始`git status --short`为空，无用户改动需搬移或恢复。
- 已读`D:/worker/paoku/AGENTS.md`、主规划`docs/plans/2026-11-01-m2-dispatch-preparation.md` §1–5。计划的本轮不启动子Agent条款与用户准备范围适用。
- 已读M0指定三个规格与glb-review清单/notes。本树仅按需读取modelBindings、trackSegments相关定义、surfaces的Surface定义/生成与采样，以及track中组合视觉归属相关行；未全库扫源码。
- Linear只读：PAO-16正文/原生relations/4条完整评论（无下一页）；最新评论ID=`46c8e7dd-f442-44a8-9d19-23348d5f42c7`，updatedAt=`2026-11-01T05:22:16.598Z`。PAO-16 Backlog，blockedBy=PAO-8/7/9（各In Review），blocks=PAO-17，relatedTo=PAO-14/6/13，parentId=PAO-5。未更改状态、评论、依赖或父任务。
- `get_agent_context`实际返回`McpServerError: Tool get_agent_context not found`；正文和评论可读，没有将缺失笔记当成事实。

## 技能来源

`C:/Users/Administrator/.workbuddy/skills/{brainstorming,using-superpowers}/SKILL.md`不存在；搜索后读取备用安装：

- [brainstorming](C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/brainstorming/SKILL.md)
- [using-superpowers](C:/Users/Administrator/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/superpowers/skills/using-superpowers/SKILL.md)
- 本项目适配说明：`D:/worker/paoku/docs/SUPERPOWERS_WORKFLOW.md`。

备用技能版本未核定，不能声称它就是文档列出的v6.3.0。采用其上下文/备选/设计/验证方法；门禁以用户要求、AGENTS与调度计划为准。用户已明确只做准备，因此不追问是否立即实现，不进入writing-plans；设计路径按本任务独占白名单。

## S/H/V/C/U证据索引

| 类别 | 本次范围 / 文件 | 可证明与限制 |
| --- | --- | --- |
| S 既有解析实测 | [selected-assets.json](selected-assets.json)的sceneBounds、面数、纹理、skin/animation | 从7a2fb29 manifest复用，不是本轮重算几何；单位非米 |
| H 本轮哈希核对 | 同文件sourceSHA256/actualSHA256/hashMatches；8/8匹配 | 只核对选定8文件；不重算全部22个；清单自身SHA也保存 |
| V 既有技术预览抽看 | 下表2张，使用view_image；不生成、不复制图片 | 可见工程车黄坡与普通车侧面；无坐标叠加、不是正式视觉验收 |
| C 候选方案/算术 | [world-assets](../../art/world-assets.md) §3–7、[设计](../../superpowers/specs/2026-11-01-pao16-world-design.md) | 逻辑目标/矩阵协议/资源分配，不冒充源端点实测 |
| U 未验证 | JSON中null字段及规格缺口 | game变换/单位/朝向符号/坡顶端点/代理/LOD/许可/真机均未签收 |

| 已查看技术预览（只读原路径） | 观察 | 限制 |
| --- | --- | --- |
| `D:/worker/paoku-sessions/glb-review/docs/assets/glb-previews/train_metro_engine_q34.png` | 工程车含大块黄色斜板，与车身同组视觉；应避免重复画坡 | 看不到可靠坐标、净空、坡中/顶支撑连续性；黄板体厚是否遮挡未验 |
| `D:/worker/paoku-sessions/glb-review/docs/assets/glb-previews/train_ramp_or_car_engine_side.png` | 普通客车侧面有窗门、轮组、车顶轮廓 | 两端细节不全，不能证明完整车头、可站区域或运动朝向 |

这两张是历史引擎技术预览，不是本树游戏截图；本次无重渲染。未打开其余图，亦未将概念原画、贴图推断或合影当本次独立验收。

## 内容检查与工程检查

[content-review.json](content-review.json)保存8项哈希、JSON与本树端点/预算算术、白名单和引用检查的结果。`git diff --check`及暂存区版本在提交前执行；新增文件也进入暂存区检查，避免只检查tracked差异。对照规格逐项审查：反向列车映射、scene/game分离、已有X旋转不重复、唯一组合根、无新道具玩法、候选预算与未测分开。

为让正常pre-commit工作，在本树执行`npm ci`，exitCode=0，安装378包并运行prepare/husky；未改package或lock文件。安装输出有既有依赖告警，本轮未执行依赖升级。正常提交不设置HUSKY=0、不跳hooks、不强推。hook按仓库配置执行`npm run build && npm run test`；其实际数量/退出结果以提交终端输出和最终交付报告为准，本文不预填未来检查通过结果。

纯文档范围不额外运行浏览器/E2E；无新N自然输入、F夹具、GPU/真机或运行时回归成绩。244单测/43E2E是M1历史数据，未挪为本轮结果。提交与远端同步结果以最终报告给出的真实commit、分支及ls-remote核对为准，避免文档自引用提交号。

## 待审与待验证

具体任务设计/美术和设备预算适用项、原作者源/许可、主题平铺源、完整车端面、源朝向/端点/净空、三方代理对齐、派生LOD/贴图、loader手性与真实引擎/设备性能全部待后续确认或验证。本轮只把缺口和方案交具体，不进行正式优化，不宣称旧遮挡问题已解决。准备交付不标PAO-16或父任务Done，不启动其他任务。
