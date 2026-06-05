# Smart Reply Claude Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do not dispatch subagents for this project. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a distributable Claude Code plugin that guides valuable long-form replies into Chinese Markdown documents and uses a fail-open Stop hook to limit oversized final CLI replies.

**Architecture:** A portable Node.js ESM command hook handles both `UserPromptSubmit` and `Stop` events. Focused library modules load configuration, parse deterministic override markers, resolve project/data paths, persist minimal per-session mode state, and construct hook responses. A Claude Code Skill provides the semantic document-writing workflow; hooks only inject policy and mechanically enforce final reply length.

**Tech Stack:** Node.js 20+ ESM, Node.js built-in test runner, Claude Code plugin manifest/hooks/skills, PowerShell installers, JSON.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `.claude-plugin/plugin.json` | Claude Code plugin metadata |
| `.claude-plugin/marketplace.json` | Allows the repository to act as a single-plugin marketplace |
| `hooks/hooks.json` | Registers `UserPromptSubmit` and `Stop` command hooks |
| `hooks/smart-reply-hook.mjs` | Reads stdin, dispatches hook events, always exits successfully |
| `hooks/lib/config.mjs` | Loads and validates built-in, user, and project configuration |
| `hooks/lib/paths.mjs` | Resolves Git/project root, output folder, plugin data directory, and session folder |
| `hooks/lib/mode.mjs` | Parses `doc`, `inline`, and `off` markers with defined precedence |
| `hooks/lib/state.mjs` | Atomically persists minimal per-session mode state and diagnostics |
| `hooks/lib/policy.mjs` | Builds additional context and Stop decisions |
| `skills/smart-reply/SKILL.md` | Semantic rules for deciding and writing Smart Reply documents |
| `installers/install.ps1` | Installs through Claude Code's native marketplace/plugin CLI |
| `installers/uninstall.ps1` | Uninstalls through Claude Code's native plugin/marketplace CLI |
| `tests/*.test.mjs` | Unit and integration tests for all hook behavior |
| `package.json` | Test and validation commands |
| `README.md` | User-facing Chinese installation, usage, configuration, and limitations |
| `LICENSE` | MIT license |

## Task 1: Scaffold And Validate The Plugin

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `.claude-plugin/marketplace.json`
- Create: `hooks/hooks.json`
- Create: `package.json`
- Create: `LICENSE`
- Test: Claude Code plugin validator

- [ ] **Step 1: Create the plugin manifest**

Create `.claude-plugin/plugin.json`:

```json
{
  "name": "smart-reply",
  "version": "0.1.0",
  "description": "Write valuable long-form Claude Code replies into reusable Markdown documents.",
  "author": {
    "name": "seaFall98"
  },
  "homepage": "https://github.com/seaFall98/smart-reply",
  "repository": "https://github.com/seaFall98/smart-reply",
  "license": "MIT",
  "keywords": ["documentation", "hooks", "chinese", "workflow"]
}
```

- [ ] **Step 2: Create the single-plugin marketplace manifest**

Create `.claude-plugin/marketplace.json` with marketplace name `smart-reply-marketplace` and one plugin whose `source` is `"."`.

- [ ] **Step 3: Register both command hooks**

Create `hooks/hooks.json`:

```json
{
  "description": "Smart Reply policy injection and final reply length guard",
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/smart-reply-hook.mjs\" user-prompt-submit",
            "timeout": 10
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/smart-reply-hook.mjs\" stop",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 4: Create package scripts and license**

Create `package.json`:

```json
{
  "name": "smart-reply",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "test": "node --test",
    "validate:plugin": "claude plugin validate --strict .",
    "check": "npm test && npm run validate:plugin"
  }
}
```

Add the standard MIT license text in `LICENSE`.

- [ ] **Step 5: Run plugin validation**

Run:

```powershell
claude plugin validate --strict .
```

Expected: successful validation with no errors.

- [ ] **Step 6: Commit**

```powershell
git add .claude-plugin hooks/hooks.json package.json LICENSE
git commit -m "chore: scaffold Claude Code plugin"
```

## Task 2: Implement Configuration And Path Resolution

**Files:**
- Create: `hooks/lib/config.mjs`
- Create: `hooks/lib/paths.mjs`
- Create: `tests/config.test.mjs`
- Create: `tests/paths.test.mjs`

- [ ] **Step 1: Write failing configuration tests**

Cover:

```js
test("uses built-in defaults when no config exists", ...)
test("project config overrides user config", ...)
test("invalid JSON fails open to lower-priority config", ...)
test("invalid language, outputDir, enabled, or maxInlineChars are ignored", ...)
test("outputDir rejects absolute paths and parent traversal", ...)
```

Expected defaults:

```js
{
  enabled: true,
  language: "zh-CN",
  outputDir: "smart-reply",
  maxInlineChars: 3000
}
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
node --test tests/config.test.mjs
```

Expected: FAIL because `hooks/lib/config.mjs` does not exist.

- [ ] **Step 3: Implement configuration loading**

Export from `hooks/lib/config.mjs`:

```js
export const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  language: "zh-CN",
  outputDir: "smart-reply",
  maxInlineChars: 3000
});

