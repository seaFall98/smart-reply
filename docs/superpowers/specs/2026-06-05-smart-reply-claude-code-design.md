# Smart Reply Claude Code 插件设计

## 1. 目标

Smart Reply 是一个面向 Claude Code 的插件，用于解决以下问题：

- 有长期价值的长篇回复直接显示在 CLI 中，阅读困难且不便追溯；
- 中文用户可读文档经常被写成英文；
- 仅依赖 `CLAUDE.md` 的软约束容易失效；
- 用户需要反复提醒 Agent 将长篇内容写入文档。

首版只支持 Claude Code。不得读取、修改或覆盖 Codex 的
`~/.codex/config.toml`、会话目录或其他用户数据。

## 2. 成功标准

安装或临时加载插件后：

1. 短回复继续直接显示在 CLI 中。
2. 完整方案、详细分析、审查报告、复盘、交接 Prompt 和多阶段计划等内容，
   默认写成中文 Markdown 文档。
3. CLI 最终回复仅保留简短摘要、文档路径和必要的下一步。
4. Agent 忘记将过长回复写入文档时，`Stop` Hook 最多阻止结束一次并要求修正。
5. 用户可以明确要求本轮直接完整回复或强制生成文档。
6. 开发测试可以使用 `claude --plugin-dir <repo>`，不修改用户的
   `~/.claude/settings.json`。
7. Hook 异常时默认放行，不能导致 Claude Code 无法正常结束会话。

## 3. 非目标

首版不包括：

- Codex、Gemini CLI 或其他 Agent 适配；
- 修改 Codex 配置或会话数据；
- 使用 `MessageDisplay` Hook 隐藏流式内容；
- 自动保存每一条原始回复；
- 自动维护跨会话文档索引；
- macOS/Linux 正式安装脚本；
- 自动修改用户项目的 `.gitignore`。

## 4. 推荐架构

插件采用“行为引导 + 结束校验”模式：

```text
用户提交 Prompt
    |
    v
UserPromptSubmit Hook
    | 注入简短策略、配置和本轮覆盖标记
    v
Claude 根据 Skill 主动写入 Markdown
    |
    v
Claude 输出简短最终回复
    |
    v
Stop Hook
    |-- 合规：允许结束
    `-- 违规：最多阻止一次，要求补写或缩短
```

这种设计不能绝对阻止长回复在修正前短暂显示，但能够：

- 让 Agent 从生成阶段开始将完整内容写入文件；
- 避免保存未经整理的原始输出；
- 保持 Claude Code 的流式响应体验；
- 通过 `Stop` Hook 提高遵守率；
- 控制实现复杂度和误判风险。

## 5. 插件结构

```text
smart-reply/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   ├── hooks.json
│   └── smart-reply-hook.mjs
├── skills/
│   └── smart-reply/
│       └── SKILL.md
├── installers/
│   ├── install.ps1
│   └── uninstall.ps1
├── tests/
│   └── smart-reply-hook.test.mjs
├── docs/
│   └── superpowers/specs/
├── package.json
├── README.md
└── LICENSE
```

首版使用 Node.js ESM 脚本，依赖 Node.js 20+，不引入第三方运行时依赖。

## 6. 组件职责

### 6.1 Smart Reply Skill

Skill 是主要行为规范，负责告诉 Claude：

- 哪些内容应沉淀为文档；
- 如何确定目标语言；
- 如何确定项目根目录和输出目录；
- 如何创建会话目录和文档文件；
- 最终 CLI 回复应包含哪些内容；
- 哪些敏感信息不得写入文档。

Skill 采用语义判断，不只依赖字符数。

默认应写文档的内容：

- 完整方案或技术设计；
- 详细调研、分析和复盘；
- 代码审查报告；
- 交接 Prompt；
- 多阶段执行计划；
- 用户明确要求生成文档；
- 具有后续复用价值的长篇内容。

默认不写文档的内容：

- 简短事实回答；
- 简短状态更新；
- 单条错误解释；
- 用户明确要求直接在 CLI 完整查看的内容。

### 6.2 UserPromptSubmit Hook

该 Hook 每轮注入一段简短上下文：

- 当前 Smart Reply 是否启用；
- 默认目标语言；
- 最终回复字符限制；
- 本轮是否包含强制标记；
- 提醒 Claude 在需要时使用 Smart Reply Skill。

Hook 不重写用户原始 Prompt，不重复注入完整 Skill 内容。

### 6.3 Stop Hook

该 Hook 接收 `last_assistant_message` 并进行机械校验。

默认规则：

- 最终回复不超过 3000 个字符时直接放行；
- 存在 `[smart-reply:inline]` 或 `[smart-reply:off]` 时放行；
- 最终回复过长时阻止结束一次；
- 阻止原因要求 Claude 将完整内容写入 Smart Reply 文档，并将最终回复缩短；
- 同一轮已经阻止过一次时放行，避免死循环；
- Hook 解析失败、文件系统错误或状态异常时放行并记录诊断信息。

Stop Hook 不负责自动把最终回复复制成文档，因为未经 Agent 整理的原始回复可能：

- 使用了错误语言；
- 包含不适合持久化的内容；
- 文档结构较差；
- 包含敏感信息。

## 7. 用户覆盖标记

首版支持以下确定性标记：

```text
[smart-reply:doc]
[smart-reply:inline]
[smart-reply:off]
```

- `[smart-reply:doc]`：本轮必须生成文档；
- `[smart-reply:inline]`：本轮允许完整 CLI 回复；
- `[smart-reply:off]`：本轮禁用 Smart Reply。

若同时出现多个冲突标记，优先级为：

```text
off > inline > doc
```

自然语言要求仍由 Claude 语义理解，标记用于需要确定行为的场景。

## 8. 语言策略

目标语言优先级：

1. 用户本轮明确指定的语言；
2. 项目配置；
3. 用户全局配置；
4. 默认 `zh-CN`。

Claude 应直接使用目标语言撰写文档，不先生成英文全文再翻译。

代码、命令、路径、API 名称和必要技术术语保持原文。

## 9. 配置

项目级配置文件：

```text
<project>/.smart-reply.json
```

用户级配置文件：

```text
~/.smart-reply/config.json
```

示例：

```json
{
  "enabled": true,
  "language": "zh-CN",
  "outputDir": "smart-reply",
  "maxInlineChars": 3000,
  "maxStopRetries": 1
}
```

优先级：

```text
项目配置 > 用户配置 > 内置默认值
```

无效字段忽略并使用默认值。无效 JSON 不得阻塞 Hook。

## 10. 文档目录与命名

项目根目录优先使用 Git 根目录；当前目录不属于 Git 仓库时使用 Claude Code
提供的当前工作目录。

默认输出结构：

```text
<project>/smart-reply/
└── 2026-06-05-claude-a1b2c3/
    ├── 01-smart-reply方案设计.md
    ├── 02-实现计划.md
    └── 03-测试报告.md
