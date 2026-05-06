import {
  applyAgentDefaultModelPrimary,
  resolveAgentModelPrimaryValue,
} from "kairos/plugin-sdk/provider-onboard";
import { kairos_GO_DEFAULT_MODEL_REF } from "./onboard.js";

export {
  applykairosGoConfig,
  applykairosGoProviderConfig,
  kairos_GO_DEFAULT_MODEL_REF,
} from "./onboard.js";

export function applykairosGoModelDefault(
  cfg: import("kairos/plugin-sdk/provider-onboard").kairosConfig,
): {
  next: import("kairos/plugin-sdk/provider-onboard").kairosConfig;
  changed: boolean;
} {
  const current = resolveAgentModelPrimaryValue(cfg.agents?.defaults?.model);
  if (current === kairos_GO_DEFAULT_MODEL_REF) {
    return { next: cfg, changed: false };
  }
  return {
    next: applyAgentDefaultModelPrimary(cfg, kairos_GO_DEFAULT_MODEL_REF),
    changed: true,
  };
}
