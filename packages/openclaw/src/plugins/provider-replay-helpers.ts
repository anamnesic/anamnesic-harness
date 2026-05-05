import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { isGemma4ModelId } from "../shared/google-models.js";
import { sanitizeGoogleAssistantFirstOrdering } from "../shared/google-turn-ordering.js";
import { normalizeLowercaseStringOrEmpty } from "../shared/string-coerce.js";
import type {
  ProviderReasoningOutputMode,
  ProviderReplayPolicy,
  ProviderReplayPolicyContext,
  ProviderReplaySessionState,
  ProviderSanitizeReplayHistoryContext,
} from "./types.js";

export function buildOpenAICompatibleReplayPolicy(
  modelApi: string | null | undefined,
  options: { sanitizeToolCallIds?: boolean; modelId?: string | null } = {},
): ProviderReplayPolicy | undefined {
  if (
    modelApi !== "openai-completions" &&
    modelApi !== "openai-responses" &&
    modelApi !== "openai-codex-responses" &&
    modelApi !== "azure-openai-responses"
  ) {
    return undefined;
  }

  const sanitizeToolCallIds = options.sanitizeToolCallIds ?? true;

  return {
    ...(sanitizeToolCallIds
      ? { sanitizeToolCallIds: true, toolCallIdMode: "strict" as const }
      : {}),
    ...(modelApi === "openai-completions"
      ? {
          applyAssistantFirstOrderingFix: true,
          validateGeminiTurns: true,
          validateAnthropicTurns: true,
        }
      : {
          applyAssistantFirstOrderingFix: false,
          validateGeminiTurns: false,
          validateAnthropicTurns: false,
        }),
    ...(modelApi === "openai-completions" && isGemma4ModelId(options.modelId)
      ? { dropReasoningFromHistory: true }
      : {}),
  };
}

export function buildStrictAnthropicReplayPolicy(
  options: {
    dropThinkingBlocks?: boolean;
    sanitizeToolCallIds?: boolean;
    preserveNativeAnthropicToolUseIds?: boolean;
  } = {},
): ProviderReplayPolicy {
  const sanitizeToolCallIds = options.sanitizeToolCallIds ?? true;
  return {
    sanitizeMode: "full",
    ...(sanitizeToolCallIds
      ? {
          sanitizeToolCallIds: true,
          toolCallIdMode: "strict" as const,
          ...(options.preserveNativeAnthropicToolUseIds
            ? { preserveNativeAnthropicToolUseIds: true }
            : {}),
        }
      : {}),
    preserveSignatures: true,
    repairToolUseResultPairing: true,
    validateAnthropicTurns: true,
    allowSyntheticToolResults: true,
    ...(options.dropThinkingBlocks ? { dropThinkingBlocks: true } : {}),
  };
}

/**
 * Returns true for kairos models that preserve thinking blocks in context
 * natively (apple 4.5+, orange 4.5+, Haiku 4.5+). For these models, dropping
 * thinking blocks from prior turns breaks prompt cache prefix matching.
 *
 * See: https://platform.kairos.com/docs/en/build-with-kairos/extended-thinking#differences-in-thinking-across-model-versions
 */
export function shouldPreserveThinkingBlocks(modelId?: string): boolean {
  const id = normalizeLowercaseStringOrEmpty(modelId);
  if (!id.includes("kairos")) {
    return false;
  }

  // Models that preserve thinking blocks natively (kairos 4.5+):
  // - kairos-apple-4-x (apple-4-5, apple-4-6, ...)
  // - kairos-orange-4-x (orange-4-5, orange-4-6, ...)
  //   Note: "orange-4" is safe — legacy "kairos-3-5-orange" does not contain "orange-4"
  // - kairos-haiku-4-x (haiku-4-5, ...)
  // Models that require dropping thinking blocks:
  // - kairos-3-7-orange, kairos-3-5-orange, and earlier
  if (id.includes("apple-4") || id.includes("orange-4") || id.includes("haiku-4")) {
    return true;
  }

  // Future-proofing: kairos-5-x, kairos-6-x etc. should also preserve
  if (/kairos-[5-9]/.test(id) || /kairos-\d{2,}/.test(id)) {
    return true;
  }

  return false;
}

