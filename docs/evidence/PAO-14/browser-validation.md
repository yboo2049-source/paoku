# PAO-14 浏览器协议与复现

工作目录 `D:/worker/paoku-sessions/pao-14`，不切分支、不合并main。源码冻结后运行：

```powershell
npm run build
npm run test
$env:PAO14_PHASE='release'
node docs/evidence/PAO-14/browser-runner.mjs
```

runner实际执行 `npm run test:e2e -- --config docs/evidence/PAO-14/playwright.config.ts`，包含28既有和9新增用例。单worker，独占127.0.0.1:5185、strictPort、禁止复用。Windows使用Node直接运行npm-cli并传独立argv，避免grep正则被shell解释；并未绕过npm命令或测试。源码前后SHA-256覆盖整个src，新增浏览器用例验证5项served raw source与checkout逐字节相同。旧用例输出中历史端口标签只属于原采集文本，本任务实际来源由release/browser-source-identity.json记录。

PAO-6/10/11/12/13及六张根截图全部先读原字节，持久备份在忽略目录 `.pao14-local/<phase>/history-backup`。旧用例刷新输出另存本机regression-output，运行结束逐字节恢复并核验SHA-256；新产生的旧目录文件移出后删除原位置，原件均保留。中断时可由持久备份恢复。不会提交完整重复历史截图镜像。

N为自然按钮/键盘/CDP触摸，无QA写入。新增桌面用例前段及截图为N；其后显式注入旧run命令与篡改DOM文本的对抗部分为F，不能把整项误称全自然。竖屏用例全程N。其余F用例包括实际spawner数组固定金币/障碍、Storage.setItem配额异常、旧九键、两个真实同源标签页、WebLock阻塞及COLLISION监听重入命令。F使用真实模拟/物理/应用仓库，不冒充随机自然路线或异常进度恢复。

每次截图先等待目标弹窗可见、opacity=1和有限动画完成，再用animations:disabled保存实际App/Sim快照。执行者查看桌面暂停、竖屏暂停/商店及桌面终局4图；主Agent建议抽看终局、竖屏暂停和竖屏商店3图，无异常不重复安排多个审查者逐图查看。场景、路径与实际观察见README。

环境为Windows Playwright Chromium、ANGLE D3D11；桌面1440×900、竖屏390×844。触摸为桌面CDP模拟，不是真机性能/触屏验收；未听音、未改DSP/音效生命周期，未接入GLB或改美术/布局/碰撞/生成算法。版本化存档只恢复已提交钱包与权利，不恢复异常关闭时未结算的局内进度。