export async function loadConfig({ projectRoot, homeDir }) {}
export function normalizeConfig(value) {}
```

Rules:

- Read `<homeDir>/.smart-reply/config.json`, then `<projectRoot>/.smart-reply.json`.
- Merge only validated known fields.
- Accept `maxInlineChars` only as an integer from 200 through 100000.
- Accept `outputDir` only as a non-empty relative path without `..`.
- Never throw for missing or invalid configuration files.

- [ ] **Step 4: Write failing path tests**

Cover:

```js
test("finds nearest ancestor containing .git", ...)
test("uses cwd when no git root exists", ...)
test("uses CLAUDE_PLUGIN_DATA when available", ...)
test("falls back to an OS temp directory when plugin data is missing", ...)
test("builds stable session folder from local date and session id", ...)
test("sanitizes session id before using it in a path", ...)
```

- [ ] **Step 5: Implement path resolution**

Export from `hooks/lib/paths.mjs`:

```js
export async function findProjectRoot(cwd) {}
export function resolvePluginDataDir(env = process.env) {}
export function buildSessionFolder(sessionId, now = new Date()) {}
export function resolveOutputDirectory({ projectRoot, outputDir, sessionId, now }) {}
```

Use filesystem ancestor walking instead of executing Git. Fallback plugin data path:

```text
<os.tmpdir()>/smart-reply-plugin-data
```

- [ ] **Step 6: Run focused tests**

Run:

```powershell
node --test tests/config.test.mjs tests/paths.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add hooks/lib/config.mjs hooks/lib/paths.mjs tests/config.test.mjs tests/paths.test.mjs
git commit -m "feat: add Smart Reply configuration and paths"
```

## Task 3: Implement Override Modes And Minimal Session State

**Files:**
- Create: `hooks/lib/mode.mjs`
- Create: `hooks/lib/state.mjs`
- Create: `tests/mode.test.mjs`
- Create: `tests/state.test.mjs`

- [ ] **Step 1: Write failing mode tests**

Cover exact marker behavior:

```js
test("returns default mode without markers", ...)
test("recognizes doc marker case-insensitively", ...)
test("inline overrides doc", ...)
test("off overrides inline and doc", ...)
test("does not treat similar prose as a marker", ...)
```

- [ ] **Step 2: Implement marker parsing**

Export:

```js
export const MODES = Object.freeze({
  DEFAULT: "default",
  DOC: "doc",
  INLINE: "inline",
  OFF: "off"
});

export function parseMode(userPrompt = "") {}
```

Only exact bracketed markers count. Precedence: `off > inline > doc > default`.

- [ ] **Step 3: Write failing state tests**

Cover:

```js
test("writes only mode and timestamp", ...)
test("sanitizes the session id used as filename", ...)
test("reads an existing state", ...)
test("returns default state for missing or invalid state", ...)
test("removes state after a completed turn", ...)
test("diagnostic log never includes prompt or assistant message fields", ...)
```

- [ ] **Step 4: Implement atomic state and diagnostics**

Export from `hooks/lib/state.mjs`:

```js
export async function writeTurnState({ dataDir, sessionId, mode, now }) {}
export async function readTurnState({ dataDir, sessionId }) {}
export async function clearTurnState({ dataDir, sessionId }) {}
export async function logDiagnostic({ dataDir, event, error, now }) {}
```

Persist only:

```json
{
  "mode": "inline",
  "updatedAt": "2026-06-05T00:00:00.000Z"
}
```

Write to a temporary sibling file and rename atomically. Diagnostic records may contain event,
timestamp, and sanitized error name/message, but no hook input payload.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
node --test tests/mode.test.mjs tests/state.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add hooks/lib/mode.mjs hooks/lib/state.mjs tests/mode.test.mjs tests/state.test.mjs
git commit -m "feat: add override modes and session state"
```

## Task 4: Implement Policy Responses And Hook Entrypoint

**Files:**
- Create: `hooks/lib/policy.mjs`
- Create: `hooks/smart-reply-hook.mjs`
- Create: `tests/policy.test.mjs`
- Create: `tests/hook-entrypoint.test.mjs`

- [ ] **Step 1: Write failing UserPromptSubmit policy tests**

Cover:

```js
test("disabled config injects no policy", ...)
test("off mode injects no policy", ...)
test("default mode injects language, target directory, and concise final reply rule", ...)
test("doc mode explicitly requires a document", ...)
test("inline mode explicitly allows a complete inline reply", ...)
```

