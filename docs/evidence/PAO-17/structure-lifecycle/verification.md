# PAO-17 首批结构/生命周期阶段验收

2026-11-02（Asia/Shanghai），单一实现方在codex/pao-17-render接续fcddba1，按已批准A→B执行。本批交主Agent复审；不标父PAO-17 Done，不解除16/9依赖、不合并、不启动18。

## 实现范围

保留BabylonRenderEngine构造/render/reset/applySkin/triggerShatterFX门面，新增幂等dispose；提取assets资源缓存/实例租约/共享材质、environment原有环境构建和循环、entityViews原有几何与差分/阴影撤销。原环境两段方法的规范化文本与初始babylon方法逐字一致（不是新主题或循环算法升级）。

加载消费者按epoch失效，共享renderer缓存独立存活；晚到销毁资源、失败不逐帧重试、非几何空容器不替换fallback，挂载设置失败回滚本次实例/阴影/动画/骨架，不把共享材质提前dispose。只读状态使用既有immutableCopy，set/delete/clear/valueOf绕过与前后Map条目传感器通过，core未改。

B仅修改main的渲染取样、legacyView同步应用投影参数及disposeGame释放桥/幂等保护。context/runId/tick/discontinuity来自一次presentation(alpha)，应用投影来自同回调一次快照；帧类型在render模块，shared types只读；断点同run/tick只消费一次，reset与紧随身份边界合并。没有再插值模拟位置或重排业务事务。

## 已执行门禁

| 检查点 | build | 完整单测 | 完整E2E | 重试 / 跳过 / flaky / unexpected | E2E时长 |
| --- | --- | --- | --- | --- | --- |
| A，main仍初始字节 | 通过 | 19文件，254/254 | 47/47（旧43＋专属N2/F2） | 0 / 0 / 0 / 0 | 319.859秒 |
| B最终 | 通过 | 21文件，261/261（原244＋新增17） | 48/48（旧43＋专属N2/F3） | 0 / 0 / 0 / 0 | 336.163秒 |

B-final完整单测记录耗时10.14秒；其后正常hook发现专属main单测冷启动超时，已通过测试模块静态预载修复并完整261项复验，具体诊断/首次失败见执行记录。运行时代码字节未变，表内完整48项E2E与最终运行时代码身份一致。完整命令：`npm run build`、`npm run test`、`npm run test:e2e -- --config .pao17-local/acceptance.config.ts --retries=0`。A/B终端日志（提交版仅规范行末空白，原始字节留本机）、Playwright报告、raw/HTTP身份及检查点hash均在本目录。专属N桌面键盘与390触摸均自然启动、运动、暂停恢复、碰撞结束并重开；没有QA注入/改seed/改时钟。专属F分别为资源与故障生命周期、源码/HTTP身份、B增加真实main释放桥。旧43项保留原测试分类和断言，不重新解释为新资产能力。

服务器独占5187，strictPort=true、reuseExistingServer=false，Windows Chromium ANGLE D3D11，单worker。完整旧回归10份.pw.ts镜像只重定向输出，逆变换source hash一致见[清单](mirror-manifest.json)，默认Vitest未误收镜像。临时配置/镜像/批量旧图保存在.pao17-local，默认配置/依赖/锁文件不改。

## 资源归属与故障证据

[真实资源记录](B-final/F-renderer-resources.json)固定夹具为404失败的legacy player加载＋现有程序实体/共享材质暖机：20轮实体创建/删除及10次reset逐项严格回同一基线，不容忍固定增长。counts覆盖mesh/node/material/texture/animation/skeleton/particle/caster。该夹具不冒充生产资产预算；同源加载/新旧消费者/缓存租约由assets单测独立验证，实际成功加载的legacy player完整释放由main真实浏览器证据补足。

[main释放结果](B-final/F-main-release.json)从真实生产模块入口调用disposeGame：Engine从1归零，Scene的mesh/node/material/texture/animation/skeleton/particle全部归零，sceneDisposed=true，无pageerror。受控宿主F另证重复dispose、外部canvas保留、旧skin/resize无响应及销毁后晚到资源dispose一次。此处验证renderer与现有main释放桥，不承诺未在本批重做的DOM/UI或应用整体热重挂载生命周期。

RED和首轮失败均保留，详见[执行记录](execution-record.md)：A首次45/47通过、0重试；网络夹具等待及自然路线目标选择修正后完整47全绿。B先有4项单测RED和真实main资源未释放RED；复核另加root-only/部分挂载回滚两项RED后修复。没有删除旧断言、skip、缩时或覆盖首轮失败换全绿。

## 图片索引与视觉结论

最终挑选的3张自然输入关键图及逐图viewport/DPR、runId/tick/seed前后采样区间、浏览器版本/参数和源hash见[图索引](visual/index.json)。采样区间包围截图，不将单个tick当精确截图时刻。

| 图 | 用途 |
| --- | --- |
| [桌面](visual/desktop.png) | 1440×900，旧场景、角色与HUD的兼容取景 |
| [390触摸](visual/390-touch.png) | 390×844，真实CDP触摸后的局内角色与HUD |
| [390重开](visual/390-restart.png) | 暂停屏原生重开，新run身份及首帧取景 |

已查看A的桌面/390图及B最终桌面/390/重开图；无新空白画面或HUD横向溢出。保留的legacy缺口包括Glow过亮、近处追逐者裁边、原点菜单展台在起跑/重开首帧占据下部取景；几何/镜头/配色均沿用原参数，本批不借此扩大到主题或18镜头改造。最终自然输入图不能代替生产障碍/坡面标定或风格签收。

## 原件保护、提交与剩余范围

[最终保护与结果](final-protection-and-results.json)对999个初始跟踪文件逐字节复核：只有授权的main/babylon和两份任务设计/接口状态文档变化，其他995个原件全部一致，1个gitlink只保留提交身份、不遍历内容。preparation原证据、public全部资产、types/core/systems/application/DOM/HTML/CSS、依赖/锁文件、默认配置、旧测试及历史证据均未改变。legacy player磁盘/HTTP字节hash一致，五个实际实现模块raw身份一致。

最终提交前再核对暂存白名单和git diff --check，通过正常hooks的build/test；完整hook/commit/push终端记录留本机.pao17-local，远端SHA另以交付报告为准。使用verification-before-completion及finishing-a-development-branch收尾；用户已明确授权仅提交推送并保留工作树，技能通用的merge/PR/清理选项不覆盖本次边界。

剩余：四件生产GLB与标定元数据、I-03事实事件/I-04生产绑定、正式组合接线、主题段池/近中远景/明亮灯光与预算、真正RH/LH生产标定、18正式角色动作/镜头、15/16/19跨分支整合均不在本批。合成根夹具只证显式key去重/非零基点，不将R06/R08/R09全部宣称通过。需主Agent阶段复审与后续固定提示词后才能续作。
