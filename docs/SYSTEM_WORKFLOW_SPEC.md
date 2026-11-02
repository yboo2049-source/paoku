# 核心系统模块与纯函数规范 (System Workflow Spec)

## 2026-11-02 PAO-17结构与生命周期执行流程

用户已批准[首批A→B计划](plans/2026-11-02-pao17-approved-execution.md)：输入身份/保护清单→失败传感器→A保留门面拆分资源/环境/实体、内部reset/dispose→完整验证检查点→B同次presentation取样身份和I-02释放桥→完整N/F/保护/截图验证→主Agent阶段复审。用户手动在原17聊天粘贴后才执行，不由Dispatcher启动。

同runId/tick断点标记只消费一次；reset使旧消费者失效而保留有效共享缓存。旧请求不得挂载或覆盖新皮肤，销毁后晚到资源必须清理；失败保留fallback、不逐帧重试。异步/动画/渲染不推进模拟、账本或道具时间。正式资源、主题池/风格及18动作镜头另批，未接入的新GLB和PAO-19不当本树能力。

## 2026-11-02 标定细化与渲染设计并行

[本批](plans/2026-11-01-pao16-pao17-parallel-prompts.md)由用户分别粘贴触发：16自动语义候选/净空分析→新路径证据/TODO→阶段主审；17只读M1实际门面及已审固定技术条目→生命周期/加载释放/主题循环设计及测试矩阵→设计送审。未验收的新16数据不作为17冻结输入；17不进入实现。手工修整延期，原作者DCC已确认不存在，不成为自动流程的等待条件。

## 2026-11-01 PAO-16 技术标定流程

4件源hash确认→完整节点/关键面量测→独立预览叠加只读Surface/代理→候选变换/非零基准与端点残差→分类/TODO→主Agent阶段审查。[探针计划](plans/2026-11-01-pao16-calibration-spike.md)不加载正式游戏实体，不更新模拟/碰撞，不因缺源标记猜测端点；诊断失败保留事实，手工美术延期。

## 2026-11-01 PAO-15 局部蒙皮试样流程

原GLB身份确认→派生DCC/骨架/权重→肩肘髋膝与组合姿势→导出有效skin/IBM/JOINTS/WEIGHTS→独立Babylon播放/释放→证据与可行性结论。[执行交接](plans/2026-11-01-pao15-rig-spike.md)规定root固定，变形测试不推进游戏逻辑，单个诊断clip不计作正式13动作；局部调权失败交返工诊断，不自动转整角色重建或外部上传。

## 2026-11-01 PAO-19 已批准UI命令反馈

[已批准执行交接](plans/2026-11-01-pao19-approved-execution.md)规定：用户意图→main捕获命令身份→通知pending→既有application.dispatch→成功/失败结果与原身份回传→UI读取已提交快照。pending不发布虚假业务成功，保留原暂停屏障/终止摘要与快照同步语义；递延命令同身份只建立一次等待。

300ms/5秒仅改变中性等待文案，不超时判失败或自动重发；显式重试按原操作身份，未知提交不能重复TOGGLE。旧run回执不能清新run等待，错误不同时经旧Toast和新错误条双发。Toast按已批准容量/去重清理旧局与定时器；道具计时只读提交快照，暂停不在UI继续倒计时。上述为实施目标，待真实N/F回归验收，不改变M1业务流程。

## 2026-10-31 M1 工作流交接（限定 PAO-10）

本节与[一致性审查](reviews/2026-10-31-pao-7-8-9-consistency.md)、[主架构M1口径](ARCHITECTURE_DESIGN.md)共同约束本批。下文直接输入改player、Y前进/Z跳高、isCollected与拾币加10分等为历史设计，不能用来实现新模拟。当前实现已为Y高度/Z前进，不重复交换轴。

1. 输入采集→带runId、next tick、单调sequence的命令队列；同tick按序消费。暂停/失焦清空未消费动作，旧runId/迟到tick/重复序号拒绝并诊断；应用暂停命令与运动回放分开。
2. requestAnimationFrame只提供非负墙钟差与渲染节奏；固定stepSec推进tick，累计器补步有上限，超量处理记诊断；暂停/后台恢复不追跑隐藏时间，start/stop保持单循环且可清理。stepSec/上限由PAO-10测试并在任务证据记录。
3. 目标tick顺序：效果到期→输入→障碍移动→角色积分→相对碰撞/支撑→拾取→伤害/护盾→积分和任务→结束→提交快照/事件。PAO-10先接固定驱动与兼容边界；PAO-11/12/13分别迁移支撑、扫掠碰撞和带种子生成，不越界重构。
4. 提交前后两个同runId深只读快照供插值，alpha限制[0,1]；仅插值空间连续值，账本、拾取、接触、phase用最新值。首帧/传送/重开不插值；表现/动画不回写模拟。
5. 确定性证据必须固定配置/模拟版本、seed、有效输入tick和顺序；测试30/60/120fps驱动到相同模拟tick的结果，明确容差。不得把旧Math.random生成器或未迁移内容宣称为已全局确定。

拾取采用AVAILABLE→CONSUMED后更新账本；积分按里程基线，金币与任务收益分账。现有可玩流程与传感器语义保留；新增能力需失败测试、build/test/e2e和真实截图检查。完整payload/生命周期依PAO-9固定契约，不用表现回调推进玩法。

## 1. 模块边界原则
所有在 `/src/systems` 下的函数，必须设计为纯函数（或接受可变状态但自身不引起外部副作用的函数），其标准签名为：
`type SystemFunction = (context: GameContext, deltaTime: number, inputs?: InputState) => void;`
*为优化性能，可以在单例模式下允许直接 mutate context 树，但严禁在 system 中操作 DOM 或 Canvas，保持严格的边界隔离。*

## 2. 模块细分
### 2.1 Input System (输入控制)
*   **输入:** 键盘事件流转换后的 `InputState`。
*   **处理:** 
    *   检查冷却/防抖。
    *   处理越界防御：如果 `player.lane === 0` 且输入向左，则忽略。
    *   变更 `player.lane`, 触发 `player.state` 变更为 Jumping/Rolling 并重置定时器。
*   **输出:** 变更后的 `player` 状态（就地修改）。

### 2.2 Movement System (运动系统)
*   **处理:**
    *   根据 `deltaTime` 和当前 `speed` 增加 `player.y`。
    *   更新 `player.z` 模拟跳跃抛物线。
    *   处理 `Jumping/Rolling` 的倒计时，结束时恢复为 `Running`。

### 2.3 Spawner & Garbage Collection (场景生成与回收)
*   **处理:**
    *   在玩家前方距离 `y + renderDistance` 处按概率生成 `Coin` 或 `Obstacle`，推入 `context.entities`。
    *   检查 `context.entities`，若实体的 `y` 落后玩家超过一定距离（不在渲染区域内），则将其从数组中 `splice` 移除。

### 2.4 Collision System (碰撞物理)
*   **处理:**
    *   遍历 `entities`，基于 3D 逻辑坐标（lane, y, z）和包围盒进行 AABB 碰撞检测。
    *   若类型为 `Coin` 发生重叠：标记 `isCollected = true`，`score += 10`。
    *   若类型为 `Obstacle` 发生重叠：更改 `context.state = GameState.GameOver`。
