import assert from "node:assert/strict";
import test from "node:test";

import { MODES } from "../hooks/lib/mode.mjs";
import {
  buildPromptSubmitResponse,
  buildStopResponse,
} from "../hooks/lib/policy.mjs";

const config = {
  enabled: true,
  language: "zh-CN",
  outputDir: "smart-reply",
  maxInlineChars: 3000,
};

test("disabled config injects no policy", () => {
  assert.deepEqual(
    buildPromptSubmitResponse({
      config: { ...config, enabled: false },
      mode: MODES.DEFAULT,
      outputDirectory: "D:\\project\\smart-reply\\session",
    }),
    {},
  );
});

test("off mode injects no policy", () => {
  assert.deepEqual(
    buildPromptSubmitResponse({
      config,
      mode: MODES.OFF,
      outputDirectory: "D:\\project\\smart-reply\\session",
    }),
    {},
  );
});

test("default mode injects language, target directory, and concise final reply rule", () => {
  const response = buildPromptSubmitResponse({
    config,
    mode: MODES.DEFAULT,
    outputDirectory: "D:\\project\\smart-reply\\session",
  });
  const context = response.hookSpecificOutput.additionalContext;
  assert.equal(response.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.match(context, /zh-CN/);
  assert.match(context, /D:\\project\\smart-reply\\session/);
  assert.match(context, /摘要、文档路径和必要下一步/);
});

test("doc mode explicitly requires a document", () => {
  const context = buildPromptSubmitResponse({
    config,
    mode: MODES.DOC,
    outputDirectory: "D:\\project\\smart-reply\\session",
  }).hookSpecificOutput.additionalContext;
  assert.match(context, /本轮必须生成文档/);
});

test("inline mode explicitly requires a complete inline reply and forbids a document", () => {
  const context = buildPromptSubmitResponse({
    config,
    mode: MODES.INLINE,
    outputDirectory: "D:\\project\\smart-reply\\session",
  }).hookSpecificOutput.additionalContext;
  assert.match(context, /必须直接在 CLI 完整回复/);
  assert.match(context, /禁止生成 Smart Reply 文档/);
});

test("allows when stop_hook_active is true", () => {
  assert.deepEqual(
    buildStopResponse({
      config,
      mode: MODES.DEFAULT,
      stopHookActive: true,
      lastAssistantMessage: "x".repeat(4000),
    }),
    {},
  );
});

test("allows when last_assistant_message is missing", () => {
  assert.deepEqual(
    buildStopResponse({
      config,
      mode: MODES.DEFAULT,
      stopHookActive: false,
      lastAssistantMessage: undefined,
    }),
    {},
  );
});

test("allows when config is disabled", () => {
  assert.deepEqual(
    buildStopResponse({
      config: { ...config, enabled: false },
      mode: MODES.DEFAULT,
      stopHookActive: false,
      lastAssistantMessage: "x".repeat(4000),
    }),
    {},
  );
});

test("allows for off or inline mode", () => {
  for (const mode of [MODES.OFF, MODES.INLINE]) {
    assert.deepEqual(
      buildStopResponse({
        config,
        mode,
        stopHookActive: false,
        lastAssistantMessage: "x".repeat(4000),
      }),
      {},
    );
  }
});

test("allows below maxInlineChars", () => {
  assert.deepEqual(
    buildStopResponse({
      config,
      mode: MODES.DEFAULT,
      stopHookActive: false,
      lastAssistantMessage: "x".repeat(3000),
    }),
    {},
  );
});

test("blocks one oversized final reply without echoing it", () => {
  const message = `PRIVATE-${"x".repeat(3000)}`;
  const response = buildStopResponse({
    config,
    mode: MODES.DEFAULT,
    stopHookActive: false,
    lastAssistantMessage: message,
  });
  assert.equal(response.decision, "block");
  assert.match(response.reason, /最终回复过长/);
  assert.doesNotMatch(JSON.stringify(response), /PRIVATE-/);
});
