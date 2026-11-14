# PAO-16 Calibration Spike Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 只量测四件GLB，给出可复现的几何与等比适配诊断，不接游戏。

**Architecture:** 源与M1只读；Node工具完整遍历节点与三角形，Babylon独立预览验证手性/方向；测量可靠性不足返回null/TODO。诊断JSON不是生产配置。

**Tech Stack:** 现有Node/TypeScript/Babylon/Vitest/Playwright，无新增依赖。

## 1. 输入与保护

基线dd82d22，分支codex/pao-16-world-assets；用户本轮明确授权探针，不授权正式美术。设计输入：D:/worker/paoku/docs/superpowers/specs/2026-11-01-pao16-calibration-spike-design.md。共享文档已由主规划记录，不在本树改总纲。

先记录src/public/旧测试/旧证据哈希；glb-review固定7a2fb29仅四件与manifest，副本放忽略的.pao16-local/inputs。工具及测试写权按上游计划，不改依赖、默认配置或游戏入口。

## 2. RED→GREEN几何工具

文件：tools/pao16-calibration/；tests/unit/pao16-calibration.test.ts。

先写断言：完整父子TRS/矩阵、逆变换往返、重复应用拒绝、非零B.y坡顶共同点、一个工程车视觉根、等比拟合残差不能误判、歧义测点返回null。运行`npm run test -- tests/unit/pao16-calibration.test.ts`，保存RED日志；预期缺模块或断言失败。再实现最小纯数学/解析与诊断工具，重复命令直至GREEN。工具类型检查单独配置在工具目录，运行`npx tsc -p tools/pao16-calibration/tsconfig.json`。

GLB读取BIN/accessor及完整节点矩阵；原始几何点带node/primitive/triangle证据，平面/切片识别保留阈值与置信度。未知前向、净空或接地语义返回null，不从AABB补齐。先刚性/等比，非等比仅诊断。输出docs/assets/pao16-calibration-spike.json与TODO。

## 3. 独立预览与RED→GREEN验收

文件：tools/pao16-calibration/预览页及服务；tests/e2e/pao16-calibration.spec.ts。独占5186 strictPort，不复用服务；Windows ANGLE D3D11。预览RH scene明确避免默认glTF手性包装二次叠加；从loader实际世界点与离线scene点比对。显示真实几何、测点、M1代理/Surface，工程车只加载一次。

先以未存在预览接口执行专属Playwright产生RED，再实现。保留3张技术截图：工程车坡顶叠加、高栏净空、普通车轮廓；主审实际查看。完整回归旧测试只复制到忽略目录，保持断言，仅重定向截图；本地配置不被Vitest发现为测试。保存源码raw/HTTP资产hash。

## 4. 验收与提交

运行`npm run build`、`npm run test`、`npm run test:e2e -- --config .pao16-local/regression.config.ts`及独立预览测试；失败自主闭环，不删旧断言。核对保护哈希、源与HTTP hash、截图与残差分类。正常hooks提交白名单，git push并ls-remote核对；不合并、不标Done、不启动下游。证据保存docs/evidence/PAO-16/calibration-spike/，完整日志与批量旧图留忽略目录。
