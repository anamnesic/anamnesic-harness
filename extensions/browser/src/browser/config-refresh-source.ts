import { getRuntimeConfig, type kairosConfig } from "../config/config.js";

export function loadBrowserConfigForRuntimeRefresh(): kairosConfig {
  return getRuntimeConfig();
}
