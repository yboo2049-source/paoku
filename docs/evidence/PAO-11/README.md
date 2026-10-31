# PAO-11 送审证据

日期：2026-11-01（Asia/Shanghai）。基线 cf57d996596a15b1cce52deab6e879a2a013ef6a，分支 feat/pao-11-surfaces。仅实现统一支撑与连续接触，等待主 Agent 验收，不声明 Done。

## 实现与验证

先写 [implementation-plan.md](implementation-plan.md)，再以真实 updatePhysics 失败用例驱动最小实现。新增 surfaces.ts 纯逻辑模块：包含基准高度的有限坡/车顶求高、相对法向下降接触、连续接缝、跳离/横向离面、移动支撑携带一次与回收撤销；PlayerEntity 的支撑状态随现有模拟快照传递。只修改派发白名单，未动 main/core/input、生成器、渲染、应用服务或共享设计文档。

数值端点容差为 1e-6m，独立于玩法宽容；移除了车顶旧0.2/0.35m吸附阈值。坡顶接车体的前缘接触只对共同端点和当前坡支撑豁免；离车尾/侧沿时的临时 departure 只避免身体仍重叠原支撑的自伤，完全分离/重新着面/回收即清除。它不提升高度，也不免疫其他障碍。

| 检查 | 最终结果 | 证据 |
| --- | --- | --- |
| npm run build | exit0；既有大 chunk 提示保留 | build.log |
| npm run test | 10文件、104/104通过；新增23项 | test.log、green-unit.log |
| 完整 npm run test:e2e（专属config） | 20/20通过；0跳过、0重试通过、0失败，94.89s | runs/verified/e2e-results.json、e2e.log |
| 真实浏览器来源 | 独占5182、当前checkout raw源精确匹配；7个生产文件前后hash不变 | runs/verified/browser-source-identity.json、source-stability.json |
| 历史证据保护 | 233文件逐字节/hash恢复通过，60个被测试刷新后复制至本任务目录 | runs/verified/history-restoration.json |
| 规格/代码质量审查 | 无剩余阻塞项；审查发现均先失败测试再最小修复 | review-notes.md、red-*.log |

单测矩阵覆盖 B=(0,5,100)、D12/H3 的5/6.5/8高度；18/45m/s固定步长连续过坡脚/坡顶；实际X/Z范围与epsilon边界；从下不吸附；相对落坡与正向跳离（含dt0）；横向离面；speedZ正负方向只携带一次、首次落面不追补、离面不多携带；支撑/departure回收清空；稳定面选择；持续贴面不重复落地事件；旧QA采样失效防守。

## 浏览器证据分级与查看

桌面1440×900，竖屏390×844；Playwright Chromium、Windows ANGLE D3D11，均为桌面浏览器，竖屏采用CDP触摸模拟，未验证手机真机性能/触控。

- **F 夹具**：在浏览器内替换现有 spawner.update 并注入固定障碍数组，使用现有QA定位安排起点。无godMode、无额外无敌。桌面键盘和竖屏真实touch均跑完地面→坡→车顶→跳离→地面；高基准夹具从y5车顶进入坡，连续上到y8车顶。此证据不证明随机生成路线普遍可达。
- **N 生产输入**：没有QA模式/状态写入，UI启动、键盘换道/跳跃/暂停；完整旧PAO-10自然输入桌面/触摸流程也在本轮全局回归中通过。随机生成未固定种子，不宣称全局确定性。
- `runs/verified/browser-summary.json` 汇总运行态tick、脚底XYZ、supportSurfaceId与contact。F-* JSON保存逐帧trace，N-* JSON保存实际采样，新增用例errors均为空。
- Dispatcher亲自查看最终桌面车顶、上坡、高基准车顶、暂停、竖屏落地及旧全局截图副本。车顶/落地人物可见，HUD未见新增溢出；上坡时旧黄色坡体仍遮挡躯干，高基准远景/旧侧道取景未修。不能仅凭当前渲染截图证明正式模型与物理代理已对齐。

代表性最终图：[桌面车顶](runs/verified/screenshots/F-desktop-roof.png)、[上坡旧遮挡](runs/verified/screenshots/F-desktop-ramp.png)、[竖屏落地](runs/verified/screenshots/F-portrait-land.png)、[高基准车顶](runs/verified/screenshots/F-high-base-roof.png)。

## 失败记录与复现

首轮单测10项中9项失败，随后补出的接缝、相对落坡、departure、正世界速度相对下降、陈旧样本和零时间跳离均有 red-*.log。`runs/initial` 为4项新增浏览器用例首轮通过。

提交日志/Markdown仅规范化行尾空格及末尾空行，以通过git diff --check；测试输出内容、断言和结果未改变。

提交环境：Codex捆绑Git只有sh而没有bash，系统bash指向WSL，使npm的bash启动脚本无法读取Windows路径。首次正常hook因此失败；重试为本次进程提供临时npm入口，直接执行已安装Node与同一npm-cli.js，hook原文和build/test命令保持原样，不禁用或跳过hook。

`runs/final` 是生产文件仍在更新期间的一轮完整回归：19/20，旧移动端用例等待跳跃超时且错误页面是菜单；运行期间存在源码更新，HMR重载是可能原因，未独立证实。该轮不作为最终源码的通过证明。另遇Windows临时文件句柄导致根截图恢复失败，已从durable备份恢复全部历史并与initial基线逐文件核对，见 `runs/final/recovered-history-baseline-check.json`。wrapper增加有界文件重试。最终冻结源码复验 `runs/verified` 全部20/20，前后生产hash相同，历史恢复全部通过；未改旧断言、未跳过测试。

复现（PowerShell，仓库根目录）：

```powershell
npm run build
npm run test
$env:PAO11_PHASE='review'
node docs/evidence/PAO-11/browser-runner.mjs
```

wrapper调用 `npm run test:e2e -- --config docs/evidence/PAO-11/playwright.config.ts`，配置严格独占5182，保留完整既有spec加新用例。输出写入独立phase；history-backup为本机应急副本、不提交，Git中已有历史原件。SHA按原始字节校验，fresh checkout的换行变化会改变磁盘SHA，复跑应重新采集而非把旧manifest当跨平台文件哈希承诺。

## 局限与交接

完整高速扫掠/薄障碍/单次伤害重构仍属于PAO-12；本实现不保证一tick跨过整个有限面时仍能落面。继续沿用旧 PLAYER_LANDED 桥与 MOVING_TRAIN.speedZ 适配，仅迁移支撑必需子集，未假称完成PAO-9全部事件/模型契约。正式模型/资产、旧坡体遮挡、旧镜头取景、生成路线与应用服务均未修改。本任务只提交送审，后续任务不自动启动。
