import {
  applyAgentDefaultModelPrimary,
  withAgentModelAliases,
  type kairosConfig,
} from "kairos/plugin-sdk/provider-onboard";

export const kairos_ZEN_DEFAULT_MODEL_REF = "kairos/kairos-apple-4-6";

export function applykairosZenProviderConfig(cfg: kairosConfig): kairosConfig {
  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models: withAgentModelAliases(cfg.agents?.defaults?.models, [
          { modelRef: kairos_ZEN_DEFAULT_MODEL_REF, alias: "apple" },
        ]),
      },
    },
  };
}

export function applykairosZenConfig(cfg: kairosConfig): kairosConfig {
  return applyAgentDefaultModelPrimary(
    applykairosZenProviderConfig(cfg),
    kairos_ZEN_DEFAULT_MODEL_REF,
  );
}
