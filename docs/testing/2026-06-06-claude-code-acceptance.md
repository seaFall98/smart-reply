# Smart Reply Claude Code 验收报告

## 环境

- 日期：2026-06-06
- Node.js：`24.14.0`
- Claude Code：`2.1.165`
- 操作系统：Windows
- 插件版本：`0.1.0`

## 自动化验证

执行：

```powershell
npm run check
git diff --check
```

结果：

- Node.js 内置测试运行器：47 项通过，0 项失败；
- Claude Code 严格插件验证：通过；
- Git 空白错误检查：通过。

自动化覆盖配置优先级、无效配置放行、路径解析、覆盖标记优先级、最小会话状态、
诊断日志隐私、UserPromptSubmit/Stop 输出协议、Stop 单次修正、异常放行、Skill 结构和
安装器安全边界。

## 安装与卸载验收

在隔离工作目录使用 `local` scope 验证：

1. 原生 marketplace 注册成功；
2. 原生插件安装成功；
3. 重复执行安装成功，未产生冲突；
4. 原生插件卸载成功；
5. marketplace 移除成功；
6. 卸载后插件列表不再包含 Smart Reply。

安装器和卸载器只调用 Claude Code 原生插件 CLI，没有直接编辑用户设置文件。

## 真实 Claude Code 会话验收

通过 `claude --plugin-dir <repo>` 验证：

| 场景 | 结果 |
| --- | --- |
| 简短事实回复 | 通过，保持简短 CLI 回复 |
| `[smart-reply:doc]` | 通过，生成中文 Markdown，并返回摘要和路径 |
| 注入目标目录 | 通过，文档写入按日期和会话划分的目标目录 |
| 低阈值 Stop 修正 | 通过，长回复被收敛为文档和简短最终回复 |
| `[smart-reply:inline]` | 通过，强制直接完整回复并跳过文档 |
| `[smart-reply:off]` | 通过，关闭 Smart Reply 行为 |
| 非 Git 工作目录 | 通过，使用当前工作目录作为项目根目录 |
| 同一会话连续生成文档 | 通过，同一目录内文件编号从 `01` 自增到 `02` |

验收期间发现当前 Claude Code 的真实 `UserPromptSubmit` 输入字段为 `prompt`，而旧版
参考材料使用 `user_prompt`。实现已修正为优先支持 `prompt`，同时保留
`user_prompt` 兼容，并添加自动化测试。

## 安全验证

- Claude Code 用户设置文件哈希在验收前后保持一致；
- Codex 配置文件哈希在验收前后保持一致；
- 未读取或修改 Codex 会话数据；
- 验收报告不包含用户设置内容、Prompt、Assistant 回复、令牌或本地绝对路径。

## 已知限制

- Stop Hook 在响应结束阶段运行，不能撤回已经流式显示的内容；
- Stop Hook 只限制最终回复长度，不能机械证明文档已经创建；
- 首版只支持 Claude Code 和 Windows PowerShell 正式安装器；
- 首版不自动生成文档索引。
