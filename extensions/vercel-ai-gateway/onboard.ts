import {
  applyAgentDefaultModelPrimary,
  type kairosConfig,
} from "kairos/plugin-sdk/provider-onboard";

export const VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF = "vercel-ai-gateway/anthropic/kairos-apple-4.6";

export function applyVercelAiGatewayProviderConfig(cfg: kairosConfig): kairosConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF] = {
    ...models[VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF],
    alias: models[VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF]?.alias ?? "Vercel AI Gateway",
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
  };
}

export function applyVercelAiGatewayConfig(cfg: kairosConfig): kairosConfig {
  return applyAgentDefaultModelPrimary(
    applyVercelAiGatewayProviderConfig(cfg),
    VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF,
  );
}
