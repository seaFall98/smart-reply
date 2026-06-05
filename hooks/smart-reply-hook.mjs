#!/usr/bin/env node

import os from "node:os";

import { loadConfig } from "./lib/config.mjs";
import { parseMode } from "./lib/mode.mjs";
import {
  findProjectRoot,
  resolveOutputDirectory,
  resolvePluginDataDir,
} from "./lib/paths.mjs";
import {
  buildPromptSubmitResponse,
  buildStopResponse,
} from "./lib/policy.mjs";
import {
  clearTurnState,
  logDiagnostic,
  readTurnState,
  writeTurnState,
} from "./lib/state.mjs";

async function readInput() {
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += chunk;
  }
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError("Hook input must be an object.");
  }
  return parsed;
}

function writeOutput(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value;
}

async function buildContext(input) {
  const cwd = requireString(input.cwd, "cwd");
  const sessionId = requireString(input.session_id, "session_id");
  const projectRoot = await findProjectRoot(cwd);
  const homeDir =
    typeof process.env.SMART_REPLY_HOME === "string" &&
    process.env.SMART_REPLY_HOME.trim() !== ""
      ? process.env.SMART_REPLY_HOME
      : os.homedir();
  const config = await loadConfig({ projectRoot, homeDir });
  const dataDir = resolvePluginDataDir();
  return { config, dataDir, projectRoot, sessionId };
}

async function handleUserPromptSubmit(input) {
  const context = await buildContext(input);
  const mode = parseMode(input.user_prompt);
  await writeTurnState({
    dataDir: context.dataDir,
    sessionId: context.sessionId,
    mode,
  });
  const outputDirectory = resolveOutputDirectory({
    projectRoot: context.projectRoot,
    outputDir: context.config.outputDir,
    sessionId: context.sessionId,
  });
  return buildPromptSubmitResponse({
    config: context.config,
    mode,
    outputDirectory,
  });
}

async function handleStop(input) {
  const context = await buildContext(input);
  const { mode } = await readTurnState({
    dataDir: context.dataDir,
    sessionId: context.sessionId,
  });
  const response = buildStopResponse({
    config: context.config,
    mode,
    stopHookActive: input.stop_hook_active,
    lastAssistantMessage: input.last_assistant_message,
  });

  if (response.decision !== "block") {
    await clearTurnState({
      dataDir: context.dataDir,
      sessionId: context.sessionId,
    });
  }
  return response;
}

async function main() {
  const event = process.argv[2] ?? "unknown";
  const dataDir = resolvePluginDataDir();

  try {
    const input = await readInput();
    if (event === "user-prompt-submit") {
      writeOutput(await handleUserPromptSubmit(input));
    } else if (event === "stop") {
      writeOutput(await handleStop(input));
    } else {
      writeOutput({});
    }
  } catch (error) {
    await logDiagnostic({ dataDir, event, error });
    writeOutput({});
  }
}

await main();
process.exitCode = 0;
