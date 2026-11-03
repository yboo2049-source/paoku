# 首失败与修复记录

以下保留实际失败，不用最终绿色覆盖它们；不包含手工权重/拓扑精修。

| 阶段 | 首失败 | 处置与复验依据 |
| --- | --- | --- |
| 初始保护清单 | 对Git跟踪gitlink目录直接readFile得到EISDIR | 分开记录1052个文件字节hash与scratch/temp_learn_harness的Git指针，不进入子仓扫描；最终比对同一集合 |
| 结构单测RED | 8失败，函数尚未实现 | unit-red.txt；实现后8通过，再增加marker/有限值组 |
| marker RED | 3失败/8通过 | marker-red.txt；本地游标实现后通过，暂停/seek不补发、每循环f0单次 |
| 非有限轨道RED | 1失败/11通过，NaN比较可误通过 | finite-red.txt；边界样本和实际动画输出显式拒绝非有限值，不放宽阈值 |
| DCC/CPU首骨矩阵比较 | Idle f0顶点误差约4.995e-7m，但原始骨矩阵基不同，差约1.3969 | 改为有明确rest/IBM对应的共同变形矩阵空间，未改骨/rest；原始DCC矩阵仍保留。最终逐骨误差约2.662e-6，阈值仍1e-4 |
| 独立页RED | 无页面/未就绪导致超时 | e2e-red.txt；实现独立页，未伪造导入结果 |
| 首真实导入E2E | float32时长0.8000000119/1.2000000477不等于JS字面量 | first-import-failure.txt；按批准的1e-5s时长容差比较真实loader数据，不修写GLB时间或隐藏短一帧 |
| 首生命周期E2E | 归位顶点残差0.003947745m，超过1e-4 | first-lifecycle-failure.txt；loader默认自动播放Idle污染了bind快照。禁用自动播放再捕获，修正后归位约4.895e-7m，阈值未放松 |
| 工具TS | 导入mjs无声明触发TS7016 | 独立tsc显式allowJs纳入JS模块，JS另做node --check/单测；未假设主src编译覆盖tools |

最终日志/计数另见README。脚底悬浮/穿地、权重串扰等是资产品质问题，另列manual-todo.md，不以修工具之名精修或掩盖。
