# PAO-16 第一批技术标定执行交接

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 对已有两列车和高低栏做实际几何量测/对齐可行性诊断，供下游接入判断。

**Architecture:** 源GLB和M1逻辑只读；独立工具预览资产、逻辑面与诊断数据，不接游戏运行时。主Agent准备与验收，用户在原PAO-16聊天手动触发。

**Tech Stack:** 既有Node、TypeScript、Babylon.js；Vitest、Playwright；必要本地几何工具。

2026-11-01（Asia/Shanghai）。具体探针范围见[设计](../superpowers/specs/2026-11-01-pao16-calibration-spike-design.md)。本交接仅针对技术Spike，不代表PAO-7/8全部批准或正式场景制作放行。旧PAO-16提示词只做文档准备；本提示词在用户主动执行时才开始工具/量测，不由Dispatcher自动启动。

## 工作树与白名单

- `D:/worker/paoku-sessions/pao-16`，`codex/pao-16-world-assets`；预期准备提交dd82d22，含M1 19aa314。核对Git并保留用户改动，不merge/reset，不从main复制游戏目录。
- 只读本树world-assets、selected-assets及相关M0技术契约；按需读src/data/modelBindings.ts、trackSegments.ts、systems/surfaces.ts、必要types。不全库扫描。
- 只读外树glb-review@7a2fb29的manifest及指定4件GLB。预览可将这4件原样复制到任务忽略输入目录，逐件hash匹配；禁止批量复制/重渲染整资产库。
- 可写 `tools/pao16-calibration/`（校验/测量/独立预览）、`tests/unit/pao16-calibration.test.ts`、`tests/e2e/pao16-calibration.spec.ts`、`docs/assets/pao16-calibration-spike.json`（诊断数据，非生产配置）、`docs/evidence/PAO-16/calibration-spike/`、`docs/art/pao16-calibration-todo.md`、本树world-assets/任务设计的探针记录及`docs/plans/2026-11-01-pao16-calibration-implementation.md`。
- src/public/HTML/物理/渲染入口/依赖/旧测试/默认配置及共享总纲/PROGRESS只读。临时工具/输入副本/配置/完整回归镜像与批量旧图用`.pao16-local/`及本机info/exclude，不改共享.gitignore。
- 独占5186、strictPort、reuseExistingServer=false，Windows ANGLE D3D11；原任务自验和主Agent复审不同时使用同一端口。不要复用或停止其他树的服务。

## 执行步骤

1. 锁定4源hash/单位与节点TRS；记录原src/public/旧测试/证据hash。沿用M1当前几何，原始源不存在不作为无限等待理由。
2. 在任务树按writing-plans细化确切文件、RED断言/命令与预期；先测试矩阵/坐标往返、重复转换拒绝、非零B.y和工程车唯一根，再做最小工具实现。
3. 逐件解析实际几何并在独立Babylon场景确认轴/正面与关键面；测点记录证据/置信度，禁止外AABB冒充坡面/净空。候选失败时给出误差和未验证点，不通过改物理“修好”。
4. 叠加M1只读Surface/代理与测点，输出候选矩阵/端点误差/净空和分类。两个逻辑孩子共一个工程车视觉根；相同模型重复实例不累计变换。原点/loader手性/源节点旋转分清一次转换。
5. 保留自动技术结果与TODO，手工美术/重拓扑/缺环境资产以后另排；本阶段可交不适配诊断，不伪造正式通过。程序错误自主修复。
6. 新工具代码每批立即类型/单测检查，交付完整build/test/E2E及独立标定预览E2E，保存2～3关键图并查看；本树M1基线244/43仅历史参照，按本轮实际数量报告，不混PAO-19或PAO-15的数量。
7. 核对服务raw源码与HTTP资产hash、源码前后/旧证据保护，完整镜像保留原断言且仅重定向输出，避免Vitest误收Playwright镜像；正常hooks仅提交白名单，git push核对远端。报告每件状态、测点/残差/矩阵、未验证项及TODO。
8. 只送探针阶段审查，不自行标PAO-16 Done、不放行PAO-17、不合并或启动下游。共享文档建议交主Agent统一整合。

## 可粘贴到原PAO-16聊天

```text
继续PAO-16，只做第一批本地技术标定Spike，不制作整批正式美术、不接游戏。目录D:/worker/paoku-sessions/pao-16，codex/pao-16-world-assets，准备基线dd82d22（含M1 19aa314）。先核对Git/用户改动，不reset/合并其他分支。
先读D:/worker/paoku/AGENTS.md、D:/worker/paoku/docs/plans/2026-11-01-pao16-calibration-spike.md及设计链接；主仓PRD/架构/系统流程/测试/PROGRESS已记录这批技术边界。旧提示词“只准备文档”不包含这次量测，本条是我手动触发第一批探针；不代表PAO-7/8全部冻结或正式制作授权。
第一批只读glb-review@7a2fb29的train_ramp_or_car（普通车厢）、train_metro（带坡工程车）、obstacle_hurdle_barrier和obstacle_slide_barrier，核对manifest哈希。只按需读本树modelBindings/trackSegments/Surface与必要types，不扫全库或全图集。
按计划白名单先写任务级实施计划与RED，再实现tools/pao16-calibration及专属测试/诊断JSON/证据/TODO。原GLB和src/public/物理/渲染入口/依赖/旧测试/共享总纲只读，不改逻辑尺寸或容差，不复制PAO-19/15实现。
实测完整节点后的轴/前向/接地线、车顶、坡脚中顶/两边、高栏梁底和柱脚净空；点必须有几何/预览依据和置信度，外AABB不冒充支撑面，自动识别不可靠的点写null+TODO。高栏节点X旋转不重复，两车Y旋转正负须确认。记录source→asset→logic→world与loader手性一次变换；工程车单视觉根对应RAMP/ROOF，禁止重复画自带坡。
与M1现行车2.4×3×12、坡2.4×3×6以及非零Y基准对照，输出候选矩阵、测点和残差。先刚性/等比，非等比或比例不可同时适配只交诊断，不拉外框就标通过。保留自动结果，手工建模/拆件重拓扑/烘焙/艺术精修列TODO，本轮不做；工具程序错误仍须自行闭环。
交付4件可接入候选/需派生修整/不适配/测点待复核分类，附2～3真实关键图（工程车坡顶叠加、高栏净空、普通车轮廓）及数据，不要求用户逐张截图点坐标。完整build/test/E2E与独立预览、独占5186 strictPort/不复用服务、raw源码/HTTP资产和旧原件hash核对，完整镜像与批量旧图留忽略目录。
正常hooks提交/git push核对远端后送主Agent，只完成探针阶段，不标PAO-16 Done、不自动放行或执行PAO-17/18/20，不合并分支。具体美术/真机预算及正式资产尚未通过的如实记录。
```
