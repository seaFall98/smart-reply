import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

const hookPath = path.resolve("hooks/smart-reply-hook.mjs");

async function makeFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "smart-reply-hook-"));
  const cwd = path.join(root, "project");
  const dataDir = path.join(root, "data");
  await mkdir(cwd, { recursive: true });
  return { cwd, dataDir };
}

function runHook(event, input, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [hookPath, event], {
      cwd: path.resolve("."),
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
    child.stdin.end(typeof input === "string" ? input : JSON.stringify(input));
  });
}

test("user-prompt-submit writes state and returns additionalContext", async () => {
  const fixture = await makeFixture();
  const result = await runHook(
    "user-prompt-submit",
    {
      session_id: "abcdef123",
      cwd: fixture.cwd,
      prompt: "[smart-reply:doc] 请设计方案",
    },
    { CLAUDE_PLUGIN_DATA: fixture.dataDir },
  );

  assert.equal(result.code, 0);
  assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /必须生成文档/);
  assert.equal(
    JSON.parse(
      await readFile(path.join(fixture.dataDir, "state", "abcdef.json"), "utf8"),
    ).mode,
    "doc",
  );
});

test("stop reads prior mode state and clears it when allowed", async () => {
  const fixture = await makeFixture();
  const env = { CLAUDE_PLUGIN_DATA: fixture.dataDir };
  await runHook(
    "user-prompt-submit",
    {
      session_id: "abcdef123",
      cwd: fixture.cwd,
      prompt: "[smart-reply:inline] 直接回答",
    },
    env,
  );
  const result = await runHook(
    "stop",
    {
      session_id: "abcdef123",
      cwd: fixture.cwd,
      stop_hook_active: false,
      last_assistant_message: "x".repeat(4000),
    },
    env,
  );

  assert.deepEqual(JSON.parse(result.stdout), {});
  await assert.rejects(
    readFile(path.join(fixture.dataDir, "state", "abcdef.json"), "utf8"),
  );
});

test("oversized stop blocks once then stop_hook_active allows and clears state", async () => {
  const fixture = await makeFixture();
  const env = { CLAUDE_PLUGIN_DATA: fixture.dataDir };
  await runHook(
    "user-prompt-submit",
    {
      session_id: "abcdef123",
      cwd: fixture.cwd,
      prompt: "请完整分析",
    },
    env,
  );
  const blocked = await runHook(
    "stop",
    {
      session_id: "abcdef123",
      cwd: fixture.cwd,
      stop_hook_active: false,
      last_assistant_message: "x".repeat(4000),
    },
    env,
  );
  assert.equal(JSON.parse(blocked.stdout).decision, "block");
  assert.equal(
    JSON.parse(
      await readFile(path.join(fixture.dataDir, "state", "abcdef.json"), "utf8"),
    ).mode,
    "default",
  );

  const allowed = await runHook(
    "stop",
    {
      session_id: "abcdef123",
      cwd: fixture.cwd,
      stop_hook_active: true,
      last_assistant_message: "x".repeat(4000),
    },
    env,
  );
  assert.deepEqual(JSON.parse(allowed.stdout), {});
  await assert.rejects(
    readFile(path.join(fixture.dataDir, "state", "abcdef.json"), "utf8"),
  );
});

test("invalid stdin exits zero and emits harmless JSON", async () => {
  const fixture = await makeFixture();
  const result = await runHook("stop", "{invalid", {
    CLAUDE_PLUGIN_DATA: fixture.dataDir,
  });
  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.stdout), {});
});

test("unknown event exits zero", async () => {
  const fixture = await makeFixture();
  const result = await runHook("unknown", {}, {
    CLAUDE_PLUGIN_DATA: fixture.dataDir,
  });
  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.stdout), {});
});

test("all handler exceptions fail open", async () => {
  const fixture = await makeFixture();
  const result = await runHook(
    "user-prompt-submit",
    { session_id: "abcdef123", cwd: null, prompt: "hello" },
    { CLAUDE_PLUGIN_DATA: fixture.dataDir },
  );
  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.stdout), {});
});

test("user-prompt-submit accepts legacy user_prompt field", async () => {
  const fixture = await makeFixture();
  const result = await runHook(
    "user-prompt-submit",
    {
      session_id: "abcdef123",
      cwd: fixture.cwd,
      user_prompt: "[smart-reply:inline] legacy field",
    },
    { CLAUDE_PLUGIN_DATA: fixture.dataDir },
  );
  assert.match(
    JSON.parse(result.stdout).hookSpecificOutput.additionalContext,
    /必须直接在 CLI 完整回复/,
  );
});
