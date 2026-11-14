# PAO-18 / PAO-19 集成准备回执 v1

2026-11-06，Asia/Shanghai。纯文档准备；没有实施、合并、浏览器/E2E、截图录屏或车尾重测。本目录不伪装运行证据。依据：[主仓任务书](D:/worker/paoku/docs/plans/2026-11-06-pao18-pao19-integration-preparation.md)。

交付：[限定集成设计](../../../../superpowers/specs/2026-11-06-pao18-pao19-integration-design.md)、[接线契约和剩余RED](../../../../presentation/pao18-pao19-integration-contract.md)、本README。

## 1. 实际 Git 核对

| 项目 | 本次读取结果 |
| --- | --- |
| cwd / Git顶层 | D:/worker/paoku-sessions/pao-18-font-diagnosis |
| 分支 | codex/pao18-font-diagnosis |
| 准备起点 HEAD | c5a9edd103eaf3677a058b432c67ad9260450e4e |
| 起点 status --short | 空，包含未跟踪项检查 |
| common-dir | D:/worker/paoku/.git |
| UI唯一来源 | b474845a972005b83f1278884b7dbe02c8af9615，Git对象可读 |
| 实测 merge-base | 19aa31492ddce4c1c5e74ef1e49312ad41ec2dd6 |
| 18同步依赖 | 任务书及既有检查点记远端仍c3a7eb64a7aa917e4a3cb7a88c1fb01a39dd4e85；本准备未重新查询远端或推送 |

复用已有18树，无新建/reset/clean/stash，无merge/cherry-pick，不读写19活动树，不启动Agent或变更Linear/依赖/父状态。固定来源通过 git show / git diff / git ls-tree / git rev-parse 只读；不读取19证据全集。

## 2. B19 精确来源清单

每个链接固定到完整提交，blob值由 git rev-parse B19:path 实测。未来直接迁入须逐个匹配；style/index为适配项，记录来源不代表目标应等于原blob。

