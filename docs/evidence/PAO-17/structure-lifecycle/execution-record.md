# PAO-17 结构/生命周期执行记录

2026-11-02，接续fcddba1495a27436de64971720aad67624bc4420。当前授权为主仓2026-11-02批准计划；原preparation证据不覆盖、不改写。主仓HEAD/磁盘状态/字节hash见current-inputs.json；历史692bf24仅代表当时HEAD，不能证明旧提示词或其后更新的文档均来自该提交。本次工作树跟踪文件保护清单为999个文件、1个gitlink（只记提交，不遍历资产树）。

## Task 0～3 / A

- 已用writing-plans细化任务并按executing-plans/TDD执行。用户指定本聊天单一实施、A通过后直接串行B，覆盖技能通用的再询问/分派流程。未启动Agent/其他任务。
- Task1 RED为4项AssetCache能力断言失败，见task1-red.txt（原始字节留本机）；GREEN验证renderer缓存与消费者资格分离、旧消费者不挂载、共享资源不早销毁、失败与空容器不逐帧重试、晚到释放及最新皮肤取样。
- Task2 RED为缺少EntityViews能力的3项断言失败，见task2-red.txt。迁移首次检查发现erasableSyntaxOnly不允许构造参数属性、syncPowerUps遗漏totalTime参数；已按报错修复。task2-green-attempt1.txt保留运行时错误。另一次测试将Babylon带内部观察属性的空renderList与原生[]深比较，虽无元素仍不相等；改为严格断言length===0，保留检查“无caster”的原意，没有删实体/资源断言。最终7项通过见task2-green-final.txt。
- Task3 RED捕获缺少dispose的2项失败；20轮实体创建/删除、10次reset资源基线测试同时通过。补齐精确回调off/resize注销、失效epoch、实例及共享容器释放、Scene/Engine释放、Canvas归属与幂等dispose。NullEngine宿主最初缺document事件接口、随后把动态纹理内部canvas与宿主canvas错误复用，均修正测试宿主模型，保留task3-green-attempt1.txt和task3-green-final.txt失败记录；真正GREEN见task3-green-attempt3.txt。
- A build成功、完整单测19文件254项通过（A-build.txt/A-unit.txt）；默认Vitest没有误收.pw.ts完整回归镜像。
- A首次完整E2E：旧43项全部通过，新桌面N通过，新增F和390 N失败，合计45/47通过、0重试，5.3分钟。见A-e2e-first.txt，原结果不会覆盖。
- F失败原因：route.abort后Babylon仍在网络失败处理时，夹具用120个rAF过早检查FAILED。改为确定HTTP404并等待真实pending结束，不改生产加载器、不修改时钟。专属复验验证真实renderer资源、20轮/10次reset、dispose/remount/外部canvas、销毁后晚到与skin/resize隔离。
- N首次失败是安全路线未在40秒内自然撞毁；首次主动接近尝试又把带坡工程车的ROOF当危险实体，角色合法上坡通过。只读自然流程诊断见本机.pao17-local/natural-debug.json（前期INTRO没有障碍，随后生成ramp-truck组合）。修正新测试的目标选择，排除ramp-truck，等待真正危险实体，用真实键盘/CDP触摸接近；没有插障碍、改seed/快照/物理、缩时间或删除GAMEOVER/重开断言。
- A-targeted-e2e.txt保留第二次夹具尝试2/4失败；A-targeted2-e2e.txt为4/4通过，0重试，约1.1分钟。完整A检查点另用A-final批次复验；成功前main始终只读。
- 已抽看本批A桌面与390自然输入截图：角色/跑道/HUD可见，未见横向UI溢出或空白；旧Glow过亮、追逐者在近处可能裁边及旧KM/H标注属于legacy兼容现状，不签收明亮城市/新UI或重设计镜头。本批不借这些旧表现扩大范围。

## Task 4～5 / B

