# PAO-15 本地诊断工具

仅消费批准的runner副本，不接游戏src/public。工具没有云端上传或付费调用。

1. 官方便携Blender校验部署到本机忽略的`.pao15-local/blender/`，工具来源与hash见证据toolchain.json。
2. `blender.exe --background --factory-startup --python tools/pao15-rig-spike/build.py -- D:/worker/paoku-sessions/pao-15`：重新生成派生工程、GLB与DCC报告。源hash不符立即停止；不要换用其他模型。
3. `node tools/pao15-rig-spike/analyze.mjs`：解析GLB/IBM/权重/root，CPU逐姿蒙皮并与DCC核对。可传`GLB路径 输出JSON路径`检查重导出文件。
4. `npx vitest run tests/unit/pao15-rig-spike.test.ts`：结构拒绝、真实混合变形、STEP/LINEAR和四元数采样。
5. `npx tsc --ignoreConfig --noEmit --target es2023 --module esnext --moduleResolution bundler --lib es2023,dom --skipLibCheck tools/pao15-rig-spike/preview.ts`：独立类型检查（TS6显式ignoreConfig）。
6. 本树依赖就绪后，独占5185运行`node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5185 --strictPort`，打开`http://127.0.0.1:5185/tools/pao15-rig-spike/`。不要复用其他服务或更改游戏入口。
7. 专属Playwright测试`tests/e2e/pao15-rig-spike.spec.ts`需本机忽略配置：baseURL5185、Windows ANGLE D3D11、webServer strictPort/reuseExistingServer=false。完整回归必须镜像旧测试并仅重定向证据输出；不得原样覆盖历史图。

诊断页采用Babylon右手原生glTF空间以直接核对Y-up/+Z前，不接入游戏左/右手转换。相位按glTF秒数换算：DCC30fps、Babylon导入轨道60fps，5秒为300个引擎帧；不是动作时长翻倍。支持选姿/真实播放/释放/重新导入，姿势只改骨架，不拥有游戏位移/无敌。

文件职责：`build.py`处理DCC和派生资产；`validate.mjs`提供纯结构/矩阵/蒙皮/采样逻辑；`analyze.mjs`执行真实文件检查；`index.html`/`preview.ts`为独立引擎预览。姿势与截图用于发现缺陷，数据有效不代表造型/权重质量通过。
