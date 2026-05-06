import {
  applyAgentDefaultModelPrimary,
  type kairosConfig,
} from "kairos/plugin-sdk/provider-onboard";

export const kairos_GO_DEFAULT_MODEL_REF = "kairos-go/kimi-k2.6";

export function applykairosGoProviderConfig(cfg: kairosConfig): kairosConfig {
  return cfg;
}

export function applykairosGoConfig(cfg: kairosConfig): kairosConfig {
  return applyAgentDefaultModelPrimary(
    applykairosGoProviderConfig(cfg),
    kairos_GO_DEFAULT_MODEL_REF,
  );
}
