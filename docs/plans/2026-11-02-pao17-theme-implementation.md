# PAO-17 Bright Theme / Ramp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 一个明亮城市轨道程序主题，有界连续环境、局内展台隐藏、真实逻辑楔形坡和完整程序车顶接缝。

**Architecture:** 保留现有门面/同次快照/资源生命周期；environment只拥有视觉池、共享背景材质和独立展台，entityViews从只读实体生成网格，babylon管理光照/雾/后处理/近影。Surface只由测试读取，生产渲染不依赖systems。

**Tech Stack:** 本树锁定Babylon/TypeScript/Vitest/Playwright，无新依赖。

2026-11-02。接续536f54b41866e2819d21cd674e64af2cb4d70f80，codex/pao-17-render；主仓批准计划/设计/首批主审为当前授权，使用writing-plans后由本聊天单一实现方按executing-plans/TDD执行，不派Agent、不重复审批。实际主仓HEAD/状态/输入字节hash见`../evidence/PAO-17/bright-theme-preview/inputs.json`，初始原件与全部已有.pao17-local文件hash见initial-protection.json。新增临时文件仅放.pao17-local/bright-theme，不覆盖旧本地证据/配置/镜像。

## Task 1 — 固定环境池与展台

Files: 修改src/render/environment.ts及babylon内部sync调用；新增tests/unit/pao17-theme.test.ts。

1. RED：实际Scene/NullEngine中按z=0、120±epsilon、多个L跳转、负值回退和reset读取真实track网格顶点经world矩阵后的覆盖边界，验证固定5个root、所需段身份、重复signal-post几何中心只归一段、无冻结矩阵残留。MENU/SHOP显示，其他三状态隐藏，reset保留局内隐藏。mock Math.random为抛错，证明背景不消费任何随机源。
2. Run `npm run test -- tests/unit/pao17-theme.test.ts`，失败日志写本批task1-red.txt，不能只测保存的目标数字。
3. 最小实现：保留LegacyEnvironment构造/类名兼容；导出局部BRIGHT_THEME参数，5个slot按index模5复用，sync(z,state)用floor计算idx-1..idx+3并强制更新world矩阵，固定几何在[0,120)重复。独立podium集合显隐，不冻结移动网格。初始far280、fog100..250，覆盖camera z-9到z-9+280。菜单既有360°环视不改变策略，独立展台背景底面覆盖far+6.2m环视半径，真实顶点验证并随展台隐藏，避免将非对称局内段池误称为全向覆盖。
4. GREEN目标单测和`npm run build`，随后继续。

## Task 2 — 明亮色板、Glow/近处阴影与归属

Files: 上述三渲染文件、必要assets.ts；新增tests/unit/pao17-theme-lifecycle.test.ts。

1. RED：真实NullEngine/Scene统计环境跨20轮跳转、10次reset的mesh/node/material/texture/animation/skeleton/particle/Glow/caster数量与清理，检查可见近景/中景/远景分类与暖冷光参数。真实浏览器另以成功加载legacy GLB、8个以上实际渲染帧并确认阴影计数稳定后立基线。
2. Run theme/lifecycle RED后，制作唯一工程主题：天空#BEDFF4、底色#657A88、钢轨#5E6871、站台#F0E7D5、暖强调#E8B74F；轨面/轨枕/路侧/楼体按段材质合批，周期3/24/30整除120，边界物z<L。不生成玩法对象、Surface或模拟RNG调用。
3. babylon设置暖主光/冷填光，far280和linear fog100..250；FXAA开、bloom关、Glow0.15仅背景信号/金币白名单，阴影1024和近处80m初值。entityViews显式维护可回收caster集合供近影增删、可回收Glow引用；player近影沿用既有注册。灯光跟随玩家Z而不改变镜头策略。
4. Run `npm run test -- tests/unit/pao17-theme.test.ts tests/unit/pao17-theme-lifecycle.test.ts`及build；保留既有缓存/失效/reset/dispose契约。

