# 首轮全局浏览器失败定位

`runs/verified` 保留首次完整25项结果：23通过、2失败，约1.9分钟；不覆盖、不把失败算作通过。8个生产文件采集前后hash一致，437份历史文件逐字节恢复通过（78份被刷新输出已复制本任务目录）。

## 新增case的重开暂停边界

`F-desktop-relative-high-speed-thin-train-terminal-once` 首局薄迎面列车确实跨越玩家，终局一次及终局后tick停止断言均通过。失败在点击重开后，owner已更新runId，测试立即发送Escape，却未等到UI渲染新状态，PAUSED断言读到RUNNING。

只读 `src/ui/dom.ts` 的 setupGlobalEvents 中，Escape以 `this.lastState` 决定是否发TOGGLE_PAUSE；该字段随UI更新，不能用同步Simulation.runId变化证明它已经更新。首次没有记录activeElement，不能把焦点当已确认根因。不是物理漏判，也不修改UI实现。

已向Dispatcher报告并获准仅修正新增测试：改为真实点击现有 `#hud-pause-btn`，Playwright等待新HUD可操作，保留完全相同PAUSED断言。新证据同时记录点击前activeElement和Simulation状态；夹具捕获数组附上runId，重开后等新run数组捕获，避免向旧数组注入。生产文件与既有测试不修改；等待物理修复后的统一冻结再跑完整矩阵，不通过重试碰运气。

## 既有PAO6车尾回归

`ramp-roof-jump-land` 的坡/车顶y=3成功，跳离后在车尾发生错误终局。事件位于 `(0,2.9183333333333388,42.38534722222217)`，obstacleId=`STATIC_TRAIN33`，time=0，normal=(0,0,1)；列车尾z=42。玩家脚底已在车尾外，但深0.8m的身体尾缘仍与车体重叠。

原迹保存于 `runs/verified/regression-output/docs/evidence/PAO-6/fixture-ramp-roof-jump-land.json`。该问题交物理与核心子Agent先写失败回归后最小修复，QA不修改既有测试、断言或游戏实现。下一轮必须重跑完整矩阵。