The response must use:

```js
{
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: "..."
  }
}
```

- [ ] **Step 2: Write failing Stop policy tests**

Cover:

```js
test("allows when stop_hook_active is true", ...)
test("allows and clears state when last_assistant_message is missing", ...)
test("allows and clears state when config is disabled", ...)
test("allows and clears state for off or inline mode", ...)
test("allows and clears state below maxInlineChars", ...)
test("blocks one oversized final reply with a concise correction reason", ...)
test("does not include the oversized assistant reply in output", ...)
```

Blocking response:

```js
{
  decision: "block",
  reason: "本轮最终回复过长。请将有长期价值的完整内容整理为 Smart Reply 文档，并把最终回复缩短为摘要、文档路径和必要下一步。",
  systemMessage: "Smart Reply 已要求缩短最终回复。"
}
```

- [ ] **Step 3: Implement policy functions**

Export from `hooks/lib/policy.mjs`:

```js
export function buildPromptSubmitResponse({ config, mode, outputDirectory }) {}
export function buildStopResponse({ config, mode, stopHookActive, lastAssistantMessage }) {}
```

The injected policy must stay short and must not duplicate the full Skill.

- [ ] **Step 4: Write failing entrypoint integration tests**

Spawn Node with JSON stdin and cover:

```js
test("user-prompt-submit writes state and returns additionalContext", ...)
test("stop reads prior mode state", ...)
test("invalid stdin exits zero and emits harmless JSON", ...)
test("unknown event exits zero", ...)
test("all handler exceptions fail open", ...)
```

- [ ] **Step 5: Implement the hook entrypoint**

`hooks/smart-reply-hook.mjs` must:

1. Read all stdin as UTF-8 JSON.
2. Resolve project root, config, data directory, and session ID.
3. For `user-prompt-submit`, parse `input.user_prompt`, persist mode, and emit policy context.
4. For `stop`, read state, evaluate `input.stop_hook_active` and
   `input.last_assistant_message`, clear state on allowed completion, and emit the decision.
5. Catch every error, write a sanitized diagnostic when possible, emit `{}`, and set exit code `0`.

- [ ] **Step 6: Run focused tests**

Run:

```powershell
node --test tests/policy.test.mjs tests/hook-entrypoint.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add hooks/lib/policy.mjs hooks/smart-reply-hook.mjs tests/policy.test.mjs tests/hook-entrypoint.test.mjs
git commit -m "feat: implement Smart Reply hooks"
```

## Task 5: Add The Smart Reply Skill

**Files:**
- Create: `skills/smart-reply/SKILL.md`
- Test: `tests/skill.test.mjs`

- [ ] **Step 1: Write a failing structural test**

Test that the Skill:

- has valid YAML frontmatter with `name: smart-reply`;
- contains the semantic document categories from the design;
- defaults user-facing documents to `zh-CN`;
- instructs Claude to use the injected target directory;
- requires a concise final reply containing summary and path;
- prohibits secrets, overwrites, and automatic transcript copying;
- documents all three override markers.

- [ ] **Step 2: Run test and verify failure**

Run:

```powershell
node --test tests/skill.test.mjs
```

Expected: FAIL because the Skill is absent.

- [ ] **Step 3: Write the Skill**

Use frontmatter:

```yaml
---
name: smart-reply
description: Use when a response is a complete plan, detailed analysis, review report, retrospective, handoff prompt, multi-stage plan, explicitly requested document, or otherwise valuable long-form content.
version: 0.1.0
---
```

The Skill must direct Claude to:

1. Prefer the injected target language and directory.
2. Create the directory if needed.
3. Inspect existing two-digit prefixes and choose the next unused number.
4. Write a focused Markdown document directly in the target language.
5. Never overwrite an existing document.
6. Never persist secrets or raw transcript content.
7. Finish with a concise CLI summary and exact document path.

- [ ] **Step 4: Run Skill and plugin validation**

Run:

```powershell
node --test tests/skill.test.mjs
claude plugin validate --strict .
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add skills/smart-reply/SKILL.md tests/skill.test.mjs
git commit -m "feat: add Smart Reply skill"
```

## Task 6: Add Native Installation And User Documentation

**Files:**
- Create: `installers/install.ps1`
- Create: `installers/uninstall.ps1`
- Create: `tests/installers.test.mjs`
- Create: `README.md`

- [ ] **Step 1: Write failing installer safety tests**

Statically verify:

- scripts never reference `.codex`, `config.toml`, or Claude `settings.json`;
- install uses only `claude plugin marketplace add` and `claude plugin install`;
- uninstall uses only `claude plugin uninstall` and `claude plugin marketplace remove`;
- both scripts stop on errors and support a non-mutating `-WhatIf` mode.