- A-final检查点通过完整47/47 E2E，0重试/跳过/flaky/unexpected，319.859秒；源身份与main未改字节的保护核对见A-checkpoint.json。进入B后才修改main。
- B先运行task4-5-red.txt：5项中4项失败，捕获缺少帧身份、断点重复/边界合并能力及main释放桥；暂停时钟断言作为兼容回归已通过。task5-browser-red.txt通过真实main路径证明未接桥时仍有1个Engine、45个mesh、74个node、37个material、9个texture、7个animationGroup、1个skeleton与1个particleSystem，明确为预期RED，不当最终结果。
- I-01：main每帧一次presentation(alpha)保存context/runId/tick/discontinuity，同一同步回调保存app快照并同时传给legacyView；不再二次插值。只读FrameIdentity在babylon模块导出，shared types不改。真实main模块执行测试使用每次采样都不同的身份/位置，验证身份配对及仅一次应用投影，不靠源码字符串。
- 断点按当前run/tick高水位只消费一次；public reset与紧随帧边界合并、render后解除预清理标记，兼容无附参调用。角色位置精确取已给插值值，不从旧根再次插值；局内视觉时钟暂停不推进模拟。
- I-02：disposeGame加幂等保护并在原释放步骤后调用renderer.dispose。可选调用仅保持旧展示adapter/旧测试double缺少新增方法时的兼容；本批实际renderer必有dispose，真实浏览器及真实资源断言证明调用与释放，不以mock次数充当资源清空。
- task4-5-green.txt：8项相关单测通过；B-targeted-e2e.txt：5项专属浏览器测试全通过、0重试，包含真实main调用后Engine/Scene资源归零。
- 复核新增load-rollback-red.txt发现两项真实边界缺口：root-only容器误收、皮肤/动画设置失败后残留clone和caster。实现后只接受有顶点几何的旧player；挂载全部成功才隐藏fallback；失败撤销本同步申请新增mesh/node/animation/skeleton/caster，并将新增暴露但无实例引用的共享材质从活动scene撤下，缓存所有权不提前销毁。load-rollback-green.txt的14项相关测试通过；这是本批生命周期范围内的修复，无新资产/风格接入。
- 最终B build成功，完整单测21文件261项通过，含原244项和本任务17项；最终完整浏览器结果另以B-final批次记录。未改旧测试/default配置/依赖/时钟/核心模块。

## 保护与测试配置（续）

完整旧回归10份镜像只替换证据/截图输出，.pw.ts位于.pao17-local/mirror；mirror-manifest.json记录源与逆变换hash一致，原断言/时钟/业务不改。临时配置在.pao17-local/acceptance.config.ts，明确5187、strictPort、reuseExistingServer=false、ANGLE D3D11、workers1、retries0。Playwright日志中的NO_COLOR/FORCE_COLOR警告不影响执行，不为此修改依赖或默认配置。

本机.pao17-local并未被仓库现有*.local规则匹配，保留为不暂存的本任务临时目录；不更改共享ignore或把临时镜像/批量旧图加入提交。结果JSON/构建日志与专属关键图按批次保留；最终保护核对另记录。正式16/9依赖、生产标定/新主题/18动作镜头均未放行或接入。

日志暂存检查发现工具输出自带行末空白/EOF空行。提交版仅规范这些空白，原始字节逐文件保存在.pao17-local/raw-logs，前后hash见log-normalization.json；失败断言/数量/时长未改，旧历史证据仍原样保护。

## 正常hook冷启动闭环

首次正常提交被hook拦下，build通过但pao17-main首项测试在5000ms默认限制下超时，260/261通过，未产生新提交；原始hook日志保存在本机并附hook-first-failure.txt提交版。其后一次push检查仅返回Everything up-to-date，远端仍fcddba1，没有失败代码被上传；后续push严格待新commit成功后执行。

使用systematic-debugging测量而非放宽timeout：boot-diagnostic.txt记录首次main动态导入含完整Babylon依赖加载约4362.876ms，重复导入约6.776ms，首次冷启动接近默认限值；该次完整261项通过，说明是冷启动成本/并发负载边界，不是新的帧身份断言失败。修复仅在专属main单测将真实NullEngine/Scene所需Babylon静态预载到测试收集阶段，继续执行真实main和原有全部断言；没有提高testTimeout、改变模拟时钟/默认配置或缩减覆盖。

boot-diagnostic-fixed.txt记录首次main导入降为83.077ms，重复约6.648ms，完整261/261通过，9.64秒；随后移除临时诊断输出，保留静态预载。此后运行时代码/资源字节hash与B-final完整48项E2E完全相同，无需把新的测试收集成本当游戏性能承诺；最终正常hook结果以本机commit-hook-success.txt及交付报告为准。
