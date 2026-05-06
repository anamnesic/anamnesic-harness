import type { ModelCatalogEntry } from "kairos/plugin-sdk/agent-runtime";
import type { ProviderRuntimeModel } from "kairos/plugin-sdk/plugin-entry";
import { normalizeModelCompat } from "kairos/plugin-sdk/provider-model-shared";

const PROVIDER_ID = "kairos-go";

export const kairos_GO_OPENAI_BASE_URL = "https://kairos.ai/zen/go/v1";
export const kairos_GO_ANTHROPIC_BASE_URL = "https://kairos.ai/zen/go";

const kairos_GO_SUPPLEMENTAL_MODELS = (
  [
    {
      id: "deepseek-v4-pro",
      name: "DeepSeek V4 Pro",
      api: "openai-completions",
      provider: PROVIDER_ID,
      baseUrl: kairos_GO_OPENAI_BASE_URL,
      reasoning: true,
      input: ["text"],
      cost: {
        input: 1.74,
        output: 3.48,
        cacheRead: 0.145,
        cacheWrite: 0,
      },
      contextWindow: 1_000_000,
      maxTokens: 384_000,
      compat: {
        supportsUsageInStreaming: true,
        supportsReasoningEffort: true,
        maxTokensField: "max_tokens",
      },
    },
    {
      id: "deepseek-v4-flash",
      name: "DeepSeek V4 Flash",
      api: "openai-completions",
      provider: PROVIDER_ID,
      baseUrl: kairos_GO_OPENAI_BASE_URL,
      reasoning: true,
      input: ["text"],
      cost: {
        input: 0.14,
        output: 0.28,
        cacheRead: 0.028,
        cacheWrite: 0,
      },
      contextWindow: 1_000_000,
      maxTokens: 384_000,
      compat: {
        supportsUsageInStreaming: true,
        supportsReasoningEffort: true,
        maxTokensField: "max_tokens",
      },
    },
  ] satisfies ProviderRuntimeModel[]
).map((model) => normalizeModelCompat(model));

export function listkairosGoSupplementalModelCatalogEntries(): ModelCatalogEntry[] {
  return kairos_GO_SUPPLEMENTAL_MODELS.map((model) => ({
    provider: model.provider,
    id: model.id,
    name: model.name,
    reasoning: model.reasoning,
    input: model.input,
    contextWindow: model.contextWindow,
  }));
}

export function resolvekairosGoSupplementalModel(
  modelId: string,
): ProviderRuntimeModel | undefined {
  const normalizedModelId = modelId.trim().toLowerCase();
  return kairos_GO_SUPPLEMENTAL_MODELS.find((model) => model.id === normalizedModelId);
}

function normalizeBaseUrl(baseUrl: string | undefined): string {
  return (baseUrl ?? "").trim().replace(/\/+$/, "");
}

export function normalizekairosGoBaseUrl(params: {
  api?: string | null;
  baseUrl?: string;
}): string | undefined {
  const normalized = normalizeBaseUrl(params.baseUrl);
  if (!normalized) {
    return undefined;
  }
  if (normalized === kairos_GO_OPENAI_BASE_URL) {
    return kairos_GO_OPENAI_BASE_URL;
  }
  if (normalized === kairos_GO_ANTHROPIC_BASE_URL) {
    return kairos_GO_ANTHROPIC_BASE_URL;
  }
  if (normalized === "https://kairos.ai/go") {
    return kairos_GO_ANTHROPIC_BASE_URL;
  }
  if (normalized === "https://kairos.ai/go/v1") {
    return params.api === "anthropic-messages"
      ? kairos_GO_ANTHROPIC_BASE_URL
      : kairos_GO_OPENAI_BASE_URL;
  }
  return undefined;
}
