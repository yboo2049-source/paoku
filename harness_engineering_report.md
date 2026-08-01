# Harness Engineering (脚手架工程) 深度调研与实操导航报告

本报告基于 `git@github.com:deusyu/harness-engineering.git` 及 OpenAI 相关思想背景提炼总结。

## 一、 核心理念：从“提示词工程”走向“系统工程”
“Harness Engineering（脚手架工程）”代表了一种思维模式的根本转变：**不再试图通过完美的提示词（Prompt）去“说服”或微调 AI，而是围绕 AI 构建一套极其严密、健壮的“脚手架系统”。** 在这套系统中，AI 仅仅被视为一个“执行引擎（Execution Engine）”。

1.  **系统优于说服 (System over Persuasion)**
    放弃对大模型黑盒的过度依赖，转而通过改变工作流、系统权限控制、物理或代码边界限制，来强行规范 AI 的行为。
2.  **人类定义边界，AI 填充细节 (Human Defines Boundaries, AI Fills Details)**
    人类架构师负责提供架构意图、设定死板的约束条件和最终目标；AI 负责在这些清晰的边界内处理繁琐的代码执行。
3.  **代理可读性 (Agent Legibility)**
    在设计代码库架构、文件夹结构和文档规范时，必须以“是否容易被 AI Agent 读取和解析”为第一准则，而不仅是为了人类阅读。结构越扁平、命名越无歧义，AI 产生幻觉的概率就越低。

## 二、 核心工作流：可控的自主开发闭环
1.  **分类与拆解 (Triage & Decomposition)**
    将宏大的目标拆解为细小的、完全隔离的子任务。确保 Agent 可以在不丢失上下文的前提下，专注于单一模块。
2.  **按需注入上下文 (Just-in-Time Context)**
    切忌将整个庞大的代码库一次性丢给 Agent。在 Agent 执行某个具体任务时，系统（或人类）只为其注入绝对必要的接口定义、文档片段和代码片段。
3.  **自主反馈循环 (Autonomous Feedback Loops / The "Ralph Cycle")**
    构建“失败-改进 (Fail-Refine)”的闭环机制。Agent 尝试编写代码 -> 运行自动化测试或代码静态检查器 (Linter) -> 根据报错日志自主修复代码。整个过程无需人类介入，直到测试通过。
4.  **多代理协同 (Multi-Agent Coordination)**
    在关键节点，引入职责分离的多个 Agent。例如：一个负责写代码（Coder），一个负责代码审查（Reviewer），一个负责写测试脚本（Tester），以此形成交叉验证。

## 三、 结构化要求与落地规范
为了让 Harness Engineering 真正落地，工程层面必须具备以下三大要素：

1.  **显性护栏 (Explicit Guardrails)**
    通过强类型语言（如 Strict TypeScript）、静态分析工具和绝对不可打破的架构规则，将 Agent 关在“安全的笼子”里编程。
2.  **高可观测性 (Traceability)**
    必须详细记录 Agent 的每一步输入和输出（Logs）。这用于在 Agent 陷入“幻觉死循环 (Hallucination Loops)”或发生“代码漂移 (Code Drift)”时，能够及时阻断并回溯溯源。
3.  **传感器与测试网 (Sensors & Testing)**
    自动化测试用例、Linters 以及编译器的报错，构成了 Agent 感知外部环境的“传感器（Senses）”。人类必须先铺设好这些传感器，Agent 才能通过它们来判断自己的工作是否达标。

---

## 附录：基于 Harness 理念的产品文档 (PRD) 编写导航
如果要求 AI 基于 Harness 理念进行开发，提供给 AI 的 PRD 必须包含以下严格区块：

1.  **系统边界与意图 (System Boundaries & Intent)**：明确目标、极端的限制（例如：只准用 React，必须是纯函数等），以及 AI 必须遵守的代码目录结构规范。
2.  **工作流与任务脚手架 (Workflow & Task Scaffolding)**：将系统隔离成互不干扰的模块，指明每个模块 Agent 会收到什么上下文，甚至规定调用什么身份的 Persona。
3.  **验证传感器 (Verification Sensors)**：提前规定好 Agent 必须通过哪些 Linter 规则，必须自己编写哪些自动化测试（Ralph Cycle 的基础）。
4.  **执行审批节点 (Execution Checkpoints)**：设定清晰的 Human-in-the-loop (人工介入) 关卡。例如：“写完状态机的测试并通过后，必须在此暂停等待人类批准，方可开发 UI”。
