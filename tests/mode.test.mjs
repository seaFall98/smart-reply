import assert from "node:assert/strict";
import test from "node:test";

import { MODES, parseMode } from "../hooks/lib/mode.mjs";

test("returns default mode without markers", () => {
  assert.equal(parseMode("请解释这个问题"), MODES.DEFAULT);
});

test("recognizes doc marker case-insensitively", () => {
  assert.equal(parseMode("[SMART-REPLY:DOC] 写成文档"), MODES.DOC);
});

test("inline overrides doc", () => {
  assert.equal(
    parseMode("[smart-reply:doc] [smart-reply:inline]"),
    MODES.INLINE,
  );
});

test("off overrides inline and doc", () => {
  assert.equal(
    parseMode(
      "[smart-reply:doc] [smart-reply:inline] [smart-reply:off]",
    ),
    MODES.OFF,
  );
});

test("does not treat similar prose as a marker", () => {
  assert.equal(parseMode("smart-reply:doc"), MODES.DEFAULT);
  assert.equal(parseMode("[smart-reply:document]"), MODES.DEFAULT);
});
