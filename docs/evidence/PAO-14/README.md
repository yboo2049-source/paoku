# PAO-14 送审证据

2026-11-01（Asia/Shanghai）。工作目录 `D:/worker/paoku-sessions/pao-14`，分支 `codex/pao-14-application`，基线 `a4486a21435a7315d091769d8ac6bc8accc8f2f0`。仅执行 PAO-14；交付 In Review，等待主 Agent 验收，不设 Done、不启动其他任务。

先写 [实施计划](implementation-plan.md)，再由应用/账本、UI 适配、QA 隔离完成 RED→GREEN。应用服务拥有页面状态、活动局、钱包/皮肤权利和版本化存档；DOM 仅提交意图、读取冻结视图。结束/退出/暂停重开/结算页商店统一先封存完整摘要、成功提交后才清世界或创建新 runId。保存失败保留摘要和原局，可重试；旧 run 命令不能终止新局。

## 实现及边界

- 拾取次数、拾取收益、任务奖励分账；30真实拾取＋50任务奖励为 count30/pickup30/reward50/earned80。金币只在首次消耗处接线，任务奖励按 missionId 每局一次。碰撞求解、时钟/RNG/积分和关卡算法未改。
- 商店校验状态、商品、所有权及余额，重复 BUY 不再扣款；钱包、交货、装备同一次持久化。cyan/pink/gold/green/purple 原有权利保留。
- `paoku_save_v1` 为单记录 schemaVersion/revision/钱包/高分/权利/选择/五项音频偏好/settledRunIds。九旧键逐字段验证迁移，新记录成功写入即完成标识，旧键原样保留；刷新不重导旧余额。未来或损坏新记录 fail-closed 保留原件，不假称已恢复合法余额。
- Web Locks 串行化遵循本协议的同源标签页，raw token/revision 拒绝陈旧写入；首冲突明确失败，下次用户重试才安全重载。写失败不发布内存资金，写后抛异常仅在读回完全一致编码时认定已提交。无 Web Locks/存储不可用时返回明确失败，不降级为假事务。
- 幂等记录不裁剪；容量/整数上限到达时失败并保留重试，不宣称无限存储。未结算局在异常关闭后的进度恢复不在范围内。非合作代码直接改 localStorage 不属于本锁协议。

既有178单测数量保留。仅一个 PAO-13 装配用例因同步退出/运行中进商店的旧断言与新契约冲突，取得用户明确授权后补存储/锁夹具、异步等待和非法商店状态拒绝断言，原生成器断言保留；见 [授权说明](authorized-pao13-test-adaptation.md)。其他既有单测及28既有E2E原文不变。

另有明确兼容边界：privileged `Simulation.change` 的旧显式金币正增量转记 rewardCoins，不推断历史拾取；UI无法获得此写能力，生产旧桥不再次加钱。Standalone AudioEngine 默认旧键适配仅为已有独立客户端/测试保留，生产 singleton 禁用该适配，由应用注入已提交设置。完整事件封套与音频生命周期迁移未在本任务实现。

## 最终检查

| 门禁 | 实际结果 | 证据 |
| --- | --- | --- |
| npm run build | exit0，含tsc；保留既有大chunk提示 | build-final.log |
| npm run test | 16文件220/220（旧178＋新42） | test-final.log |
| 完整 npm run test:e2e，任务config | 37/37（旧28＋新9），193.128秒，0 skipped/unexpected/flaky，exit0 | runs/release/e2e-results.json、e2e.log |
| 稳定截图 | 最终完整运行包含3类拍摄场景与4张稳定图，执行者实际查看 | runs/release/screenshots/、screenshot-manifest.json |
| 实际服务与源码 | 独占5185 strictPort/no reuse，5项raw源精确匹配；整个src前后hash不变 | release/browser-source-identity/source-stability.json |
| 历史恢复 | 709份原文件逐字节恢复；共核验731路径，包含22个新增旧目录输出的移除；100个刷新输出仅存本机忽略镜像 | runs/release/history-restoration.json |
| Git范围/空白 | 仅白名单＋用户授权的单一测试适配；git diff --check通过 | 提交前暂存审查 |

补验原因：首批截图只等待可见，实际查看发现淡入过渡帧；截图辅助函数现显式等待 opacity=1 和有限动画完成，再采图。早期过渡图保留在本机prior-runs作为运行原始记录，不作为最终稳定界面依据。最后统一完整回归使用加强等待后的截图辅助函数；所有先前批次移至本机忽略目录，最终依据为release运行。没有修改CSS或布局掩盖问题。

