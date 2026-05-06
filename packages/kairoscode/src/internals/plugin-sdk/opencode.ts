import { createProviderApiKeyAuthMethod, type OpenClawConfig } from "./provider-auth-api-key.js";

export { applykairosZenModelDefault, kairos_ZEN_DEFAULT_MODEL } from "./provider-onboard.js";

const kairos_SHARED_PROFILE_IDS = ["kairos:default", "kairos-go:default"] as const;
const kairos_SHARED_HINT = "Shared API key for Zen + Go catalogs";
const kairos_SHARED_WIZARD_GROUP = {
  groupId: "kairos",
  groupLabel: "kairos",
  groupHint: kairos_SHARED_HINT,
} as const;

export function createkairosCatalogApiKeyAuthMethod(params: {
  providerId: string;
  label: string;
  optionKey: string;
  flagName: `--${string}`;
  defaultModel: string;
  applyConfig: (cfg: OpenClawConfig) => OpenClawConfig;
  noteMessage: string;
  choiceId: string;
  choiceLabel: string;
}) {
  return createProviderApiKeyAuthMethod({
    providerId: params.providerId,
    methodId: "api-key",
    label: params.label,
    hint: kairos_SHARED_HINT,
    optionKey: params.optionKey,
    flagName: params.flagName,
    envVar: "kairos_API_KEY",
    promptMessage: "Enter kairos API key",
    profileIds: [...kairos_SHARED_PROFILE_IDS],
    defaultModel: params.defaultModel,
    expectedProviders: ["kairos", "kairos-go"],
    applyConfig: params.applyConfig,
    noteMessage: params.noteMessage,
    noteTitle: "kairos",
    wizard: {
      choiceId: params.choiceId,
      choiceLabel: params.choiceLabel,
      ...kairos_SHARED_WIZARD_GROUP,
    },
  });
}