## Task 3 — 真楔形与程序ROOF

Files: src/render/entityViews.ts；新增tests/unit/pao17-ramp-view.test.ts。

1. RED：从实际mesh PositionKind/indices及world矩阵建立三角形垂直射线求最高表面，用只读obstacleSurface/sampleSurface独立比较脚/中/顶/两侧、坡顶73→车顶入口73/出口85，以及X偏移、Y+5、尺寸变化。原盒体的坡脚错高、车顶缩进及-0.005顶面偏差必须失败。箭头实际顶点应在坡面上方窄偏移内，顶面法线向上。
2. Run `npm run test -- tests/unit/pao17-ramp-view.test.ts`保留RED。
3. 最小实现：私有VertexData楔形，底面/左右/后面封闭，坡面从local z=-d/2,y=0升到z=d/2,y=h，硬边法线；箭头顶点直接贴逻辑坡面窄偏移。程序顶板宽深取obs原值，厚0.15、中心y=h-0.075使顶面恰好h。材质配合明亮主题，但车身/碰撞/跳高/容差不改。
4. GREEN目标单测/build，然后完整单测。

## Task 4 — 完整N/F、实际暖机与交付

Files: 新增tests/e2e/pao17-theme.spec.ts、pao17-ramp-view.spec.ts，专属证据docs/evidence/PAO-17/bright-theme-preview/；任务设计/接口状态可更新。main/shared types/modelBindings/core/systems/application/DOM/public/HTML/默认配置/依赖/所有旧测试保持只读。

1. 本轮专属N桌面键盘/390触摸启动、移动、暂停/恢复、结束/重开，记录逐图run/tick/seed/视口/DPR区间。F用QA限定现有传感器/独立受控宿主：标准坡及Y+5实际走坡/顶/退出，三角几何接缝与角色可见；多段跳转/回退/重开后覆盖和基线。
2. 原12份/48项E2E全部镜像到.pao17-local/bright-theme/mirror（.pw.ts），仅改输出路径/必要相对import重定向，逆变换源hash逐字一致；旧48原断言/时钟/资源检查全部保留。新测试不覆盖旧preparation/structure-lifecycle证据。
3. `npm run build`、`npm run test`、`npm run test:e2e -- --config .pao17-local/theme-acceptance.config.ts --retries=0`；5187独占strictPort、不复用、D3D11、单worker；配置只在新增本机路径，不覆盖旧acceptance配置。真实GLB/阴影充分暖机稳定后20轮回收/10次reset严格回基线，最终dispose归零；不等待被取消loader Promise必然结算。
4. raw实际源和legacy player磁盘/HTTP hash、所有保护原件/已有local证据hash核对。查看2～3本轮真实图：明亮桌面、390、坡顶/角色接缝，异常扩看；额外循环帧索引可辅助，不拿旧图代验。
5. 写最终参数/N-F与完整计数/时长/重试/首次失败/剩余范围，正常hooks仅提交白名单并push核远端SHA。记录首次失败不抹去；不合入15/16/19，不制作/加载四新GLB，不改Linear或父Done，不启动18/20。

## 完成口径

仅工程预览/循环/程序坡顶阶段送主Agent复审，正式资产、生产标定、角色动作/镜头、PAO-19 UI及真机预算继续递延。结果和实际参数在本批verification.md记录，不能把旧261/48当新批成绩。

## 执行结果

Task1～4已完成本批实现与验证，待正常hooks提交推送并交主Agent复审。最终build、24文件273项单测通过；完整53项E2E（原48＋本批N2/F3）同最终源码复验通过，381.708秒，0自动重试/skip/flaky/unexpected。保留首轮assets冷导入超时、法线/菜单RED、全部视觉迭代，以及一次外部字体网络失败的52/53完整记录；未删旧断言/改时钟或屏蔽错误。参数与阶段证据见[验收报告](../evidence/PAO-17/bright-theme-preview/verification.md)。
