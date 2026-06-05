import assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildSessionFolder,
  findProjectRoot,
  resolveOutputDirectory,
  resolvePluginDataDir,
} from "../hooks/lib/paths.mjs";

test("finds nearest ancestor containing .git", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "smart-reply-root-"));
  const project = path.join(root, "project");
  const nested = path.join(project, "a", "b");
  await mkdir(path.join(project, ".git"), { recursive: true });
  await mkdir(nested, { recursive: true });
  assert.equal(await findProjectRoot(nested), project);
});

test("uses cwd when no git root exists", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "smart-reply-cwd-"));
  assert.equal(await findProjectRoot(cwd), cwd);
});

test("uses CLAUDE_PLUGIN_DATA when available", () => {
  assert.equal(
    resolvePluginDataDir({ CLAUDE_PLUGIN_DATA: "D:\\plugin-data" }),
    path.resolve("D:\\plugin-data"),
  );
});

test("falls back to an OS temp directory when plugin data is missing", () => {
  assert.equal(
    resolvePluginDataDir({}),
    path.join(tmpdir(), "smart-reply-plugin-data"),
  );
});

test("builds stable session folder from local date and session id", () => {
  const now = new Date(2026, 5, 6, 12, 0, 0);
  assert.equal(
    buildSessionFolder("abcdef123456", now),
    "2026-06-06-claude-abcdef",
  );
});

test("sanitizes session id before using it in a path", () => {
  const now = new Date(2026, 5, 6, 12, 0, 0);
  assert.equal(
    buildSessionFolder("../a:b*c?d", now),
    "2026-06-06-claude-abcd",
  );
});

test("resolves output directory inside the project", () => {
  const now = new Date(2026, 5, 6, 12, 0, 0);
  assert.equal(
    resolveOutputDirectory({
      projectRoot: "D:\\project",
      outputDir: "docs/smart-reply",
      sessionId: "abcdef123456",
      now,
    }),
    path.join(
      path.resolve("D:\\project"),
      "docs",
      "smart-reply",
      "2026-06-06-claude-abcdef",
    ),
  );
});