- [ ] **Step 2: Implement the install script**

`installers/install.ps1` parameters:

```powershell
param(
  [ValidateSet("user", "project", "local")]
  [string]$Scope = "user",
  [switch]$WhatIf
)
```

Behavior:

1. Verify `node`, `claude`, and Claude Code version `2.1.163` or newer.
2. Run `claude plugin validate --strict <repo-root>`.
3. In `-WhatIf`, print native commands and exit.
4. Run:

```powershell
claude plugin marketplace add <repo-root> --scope $Scope
claude plugin install smart-reply@smart-reply-marketplace --scope $Scope
```

Do not directly edit any settings file.

- [ ] **Step 3: Implement the uninstall script**

In normal mode run:

```powershell
claude plugin uninstall smart-reply@smart-reply-marketplace --scope $Scope --yes
claude plugin marketplace remove smart-reply-marketplace --scope $Scope
```

Support `-KeepData` by forwarding `--keep-data`.

- [ ] **Step 4: Write the Chinese README**

Include:

- what Smart Reply does and does not guarantee;
- requirement: Node.js 20+ and tested Claude Code version `2.1.163`;
- safe development command: `claude --plugin-dir <repo>`;
- installer and uninstaller commands;
- configuration fields and precedence;
- override markers;
- generated document structure;
- explicit statement that Stop cannot retract already streamed content;
- privacy and fail-open behavior;
- troubleshooting with `claude plugin validate --strict .` and Claude debug logs.

- [ ] **Step 5: Run installer tests and dry runs**

Run:

```powershell
node --test tests/installers.test.mjs
powershell -ExecutionPolicy Bypass -File installers/install.ps1 -WhatIf
powershell -ExecutionPolicy Bypass -File installers/uninstall.ps1 -WhatIf
```

Expected: PASS; dry runs print only native Claude plugin commands.

- [ ] **Step 6: Commit**

```powershell
git add installers tests/installers.test.mjs README.md
git commit -m "docs: add safe installation workflow"
```

## Task 7: Full Verification And Manual Claude Code Acceptance

**Files:**
- Modify only files required by verified defects
- Create: `docs/testing/2026-06-05-claude-code-acceptance.md`

- [ ] **Step 1: Run the complete automated suite**

Run:

```powershell
npm run check
git diff --check
```

Expected: all tests and strict plugin validation pass; no whitespace errors.

- [ ] **Step 2: Snapshot protected user files before manual testing**

Record hashes only, not contents:

```powershell
Get-FileHash "$HOME\.claude\settings.json" -ErrorAction SilentlyContinue
Get-FileHash "$HOME\.codex\config.toml" -ErrorAction SilentlyContinue
```

Do not inspect or modify Codex session data.

- [ ] **Step 3: Test with a temporary isolated workspace**

Create a temporary test workspace outside this repository. Run Claude Code using:

```powershell
claude --plugin-dir <repo>
```

Manually verify:

1. A short factual question remains inline.
2. A requested detailed Chinese design creates a Markdown document.
3. `[smart-reply:doc]` injects a mandatory document instruction.
4. `[smart-reply:inline]` permits a long inline answer.
5. `[smart-reply:off]` disables policy for the turn.
6. An oversized final reply triggers at most one Stop correction.
7. Invalid Smart Reply config fails open.

- [ ] **Step 4: Verify protected user files did not change**

Re-run hashes and confirm they match the pre-test values.

- [ ] **Step 5: Write the acceptance report**

Document:

- Claude Code and Node.js versions;
- commands run;
- automated results;
- each manual scenario result;
- known limitations;
- confirmation that protected settings hashes were unchanged.

Do not include user settings contents, prompts, assistant replies, tokens, or local absolute paths.

- [ ] **Step 6: Commit verification fixes and report**

```powershell
git add docs/testing/2026-06-05-claude-code-acceptance.md
git commit -m "test: verify Smart Reply Claude Code plugin"
```

If verification required code fixes, inspect `git diff` and stage each changed implementation or
test file by its exact path before this commit. Never use `git add -A` or `git add .`.

- [ ] **Step 7: Final repository verification**

Run:

```powershell
npm run check
git diff --check
git status --short
```

Expected: tests and validation pass; working tree clean.

## Plan Self-Review

- The plan covers all approved design sections: Claude-only scope, Skill behavior, both hooks,
  override state transfer, fail-open behavior, configuration, paths, privacy, native installation,
  automated testing, and manual acceptance.
- It deliberately does not add MessageDisplay, Codex integration, transcript parsing, index
  generation, or direct user settings edits.
- Stop enforcement is explicitly limited to final reply length and does not claim to verify that a
  document was created.
- Execution is inline by the current Codex agent; no subagent workflow is used.
