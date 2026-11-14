# PAO-17 明亮主题与楔形坡阶段验收

2026-11-02（Asia/Shanghai），接续536f54b41866e2819d21cd674e64af2cb4d70f80，本聊天单一实现方。依据主仓已批准路线A与本树[实施计划](../../../plans/2026-11-02-pao17-theme-implementation.md)完成本工程增量，交主Agent复审。父PAO-17/16/21完整Done、正式资产与18/20启动不在本次口径。

## 实际参数与行为

| 项目 | 最终运行值 |
| --- | --- |
| 色板 | 天空#BEDFF4、轨面#657A88、钢轨#5E6871、站台#F0E7D5、暖强调#E8B74F |
| 主光/填光 | 暖#FFF2D5、强度0.7；冷#D6E6F4、强度0.4 |
| 池 | L=120m，固定5段，idx=floor(playerZ/L)，idx-1..idx+3；正负多段跳转/回退/reset直接定位 |
| 重复/覆盖 | 轨枕3m、建筑24m、信号30m；半开锚点归属，无重复边界件；实测world覆盖包住相机z-9至z-9+280 |
| 景深 | far280m，线性雾100～250m；移动段和子网格不冻结world矩阵 |
| 展台 | MENU/SHOP显示；PLAYING/PAUSED/GAMEOVER及局内reset均隐藏；独立600×600菜单底面覆盖既有环视，不改镜头策略 |
| 后处理 | FXAA开、bloom关；Glow0.15，仅显式信号/金币白名单，回收注销 |
| 阴影 | 1024，PCF medium，近处主要实体80m，bias0.0005、normalBias0.02；当前Windows WebGL2实测，不作未知设备预算承诺 |
| 轨枕 | 几何顶面保持Y=0，与地面齐平；材质zOffset=-1避免共面深度竞争，未抬高物理地面 |
| 坡/顶板 | 原生LH楔形，脚(z-d/2,y)、顶(z+d/2,y+h)；箭头平面偏移0.018m。roof完整宽/深，厚0.15、中心h-0.075，顶面精确h |

轨道/简化站台/低细节城市仅视觉程序几何，均在渲染模块拥有；背景不生成玩法对象/Surface、不读取或消费模拟RNG。普通车/工程坡顶继续程序表现，没有加载四件候选GLB或改productionAccepted/modelBindings。旧角色、动作、镜头和UI继续兼容。

## 新测试与完整门禁

最终build通过；完整单测24文件273/273通过，10.46秒（原261＋本批12）。新增theme/ramp E2E为N2/F3；原12份/48项完整保留，合计53项。

| 完整运行 | 结果 | 时长 | 自动重试 / skip / flaky / unexpected |
| --- | --- | --- | --- |
| full-first，共面材质修复前 | 53/53，随后人工看图发现轨枕问题，未据此提交 | 378.932秒 | 0 / 0 / 0 / 0 |
| full-final，最终运行时代码 | 52/53；唯一失败为Google Fonts连接关闭，未修改断言/网络环境来通过 | 395.826秒 | 0 / 0 / 0 / 1 |
| full-recheck，同一最终代码全量复验 | **53/53通过** | **381.708秒** | **0 / 0 / 0 / 0** |

命令：`npm run build`、`npm run test`、`npm run test:e2e -- --config .pao17-local/theme-acceptance.config.ts --retries=0`。以上是不同独立运行，不能把完整复验说成从未失败。前次字体网络失败及碰撞body已通过的证据见[摘要](network-failure-summary.json)和[执行记录](execution-record.md)；成功复验不等于修复外部字体链路。

每一phase使用新建可逆.pw.ts镜像，只重定向输出；源/逆变换hash一致见[最终镜像清单](full-recheck-mirror-manifest.json)。原测试、断言、默认配置、超时与模拟时钟未改；Vitest未收集镜像。5187独占strictPort、reuseExistingServer=false、Windows Chromium ANGLE D3D11、1 worker、retries=0。

N为本轮真实桌面键盘/390触摸的启动、动作、暂停/恢复、自然碰撞结束和新run重开；没有QA写入。F两个坡用例明确使用QA夹具：标准坡脚67/顶73、车顶入口73/出口85，加Y+5；真实走坡/顶/落地、接触trace及实际mesh三角Ray交点与只读sampleSurface误差<1e-6。测试未反改Surface/physics/尺寸/跳高/容差。

## 充分暖机与资源结果

[成功加载/资源记录](full-recheck/F-successful-warm-resources.json)：真实legacy player GLB完成（cache1、lease1、7动画组、1骨架）后，再实际渲染9帧，连续3帧计数一致且scene ready；另暖空实体8帧后才立基线。

| 暖机空动态实体基线 | 数量 |
| --- | ---: |
| meshes / transformNodes | 71 / 78 |
| materials / textures | 32 / 8 |
| animationGroups / skeletons / particleSystems | 7 / 1 / 1 |
| caster / Glow白名单引用 | 5 / 5 |
| renderer缓存资源 / 租约 / pending / failed | 1 / 1 / 0 / 0 |

20轮跨多段/负向回收和10次reset后全部严格回此基线，所有pool root身份/数量有界；未使用固定正增长容差。最终dispose后上述资源/引用/缓存/租约均为0。原48项中的404 fallback、晚到、真实main释放桥仍执行通过。这里证明本renderer可枚举资源归属，不声称整个浏览器堆或所有被取消Promise必然结算。

## 三张最终真实关键图

已查看本轮最终三图，轨枕连续可见、坡面自阴影条纹已消失、角色不再被盒状坡体遮住，未见新空白/横向溢出。前期过曝、ESM条纹和共面轨枕图保留在本机新批次档案，没有拿旧图当新主题证据。

- [1440×900明亮桌面](full-recheck/N-bright-desktop.png)
- [390×844触摸竖屏](full-recheck/N-bright-390.png)
- [真实走坡/车顶前接缝/角色](full-recheck/F-bright-ramp-roof.png)

[图索引](image-index.json)记录逐图viewport/DPR、runId/tick/seed的截图前后区间、浏览器版本和图片/运行时hash；区间采样不冒充精确截图tick。F实际world覆盖与循环逐帧计数也在资源记录中，不以静态图片替代覆盖断言。近处追逐者裁边、旧角色占位动作/皮肤和旧UI单位依然属后续18/19范围，本批没有重设计它们。

## 原件保护与交付边界

[最终结果/保护](final-results-and-protection.json)：初始1078个跟踪文件中只改四个获批渲染文件，其余1074逐字节一致；原有.pao17-local的232个文件全部字节一致，gitlink只保留提交身份、不遍历。main/shared types/modelBindings/core/systems/application/DOM/public/HTML/依赖/默认配置/旧测试/共享总纲和所有历史证据未改变。新源码/旧GLB的[raw与HTTP身份](final-raw-http-identity.json)一致，最终运行时代码与复验字节一致。

原始本批日志留.pao17-local/bright-theme，提交版只规范行末空白/换行/EOF空行，hash对照见[日志身份](log-identities.json)。前期图片及重复预览数据字节保留的本机路径见[图片归档](preliminary-image-archive.json)、[预览数据归档](preliminary-data-archive.json)；完整各阶段报告/失败摘要与最终原始F/N数据仍提交。本次正常hooks的完整输出另留本机commit-hook日志，提交与远程SHA以交付报告为准。

剩余正式GLB/语义元数据、生产RH/LH标定和真实组合接线、15/16/19集成、正式13动作/镜头、整体同屏品质及真机预算继续专门审批/验收。仅送本主题/程序坡阶段主Agent复审，不标父任务Done，不合并或启动18/20。
