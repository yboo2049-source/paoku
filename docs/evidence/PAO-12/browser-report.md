# PAO-12 浏览器回归验收

日期：2026-11-01（Asia/Shanghai）。最终采集使用冻结生产源码和冻结测试，`PAO12_PHASE=verified-final`，独占端口5183、strictPort且reuseExistingServer=false。

## 最终结果

- 命令：`node docs/evidence/PAO-12/browser-runner.mjs`，wrapper调用完整 `npm run test:e2e -- --config docs/evidence/PAO-12/playwright.config.ts`。
- 25/25通过，既有20项+新增5项；0 skipped、0 unexpected、0 flaky；耗时109244.916ms。原PAO6坡→顶→跳离→车尾落地回归通过，断言未修改。
- 八份生产源文件采集前后SHA256一致。浏览器raw模块精确匹配当前checkout；新用例记录页面错误/console warning,error/requestfailed均为空。
- 437份历史PAO6/10/11及根截图逐字节恢复通过；78份被测试刷新后的输出已复制到本任务 `regression-output`。durable应急备份仅本机留存，不提交。
- 浏览器Chromium 151.0.7922.34，Windows，ANGLE D3D11启动；桌面1440×900、竖屏390×844、DPR1。竖屏为桌面浏览器viewport/CDP触摸模拟，非手机真机。

## 新增覆盖及证据等级

全部新增场景标F，使用现有QA门控或显式隔离模拟，不冒充自然随机路线证明。既有N桌面/触摸生产输入用例在本次完整回归中继续通过。

1. live应用迎面列车depth=.05、speedZ=-1800的一tick跨越，记录一次COLLISION及终局tick停止；重开新run再用相同实体ID碰撞，可再次终局，累计事件恰2次。-1800是刻意的极端夹具，非生成器速度配置承诺。
2. live应用同tick拾HOVERBOARD与两障碍命中，先激活后碎裂，恰一次消费，保留1.2秒保护、持续存活；竖屏截图。
3. live应用QA初始空中定位后真实键盘s滑铲，与高栏实际高度相交仍致命，不能因isRolling绕过。
4. 浏览器内另建隔离Simulation，45m/s、.125s大步跨薄静态栏；站立/地面翻滚/跳越/空中翻滚盒矩阵。该条是浏览器模块集成F，不是live应用自然运行轨迹。
5. live应用QA从z0定位到z40跨过z20障碍，不扫旧位置；清世界/换道/再次定位撤销旧支撑和终局标记，正常继续跑。

## 视觉检查

QA亲自查看最终竖屏护盾消费、桌面定位后跑动、桌面车顶、竖屏落地及既有PAO6车尾落地截图。人物可见，桌面中道车顶与竖屏中道落地居中；定位夹具左道人物在左侧是预期状态。Dispatcher另亲看桌面终局、竖屏护盾运行/暂停、PAO6车尾落地、PAO11桌面车顶和竖屏上坡，HUD/弹窗未见新增溢出。

代表图：

- `runs/verified-final/screenshots/F-portrait-shield-consumed.png`
- `runs/verified-final/screenshots/F-desktop-teleport-recycled.png`
- `runs/verified-final/regression-output/docs/evidence/PAO-11/runs/final/screenshots/F-desktop-roof.png`
- `runs/verified-final/regression-output/docs/evidence/PAO-11/runs/final/screenshots/F-portrait-land.png`
- `runs/verified-final/regression-output/docs/evidence/PAO-6/fixture-roof-exit-land.png`

竖屏黄色坡体仍遮挡角色，是旧渲染问题；旧前景警员和高亮材质也影响局部场景辨识。未修改表现，也不凭截图声明正式模型与碰撞代理完全对齐。物理接口仍为脚底中心、X/Z宽深0.8m、站立高1.8m/翻滚0.9m；障碍用底面中心及实体width/height/depth，后续美术/渲染由主Agent协调。

## 失败轮与复跑原因

`runs/verified` 原样保留23/25失败结果。新case的即时Escape依赖旧UI渲染状态，改为真实HUD暂停点击，保持PAUSED原断言；旧PAO6顶沿重复伤害则交物理子Agent先失败回归再修复。见 `browser-first-run-analysis.md`。重新build及153项全单测通过并再次冻结后才采集verified-final，未重试碰运气、未改旧断言。
