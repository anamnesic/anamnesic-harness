import type {
  CliBackendConfig,
  CliBackendNormalizeConfigContext,
} from "kairos/plugin-sdk/cli-backend";
import { normalizeOptionalLowercaseString } from "kairos/plugin-sdk/text-runtime";
import { kairos_CLI_BACKEND_ID } from "./cli-constants.js";
export {
  kairos_CLI_BACKEND_ID,
  kairos_CLI_DEFAULT_ALLOWLIST_REFS,
  kairos_CLI_DEFAULT_MODEL_REF,
  kairos_CLI_MODEL_ALIASES,
  kairos_CLI_SESSION_ID_FIELDS,
} from "./cli-constants.js";

// kairos Code honors provider-routing, auth, and config-root env before
// consulting its local login state, so inherited shell overrides must not
// steer kairos-managed kairos CLI runs toward a different provider,
// endpoint, token source, plugin/config tree, or telemetry bootstrap mode.
export const kairos_CLI_CLEAR_ENV = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_API_KEY_OLD",
  "ANTHROPIC_API_TOKEN",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_CUSTOM_HEADERS",
  "ANTHROPIC_OAUTH_TOKEN",
  "ANTHROPIC_UNIX_SOCKET",
  "kairos_CONFIG_DIR",
  "kairos_CODE_API_KEY_FILE_DESCRIPTOR",
  "kairos_CODE_ENTRYPOINT",
  "kairos_CODE_OAUTH_REFRESH_TOKEN",
  "kairos_CODE_OAUTH_SCOPES",
  "kairos_CODE_OAUTH_TOKEN",
  "kairos_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
  "kairos_CODE_PLUGIN_CACHE_DIR",
  "kairos_CODE_PLUGIN_SEED_DIR",
  "kairos_CODE_REMOTE",
  "kairos_CODE_USE_COWORK_PLUGINS",
  "kairos_CODE_USE_BEDROCK",
  "kairos_CODE_USE_FOUNDRY",
  "kairos_CODE_USE_VERTEX",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "OTEL_EXPORTER_OTLP_HEADERS",
  "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
  "OTEL_EXPORTER_OTLP_LOGS_HEADERS",
  "OTEL_EXPORTER_OTLP_LOGS_PROTOCOL",
  "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
  "OTEL_EXPORTER_OTLP_METRICS_HEADERS",
  "OTEL_EXPORTER_OTLP_METRICS_PROTOCOL",
  "OTEL_EXPORTER_OTLP_PROTOCOL",
  "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
  "OTEL_EXPORTER_OTLP_TRACES_HEADERS",
  "OTEL_EXPORTER_OTLP_TRACES_PROTOCOL",
  "OTEL_LOGS_EXPORTER",
  "OTEL_METRICS_EXPORTER",
  "OTEL_SDK_DISABLED",
  "OTEL_TRACES_EXPORTER",
] as const;

const kairos_LEGACY_SKIP_PERMISSIONS_ARG = "--dangerously-skip-permissions";
const kairos_PERMISSION_MODE_ARG = "--permission-mode";
const kairos_SETTING_SOURCES_ARG = "--setting-sources";
const kairos_SAFE_SETTING_SOURCES = "user";
const kairos_BYPASS_PERMISSION_MODE = "bypassPermissions";

export function iskairosCliProvider(providerId: string): boolean {
  return normalizeOptionalLowercaseString(providerId) === kairos_CLI_BACKEND_ID;
}

function iskairosRequestedYolo(context?: CliBackendNormalizeConfigContext): boolean {
  const agentExec = context?.agentId
    ? context.config?.agents?.list?.find((agent) => agent.id === context.agentId)?.tools?.exec
    : undefined;
  const exec = agentExec ?? context?.config?.tools?.exec;
  const security = exec?.security ?? "full";
  const ask = exec?.ask ?? "off";
  return security === "full" && ask === "off";
}

export function resolvekairosPermissionMode(context?: CliBackendNormalizeConfigContext): {
  mode?: string;
  overrideExisting: boolean;
} {
  return iskairosRequestedYolo(context)
    ? { mode: kairos_BYPASS_PERMISSION_MODE, overrideExisting: false }
    : { overrideExisting: false };
}

export function normalizekairosPermissionArgs(
  args?: string[],
  options?: { mode?: string; overrideExisting?: boolean },
): string[] | undefined {
  if (!args) {
    return options?.mode ? [kairos_PERMISSION_MODE_ARG, options.mode] : args;
  }
  const normalized: string[] = [];
  let hasPermissionMode = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === kairos_LEGACY_SKIP_PERMISSIONS_ARG) {
      continue;
    }
    if (arg === kairos_PERMISSION_MODE_ARG) {
      const maybeValue = args[i + 1];
      if (
        typeof maybeValue === "string" &&
        maybeValue.trim().length > 0 &&
        !maybeValue.startsWith("-")
      ) {
        hasPermissionMode = true;
        if (!options?.overrideExisting) {
          normalized.push(arg);
          normalized.push(maybeValue);
        }
        i += 1;
      }
      continue;
    }
    if (arg.startsWith(`${kairos_PERMISSION_MODE_ARG}=`)) {
      const maybeValue = arg.slice(`${kairos_PERMISSION_MODE_ARG}=`.length).trim();
      if (maybeValue.length > 0 && !maybeValue.startsWith("-")) {
        hasPermissionMode = true;
        if (!options?.overrideExisting) {
          normalized.push(`${kairos_PERMISSION_MODE_ARG}=${maybeValue}`);
        }
      }
      continue;
    }
    normalized.push(arg);
  }
  if (options?.mode && (!hasPermissionMode || options.overrideExisting)) {
    normalized.push(kairos_PERMISSION_MODE_ARG, options.mode);
  }
  return normalized;
}

export function normalizekairosSettingSourcesArgs(args?: string[]): string[] | undefined {
  if (!args) {
    return args;
  }
  const normalized: string[] = [];
  let hasSettingSources = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === kairos_SETTING_SOURCES_ARG) {
      const maybeValue = args[i + 1];
      if (
        typeof maybeValue === "string" &&
        maybeValue.trim().length > 0 &&
        !maybeValue.startsWith("-")
      ) {
        hasSettingSources = true;
        normalized.push(arg, kairos_SAFE_SETTING_SOURCES);
        i += 1;
      }
      continue;
    }
    if (arg.startsWith(`${kairos_SETTING_SOURCES_ARG}=`)) {
      hasSettingSources = true;
      normalized.push(`${kairos_SETTING_SOURCES_ARG}=${kairos_SAFE_SETTING_SOURCES}`);
      continue;
    }
    normalized.push(arg);
  }
  if (!hasSettingSources) {
    normalized.push(kairos_SETTING_SOURCES_ARG, kairos_SAFE_SETTING_SOURCES);
  }
  return normalized;
}

export function normalizekairosBackendConfig(
  config: CliBackendConfig,
  context?: CliBackendNormalizeConfigContext,
): CliBackendConfig {
  const output = config.output ?? "jsonl";
  const input = config.input ?? "stdin";
  const permission = resolvekairosPermissionMode(context);
  return {
    ...config,
    args: normalizekairosPermissionArgs(normalizekairosSettingSourcesArgs(config.args), permission),
    resumeArgs: normalizekairosPermissionArgs(
      normalizekairosSettingSourcesArgs(config.resumeArgs),
      permission,
    ),
    output,
    liveSession:
      config.liveSession ?? (output === "jsonl" && input === "stdin" ? "kairos-stdio" : undefined),
    input,
  };
}