```

会话目录名由以下字段组成：

```text
本地日期 + claude + session_id 前六位
```

文档名由两位自增序号和简短标题组成。创建文件前必须再次确认目标路径不存在，
不得覆盖已有文件。

首版不自动维护 `index.md`，避免并发写入冲突。

## 11. 状态与日志

Hook 需要记录“本轮是否已经阻止过”，避免重复阻止。

状态和诊断日志写入插件用户数据目录或系统临时目录，不写入用户项目：

```text
<plugin-data>/state/<session-id>.json
<plugin-data>/logs/smart-reply.log
```

状态文件只保存必要元数据，不保存用户 Prompt 或完整 Assistant 回复。

## 12. 安装与开发测试

### 12.1 开发测试

使用临时插件目录加载：

```powershell
claude --plugin-dir <repo>
```

该方式只影响当前会话，不修改用户设置。

### 12.2 正式安装

Windows 安装脚本负责：

- 验证 Node.js 和 Claude Code 可用；
- 验证插件结构；
- 通过 Claude Code 原生插件或市场机制安装；
- 安装后验证插件可加载性；
- 不读取或修改任何 Codex 文件。

正式安装方式需要在实现阶段根据当前 Claude Code 插件 CLI 的稳定能力确定。
首版安装器不得直接修改 `~/.claude/settings.json`。如果原生安装能力无法满足要求，
仅提供 `--plugin-dir` 使用说明；任何配置文件修改方案必须单独设计并获得用户明确授权。

## 13. 安全边界

- 不触碰 `~/.codex/config.toml` 和 Codex 会话目录；
- 不自动保存所有对话；
- 不把密钥、令牌、环境变量值或明确标记的敏感信息写入文档；
- 不覆盖已有文件；
- 不自动修改 `.gitignore`；
- 不执行网络请求；
- Hook 失败时默认放行；
- 首版安装器不直接修改 `~/.claude/settings.json`。

## 14. 测试策略

### 14.1 自动化测试

使用 Node.js 内置测试运行器覆盖：

- 默认配置与配置优先级；
- 无效 JSON 配置；
- 三种覆盖标记及冲突优先级；
- 短回复放行；
- 长回复首次阻止；
- 长回复第二次放行；
- Hook 输入异常时放行；
- 状态文件创建和清理；
- Windows 路径与非 Git 目录；
- 安装器重复执行和回滚逻辑。

### 14.2 插件验证

运行：

```powershell
claude plugin validate --strict .
```

### 14.3 手工验收

通过 `claude --plugin-dir <repo>` 验证：

1. 简短问题直接回答；
2. 长篇技术方案生成中文 Markdown；
3. 最终回复只包含摘要和路径；
4. `[smart-reply:inline]` 允许长回复；
5. `[smart-reply:doc]` 强制生成文档；
6. Hook 错误不会卡住会话；
7. 测试期间用户 Claude Code 设置未发生变化；
8. Codex 配置和会话目录未发生变化。

## 15. 后续版本

首版稳定后再评估：

- Codex 适配；
- macOS/Linux 安装器；
- 可选索引生成命令；
- 可选 `MessageDisplay` 显示层拦截；
- 更多语言和配置入口；
- 文档清理和归档策略。

Codex 适配必须单独设计，不得直接复用可能覆盖 `config.toml` 的安装逻辑。
