# Runner 四动作技术样本派生工程 v1

2026-11-03。`runner-basic-motion-derived.blend`从已审64c4f31的派生绑定工程另存，不是原作者DCC。没有创建骨架、重绑、刷权重、修改拓扑、重烘焙或重新生成造型；商业使用条件仍未取得。

固定源：`assets-source/characters/runner/rig-spike/runner-derived.blend`，SHA-256 `a75de312d230d1f7924ec7616b47428515dba4b58f1f2219c1dbb8c7e17875bd`。新工程保留runner_rig_spike_v1的23骨、原rest/skin/权重/网格/材质；旧文件不保存、不覆盖。新的内存工程移除旧诊断action，仅保留四个具名action并设fake user，旧诊断GLB/工程仍在原路径。

| 动作 | fps/N/秒 | 用途 |
| --- | --- | --- |
| tech_idle_v1 | 30/60/2.0 | 局部呼吸循环 |
| tech_run_v1 | 30/24/0.8 | 对侧腿/臂局部周期，非世界前进 |
| tech_jump_v1 | 30/36/1.2 | 单clip三阶段姿势演示，不决定真实落地 |
| tech_slide_v1 | 30/36/1.2 | 单clip进入/维持/退出，不结束模拟roll |

每条有fN边界键；原地root/asset父节点固定，scale1。局部pelvis的目标竖直向量通过骨rest基的逆变换转换为PoseBone.location；没有再次缩放或Apply Transform。新工程已在新Blender4.5.3进程重开、重导出并校验。

重建命令、工具版本和边界策略见[本地工具](../../../../../tools/pao15-basic-motion-sample/README.md)；新源/GLB完整hash、实际测量、截图与短录屏见[证据](../../../../../docs/evidence/PAO-15/basic-motion-sample/v1/README.md)。这些是四个隔离技术clip，不是正式13动作，未接游戏或放行18。已知串权和足底问题见证据中的人工TODO，继续延期。
