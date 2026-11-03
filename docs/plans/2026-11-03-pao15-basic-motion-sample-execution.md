# PAO-15 四动作技术样本实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 从已审派生工程保留rest/skin/权重，自动生成四个原地局部骨动作，交真实文件/引擎校验与质量诊断。

**Architecture:** 仅另存新派生源；旧输入和工具只读。新Blender脚本按批准A曲线采样并保护周期边界；Node从GLB实际accessor/通道验结构、来源差异、时长、根和速度；独立Babylon页验证动作与生命周期，不接游戏。

**Tech Stack:** 已有Blender4.5.3 LTS、Node、Babylon、TypeScript、Vitest、Playwright；无需新依赖或云服务。

2026-11-03（Asia/Shanghai）。当前授权为主规划`docs/plans/2026-11-03-pao15-pao18-approved-execution.md`§2/4，覆盖候选设计的“仅设计/待批准”阶段限制。起点8c4b09fc5351778fe8db19858d52924ac70463b9，初始cwd/顶层/分支正确且干净；不重做绑定，不手工调权/拓扑/动作精修。

## Task 1 身份与保护

- 创建新证据目录`docs/evidence/PAO-15/basic-motion-sample/v1/`，记录全部既有跟踪文件的hash与范围；只是完整性检查，不读取无关系统逻辑/图集。
- 旧blend SHA=`a75de312d230d1f7924ec7616b47428515dba4b58f1f2219c1dbb8c7e17875bd`，旧GLB=`cb84cfb9a308c54245ac49627383aa6643c8d40efc9c2a6929334dc60c7348f5`。Blender实际可执行hash/旧工具版本登记；5185占用先核对，冲突不终止其他服务。
- 本机`.pao15-local/`已忽略；只在那里保存临时配置/完整回归镜像及批量旧图。

## Task 2 真实校验逻辑RED→GREEN

- 新`tests/unit/pao15-basic-motion-sample.test.ts`先写能失败的源身份/rest/骨架/IBM/权重、四clip集合/真实时长/边界、根/父层漂移、有符号循环速度与q/-q用例。先跑`npx vitest run tests/unit/pao15-basic-motion-sample.test.ts`保存RED。
- 新`tools/pao15-basic-motion-sample/validate.mjs`复用固定旧解析/矩阵原语，不改旧工具；最小实现后GREEN。再增加本地marker时序/暂停/切换/seek去重的纯逻辑用例，先RED再实现`playback.mjs`。
- 每次JS更改执行node --check和目标单测；新增预览TS显式独立tsc（--ignoreConfig），不能依赖主tsc覆盖tools。

## Task 3 新派生源与四clip

- 新`tools/pao15-basic-motion-sample/build.py`读取旧工程，不运行旧build.py。按名称保留23骨/父级/rest/权重/材质/网格；禁用旧诊断动画后在新工程创建四独立action。
- tech_idle_v1=30fps/N60/2s，tech_run_v1=30/N24/0.8s，Jump/Slide=30/N36/1.2s；每条含fN边界键，所有root/asset父节点绑定TRS固定。局部pelvis增量转换到骨父空间，不能重复尺度归一化。
- 依批准参数，旋转相对rest，周期自动对称f1/fN-1切线保护；非循环用有界平滑插值。轴错误可小范围修正并记真实理由，不借机刷权或重新绑定。
- 新源`assets-source/characters/runner/basic-motion-sample/v1/runner-basic-motion-derived.blend`；新GLB及manifest在新证据目录。导出仅四clip，不混rig_diagnostic。
- DCC保存若干共同关键帧/中间时刻的具名骨矩阵、网格顶点、足底/远端影响与资源数。Node解析真实GLB逐姿CPU蒙皮对照，不以manifest自证。新进程重开新blend重导出到忽略目录并再次校验。

## Task 4 独立预览RED→GREEN

- 新`tests/e2e/pao15-basic-motion-sample.spec.ts`先RED：四clip、实际时长、真实软变形、循环边界、暂停/恢复、切换、重播、hold/rest归位、seek/marker不补发、释放重载。
- 新`tools/pao15-basic-motion-sample/index.html`/`preview.ts`使用同一GLB与manifest，RH原生glTF/Y-up/+Z；不导入游戏src。暖机后20轮切换/重播、10轮释放重载，资源按骨架/组/材质/纹理/网格分报。
- 5185 strictPort/reuseExistingServer=false/ANGLE D3D11。2～3关键图=Run、Jump、Slide（至少一侧视）实际打开；短录屏包含周期与阶段。工具错误闭环；串权、脚滑/穿地、包穿插如实列新证据TODO，不手修后才交。

## Task 5 完整验证、固定提交

- `npm run build`、`npm run test`；`node --check`；`npx tsc --ignoreConfig --allowJs --checkJs false --noEmit --target es2023 --module esnext --moduleResolution bundler --lib es2023,dom --skipLibCheck tools/pao15-basic-motion-sample/preview.ts`（显式纳入mjs依赖，JS逻辑另验）。
- 完整旧44 E2E与新增样本测试通过`npm run test:e2e -- --config .pao15-local/basic-full.config.ts`运行。旧测试镜像用.pw.ts，唯一改动为旧证据输出路径；保留原断言，旧工具/旧样本均只读。保留首失败日志，0 skip/retry；最终计数以实际为准。
- raw模块/新GLB HTTP字节与磁盘hash对照；全部旧跟踪文件与输入前后hash相同。N原生旧游戏回归与F独立样本明确区分，不宣称新runner自然输入接入。
- 新证据README分别给pipeline/quality、clip可用与缺项、人工TODO、资源和未测项，附SHA清单；商业条件/正式13动作/真机预算不验收。只暂存本批白名单，git diff --cached --check，正常hooks commit/push、ls-remote核对固定SHA。等待主Agent独立验收，不标Done/接游戏/放行18。
