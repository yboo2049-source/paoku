# PAO-14 两项 P2 修订送审

2026-11-01（Asia/Shanghai）。基线 `3d0efe8c061d4482d60dbf5e429a9f980937eed0`，分支 `codex/pao-14-application`。依据主审2efbad5b/3cf9f0cb和本机 `D:/worker/paoku/docs/reviews/2026-11-01-pao-14-review.md`，只修两项P2，不接续其他任务。先写[修订计划](revision-plan.md)，应用与适配职责隔离、先RED再实施；不另起架构或美术方案。

## 改动

1. **商店陈旧缓存提前拒绝。** `SaveRepository.checkFreshness()`在共享锁内比较raw token；BUY/EQUIP在余额、所有权及已拥有BUY幂等判断之前调用。陈旧请求明确CONFLICT、保留当前内存；下次显式重试才load最新存档。update内原有锁与token检查仍在，覆盖检查与写入之间其他标签页再次写入的情况，不静默覆盖最新资金、不自动重试扣款。
2. **排队音频意图丢失。** 新增`UPDATE_AUDIO`及`AudioOperation`，三个布尔字段只提交TOGGLE，两个音量字段提交SET_VOLUME。应用串行执行时在受锁draft.audio上应用，写成功才发布新设置。MUSIC/SFX、HUD主静音、range输入均接入字段意图；旧`SET_AUDIO`完整设置替换接口保持兼容。暂停屏障、focused range编辑草稿、音频DSP/播放生命周期不变。

源改动只有appService/saveRepository/types、main应用桥、dom设置事件接线。没有碰撞、生成、渲染、GLB、音频引擎、HTML/CSS或依赖改动。原220单测全部保留，追加16；原37项E2E原文保留，新增pao14-review.spec.ts四项。

## RED 与回归

- 应用RED：`revision-application-red.log`，16新增失败/16已有通过；GREEN为32/32，见`revision-application-green.log`。包括跨服务旧余额购买、旧权利装备、已拥有BUY，音频不同字段、同字段/主静音双toggle、音量/开关交错、同音量排队、无效操作、失败重试与commandId幂等。锁为真实Promise串行锁，不用无锁函数冒充并发验证。
- 浏览器RED：`revision-browser-red.log`实际复现MUSIC被SFX旧快照恢复、音量/开关覆盖。最初双toggle夹具错误地在MENU点不可见HUD按钮而超时，该超时不是缺陷证据；修正为菜单BGM双toggle、开局后HUD主静音双toggle，`revision-toggle-red.log`真实复现expected true/received false。未放宽业务断言。
- 接线后新增浏览器4/4通过（`revision-browser-focused.log`），随后运行全部旧37＋新增4的完整回归。所有F用例调用真实应用/仓库/DOM接线；保存锁、HTML range input事件和另一标签页的100收益摘要属于对抗夹具，不能冒充自然拾取。

最终门禁全部通过，见`revision-validation-summary.json`：build exit0；16文件236/236单测（原220＋新16）；完整41/41 E2E（原37＋新4），221.762秒，0 skipped/unexpected/flaky，exit0。整个src前后hash相同，5项修订源码raw响应与checkout精确匹配；709份历史原文件逐字节恢复，共731路径核验通过。原PAO-14 release目录Git无差异。日志为`revision-build.log`、`revision-test.log`、`runs/revision-full/e2e.log`。

## 视觉与来源

浏览器独占127.0.0.1:5185、strictPort、禁止复用，Windows Chromium/ANGLE D3D11；桌面1440×900，竖屏390×844是桌面viewport模拟，非手机真机。

执行者已实际查看两张新增稳定图，未见新增遮挡/溢出。建议主Agent只抽看这两张，不安排多个审查者重复逐图检查：

| 场景/操作 | 路径（本目录下） | 检查目标 |
| --- | --- | --- |
| F：保存锁等待时真实点击MUSIC、SFX，释放后两者OFF | runs/revision-full/screenshots/F-review-desktop-audio-both-off.png | 已亲看：MUSIC:OFF与SFX:OFF同时可见，按钮/滑块和菜单完整，无新增布局异常 |
| F：另一标签页封存100收益，本页首次BUY冲突、同commandId显式重试成功 | runs/revision-full/screenshots/F-review-portrait-shop-retry.png | 已亲看：余额50、pink的EQUIPPED、cyan的EQUIP及返回按钮可见；其他皮肤仍在原滚动列表内，不以此图宣称全部可见 |

截图先等toast消失、弹窗可见、opacity=1及有限动画完成。截图与AppSnapshot JSON一并保存，不能用描述代替实际看图。原PAO-14 release证据不覆盖；其他历史原件由既有runner逐字节备份/恢复，完整刷新镜像和早期修订批次仅本机忽略目录，精简摘要为`revision-prior-runs-summary.json`。

## 保持的局限与收尾

新鲜度策略不承诺各标签页实时自动刷新，首次冲突后需用户显式重试；合作事务外直接改localStorage不在保证内。旧SET_AUDIO仍表示调用者明确提供整份设置，新UI使用字段意图避免旧快照覆盖。局内异常退出恢复、真机/听感、完整新版事件封套及既有美术局限均不属于本次修订。

完整门禁通过后运行正常hooks提交推送、核对远端，证据与局限回写Linear，设In Review等待主Agent复审，不设Done、不启动其他任务。提交/推送日志仅本机`.pao14-local/revision-commit-hook.log`及`revision-push.log`；提交号在Linear回写，避免改写提交历史。
