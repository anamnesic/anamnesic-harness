import type { kairosConfig } from "kairos/plugin-sdk/config-types";
import {
  normalizeResolvedSecretInputString,
  normalizeSecretInput,
} from "kairos/plugin-sdk/secret-input";
import { normalizeOptionalString } from "kairos/plugin-sdk/text-runtime";

export const DEFAULT_TAVILY_BASE_URL = "https://api.tavily.com";
export const DEFAULT_TAVILY_SEARCH_TIMEOUT_SECONDS = 30;
export const DEFAULT_TAVILY_EXTRACT_TIMEOUT_SECONDS = 60;

type TavilySearchConfig =
  | {
      apiKey?: unknown;
      baseUrl?: string;
    }
  | undefined;

type PluginEntryConfig = {
  webSearch?: {
    apiKey?: unknown;
    baseUrl?: string;
  };
};

export function resolveTavilySearchConfig(cfg?: kairosConfig): TavilySearchConfig {
  const pluginConfig = cfg?.plugins?.entries?.tavily?.config as PluginEntryConfig;
  const pluginWebSearch = pluginConfig?.webSearch;
  if (pluginWebSearch && typeof pluginWebSearch === "object" && !Array.isArray(pluginWebSearch)) {
    return pluginWebSearch;
  }
  return undefined;
}

function normalizeConfiguredSecret(value: unknown, path: string): string | undefined {
  return normalizeSecretInput(
    normalizeResolvedSecretInputString({
      value,
      path,
    }),
  );
}

export function resolveTavilyApiKey(cfg?: kairosConfig): string | undefined {
  const search = resolveTavilySearchConfig(cfg);
  return (
    normalizeConfiguredSecret(search?.apiKey, "plugins.entries.tavily.config.webSearch.apiKey") ||
    normalizeSecretInput(process.env.TAVILY_API_KEY) ||
    undefined
  );
}

export function resolveTavilyBaseUrl(cfg?: kairosConfig): string {
  const search = resolveTavilySearchConfig(cfg);
  const configured =
    (normalizeOptionalString(search?.baseUrl) ?? "") ||
    normalizeSecretInput(process.env.TAVILY_BASE_URL) ||
    "";
  return configured || DEFAULT_TAVILY_BASE_URL;
}

export function resolveTavilySearchTimeoutSeconds(override?: number): number {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return Math.floor(override);
  }
  return DEFAULT_TAVILY_SEARCH_TIMEOUT_SECONDS;
}

export function resolveTavilyExtractTimeoutSeconds(override?: number): number {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return Math.floor(override);
  }
  return DEFAULT_TAVILY_EXTRACT_TIMEOUT_SECONDS;
}
