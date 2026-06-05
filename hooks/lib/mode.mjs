export const MODES = Object.freeze({
  DEFAULT: "default",
  DOC: "doc",
  INLINE: "inline",
  OFF: "off",
});

const MARKERS = Object.freeze({
  [MODES.DOC]: /\[smart-reply:doc\]/i,
  [MODES.INLINE]: /\[smart-reply:inline\]/i,
  [MODES.OFF]: /\[smart-reply:off\]/i,
});

export function parseMode(userPrompt = "") {
  const prompt = typeof userPrompt === "string" ? userPrompt : "";
  if (MARKERS[MODES.OFF].test(prompt)) {
    return MODES.OFF;
  }
  if (MARKERS[MODES.INLINE].test(prompt)) {
    return MODES.INLINE;
  }
  if (MARKERS[MODES.DOC].test(prompt)) {
    return MODES.DOC;
  }
  return MODES.DEFAULT;
}
