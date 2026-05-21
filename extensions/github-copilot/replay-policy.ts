import { normalizeLowercaseStringOrEmpty } from "kairos/plugin-sdk/text-runtime";

export function buildGithubCopilotReplayPolicy(modelId?: string) {
  return normalizeLowercaseStringOrEmpty(modelId).includes("kairos")
    ? {
        dropThinkingBlocks: true,
      }
    : {};
}
