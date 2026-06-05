---
name: smart-reply
description: Use when a response is a complete plan, detailed analysis, review report, retrospective, handoff prompt, multi-stage plan, explicitly requested document, or otherwise valuable long-form content.
version: 0.1.0
---

# Smart Reply

将有长期价值的长篇用户可读内容直接整理为可复用 Markdown 文档，而不是把全文作为
最终 CLI 回复。

## 何时写文档

默认将以下内容写成文档：

- 完整方案或技术设计；
- 详细分析、调研或说明；
- 审查报告；
- 复盘；
- 交接 Prompt；
- 多阶段计划；
- 用户明确要求生成文档；
- 其他具有长期复用价值的长篇内容。

简短事实回答、简短状态更新和单条错误解释通常直接在 CLI 中回答。

## 覆盖标记

- `[smart-reply:doc]`：本轮必须写文档。
- `[smart-reply:inline]`：本轮必须直接在 CLI 完整回复，禁止生成 Smart Reply 文档。
- `[smart-reply:off]`：本轮关闭 Smart Reply。

冲突时优先级为 `off > inline > doc`。

## 文档流程

1. 优先使用 Smart Reply policy 注入的目标语言和注入的目标目录。
2. 未指定目标语言时，用户可读文档默认使用 `zh-CN`；代码、命令、路径、API 名称和
   必要技术术语保持原文。
3. 创建注入的目标目录（如果不存在）。
4. 查看目录内已有的 `NN-标题.md` 文件，选择下一个未使用的两位数字编号。
5. 使用简短、可读的标题创建 Markdown 文档，例如 `01-方案设计.md`。
6. 直接用目标语言撰写结构完整、可独立阅读的文档，不先写英文全文再翻译。
7. 写入前确认目标路径不存在；不得覆盖任何已有文件。
8. 最终 CLI 回复仅保留摘要、文档路径和必要下一步。

## 安全规则

- 不得将密钥、令牌、环境变量值或其他敏感信息写入文档。
- 不得复制或保存原始 transcript。
- 不得机械复制未经整理的完整聊天回复作为文档。
- 不得自动修改 `.gitignore` 或其他项目配置。
- 如果无法安全写入文档，简短说明阻塞原因，不要伪造文档路径。
