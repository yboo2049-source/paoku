# PAO-15 本地自动绑定探针实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在现有runner副本上建立可编辑派生骨架/真实蒙皮、单一诊断clip，交实际导入证据和人工TODO。

**Architecture:** 源GLB只读；Blender后台脚本做单位/朝向归一化、自动骨架及权重、批量试姿、派生工程/GLB。Node校验器拒绝无效结构并CPU采样蒙皮，独立Vite/Babylon页播放同一GLB；不接游戏运行时。

**Tech Stack:** 官方便携Blender、本树Node/Babylon/Vitest/Playwright；本地工具和完整回归镜像放`.pao15-local/`，仅加入本机info/exclude。

2026-11-01。输入批准文件：`D:/worker/paoku/docs/plans/2026-11-01-pao15-rig-spike.md`及其试样设计。用户批准本地自动探针，原始DCC不存在；商业许可未验证。正式13动作、手工调权/拓扑/烘焙/动作精修均不在范围内。

## Task 1 输入、环境与证据保护

1. 核对分支/8b26bdf/干净工作区；记录源runner SHA-256=`0f475ed22a2abfbbb9b4cb3069f5c9b131110847b23bd68fbcdff4b3baa797d9`、清单7a2fb29。
2. 以本机info/exclude忽略`.pao15-local/`。便携工具只从download.blender.org下载，记录版本、URL、官方SHA256及本地校验；不系统安装/全局PATH。
3. 将src/public/旧测试/旧证据的路径+SHA清单保存在`docs/evidence/PAO-15/rig-spike/protected-before.json`；扫描限这些保护目录作完整性校验，不读取无关源码/图集内容。结束比较同一集合，不能把镜像生成截图写回旧证据。

## Task 2 校验脚本先RED后GREEN

Create `tests/unit/pao15-rig-spike.test.ts`、`tools/pao15-rig-spike/validate.mjs`。

1. 写最小合成真实skin fixture（mesh/joints/IBM/WEIGHTS）；测试拒绝非有限/未归一权重、越界关节、缺失或无效IBM、root漂移、超预算以及刚性整模伪变形。合法两骨混合时顶点按已知位移变化，root保持原点。
2. `npx vitest run tests/unit/pao15-rig-spike.test.ts`预期RED（缺校验模块/功能），保存日志；实现GLB/accessor/层级/skin/轨道检查，再运行至GREEN，不放松断言。
3. `node --check tools/pao15-rig-spike/validate.mjs`；每次逻辑修改后跑专属单测，新增脚本立即语法检查。

## Task 3 DCC自动试样

Create `tools/pao15-rig-spike/build.py`；输出`assets-source/characters/runner/rig-spike/runner-derived.blend`及`docs/evidence/PAO-15/rig-spike/runner-rig-spike.glb`。

1. 只导入指定runner，完整节点变换后归一化探针高1.8m/脚底0；以轴标记/正侧预览核对+Z，变换一次且记录矩阵。
2. 脚本建立character-spec的23节点起点（≤48关节），自动权重；若热权重计算失败，明确记录并采用同一批次的几何距离加权自动分配，≤4且归一化。不得人工刷权重/改拓扑。保留网格/材质，源26,268面不增到30k。
3. 创建单clip `rig_diagnostic`，30fps；rest、左右肩90/肘120/髋90/膝120、组合蹲姿与rest归位，记录每pose帧/局部轴/角度。root不动；烘焙真实骨变形，不做整模颠簸。
4. 保存派生.blend、导出GLB、DCC姿态顶点位移/权重覆盖/资源/工具记录，验证可重新打开并重新导出。自动视觉瑕疵保留，不进入人工修整。

## Task 4 独立导入与E2E

Create `tools/pao15-rig-spike/index.html`、`preview.ts`、`tests/e2e/pao15-rig-spike.spec.ts`。预览直接读试样GLB，不改src/public。

1. 先写E2E：导入有骨架和单clip、真实播放推进、切姿CPU顶点变形、root稳定、释放后骨架/mesh清理；缺页面时RED，保存日志。
2. 实现可切姿/重播/释放/重新加载、轴/地面标尺、准确工具诊断UI；Babylon实际加载并播放；Windows D3D11，独占5185/strictPort/reuseExistingServer=false。
3. 保存2–3关键截图（rest/组合/侧关节）及一次短录屏；查看真实截图，问题按部件/帧/证据列人工TODO。

## Task 5 完整回归与身份保护

1. `npm run build`、`npm run test`；工具TS用独立命令 `npx tsc --ignoreConfig --noEmit --target es2023 --module esnext --moduleResolution bundler --lib es2023,dom --skipLibCheck tools/pao15-rig-spike/preview.ts`（TS6显式ignoreConfig）。
2. 将全部旧E2E（不删断言）复制到`.pao15-local/regression/`，仅镜像替换旧证据目的地到忽略目录。独立配置5185、D3D11、strictPort、reuseExistingServer=false；通过`npm run test:e2e -- --config ...`跑完整镜像+新探针测试。服务探测记录本树原始src/main响应hash；运行前检查端口未占用，不终止他人服务。
3. 查看游戏桌面/竖屏关键截图；保存少量本次关键图，批量旧图/原件不重新提交。结束复核保护清单与源hash，差异必须解释并恢复原件。

## Task 6 报告、正常提交与推送

1. `docs/evidence/PAO-15/rig-spike/README.md`分别报告自动流程/结构检查与视觉质量（可继续/需局部修整/建议替换/环境阻塞），附工具/资源/hash/pose索引与未测项。
2. `docs/art/pao15-rigging-manual-todo.md`按主规划清单建立任务副本，只按真实诊断补证据，不勾未执行；原角色规格/设计仅追加本探针状态，保留正式制作门禁。
3. 暂存白名单，git diff --cached --check，正常hooks commit，git push并用ls-remote比对HEAD；不改Linear状态/评论，不标PAO-15/18 Done，不自动执行后续。
