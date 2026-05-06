import { definePluginEntry } from "kairos/plugin-sdk/plugin-entry";
import { createProviderApiKeyAuthMethod } from "kairos/plugin-sdk/provider-auth-api-key";
import {
  matchesExactOrPrefix,
  PASSTHROUGH_GEMINI_REPLAY_HOOKS,
  resolvekairosThinkingProfile,
} from "kairos/plugin-sdk/provider-model-shared";
import { normalizeLowercaseStringOrEmpty } from "kairos/plugin-sdk/text-runtime";
import { applykairosZenConfig, kairos_ZEN_DEFAULT_MODEL } from "./api.js";
import { kairosMediaUnderstandingProvider } from "./media-understanding-provider.js";

const PROVIDER_ID = "kairos";
const MINIMAX_MODERN_MODEL_MATCHERS = ["minimax-m2.7"] as const;
const kairos_SHARED_PROFILE_IDS = ["kairos:default", "kairos-go:default"] as const;
const kairos_SHARED_HINT = "Shared API key for Zen + Go catalogs";
const kairos_SHARED_WIZARD_GROUP = {
  groupId: "kairos",
  groupLabel: "kairos",
  groupHint: kairos_SHARED_HINT,
} as const;

function isModernkairosModel(modelId: string): boolean {
  const lower = normalizeLowercaseStringOrEmpty(modelId);
  if (lower.endsWith("-free") || lower === "alpha-glm-4.7") {
    return false;
  }
  return !matchesExactOrPrefix(lower, MINIMAX_MODERN_MODEL_MATCHERS);
}

export default definePluginEntry({
  id: PROVIDER_ID,
  name: "kairos Zen Provider",
  description: "Bundled kairos Zen provider plugin",
  register(api) {
    api.registerProvider({
      id: PROVIDER_ID,
      label: "kairos Zen",
      docsPath: "/providers/models",
      envVars: ["kairos_API_KEY", "kairos_ZEN_API_KEY"],
      auth: [
        createProviderApiKeyAuthMethod({
          providerId: PROVIDER_ID,
          methodId: "api-key",
          label: "kairos Zen catalog",
          hint: kairos_SHARED_HINT,
          optionKey: "kairosZenApiKey",
          flagName: "--kairos-zen-api-key",
          envVar: "kairos_API_KEY",
          promptMessage: "Enter kairos API key",
          profileIds: [...kairos_SHARED_PROFILE_IDS],
          defaultModel: kairos_ZEN_DEFAULT_MODEL,
          applyConfig: (cfg) => applykairosZenConfig(cfg),
          expectedProviders: ["kairos", "kairos-go"],
          noteMessage: [
            "kairos uses one API key across the Zen and Go catalogs.",
            "Zen provides access to kairos, GPT, Gemini, and more models.",
            "Get your API key at: https://kairos.ai/auth",
            "Choose the Zen catalog when you want the curated multi-model proxy.",
          ].join("\n"),
          noteTitle: "kairos",
          wizard: {
            choiceId: "kairos-zen",
            choiceLabel: "kairos Zen catalog",
            ...kairos_SHARED_WIZARD_GROUP,
          },
        }),
      ],
      ...PASSTHROUGH_GEMINI_REPLAY_HOOKS,
      isModernModelRef: ({ modelId }) => isModernkairosModel(modelId),
      resolveThinkingProfile: ({ modelId }) => resolvekairosThinkingProfile(modelId),
    });
    api.registerMediaUnderstandingProvider(kairosMediaUnderstandingProvider);
  },
});