## 实际视觉检查及主 Agent 抽看建议

执行者亲自查看下列四张稳定新图及完整回归镜像中的桌面/竖屏自然跳跃图。弹窗文字与按钮完整，无新增遮挡或横向溢出；运行中玩家完整可见且位于中道中央。旧右侧追捕角色局部出框、霓虹高亮及速度单位标注仍在，未重做表现。

| 场景/操作 | 分级 | 路径（本目录下） | 实际可见结果/待确认 |
| --- | --- | --- | --- |
| 桌面开始→跳跃→暂停，等动画完成 | N | runs/release/screenshots/N-desktop-stable-paused.png | 三个按钮完整、居中，无新增溢出 |
| 390×844真实CDP划屏→暂停 | N | runs/release/screenshots/N-portrait-stable-paused.png | 三按钮与弹窗均在视口内；非手机真机 |
| 竖屏暂停→菜单→商店 | N | runs/release/screenshots/N-portrait-stable-shop.png | 零余额/已装备/禁用购买显示正确，返回按钮可见；其余皮肤位于原滚动列表，不以此图声称全部可见 |
| 30币与致命列车同tick→完整结算 | F | runs/release/screenshots/F-desktop-stable-terminal-summary.png | +80收益、+50任务Toast和结算按钮清晰，不重叠；固定夹具不冒充自然路况 |

**建议主 Agent 抽看后三图（竖屏暂停、竖屏商店、桌面+80终局）**；有异常再扩看，不安排多审查者重复逐张检查。旧自然运行图实际查看路径在 `.pao14-local/verified/regression-output/docs/evidence/PAO-13/runs/final/screenshots/N-{desktop,portrait}-seeded-jump.png`，为本机回归镜像，不重复提交。黄色坡体遮挡的旧局限沿用前批报告，本轮未新增声称已修复。

新增桌面用例的截图前段为N；旧run命令注入/DOM篡改部分为F。其他F覆盖存储配额失败与重试、旧九键/权利、两个真实标签页冲突、锁等待期间暂停输入隔离、tick内COLLISION监听重入退出。新增用例pageerror/console error记录均为空。环境是Windows Chromium/ANGLE D3D11，未做手机真机性能、人工听音或正式模型标定验收。

## 失败记录、复现与收尾

初始RED、边界RED、首轮219/220冲突、商店缓存7/8失败均保留日志；未删测/跳测或放宽资金断言。补充边界probe显式config独立运行2/2、native控件probe1/1，不计入220单测或37E2E。非诊断性探针首轮绿灯明确保留原名，不冒充RED。

进一步复跑发现两类已区分的失败：一轮因Google Fonts的ERR_CONNECTION_CLOSED使2项网络日志门禁失败，四个对应外部URL随后预检均HTTP200（font-network-preflight.json）；另一轮35/36暴露真实native滑块编辑被每帧旧快照覆盖。后者新增持锁＋两次rAF确定性RED，两个range聚焦时保留编辑草稿，失焦读取已提交快照；没有让声音或存档先假成功。修复后旧native用例＋新锁等待用例2/2，build及220单测重验通过，最终完整回归为37项。失败日志final-browser.log、accepted-browser.log、red-slider-browser.log保留，不把这些轮次计作通过。

[浏览器协议](browser-validation.md)说明复现、N/F及恢复流程；[应用报告](application-report.md)、[账本报告](ledger-report.md)、[适配报告](ui-adapter-report.md)、[独立应用审查](application-independent-review.md)和[接线复核](ui-integration-review.md)说明细节。早期重复完整运行目录移至忽略的 `.pao14-local/prior-runs`，提交其摘要 prior-runs-summary.json 与必要RED日志。完整历史镜像/备份/npm shim均仅本机，不提交重复几十MiB图集。

没有生图、建模、GLB加载、渲染/相机/美术、HTML/CSS、依赖改动；不合并origin/main、不改远程历史。检查通过后正常hooks提交推送，并将提交号/远端核验结果回写Linear；该状态仅为送审，最终验收交主Agent。

本机Codex捆绑Git缺少bash，系统bash指向WSL；提交进程临时PATH使用同一捆绑sh及忽略目录npm入口，直接执行已安装Node/npm-cli，hook原文与build/test命令不变，不禁用/跳过hooks。Linear共享field-notes的get_agent_context/record_agent_learning均返回Tool not found，具体发现改由本目录和Issue评论保留；Issue状态/评论API正常。