| 路径/固定引用 | Git blob | 处理 |
| --- | --- | --- |
| [src/ui/dom.ts](https://github.com/yboo2049-source/paoku/blob/b474845a972005b83f1278884b7dbe02c8af9615/src/ui/dom.ts) | 3909d2dbdeefc70fb34ebc9f2221bed11c93c9c4 | 原字节候选；main另接命令反馈/同帧布局 |
| [src/ui/views/models.ts](https://github.com/yboo2049-source/paoku/blob/b474845a972005b83f1278884b7dbe02c8af9615/src/ui/views/models.ts) | 67a9c3ecf60ca97329fd88aa4ee0dfe10d9c5d77 | 原字节新增候选 |
| [src/ui/views/screens.ts](https://github.com/yboo2049-source/paoku/blob/b474845a972005b83f1278884b7dbe02c8af9615/src/ui/views/screens.ts) | 865ecdd56b9fb6defcfb89ce451020ebf0b0f878 | 原字节新增候选 |
| [src/presentation/hudSafeArea.ts](https://github.com/yboo2049-source/paoku/blob/b474845a972005b83f1278884b7dbe02c8af9615/src/presentation/hudSafeArea.ts) | e402beb9dd4824d3a1b360a78058099fa8d13db5 | 原字节新增候选，复用已实现producer/纯值函数 |
| [src/style.css](https://github.com/yboo2049-source/paoku/blob/b474845a972005b83f1278884b7dbe02c8af9615/src/style.css) | a7edd2aa3ee6cc2ca81d4c4e22943c53f1a50672 | UI布局来源；保留18同源@font-face，宿主尺寸选择性适配 |
| [index.html](https://github.com/yboo2049-source/paoku/blob/b474845a972005b83f1278884b7dbe02c8af9615/index.html) | 96656edea04c12e089b7ad47fe04d879be5c9fb3 | 只继承lang/viewport-fit，不带Google字体外链 |

补充只读固定引用：

- [19几何桥设计](https://github.com/yboo2049-source/paoku/blob/b474845a972005b83f1278884b7dbe02c8af9615/docs/superpowers/specs/2026-11-04-pao19-hud-safe-area-bridge-design.md)、[契约含H13/H14/H16](https://github.com/yboo2049-source/paoku/blob/b474845a972005b83f1278884b7dbe02c8af9615/docs/ui/pao19-hud-safe-area-contract.md)、[producer阶段README](https://github.com/yboo2049-source/paoku/blob/b474845a972005b83f1278884b7dbe02c8af9615/docs/evidence/PAO-19/hud-safe-area-producer/v1/README.md)。README仅按需读取其阶段边界/门面，未重验或搬运其运行证据。
- [19 main差异来源](https://github.com/yboo2049-source/paoku/blob/b474845a972005b83f1278884b7dbe02c8af9615/src/main.ts)：仅比较UI回执接缝，不整份采用。
- [19 UI模型unit](https://github.com/yboo2049-source/paoku/blob/b474845a972005b83f1278884b7dbe02c8af9615/tests/unit/pao19-ui.test.ts)、[producer unit](https://github.com/yboo2049-source/paoku/blob/b474845a972005b83f1278884b7dbe02c8af9615/tests/unit/pao19-hud-safe-area.test.ts)、[UI E2E](https://github.com/yboo2049-source/paoku/blob/b474845a972005b83f1278884b7dbe02c8af9615/tests/e2e/rebuild-ui.spec.ts)、[producer E2E](https://github.com/yboo2049-source/paoku/blob/b474845a972005b83f1278884b7dbe02c8af9615/tests/e2e/pao19-hud-safe-area.spec.ts)。以上为未来迁入清单，当前未复制到tests。
- [18 main基线](https://github.com/yboo2049-source/paoku/blob/c5a9edd103eaf3677a058b432c67ad9260450e4e/src/main.ts)、[18 Babylon门面](https://github.com/yboo2049-source/paoku/blob/c5a9edd103eaf3677a058b432c67ad9260450e4e/src/render/babylon.ts)、[18 CameraRig边界](https://github.com/yboo2049-source/paoku/blob/c5a9edd103eaf3677a058b432c67ad9260450e4e/src/render/cameraRig.ts)。18尚未同步提交的链接可能在远端暂不可用；本地Git对象为本次核查依据，不宣称已发布。

## 3. 已确认差异和推荐交接

1. 18 main在render后才update UI，且UI拿simulation.snapshot.context而render拿presentation.context。候选改为同次presentation/app/view，UI写→批量测量→纯值换算→第三参render；保持原stamp和独立receipt。
2. B19 producer已有measure/read/invalidate/subscribe/reset/dispose门面，无生产消费者；本准备不重复producer设计或声称相机已通过。
3. 19旧main删除了18后加事实桥/重入/故障保护；不能整份覆盖。其命令pending/result、相同意图的commandId和已封存summary关联、TOGGLE_AUDIO身份透传是所需适配点，保留18屏障和业务规则。
4. index差异只有lang、viewport-fit和Google字体链接。只迁前两者；style迁UI布局及宿主必要尺寸语义，保留18同源字体声明/资产/PWA能力，17场景不动。
5. 采用render第三个HudCameraFrame纯值参数和getPresentationSize只读数值门面；无DOM渲染依赖，无布局总线、shared types改动。实际buffer换算一次，reducedMotion/presentationOptions保留。
6. PAUSED/GAMEOVER冻结实际AnimationGroup/镜头pose；最终投影按同帧实际三角色bounds和新布局独立诊断。新桥UNREADY不回退旧profile假报safe，也不阻断事实和实体；第一失效帧局部保留camera pose。
7. B19 pao6-baseline在roof-jump前增加reach(page,31)，18旧测试没有此行；不带入，不修改旧等待/断言，不借UI迁入处理车尾。
8. 18 pao18-controller-camera.spec.ts:149–150、227–238具有旧HUD底部112/240px布局断言，与19顶部速度表/手机侧列存在源码语义冲突。设计第7节提出唯一具体例外候选：旧布局断言原样保留于明确兼容夹具，生产N和新UI投影另分报；仅候选触碰该旧文件两段装配/分类及新tests/fixtures/pao18-legacy-hud.ts，须主审另批。没有实际运行或改写旧断言，不把此冲突与当前PAO-6失败混同。

未来最小生产范围：main、babylon、上述固定四份TS来源、style/index选择性适配，以及新纯值hudCameraInput。新集成unit/E2E与19四份专属测试另列白名单。cameraRig求解器、simulation/input/physics/application/audio/shared types、资产/关卡、旧测试/依赖/默认配置只读。详细路径与例外规则见设计第7节。

## 4. 验证边界和本批检查

本批仅确认Git、固定对象/差异、文档内容与引用、git diff --check，以及提交时正常hooks。没有运行新的producer/集成矩阵，没有启动5188或浏览器，没有运行E2E/截图/录屏/车尾诊断。

原18 build/320unit、71/72E2E及19 producer成绩均只作来源记录，不当成本次集成通过。当前18失败索引：[FAILURES.md](../../../../evidence/PAO-18/fact-bridge-implementation/FAILURES.md)。下一批先由Dispatcher裁定检查点同步与验收基线；任何新失败或原失败均须留首现场，不自动豁免/合并。

准备文档的检查/本地提交回执见最终交付消息；不在文档中预写未发生的hook通过或提交SHA。未来实施之前须独立主审本设计/精确签名/文件范围，再写专属实施计划。

## 5. 发布限制

18本地代码/证据检查点3aa62fb、c5a9edd尚未同步；直接push本分支会一并发布它们。按任务书，本批仅正常hooks提交这三份文档，不推送当前历史链，不声称远端一致。最终返回本地固定提交，由主Agent根据用户授权处理历史链同步与后续独占实施窗口。

准备结束不代表18或19 Done；15/17→18父依赖保留，正式新角色/19生产接入/车尾预览均未验收。没有自动进入实现或合并。