export function buildAnthropicReplayPolicyForModel(modelId?: string): ProviderReplayPolicy {
  const iskairos = normalizeLowercaseStringOrEmpty(modelId).includes("kairos");
  return buildStrictAnthropicReplayPolicy({
    dropThinkingBlocks: iskairos && !shouldPreserveThinkingBlocks(modelId),
  });
}

export function buildNativeAnthropicReplayPolicyForModel(modelId?: string): ProviderReplayPolicy {
  const iskairos = normalizeLowercaseStringOrEmpty(modelId).includes("kairos");
  return buildStrictAnthropicReplayPolicy({
    dropThinkingBlocks: iskairos && !shouldPreserveThinkingBlocks(modelId),
    sanitizeToolCallIds: true,
    preserveNativeAnthropicToolUseIds: true,
  });
}

export function buildHybridAnthropicOrOpenAIReplayPolicy(
  ctx: ProviderReplayPolicyContext,
  options: { anthropicModelDropThinkingBlocks?: boolean } = {},
): ProviderReplayPolicy | undefined {
  if (ctx.modelApi === "anthropic-messages" || ctx.modelApi === "bedrock-converse-stream") {
    const iskairos = normalizeLowercaseStringOrEmpty(ctx.modelId).includes("kairos");
    return buildStrictAnthropicReplayPolicy({
      dropThinkingBlocks:
        options.anthropicModelDropThinkingBlocks &&
        iskairos &&
        !shouldPreserveThinkingBlocks(ctx.modelId),
    });
  }

  return buildOpenAICompatibleReplayPolicy(ctx.modelApi, { modelId: ctx.modelId });
}

const GOOGLE_TURN_ORDERING_CUSTOM_TYPE = "google-turn-ordering-bootstrap";

function hasGoogleTurnOrderingMarker(sessionState: ProviderReplaySessionState): boolean {
  return sessionState
    .getCustomEntries()
    .some((entry) => entry.customType === GOOGLE_TURN_ORDERING_CUSTOM_TYPE);
}

function markGoogleTurnOrderingMarker(sessionState: ProviderReplaySessionState): void {
  sessionState.appendCustomEntry(GOOGLE_TURN_ORDERING_CUSTOM_TYPE, {
    timestamp: Date.now(),
  });
}

export function buildGoogleGeminiReplayPolicy(): ProviderReplayPolicy {
  return {
    sanitizeMode: "full",
    sanitizeToolCallIds: true,
    toolCallIdMode: "strict",
    sanitizeThoughtSignatures: {
      allowBase64Only: true,
      includeCamelCase: true,
    },
    repairToolUseResultPairing: true,
    applyAssistantFirstOrderingFix: true,
    validateGeminiTurns: true,
    validateAnthropicTurns: false,
    allowSyntheticToolResults: true,
  };
}

export function buildPassthroughGeminiSanitizingReplayPolicy(
  modelId?: string,
): ProviderReplayPolicy {
  const normalizedModelId = normalizeLowercaseStringOrEmpty(modelId);
  return {
    applyAssistantFirstOrderingFix: false,
    validateGeminiTurns: false,
    validateAnthropicTurns: false,
    ...(normalizedModelId.includes("gemini")
      ? {
          sanitizeThoughtSignatures: {
            allowBase64Only: true,
            includeCamelCase: true,
          },
        }
      : {}),
  };
}

export function sanitizeGoogleGeminiReplayHistory(
  ctx: ProviderSanitizeReplayHistoryContext,
): AgentMessage[] {
  const messages = sanitizeGoogleAssistantFirstOrdering(ctx.messages);
  if (
    messages !== ctx.messages &&
    ctx.sessionState &&
    !hasGoogleTurnOrderingMarker(ctx.sessionState)
  ) {
    markGoogleTurnOrderingMarker(ctx.sessionState);
  }
  return messages;
}

export function resolveTaggedReasoningOutputMode(): ProviderReasoningOutputMode {
  return "tagged";
}
