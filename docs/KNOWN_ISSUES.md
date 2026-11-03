# 已知问题与延期事项

本文件是延期问题的统一入口。报告、首次失败和未提交候选实现继续保留；“延期”不表示问题不存在、已解决或测试全绿。仅在用户明确要求恢复时重新启动修复；有新复现先补证据，不自动派发Agent。

## KI-001 车尾下降接触连续性

- **状态：用户明确延期，2026-11-03暂停继续修复和复验。** 原浏览器场景本次未再失败；历史固定步反例已复现，保留该事实，不再追修。
- 表现：旧PAO-6坡→车顶→跳跃→离顶用例曾GAMEOVER；特定输入下，已证顶面接触的同一步终点越过车尾，未保留departure，下一tick残余重叠被判致死。
- 可追溯条件：STATIC_TRAIN33中心z33/depth18、top3；继承速度18.020833333333332、局部JUMP97；138→139的碰撞位置z42.11395833333329/y2.9183333333333388。相邻96/98成功。局部重建tick不冒充原浏览器缺失的绝对输入身份。
- 诊断：[原始主审](reviews/2026-11-03-pao15-basic-motion-sample-review.md)、[诊断主审](reviews/2026-11-03-regression-diagnosis-review.md)、[本地修复预审](reviews/2026-11-03-roof-remediation-local-review.md)。原15完整45/46记录不删除。
- 候选修复已在`D:/worker/paoku-sessions/pao-15-roof-diagnosis`本地实现，主Agenttsc/72目标单测通过；任务方完整49/50的车尾新增4项和旧PAO-6通过，但最终门禁未通过。**未验收、未提交、未推送、未移植**，不将其标为已交付修复。
- 冻结接续：分支codex/pao15-roof-diagnosis，本地/远端HEAD均8af24af083b369f3f8dc8bb883a861975b9972af；暂存区空，当前2个跟踪修改、43个未跟踪文件保留。这个HEAD是诊断基线，不包含候选修复。物理源码及两份测试hash见本地预审，已重新核对一致。
- 处理：保留原目录、源码/测试改动、trace/截图/日志和本地候选；不reset/clean/stash、删除/合并、代提交或反复跑测试追绿。暂停不自动改变父15/18状态/依赖，也不把旧套件改成skip或忽略失败。

## KI-002 四动作独立预览偶发ready超时

- **状态：随本轮车尾收口调查一并延期，2026-11-03不继续排查。** 与KI-001分别记录，未证明有因果关系。
- 表现：车尾候选修复完整回归49/50，唯一失败是旧四clip预览等待`__BASIC_MOTION__.ready`超过60000ms。现场显示“样本已释放”、模型未出现；manifest/structure/dcc-report/GLB HTTP200，无已记录脚本或请求异常；各await是否完成未知。
- 主Agent一次新页面只读采样约4秒ready，未重现整套前序条件，不能关闭首次超时或据此归因网络/GPU。原完整49/50及16MBtrace不覆盖、不删除。
- 证据：[本地预审](reviews/2026-11-03-roof-remediation-local-review.md)，原始trace路径/hash在任务树`docs/evidence/QA/roof-exit-remediation/v1/final-state.json`，本机观察在`.pao15-local/main-preview-timeout-review/`。
- 处理：此前[只读调查提示词](plans/2026-11-03-motion-preview-readiness-diagnosis.md)不再执行；不改预览/模型/旧断言/超时/错误过滤，不继续单测、定向或全套重跑。新复现可另补证据，恢复调查需用户明确指令。

## 当前执行入口

给原车尾聊天使用[暂停收口提示词](plans/2026-11-03-roof-exit-deferred-handoff.md)。字体修复保持其既有单独授权，本次暂停不扩展或取消字体任务写权，不把车尾/预览延期记录当作字体全绿证明。
