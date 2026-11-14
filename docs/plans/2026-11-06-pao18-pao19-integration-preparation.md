# PAO-18/19 接线准备任务

2026-11-06，Asia/Shanghai。本文件为**已有方案的限定集成准备**，不是生产实现计划或合并授权。不重做19界面/producer设计，也不诊断18车尾。目标是把两个固定已存在的工程来源和最后一段接线的范围变成可审查文档。

## 目标工作树已复用并核验

| 用途 | 实际目录与分支 | 固定提交与状态 |
| --- | --- | --- |
| 唯一准备目标 | D:/worker/paoku-sessions/pao-18-font-diagnosis；codex/pao18-font-diagnosis | c5a9edd103eaf3677a058b432c67ad9260450e4e，本地干净；代码提交3aa62fb；远端仍c3a7eb6 |
| UI只读来源 | D:/worker/paoku-sessions/pao-19；codex/pao-19-ui | b474845a972005b83f1278884b7dbe02c8af9615，干净、远端一致 |

两树顶层/common-dir、主仓worktree登记、分支、HEAD、status及指定远端已实际核对。18固定c3a7eb6为当前检查点祖先，19基线ff02092为b474845祖先；共同祖先19aa314。存在即复用，不新建树，不退回旧SHA。18已有依赖但本轮未新装或启动服务，先前build/320单测和已记录71/72不是本次集成成绩。

## 本批交付及写权

只允许在目标18树新增以下三份本批文档：

1. docs/superpowers/specs/2026-11-06-pao18-pao19-integration-design.md
2. docs/presentation/pao18-pao19-integration-contract.md
3. docs/evidence/PAO-19/integration-preparation/v1/README.md

其他文件只读。19来源通过固定b474845的Git对象读取，不扫描其目录/证据全集，不写19。共享核心文档、主仓进度、Linear、src/tests/index/CSS/public/默认配置/依赖均不能修改。禁止合并/cherry-pick、暂存/推送18当前检查点或先拼代码试跑；本批不启动浏览器，不重复验证15/16/17或旧18。

## 只核对尚未接上的差异

- 固定来源清单：19的src/ui/dom.ts、src/ui/views/models.ts、src/ui/views/screens.ts、src/style.css、index.html及中立src/presentation/hudSafeArea.ts；列明哪些字节未来可直接带入、哪些必须适配及理由。补必要旧/新测试来源清单与原断言保护方案，不提前声称合并后用例总数或全部适用。
- 18的main/babylon事实交付和冻结/生命周期保持为基线，不把19旧main整体覆盖。18 main目前在render之后update UI，需要设计唯一同帧UI写→批量读→render顺序，并保持同次presentation/AppSnapshot、事实stamp和独立receipt；UNREADY不能阻断事实/实体消费。
- index差异仅lang、viewport-fit及Google字体外链；继承19可用文档/视口语义，保留18同源字体和PWA资产能力。style差异须区分19UI布局与18同源@font-face/宿主Canvas样式，不重新引入外链或覆盖明亮场景能力；不因此重开字体或17美术审批。
- 复用19已经实现并验收的measure/read/invalidate/subscribe/reset/dispose及normalizeOcclusion/toBufferGeometry，冻结setHudSafeArea或等价数值入口的精确签名/所有者，不让render读DOM。CSS→buffer按实际尺寸仅换算一次；布局producer/epoch/revision与18事实streamEpoch/eventId分离。
- 保留现有reducedMotion/presentationOptions及CameraInput/solver边界；明确PLAYING、MENU/SHOP、PAUSED/GAMEOVER、resize/visualViewport、dirty/UNREADY/RELEASED、失效首帧、reset/dispose的行为。模态冻结时可更新只读诊断，不因布局变动抖镜头；任意侧面占区无解如实报冲突，不移动模拟角色或藏追逐者。
- 对同帧顺序、真实DOM与最终投影、长数字/四buff/Toast、390/桌面、DPR/实际buffer、暂停旋转、迟到租约/释放及事实不漏投列新增RED矩阵。既有H13/H14/H16只补生产接线缺口，不重复producer全部矩阵。
- 未来最小写权预计main/babylon、UI固定来源迁入、纯值适配及专属新测试。cameraRig求解器、simulation/input/physics、application/交易/音频、资产/动作/关卡/旧测试断言不开放；确需例外只列最小路径和实证理由，不自行写码。

## 风险和后续门禁

18检查点完整E2E为71/72，车尾已知场景失败继续延期且根因未知；本批只消费固定Git对象，不因此把父18标Done、豁免未来新失败或预先允许带失败合并。设计要提出集成前检查点同步、未来正常hooks/测试/阶段失败记录的具体处理建议，交主Agent裁定，不能继续追修车尾或反复跑旧suite。

文档完成后只做内容、固定引用和diff检查；正常hooks提交这三份文档。若准备推送当前历史链会一并发布18尚未同步的两个检查点，**本批不代推送**，返回本地SHA和这一依赖，由主Agent依据用户授权处理。不要把本地提交写成远端一致。

## 给原PAO-18聊天的提示词

```text
下一项是PAO-18/19限定集成准备，仍复用原18树，不新建树、不修车尾、不重做UI。
目录D:/worker/paoku-sessions/pao-18-font-diagnosis，分支codex/pao18-font-diagnosis。
本地c5a9edd103eaf3677a058b432c67ad9260450e4e，代码检查点3aa62fb；远端仍c3a7eb6，先核对实际Git，HEAD推进先审新增，不reset。

先读D:/worker/paoku/docs/plans/2026-11-06-pao18-pao19-integration-preparation.md，按其白名单只新增三份准备文档，不写生产/测试、不merge/cherry-pick、不启动浏览器。
只读UI来源固定为b474845a972005b83f1278884b7dbe02c8af9615的Git对象。
重点核对19 UI来源、main/style/index冲突、同帧写读render和实际producer到相机入口，补剩余接线RED矩阵及未来最小写权。
保留18事实桥/重入/字体/明亮场景；19 index仍含Google字体链接，不能整份覆盖；19旧main也不能覆盖18。

不重复旧设计或producer验收，不调查车尾/预览，不改父状态或启动其他Agent。
内容/引用/diff及正常hooks通过后仅提交三份文档，本批不推送尚未同步的18历史链。交固定本地SHA和具体集成方案待主审，再确定实现窗口。
```
