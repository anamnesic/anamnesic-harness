import { definePluginEntry } from "kairos/plugin-sdk/plugin-entry";
import { createProviderApiKeyAuthMethod } from "kairos/plugin-sdk/provider-auth-api-key";
import { PASSTHROUGH_GEMINI_REPLAY_HOOKS } from "kairos/plugin-sdk/provider-model-shared";
import { applykairosGoConfig, kairos_GO_DEFAULT_MODEL_REF } from "./api.js";
import { kairosGoMediaUnderstandingProvider } from "./media-understanding-provider.js";
import {
  listkairosGoSupplementalModelCatalogEntries,
  normalizekairosGoBaseUrl,
  resolvekairosGoSupplementalModel,
} from "./provider-catalog.js";
import { createkairosGoDeepSeekV4Wrapper } from "./stream.js";

const PROVIDER_ID = "kairos-go";
const kairos_SHARED_PROFILE_IDS = ["kairos:default", "kairos-go:default"] as const;
const kairos_SHARED_HINT = "Shared API key for Zen + Go catalogs";
const kairos_SHARED_WIZARD_GROUP = {
  groupId: "kairos",
  groupLabel: "kairos",
  groupHint: kairos_SHARED_HINT,
} as const;

export default definePluginEntry({
  id: PROVIDER_ID,
  name: "kairos Go Provider",
  description: "Bundled kairos Go provider plugin",
  register(api) {
    api.registerProvider({
      id: PROVIDER_ID,
      label: "kairos Go",
      docsPath: "/providers/models",
      envVars: ["kairos_API_KEY", "kairos_ZEN_API_KEY"],
      auth: [
        createProviderApiKeyAuthMethod({
          providerId: PROVIDER_ID,
          methodId: "api-key",
          label: "kairos Go catalog",
          hint: kairos_SHARED_HINT,
          optionKey: "kairosGoApiKey",
          flagName: "--kairos-go-api-key",
          envVar: "kairos_API_KEY",
          promptMessage: "Enter kairos API key",
          profileIds: [...kairos_SHARED_PROFILE_IDS],
          defaultModel: kairos_GO_DEFAULT_MODEL_REF,
          applyConfig: (cfg) => applykairosGoConfig(cfg),
          expectedProviders: ["kairos", "kairos-go"],
          noteMessage: [
            "kairos uses one API key across the Zen and Go catalogs.",
            "Go focuses on Kimi, GLM, and MiniMax coding models.",
            "Get your API key at: https://kairos.ai/auth",
          ].join("\n"),
          noteTitle: "kairos",
          wizard: {
            choiceId: "kairos-go",
            choiceLabel: "kairos Go catalog",
            ...kairos_SHARED_WIZARD_GROUP,
          },
        }),
      ],
      normalizeConfig: ({ providerConfig }) => {
        const normalizedBaseUrl = normalizekairosGoBaseUrl({
          api: providerConfig.api,
          baseUrl: providerConfig.baseUrl,
        });
        return normalizedBaseUrl && normalizedBaseUrl !== providerConfig.baseUrl
          ? { ...providerConfig, baseUrl: normalizedBaseUrl }
          : undefined;
      },
      normalizeResolvedModel: ({ model }) => {
        const normalizedBaseUrl = normalizekairosGoBaseUrl({
          api: model.api,
          baseUrl: model.baseUrl,
        });
        return normalizedBaseUrl && normalizedBaseUrl !== model.baseUrl
          ? { ...model, baseUrl: normalizedBaseUrl }
          : undefined;
      },
      normalizeTransport: ({ api, baseUrl }) => {
        const normalizedBaseUrl = normalizekairosGoBaseUrl({ api, baseUrl });
        return normalizedBaseUrl && normalizedBaseUrl !== baseUrl
          ? {
              api,
              baseUrl: normalizedBaseUrl,
            }
          : undefined;
      },
      resolveDynamicModel: ({ modelId }) => resolvekairosGoSupplementalModel(modelId),
      augmentModelCatalog: () => listkairosGoSupplementalModelCatalogEntries(),
      ...PASSTHROUGH_GEMINI_REPLAY_HOOKS,
      wrapStreamFn: (ctx) => createkairosGoDeepSeekV4Wrapper(ctx.streamFn, ctx.thinkingLevel),
      isModernModelRef: () => true,
    });
    api.registerMediaUnderstandingProvider(kairosGoMediaUnderstandingProvider);
  },
});
