# PAO-14 两项 P2 修订计划

2026-11-01。仅修主审2efbad5b/3cf9f0cb及 D:/worker/paoku/docs/reviews/2026-11-01-pao-14-review.md 的两项P2。基线3d0efe8，codex/pao-14-application，目录/分支匹配且工作区干净。不切分支、不合并main，不启动其他任务。

1. 商店：先用两个AppService共享存储及真实串行锁复现另一页结算后本页持续INSUFFICIENT_FUNDS、另一页购买后本页持续NOT_OWNED。仓库提供受共享锁保护的只读新鲜度检查，放在BUY/EQUIP余额/权利判断之前；陈旧请求明确CONFLICT并使后续显式重试load。保留update内的锁及raw-token二次保护，不能用静默覆盖或自动扣款重试绕过冲突。
2. 音频：新增AudioOperation判别联合，TOGGLE字段限masterMuted/bgmEnabled/sfxEnabled；SET_VOLUME字段限bgmVolume/sfxVolume且值有限并在[0,1]。新UPDATE_AUDIO命令携带operation，在应用串行队列和仓库受锁事务内对当前已提交audio应用。旧SET_AUDIO完整设置接口保留。DOM只提交字段意图，main主静音按钮同样提交TOGGLE，不在点击时用旧快照计算整份新设置。写成功前不发布未提交设置。

职责隔离：应用角色仅appService/saveRepository/types及本任务新增单测；适配角色仅main/dom接线，等待RED后实施。Dispatcher负责浏览器RED、新回归、证据/完整验收/提交；不重复安排视觉审查。只读必要模块，不重新遍历全库。

RED矩阵：跨页结算→购买显式重试；跨页购买→装备显式重试；已有冲突保护与失败无资金假成功；同锁等待时不同音频字段、同字段两次toggle、主静音两次toggle、音量与开关交错/同音量字段排队；旧SET_AUDIO兼容、无效operation、同commandId幂等、失败重试。浏览器使用真实按钮/原生range事件和实际共享保存锁，归类F，不能只测私有setter。

源白名单限src/application/appService.ts、saveRepository.ts、types.ts、src/main.ts、src/ui/dom.ts；测试补入PAO-14自己的application/shopTransactions单测和新增tests/e2e/pao14-review.spec.ts。不改GLB、render、HTML/CSS、音频DSP、物理、生成或旧37项E2E。共享设计文档/PROGRESS继续只读，本计划记录本次实施数据与流程。

最终build、全部220项旧单测加新增、完整旧37项E2E加新增回归；独占5185 strictPort/no reuse，源码前后hash和raw source身份核验。复用既有runner，历史逐字节备份/恢复；原PAO-14已交付release证据不覆盖，新阶段使用独立revision名称。截图等待opacity=1及动画完成，只查必要桌面/竖屏稳定图并推荐2–3张。通过后正常hooks commit/push，核对远端、回写Linear后设In Review，不设Done，等待复审。
