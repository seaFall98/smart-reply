import { MODES } from "./mode.mjs";

export function buildPromptSubmitResponse({ config, mode, outputDirectory }) {
  if (!config.enabled || mode === MODES.OFF) {
    return {};
  }

  let modeInstruction =
    "判断本轮是否属于有长期价值的长篇内容；如属于，请使用 smart-reply Skill 写成文档。";
  if (mode === MODES.DOC) {
    modeInstruction = "本轮必须生成文档，并遵循 smart-reply Skill。";
  } else if (mode === MODES.INLINE) {
    modeInstruction =
      "本轮必须直接在 CLI 完整回复，禁止生成 Smart Reply 文档；最终回复长度限制不适用。";
  }

  const additionalContext = [
    "Smart Reply policy:",
    modeInstruction,
    `用户可读文档目标语言：${config.language}。`,
    `文档目标目录：${outputDirectory}。`,
    "生成文档时，最终回复仅保留摘要、文档路径和必要下一步。",
    "不要保存密钥、令牌、环境变量值或原始 transcript。",
  ].join("\n");

  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  };
}

export function buildStopResponse({
  config,
  mode,
  stopHookActive,
  lastAssistantMessage,
}) {
  if (
    !config.enabled ||
    stopHookActive === true ||
    mode === MODES.OFF ||
    mode === MODES.INLINE ||
    typeof lastAssistantMessage !== "string" ||
    lastAssistantMessage.length <= config.maxInlineChars
  ) {
    return {};
  }

  return {
    decision: "block",
    reason:
      "本轮最终回复过长。请将有长期价值的完整内容整理为 Smart Reply 文档，并把最终回复缩短为摘要、文档路径和必要下一步。",
    systemMessage: "Smart Reply 已要求缩短最终回复。",
  };
}
