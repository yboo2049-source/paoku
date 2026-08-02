# 会话交接文档 (Session Handoff)

> **Harness 规则：** 当 Agent 遇到不可恢复的错误、陷入死循环、或者因 Token 限制需要结束当前会话前，**必须**填写此文档，以便下一个 Agent 能够无缝接盘。

## 1. 目标状态 (Target Status)
- 当前正在开发的 Feature 位于 `FEATURE_LIST.md` 的哪一项？
- 已经实现了什么？还差什么？

## 2. 现场快照 (Context Snapshot)
- **最后修改的文件：** `src/...`
- **最后运行的命令：** `npm run ...`
- **当前的报错日志/异常现象：**
  ```text
  (粘贴最近一次阻断进度的错误日志)
  ```

## 3. 下一步行动建议 (Next Steps)
- 给下一个 Agent 的明确指示（例如：“请检查 `src/systems/collision.ts` 第 50 行的算法边界问题，修复后再跑一遍测试”）。
