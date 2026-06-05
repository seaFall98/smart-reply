import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillPath = "skills/smart-reply/SKILL.md";

test("Smart Reply skill contains the required workflow and safety rules", async () => {
  const skill = await readFile(skillPath, "utf8");
  assert.match(skill, /^---\r?\n[\s\S]*name:\s*smart-reply[\s\S]*\r?\n---/);
  for (const category of [
    "完整方案",
    "详细分析",
    "审查报告",
    "复盘",
    "交接 Prompt",
    "多阶段计划",
  ]) {
    assert.match(skill, new RegExp(category));
  }
  assert.match(skill, /zh-CN/);
  assert.match(skill, /注入的目标目录/);
  assert.match(skill, /摘要、文档路径和必要下一步/);
  assert.match(skill, /不得覆盖/);
  assert.match(skill, /密钥|令牌/);
  assert.match(skill, /原始 transcript/);
  assert.match(skill, /\[smart-reply:doc\]/);
  assert.match(skill, /\[smart-reply:inline\]/);
  assert.match(skill, /\[smart-reply:off\]/);
  assert.match(skill, /必须直接在 CLI 完整回复，禁止生成 Smart Reply 文档/);
});
