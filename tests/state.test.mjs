import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { MODES } from "../hooks/lib/mode.mjs";
import {
  clearTurnState,
  logDiagnostic,
  readTurnState,
  writeTurnState,
} from "../hooks/lib/state.mjs";

async function makeDataDir() {
  return mkdtemp(path.join(tmpdir(), "smart-reply-state-"));
}

test("writes only mode and timestamp", async () => {
  const dataDir = await makeDataDir();
  const now = new Date("2026-06-06T00:00:00.000Z");
  await writeTurnState({
    dataDir,
    sessionId: "abcdef123",
    mode: MODES.INLINE,
    now,
    prompt: "must not persist",
  });

  const stored = JSON.parse(
    await readFile(path.join(dataDir, "state", "abcdef.json"), "utf8"),
  );
  assert.deepEqual(stored, {
    mode: MODES.INLINE,
    updatedAt: now.toISOString(),
  });
});

test("sanitizes the session id used as filename", async () => {
  const dataDir = await makeDataDir();
  await writeTurnState({
    dataDir,
    sessionId: "../a:b*c?d",
    mode: MODES.DOC,
    now: new Date("2026-06-06T00:00:00.000Z"),
  });
  assert.equal(
    JSON.parse(await readFile(path.join(dataDir, "state", "abcd.json"), "utf8"))
      .mode,
    MODES.DOC,
  );
});

test("reads an existing state", async () => {
  const dataDir = await makeDataDir();
  await writeTurnState({
    dataDir,
    sessionId: "abcdef123",
    mode: MODES.OFF,
    now: new Date("2026-06-06T00:00:00.000Z"),
  });
  assert.equal((await readTurnState({ dataDir, sessionId: "abcdef123" })).mode, MODES.OFF);
});

test("overwrites state for the next turn in the same session", async () => {
  const dataDir = await makeDataDir();
  await writeTurnState({
    dataDir,
    sessionId: "abcdef123",
    mode: MODES.DOC,
    now: new Date("2026-06-06T00:00:00.000Z"),
  });
  await writeTurnState({
    dataDir,
    sessionId: "abcdef123",
    mode: MODES.INLINE,
    now: new Date("2026-06-06T00:01:00.000Z"),
  });
  assert.deepEqual(await readTurnState({ dataDir, sessionId: "abcdef123" }), {
    mode: MODES.INLINE,
    updatedAt: "2026-06-06T00:01:00.000Z",
  });
});

test("returns default state for missing or invalid state", async () => {
  const dataDir = await makeDataDir();
  assert.deepEqual(await readTurnState({ dataDir, sessionId: "missing" }), {
    mode: MODES.DEFAULT,
  });
  await mkdir(path.join(dataDir, "state"), { recursive: true });
  await writeFile(
    path.join(dataDir, "state", "invalid.json"),
    "{invalid",
    "utf8",
  );
  assert.deepEqual(await readTurnState({ dataDir, sessionId: "invalid" }), {
    mode: MODES.DEFAULT,
  });
});

test("removes state after a completed turn", async () => {
  const dataDir = await makeDataDir();
  await writeTurnState({
    dataDir,
    sessionId: "abcdef123",
    mode: MODES.DOC,
    now: new Date(),
  });
  await clearTurnState({ dataDir, sessionId: "abcdef123" });
  assert.deepEqual(await readTurnState({ dataDir, sessionId: "abcdef123" }), {
    mode: MODES.DEFAULT,
  });
});

test("diagnostic log never includes prompt or assistant message fields", async () => {
  const dataDir = await makeDataDir();
  const error = new Error("secret prompt and assistant message");
  error.user_prompt = "private prompt";
  error.last_assistant_message = "private assistant reply";
  await logDiagnostic({
    dataDir,
    event: "stop",
    error,
    now: new Date("2026-06-06T00:00:00.000Z"),
  });

  const log = await readFile(path.join(dataDir, "logs", "smart-reply.log"), "utf8");
  assert.doesNotMatch(log, /private|secret prompt|assistant message|user_prompt|last_assistant/);
  assert.match(log, /"event":"stop"/);
});
