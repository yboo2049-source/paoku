# PAO-16 自动标定细化 Implementation Plan

**Goal:** 从3de6e54接续，仅四件资产增加可核验的结构/边界候选和有限净空覆盖，不接游戏。

**Architecture:** 原core解析复用；新refinement-core建立XZ投影索引、法向筛选、网格连通与水平剖面；新refine入口输出独立JSON。旧诊断和旧证据逐字节保护。无新依赖、无其他Agent。

**Tech Stack:** 已有Node24、TS、Babylon、Vitest、Playwright。

输入：主仓parallel-prompts及首批主审；用户2026-11-02手动授权本Spike。主审接受首批数值链路，但未接受语义端点/正式接入。共享总纲只读；本计划为唯一新增任务级记录。

1. Git固定3de6e54、保存src/public/旧测试/旧证据及首批JSON哈希；四件外部源固定glb-review7a2fb29，只核这四件。
2. 新建tests/unit/pao16-calibration-refinement.test.ts，RED覆盖：加速射线与穷举一致（含格边界）、外域不吸附、网格洞不自动桥接、斜面与平面法向区别、剖面交点可追溯、有限采样不声称连续证明。命令`npm run test -- tests/unit/pao16-calibration-refinement.test.ts`，缺模块应失败并存新证据目录。
3. 新建tools/pao16-calibration/refinement-core.ts与refine.ts。每批运行工具tsc及专属单测。输出docs/assets/pao16-calibration-refinement.json，绝不调用旧measure以免覆盖首批。源点保留node/primitive/triangle/重心/局部坐标。候选域来自实际射线/剖面交点，AABB仅选扫描域。
4. 一次固定参数预算：车顶65×33网格、工程车纵向101点×5截线，高栏两级有限网格和低栏固定高度剖面；法向阈值10°仅为几何筛选假设。无可靠语义则null+候选集合。导出覆盖/缺失/间距与网格敏感性，禁止把有限采样或临时内点拟合判作连续/端点证书。
5. 新独立refinement-preview入口及pao16-calibration-refinement.spec.ts，RED后实现；新证据3图：工程车转换带及侧向样本、高栏覆盖网格、普通车双端与车顶候选。loader RH点与离线数据比对，单工程车根；M1目标及Y+5保持不变。LH如不实测明确未验证，不将RH数值直接交生产。
6. 更正当前TODO生成文字：原DCC已确认不存在，未来标明来源建立重建派生工程，不把索取原源当门禁。本轮不修网格/材质/LOD，不上传云端；历史旧文字只由新记录更正。
7. 工具冻结后完整build/test/原43项镜像E2E+新预览；独占5186 strictPort/reuse=false/D3D11，旧断言仅重定向输出。记录所有失败，raw源码和源/副本/HTTP/保护哈希，查看3张新图。正常hooks提交、push核远程，不标Done/不解锁下游。
