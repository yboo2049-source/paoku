# PAO-18/19 接线实施 v1：类型门禁失败停止现场

本文件保留首次类型停止现场。后续已修类型并执行唯一完整门禁，最终103/106通过、3项新失败；当前状态见[FOLLOWUP.md](FOLLOWUP.md)，原始失败文件不覆盖。

2026-11-06（Asia/Shanghai）。状态：未提交WIP，未完成集成验收，按获批执行计划的失败规则停止。起点及当前HEAD均为 d303633e2539a26ca595438b51216a02900df92f，分支 codex/pao18-font-diagnosis；开工实测远端相同。没有新提交或push，没有合并/父Done/依赖变更，也未启动其他Agent。

依据：[获批主计划](D:/worker/paoku/docs/plans/2026-11-06-pao18-pao19-approved-integration-execution.md)、[主审](D:/worker/paoku/docs/reviews/2026-11-06-pao18-pao19-integration-design-review.md)、[本树实施计划](../../../../plans/2026-11-06-pao18-pao19-integration-execution.md)。本报告保留错误，不把行为RED或中间GREEN当完整门禁成绩。

## 已完成的限定工作

- 实测cwd/顶层/分支/HEAD/status/common-dir/远端和worktree登记；原树干净，5198无监听。原始新输出位于 D:/worker/paoku-diagnostics/pao18-pao19-integration-20261106，首次创建前确认不存在且在项目根外。本地脚本仅.pao18.local/pao19-integration。
- 保护索引1,400项，关键源/旧测试/字体等92项SHA256；停止时排除获批可写的5个原有关键文件，其余87项实测不变，未发现白名单外改动，暂存为空。全索引/原始清单在根外protection-before.json；精简核对见[stop-status.json](stop-status.json)。
- 首轮真实main行为RED：原顺序render→update、UI异常逸出、未通知pending，3条断言失败；[red-main.txt](red-main.txt)。真实Babylon第三参/诊断RED随后留存，[red-camera.txt](red-camera.txt)。
- b474845a972005b83f1278884b7dbe02c8af9615的四份生产TS原字节迁入，停止时四blob全部匹配；四份专属测试迁入，E2E仅按获批范围改生产host缓存读取/输出出口。见[fixed-source-copy.json](fixed-source-copy.json)。
- style组合19布局与18原两个同源font-face；index只继承中文lang/viewport-fit。未引Google字体，不改public/PWA或17场景。
- 旧controller-camera仅迁移三组旧布局断言归属至显式F夹具，viewport和五行输入保留；原N输入/lane/真实骨骼与组暂停/溢出/恢复重开/错误断言仍在生产UI。固定c5a9edd的旧uiHTML模板和完整CSS在新tests/fixtures/pao18-legacy-hud.ts装配真实独立HTML，不伪造rect或改生产CSS。本轮未运行此浏览器夹具。
- main同帧update→measure→render、同一view/AppSnapshot、第三纯值参、UI异常独立处理、pending/result/原commandId/封存summary与TOGGLE_AUDIO身份兼容已写入；Babylon数值尺寸/UNREADY局部pose保护与最终投影诊断已写入。尚未经过浏览器/最终完整门禁，不签收普通390/桌面投影。
- 新集成unit及7条集成E2E已写入。E2E尚未列举/执行，7只表示源文件定义数，不是完整suite实际计数或通过数。

## 当前停止点：显式新测试类型检查 exit2

首失败原文和完整命令：[tests-tsc-initial.txt](tests-tsc-initial.txt)。这是未预期门禁失败，不是预先建立的功能RED。没有为消除它追加改写继承测试或改检查配置。

| 文件/位置 | 原始错误 | 归属 |
| --- | --- | --- |
| tests/e2e/rebuild-ui.spec.ts:10、11、47、67、69、74、80、89、91等 | TS2307：绝对动态导入 /src/main.ts、/src/ui/dom.ts、/src/core/eventBus.ts、/src/systems/spawner.ts 无法解析 | 固定B19继承源码；本轮只改该文件输出变量，没有修导入 |
| 同文件:40，三处调用 | TS18047：cdp可能为null | 固定B19继承源码，原断言与控制流程未变 |
| tests/unit/pao19-hud-camera-integration.test.ts:24 | TS2345：spyOn(any).mockImplementation 的(number,number)参数不兼容unknown[] | 本轮新增测试替身的类型签名错误，尚未修复 |

获批迁入测试仅允许host缓存读取、替身补齐和输出适配。rebuild-ui继承的导入/空值类型处理不在这三类内；本任务又要求遇新失败/其他继承失败保存现场停止。因此保留全部WIP交主审，不扩大到测试语义或通过本机配置掩盖错误。

最小后续处理建议（尚未执行）：只对新集成unit修正spy参数类型；另明确是否允许tests/e2e/rebuild-ui.spec.ts的纯类型适配，将绝对导入改为同URL的变量动态导入，并对已由mobile分支控制的CDP做类型收窄。保持全部断言/故障注入/控制流程/原60秒/load/retries，不改游戏或旧PAO-6。此是新增范围裁定，不重开已批准的18/19设计或旧HUD例外。

## 实际验证结果

| 检查 | 本轮实际结果 |
| --- | --- |
| main行为RED | 3/3按预期行为失败，原文保留 |
| Babylon边界RED | 第三参能力未实现的断言失败，原文保留 |
| 源tsc（main接线后） | exit0，[source-tsc-host.txt](source-tsc-host.txt) |
| 目标unit（新增/迁入+原pao17-main/pao10-main） | 5文件37/37通过，exit0，[target-green-02.txt](target-green-02.txt) |
| 新测试显式tsc | exit2，当前停止点 |
| 最终build / 完整unit | 未运行 |
| 新浏览器目标组 / --list / 完整E2E | 均未运行 |
| 本轮截图/录屏/实际投影/资源暖机20轮及10reset | 均未执行，不以测试代码当通过 |
| 四份生产固定blob / 白名单外87项SHA256保护 | 匹配/通过 |
| tracked git diff --check | 通过；未暂存/提交 |

中间TDD环境修订均留根外原始日志：NullEngine测试替身需显式提供buffer尺寸，新增pose断言对目标重算采用浮点容差；AppSnapshot getter每次返回副本，传感器改为捕获本帧一次getter结果验证引用，而非与上帧副本比较。没有改变固定来源测试断言来让功能通过。

根外另保留 camera-green.txt、target-green-01.txt 等中间失败输出、wip.patch与wip-new-files快照。没有删除或覆盖首失败。没有启动服务或浏览器，因此5198无本次需清理服务。

## 能力与交接边界

当前只有源码和目标unit层面的工程进展。普通HUD与最大HUD、最终真实三实体投影、自然键盘/触摸、实际组冻结/旋转、迟到/资源稳定/释放以及完整旧新回归均未验收，不声称接线完成。

原18 PAO-6 roof-exit-land预期PLAYING实际GAMEOVER及历史导航/断连记录原样保留，本轮未复现/调查/修改。此次类型失败不在单项车尾阶段提交例外内，故不得提交推送。下一步由Dispatcher审查本现场及最小类型适配范围；不自动继续实现、合并或标父18 Done。
