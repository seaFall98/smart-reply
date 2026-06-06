# Smart Reply

Smart Reply 是一个 Claude Code 插件。它引导 Claude 将完整方案、详细分析、审查报告、
复盘、交接 Prompt 和多阶段计划等有长期价值的内容写成 Markdown 文档，并让最终 CLI
回复保持简洁。

用户可读文档默认使用中文（`zh-CN`），也可以通过配置或本轮指令指定其他语言。

## 能力边界

Smart Reply 使用以下组合：

- `UserPromptSubmit` Hook 注入精简策略和目标目录；
- `smart-reply` Skill 负责语义判断和文档写作流程；
- `Stop` Hook 在最终回复超过阈值时最多要求修正一次。

`Stop` Hook 在 Claude 完成响应时触发，因此不能撤回已经流式显示的内容。首版也不会
自动保存所有聊天内容、复制原始 transcript，或机械地把原始回复备份为文档。

## 要求

- Node.js 20 或更新版本；
- Claude Code `2.1.163` 或更新版本。

最低支持目标为 Claude Code `2.1.163`；当前版本已使用 Claude Code `2.1.165`
完成端到端验收。

## 临时加载

开发或试用时，可以只对当前 Claude Code 会话加载插件：

```powershell
claude --plugin-dir <repo>
```

该命令不会直接修改用户设置文件。

## 安装

直接让CLAUDE CODE帮你安装

```
请帮我安装https://github.com/seaFall98/smart-reply这个插件
```

然后在会话里使用

```
/reload-plugins #重新加载插件
/reload-skills #重新加载技能
```

如果手动安装，步骤如下：

先查看安装器将执行的 Claude Code 原生命令：

```powershell
powershell -ExecutionPolicy Bypass -File installers/install.ps1 -WhatIf
```

安装到用户范围：

```powershell
powershell -ExecutionPolicy Bypass -File installers/install.ps1
```

也可以指定 `-Scope project` 或 `-Scope local`。安装器只调用 Claude Code 原生插件
和 marketplace CLI，不直接编辑任何用户设置文件。

## 卸载

直接让CLAUDE CODE帮你卸载

```
帮我卸载smart-reply
```

或者手动卸载

```powershell
powershell -ExecutionPolicy Bypass -File installers/uninstall.ps1
```

保留插件状态和日志：

```powershell
powershell -ExecutionPolicy Bypass -File installers/uninstall.ps1 -KeepData
```

## 使用方式

默认情况下，Claude 自行判断有长期价值的长篇内容是否需要写成文档，亲测有效，无需显示提示或显示使用skill。

需要确定行为时，使用以下标记：

```text
[smart-reply:doc]       本轮必须生成文档
[smart-reply:inline]    本轮必须直接完整回复，禁止生成文档
[smart-reply:off]       本轮关闭 Smart Reply
```

冲突时优先级为：

```text
off > inline > doc
```

## 配置

项目级配置：

```text
<project>/.smart-reply.json
```

用户级配置：

```text
~/.smart-reply/config.json
```

项目配置优先于用户配置，用户配置优先于内置默认值。

```json
{
  "enabled": true,
  "language": "zh-CN",
  "outputDir": "smart-reply",
  "maxInlineChars": 3000
}
```

- `enabled`：是否启用 Smart Reply；
- `language`：用户可读文档目标语言；
- `outputDir`：项目根目录下的相对输出路径；
- `maxInlineChars`：Stop Hook 允许的最终回复最大字符数，范围为 `200` 到 `100000`。

无效字段和无法解析的配置文件会被忽略，Hook 默认放行。

## 文档结构

Smart Reply 优先使用 Git 根目录作为项目根目录；非 Git 目录使用当前工作目录。

```text
<project>/smart-reply/
└── 2026-06-06-claude-a1b2c3/
    ├── 01-方案设计.md
    └── 02-测试报告.md
```

## 隐私与安全

- Hook 异常时默认放行，不阻止 Claude Code 正常结束；
- 状态只保存本轮覆盖模式和时间戳；
- 诊断日志不保存用户 Prompt 或完整 Assistant 回复；
- 不复制原始 transcript；
- 不写入密钥、令牌或环境变量值；
- 不覆盖已有文档；
- 不直接修改 Claude Code 用户设置；
- 不读取或修改 Codex 配置及会话数据。

## 验证与排查

运行自动化测试和严格插件验证：

```powershell
npm run check
```

单独验证插件结构：

```powershell
claude plugin validate --strict .
```

需要排查 Hook 时，可使用 Claude Code 的 `--debug` 或 `--debug-file` 参数查看当前会话
的 Hook 执行信息。

## 当前限制

- 首版只支持 Claude Code；
- 正式安装脚本首版只支持 Windows PowerShell；
- Stop Hook 只能限制最终回复，不能证明文档确实已经创建；
- 不自动维护文档索引；
- 不使用 `MessageDisplay` Hook 隐藏流式内容。
