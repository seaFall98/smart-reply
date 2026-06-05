import { appendFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { MODES } from "./mode.mjs";
import { sanitizeSessionId } from "./paths.mjs";

const VALID_MODES = new Set(Object.values(MODES));

function statePath(dataDir, sessionId) {
  return path.join(dataDir, "state", `${sanitizeSessionId(sessionId)}.json`);
}

export async function writeTurnState({
  dataDir,
  sessionId,
  mode,
  now = new Date(),
}) {
  const filePath = statePath(dataDir, sessionId);
  const stateDir = path.dirname(filePath);
  await mkdir(stateDir, { recursive: true });

  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const state = {
    mode: VALID_MODES.has(mode) ? mode : MODES.DEFAULT,
    updatedAt: now.toISOString(),
  };
  await writeFile(temporaryPath, `${JSON.stringify(state)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

export async function readTurnState({ dataDir, sessionId }) {
  try {
    const state = JSON.parse(await readFile(statePath(dataDir, sessionId), "utf8"));
    if (!state || !VALID_MODES.has(state.mode)) {
      return { mode: MODES.DEFAULT };
    }
    return {
      mode: state.mode,
      ...(typeof state.updatedAt === "string" ? { updatedAt: state.updatedAt } : {}),
    };
  } catch {
    return { mode: MODES.DEFAULT };
  }
}

export async function clearTurnState({ dataDir, sessionId }) {
  try {
    await rm(statePath(dataDir, sessionId), { force: true });
  } catch {
    // State cleanup must never block Claude Code.
  }
}

export async function logDiagnostic({
  dataDir,
  event,
  error,
  now = new Date(),
}) {
  try {
    const logDir = path.join(dataDir, "logs");
    await mkdir(logDir, { recursive: true });
    const record = {
      timestamp: now.toISOString(),
      event: typeof event === "string" ? event.slice(0, 80) : "unknown",
      errorName:
        error && typeof error.name === "string"
          ? error.name.slice(0, 80)
          : "Error",
      message: "Hook processing failed.",
    };
    await appendFile(
      path.join(logDir, "smart-reply.log"),
      `${JSON.stringify(record)}\n`,
      "utf8",
    );
  } catch {
    // Diagnostic logging is best effort and must fail open.
  }
}
