# Runner 本地自动绑定派生工程

这是由现有静态GLB**派生重建**的Blender工程，不是原作者DCC源。作者已确认原始DCC/骨架工程不存在。本试样不改造型、不重拓扑、不手工刷权重、不制作正式动作；商业使用与再分发许可未验证，不能把本次技术试样批准当发布授权。

- 工程：`runner-derived.blend`，Blender 4.5.3 LTS，所有源贴图已打包，可独立打开。
- 重建脚本：[build.py](../../../../tools/pao15-rig-spike/build.py)。从工作树根执行：`.pao15-local/blender/blender-4.5.3-windows-x64/blender.exe --background --factory-startup --python tools/pao15-rig-spike/build.py -- D:/worker/paoku-sessions/pao-15`。
- 原文件只读：`D:/worker/paoku-sessions/glb-review/public/models/character_runner.glb`；SHA-256=`0f475ed22a2abfbbb9b4cb3069f5c9b131110847b23bd68fbcdff4b3baa797d9`。
- 使用本地官方便携工具，官方校验、派生输出hash、轴向/骨架/权重/逐姿变形记录见[试样证据](../../../../docs/evidence/PAO-15/rig-spike/README.md)。未调用Tripo/Mixamo或其他云端。
- 工程骨架`runner_rig_spike_v1`，23关节；原34网格和1材质保留。每顶点按最近4条rest骨段的平滑距离分配权重，自动归一化。没有使用人工修权，也未尝试热权重求解器；它是可复现几何算法基线，不宣称等同人工权重或生产级自动绑定。
- Blender工程为Z-up/-Y前，导出glTF为Y-up/+Z前。完整原节点先烘到mesh data，再按实测高0.9790511131归一化为探针1.8m，绑定前仅应用一次。导出根保持单位TRS，glTF骨骼IBM与网格坐标一起校验；实际游戏手性转换尚未接线。
- 单动作`rig_diagnostic`，DCC 30fps，0–150帧/5秒，11个诊断采样：rest、左右肩肘髋膝、组合、归位。骨局部旋转与帧索引见dcc-report.json。不是正式run/jump/slide动作，也不增加任何玩法。
- 工程已在新的Blender进程重新打开并重新导出到忽略目录，重导出结构与变形再次验证。重新导出步骤按dcc-report的exportOptions执行并替换输出路径即可。

已知质量结论：**自动流程通过，需局部修整，人工待办**。自动权重存在串权；组合姿势未做接触与动作精修。源26,268面/两张4K保留只是隔离探针，不代表正式12k/6k和纹理预算通过。详见[人工TODO](../../../../docs/art/pao15-rigging-manual-todo.md)。
