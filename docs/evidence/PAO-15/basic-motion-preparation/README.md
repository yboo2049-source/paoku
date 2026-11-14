# PAO-15 四类基础动作样本：设计准备证据

2026-11-03（Asia/Shanghai）。本目录为纯文本设计证据，**不是新动作/GLB/引擎运行证据**。

## 范围与输入

- cwd=`D:/worker/paoku-sessions/pao-15`，branch=`codex/pao-15-character-assets`；固定起点`64c4f3120224f42995bc4b0fae544feae139d380`，首次Git状态为空。未reset/merge，未启动其他任务/Agent。
- 已读[主入口](D:/worker/paoku/AGENTS.md)、[11月3日派发准备](D:/worker/paoku/docs/plans/2026-11-03-pao15-pao18-preparation-prompts.md)、[15绑定主审](D:/worker/paoku/docs/reviews/2026-11-01-pao15-rig-spike-review.md)、[主人工TODO](D:/worker/paoku/docs/art/pao15-rigging-manual-todo.md)。它们为主规划树只读输入，内容hash单列[inputs.json](inputs.json)。未将其中18提示词作为本树行动授权。
- 本树只按需读[character-spec](../../../art/character-spec.md)、[旧试样README](../rig-spike/README.md)、[pose-index](../rig-spike/pose-index.json)、structure中的23骨名/parent、toolchain及build.py骨架/姿势定义。没有全库/全部GLB/图集扫描，没有重新验证已审绑定。
- 使用using-superpowers/brainstorming做有界送审设计；参考art-animation-vfx/animation-spec。技能路径沿本会话已定位版本。项目30fps、0基半开和GLB边界键优先；通用2D采样、1基闭区间、攻击/无敌模板不引入本规格。

## 固定输入身份（引用旧已审记录，不是本轮重开工程测量）

| 文件/身份 | SHA-256 / 说明 |
| --- | --- |
| 原静态runner | `0f475ed22a2abfbbb9b4cb3069f5c9b131110847b23bd68fbcdff4b3baa797d9`；原GLB只读，不是可动画产物 |
| 旧派生runner-derived.blend | `a75de312d230d1f7924ec7616b47428515dba4b58f1f2219c1dbb8c7e17875bd`；旧SHA清单记录，无原作者DCC |
| 旧runner-rig-spike.glb | `cb84cfb9a308c54245ac49627383aa6643c8d40efc9c2a6929334dc60c7348f5`；单rig_diagnostic |
| 骨架 | 实际runner_rig_spike_v1，23骨；局部X诊断姿态不等于解剖轴正式签收 |
| 既有工具 | Blender4.5.3 LTS / build67807e1800cc；旧官方便携包SHA `6b657c8bdd3a7b65b07b9e1ae17eb4be7dd4aa23121da7f3d3354fc2551330a7`；本轮未安装/启动/重新下载 |
| 新四clip/新派生hash | 尚未生成，均未知；禁止填成旧诊断clip/hash或声明通过 |

## 本轮交付与检查口径

- [设计稿](../../../superpowers/specs/2026-11-03-pao15-basic-motion-sample-design.md)：两本地路线及推荐、边界/失败处理、未来路径/写权和主审决策。
- [规格](../../../art/pao15-basic-motion-sample-spec.md)：四clip采样/关键姿势/阶段、循环速度、候选manifest、表现标记/取消、已知TODO与后续RED/质量矩阵。
- [review.json](review.json)：本轮内容/引用/范围检查及历史输入身份摘要。后续正常提交hook结果保留在提交执行记录，必要时附本目录纯文本日志；不跳hook。

本轮不写实施计划/测试代码/工具脚本，不打开保存二进制工程，不跑生成/导出/独立预览，不上传模型。只有文本变化，不专门运行E2E/浏览器/截图。旧绑定的257单测/44 E2E和主审重导出是历史验收，只能引用，不能算四clip通过。设计中BM矩阵全部待后续执行。

正常hook仍执行本树build/test；依赖已存在，无需安装或改锁文件。Windows Git shell若不能执行npm的bash入口，允许仅在提交命令进程内将npm映射到**现有同版npm-cli.js**，保留原hook命令及所有检查；不复制/安装bash二进制、不改hook/全局PATH。该环境选择不修改任何资产或依赖文件。

准备送审不等于设计已批准；不标PAO-15 Done，不放行18，不进入writing-plans/制作或游戏接线。正式执行需主Agent审查并另发提示词。
