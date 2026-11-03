# PAO-15 本地四动作技术样本工具

执行授权为主规划`2026-11-03-pao15-pao18-approved-execution.md`§2/4。旧rig-spike工具只读；本工具直接复用其固定版解析/矩阵/CPU蒙皮原语，自己检查四clip/源差异/根与循环，不改旧的单诊断clip检查。

从本树根执行：

1. `.pao15-local/blender/blender-4.5.3-windows-x64/blender.exe --background --factory-startup --disable-autoexec --python tools/pao15-basic-motion-sample/build.py -- D:/worker/paoku-sessions/pao-15`。只打开固定旧blend，先核hash再另存新源/导出；不执行旧绑定生成器，不创建或刷写权重。
2. `node tools/pao15-basic-motion-sample/analyze.mjs`。实际解析新GLB，核旧源hash、源rest/IBM/权重/几何、各sampler真实时长、root/父层及有符号接缝速度；30共同姿态对照DCC与CPU。会重建**数值阶段**manifest；人工品质结论以证据README/TODO为准，不由生成器自证。
3. `node tools/pao15-basic-motion-sample/analyze.mjs .pao15-local/basic-reopened.glb docs/evidence/PAO-15/basic-motion-sample/v1/reopened-structure.json`校验重开工程的重导出，不覆盖正式样本manifest。
4. `npx vitest run tests/unit/pao15-basic-motion-sample.test.ts`；三个mjs分别`node --check`。
5. `npx tsc --ignoreConfig --allowJs --checkJs false --noEmit --target es2023 --module esnext --moduleResolution bundler --lib es2023,dom --skipLibCheck tools/pao15-basic-motion-sample/preview.ts`。TS显式包含导入的本地mjs，JS逻辑另由语法/单测和真实文件校验覆盖。
6. 独占5185：`node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5185 --strictPort`，打开`http://127.0.0.1:5185/tools/pao15-basic-motion-sample/`。不要复用其他服务。

预览禁用glTF loader默认自动播放后才记录真实bind姿态；只在右手原生glTF/m/Y-up/+Z空间播放。DCC30fps、loader轨道60fps按秒换算；切换先停旧组/恢复bind，暂停冻结实际AnimationGroup，seek不补发marker，释放禁用控件。标记是本地姿态提示，不发游戏落地/roll/无敌事实。`playback.mjs`仅维护本地clip实例/循环marker游标。

循环源按批准曲线生成，f1与fN-1相对f0做对称切线保护，fN=f0；导出30fps LINEAR。检查的“速度连续”是有符号局部TRS循环接缝，不外推全时间曲线处处C1或自然跑步。DCC与glTF的骨坐标基不同，逐骨比较采用共同世界变形空间（pose×inverse-rest / jointWorld×IBM），原始骨矩阵也保留在DCC记录。

新专属E2E为`tests/e2e/pao15-basic-motion-sample.spec.ts`。完整套件通过本机忽略的`.pao15-local/basic-full.config.ts`，使用Windows D3D11、strictPort、不复用服务；所有旧镜像断言保留，唯一改证据输出，镜像后缀.pw.ts不混入Vitest。新代码、资产和报告只在本批白名单内。
