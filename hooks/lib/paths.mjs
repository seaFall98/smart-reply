import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function findProjectRoot(cwd) {
  const original = path.resolve(cwd);
  let current = original;

  while (true) {
    if (await exists(path.join(current, ".git"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return original;
    }
    current = parent;
  }
}

export function resolvePluginDataDir(env = process.env) {
  if (
    typeof env.CLAUDE_PLUGIN_DATA === "string" &&
    env.CLAUDE_PLUGIN_DATA.trim() !== ""
  ) {
    return path.resolve(env.CLAUDE_PLUGIN_DATA);
  }

  return path.join(os.tmpdir(), "smart-reply-plugin-data");
}

function localDate(now) {
  const year = String(now.getFullYear()).padStart(4, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sanitizeSessionId(sessionId) {
  const sanitized = String(sessionId ?? "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 6);
  return sanitized || "session";
}

export function buildSessionFolder(sessionId, now = new Date()) {
  return `${localDate(now)}-claude-${sanitizeSessionId(sessionId)}`;
}

export function resolveOutputDirectory({
  projectRoot,
  outputDir,
  sessionId,
  now = new Date(),
}) {
  return path.join(
    path.resolve(projectRoot),
    outputDir,
    buildSessionFolder(sessionId, now),
  );
}
