import {
  getRuntimeConfigSnapshot,
  getRuntimeConfigSourceSnapshot,
} from "../config/runtime-snapshot.js";
import type { kairosConfig } from "../config/types.kairos.js";

export function resolvePluginActivationSourceConfig(params: {
  config?: kairosConfig;
  activationSourceConfig?: kairosConfig;
}): kairosConfig {
  if (params.activationSourceConfig !== undefined) {
    return params.activationSourceConfig;
  }
  const sourceSnapshot = getRuntimeConfigSourceSnapshot();
  if (sourceSnapshot && params.config === getRuntimeConfigSnapshot()) {
    return sourceSnapshot;
  }
  return params.config ?? {};
}
