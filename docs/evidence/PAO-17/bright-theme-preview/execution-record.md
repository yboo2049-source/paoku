# PAO-17 明亮主题工程预览执行记录

2026-11-02，接续536f54b41866e2819d21cd674e64af2cb4d70f80，分支codex/pao-17-render。用户已批准路线A、本批有界循环/展台隐藏/程序楔形及顶板接缝；本树计划为docs/plans/2026-11-02-pao17-theme-implementation.md。使用writing-plans细化后按executing-plans/TDD实施，本聊天是唯一实现方，不启动Agent/其他任务。

## 输入与保护

初始git仅未追踪.pao17-local，跟踪文件无改动。initial-protection.json记录1078个跟踪文件、1个gitlink身份及已有232个本地证据文件的字节hash。所有新临时文件位于.pao17-local/bright-theme及新theme-acceptance.config.ts，旧配置/镜像/日志完整保留。主仓输入HEAD/状态/字节hash见inputs.json，HEAD不是全部工作树内容的替代。另读PAO-16 c7b09e6主审摘要，身份见additional-input.json；未读16活动树、大型样本JSON或复制/修改/加载四件候选GLB。

## RED→GREEN

- Task1原3项RED捕获缺五段真实网格覆盖、重复边界几何不可验证、局内展台未隐藏。用floor(z/120)和模5复用实现idx-1..idx+3，真实world顶点/矩阵验证跨多段、负值回退和reset；移动根/网格不冻结。Math.random对抗防护仅作用于重定位/重开，避免把Babylon内部构建资源ID误当模拟RNG。
- Task2原2项RED捕获缺明亮资源/Glow白名单及近影接口。环境按段/材质合批，共享背景材质单一归属；信号和金币显式白名单，释放逐个移除；entityViews保存caster集合，可随既有实体接近/远离增删引用。首个build暴露AbstractMesh/Glow Mesh参数差异，已在受控的实体Mesh集合边界修正类型，未改共享类型。
- Task3原6项RED捕获坡脚/中点高度、旧顶板缩进和低0.005m、悬浮箭头。生成原生LH楔形硬边网格和贴坡箭头；程序roof宽深取obs原值，中心h-0.075、厚0.15使顶面=h。真实顶点/索引/world三角交点与只读obstacleSurface/sampleSurface比较，包含两侧、入口/出口、X偏移、Y+5和尺寸变化，误差<1e-6。首个GREEN尝试仍有3项法线失败，修正LH面绕序一次后通过，未动Surface/物理/容差。
- 后续补充menu-orbit-red：原有360°菜单镜头可能向后看出非对称局内池。独立menuBackdrop实际顶点覆盖far+环视半径，600×600m底面只在MENU/SHOP显示，与展台同步隐藏；不改变镜头策略或五段池。12项主题/坡面专属单测通过。

## 首次失败与可读性调整

- 首轮完整单测271/272：原pao17-assets首项动态导入assets连带完整Babylon入口超过5000ms默认限制。旧测试只读，未提高超时或改时钟；assets将Color3改为类型导入、StandardMaterial改为官方子模块导入，缩小纯缓存测试的初始化依赖。复验完整272/272通过；补菜单用例后为273/273。原超时日志保留，正常hook仍执行默认完整单测。
- preview五项专属E2E全部通过，原光强1.2/0.85使站台/地面过曝。按已批准方向调为暖主光0.7、冷填光0.4；preview2五项再次通过。首次坡图在到顶后才捕获，坡体已接近镜头下方；改为实际走坡中段抓图，JSON保留截图前后快照，不改相机或伪造位姿。
- preview2坡面存在自阴影条纹；提高bias仍未解决，shadow-preview保留该图。受控shadow-debug同机对照原ESM/关闭接收/背面投影/PCF，关闭接收确认阴影来源，PCF能保留角色阴影且条纹消失。最终1024 PCF medium、bias0.0005、normalBias0.02，继续接收/投射真实阴影。诊断图留本地，不冒充自然输入验收。该选择不承诺未知WebGL1设备或真机预算。
- full-first完整53/53通过、0重试，378.932秒；人工最终复看发现轨枕与track顶面共面，部分横条发生深度竞争。仅加轨枕材质zOffset=-1，几何顶面仍0、物理平面不改；full-first图与报告原样保留。修正后build及完整273项单测再次通过，重新执行完整E2E，不以之前全绿代替新图。
- full-final完整52/53通过，唯一失败是旧PAO-12隔离碰撞夹具afterEach记录到Google Fonts两条CSS请求ERR_CONNECTION_CLOSED。碰撞body的maxSpeed=45、stepSec=.125、ENDED和全部姿态断言均通过；来源/原错误与矩阵结果见network-failure-summary.json，完整原JSON仍在本机。未为此修改物理、旧测试、默认超时、网络路由或屏蔽字体错误；使用相同最终运行时字节、retries=0重新跑全量full-recheck。成功复验也不证明外部字体链路永久稳定。

## 本批验证方法与口径

真实GLB成功后继续实际渲染至少9帧并检查连续3帧计数稳定、scene ready；再暖空实体8帧，才记录缓存/动画/骨架/阴影等基线。20轮跨多段/回退、10次reset逐项严格回相同基线，最终全部释放；不容忍固定正增长，不把初始化纹理增加当泄漏，也不要求被引擎取消的loader Promise必然结算。

N为真实桌面键盘/390 CDP触摸，启动、移动、暂停恢复、接近危险实体自然碰撞结束、重开；无QA写入或改seed。F坡面为明确QA夹具，通过原有传感器/临时spawner注入标准坡67→73与车顶73→85，并增Y+5；真实走坡/顶/退出与Triangle Ray/Surface独立比对，记录脚底接触trace。F环境为受控宿主真实renderer、真实GLB及GPU阴影，不冒充自然关卡或正式资产。

完整镜像12份原48项E2E仅改证据输出，可逆hash见各phase-mirror-manifest.json；新增5项分N2/F3。全部采用5187 strictPort、不复用、Windows Chromium ANGLE D3D11、1 worker、0 retries；.pw.ts不误收Vitest。最终完整结果/图片/原件核对在verification.md，不引用前批261/48作为本批成绩。

生产实现只改四个渲染文件；main、共享types/modelBindings、core/systems/application、DOM/public/HTML、依赖/默认配置/所有旧测试及共享总纲保持只读。正式资产、18角色/镜头、19UI、生产RH/LH标定和真机预算继续递延；本批不更新父Issue Done/依赖、不合并或启动18/20。
