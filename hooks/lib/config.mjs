import { readFile } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  language: "zh-CN",
  outputDir: "smart-reply",
  maxInlineChars: 3000,
});

function isSafeRelativePath(value) {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    path.isAbsolute(value) ||
    path.win32.isAbsolute(value) ||
    path.posix.isAbsolute(value)
  ) {
    return false;
  }

  return !value
    .replaceAll("\\", "/")
    .split("/")
    .some((segment) => segment === "..");
}

export function normalizeConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized = {};

  if (typeof value.enabled === "boolean") {
    normalized.enabled = value.enabled;
  }

  if (typeof value.language === "string" && value.language.trim() !== "") {
    normalized.language = value.language.trim();
  }

  if (isSafeRelativePath(value.outputDir)) {
    normalized.outputDir = value.outputDir.trim();
  }

  if (
    Number.isInteger(value.maxInlineChars) &&
    value.maxInlineChars >= 200 &&
    value.maxInlineChars <= 100000
  ) {
    normalized.maxInlineChars = value.maxInlineChars;
  }

  return normalized;
}

async function readConfig(filePath) {
  try {
    return normalizeConfig(JSON.parse(await readFile(filePath, "utf8")));
  } catch {
    return {};
  }
}

export async function loadConfig({ projectRoot, homeDir }) {
  const userConfig = await readConfig(
    path.join(homeDir, ".smart-reply", "config.json"),
  );
  const projectConfig = await readConfig(
    path.join(projectRoot, ".smart-reply.json"),
  );

  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    ...projectConfig,
  };
}
