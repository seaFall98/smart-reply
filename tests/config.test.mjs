import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  DEFAULT_CONFIG,
  loadConfig,
  normalizeConfig,
} from "../hooks/lib/config.mjs";

async function makeFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "smart-reply-config-"));
  const homeDir = path.join(root, "home");
  const projectRoot = path.join(root, "project");
  await mkdir(homeDir, { recursive: true });
  await mkdir(projectRoot, { recursive: true });
  return { homeDir, projectRoot };
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value), "utf8");
}

test("uses built-in defaults when no config exists", async () => {
  const fixture = await makeFixture();
  assert.deepEqual(await loadConfig(fixture), DEFAULT_CONFIG);
});

test("project config overrides user config", async () => {
  const fixture = await makeFixture();
  await writeJson(path.join(fixture.homeDir, ".smart-reply", "config.json"), {
    language: "en-US",
    maxInlineChars: 1800,
  });
  await writeJson(path.join(fixture.projectRoot, ".smart-reply.json"), {
    language: "ja-JP",
  });

  assert.deepEqual(await loadConfig(fixture), {
    ...DEFAULT_CONFIG,
    language: "ja-JP",
    maxInlineChars: 1800,
  });
});

test("invalid JSON fails open to lower-priority config", async () => {
  const fixture = await makeFixture();
  await writeJson(path.join(fixture.homeDir, ".smart-reply", "config.json"), {
    language: "fr-FR",
  });
  await writeFile(
    path.join(fixture.projectRoot, ".smart-reply.json"),
    "{invalid",
    "utf8",
  );

  assert.equal((await loadConfig(fixture)).language, "fr-FR");
});

test("invalid known fields and unknown fields are ignored", () => {
  assert.deepEqual(
    normalizeConfig({
      enabled: "yes",
      language: "",
      outputDir: 42,
      maxInlineChars: 199,
      unknown: true,
    }),
    {},
  );
});

test("outputDir rejects absolute paths and parent traversal", () => {
  assert.deepEqual(normalizeConfig({ outputDir: "../private" }), {});
  assert.deepEqual(normalizeConfig({ outputDir: "nested/../private" }), {});
  assert.deepEqual(normalizeConfig({ outputDir: "C:\\private" }), {});
  assert.deepEqual(normalizeConfig({ outputDir: "/private" }), {});
  assert.deepEqual(normalizeConfig({ outputDir: "docs/smart-reply" }), {
    outputDir: "docs/smart-reply",
  });
});
