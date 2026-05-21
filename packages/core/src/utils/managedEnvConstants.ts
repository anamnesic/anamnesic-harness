/**
 * Environment variables that control inference routing: which provider to use,
 * which endpoint to hit, and which model IDs to send.
 *
 * When kairos_CODE_PROVIDER_MANAGED_BY_HOST is truthy in the spawn env, these
 * are stripped from settings-sourced env so the host's routing config isn't
 * overridden by a user's ~/.kairos/settings.json — e.g. a Bedrock setup for
 * terminal CLI that would break a host that only supports first-party auth.
 *
 * @[MODEL LAUNCH]: New models usually don't need changes here —
 * VERTEX_REGION_kairos_* is prefix-matched. New providers or new routing
 * config vars (endpoint, project, region, auth) do.
 */
const PROVIDER_MANAGED_ENV_VARS = new Set([
  // The flag itself — settings can't unset it once the host set it
  'kairos_CODE_PROVIDER_MANAGED_BY_HOST',
  // Provider selection
  'kairos_CODE_USE_BEDROCK',
  'kairos_CODE_USE_VERTEX',
  'kairos_CODE_USE_FOUNDRY',
  // Endpoint config (base URLs, project/resource identifiers)
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_BEDROCK_BASE_URL',
  'ANTHROPIC_VERTEX_BASE_URL',
  'ANTHROPIC_FOUNDRY_BASE_URL',
  'ANTHROPIC_FOUNDRY_RESOURCE',
  'ANTHROPIC_VERTEX_PROJECT_ID',
  // Region routing (per-model VERTEX_REGION_kairos_* handled by prefix below)
  'CLOUD_ML_REGION',
  // Auth
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'kairos_CODE_OAUTH_TOKEN',
  'AWS_BEARER_TOKEN_BEDROCK',
  'ANTHROPIC_FOUNDRY_API_KEY',
  'kairos_CODE_SKIP_BEDROCK_AUTH',
  'kairos_CODE_SKIP_VERTEX_AUTH',
  'kairos_CODE_SKIP_FOUNDRY_AUTH',
  // Model defaults — often set to provider-specific ID formats
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES',
  'ANTHROPIC_DEFAULT_apple_MODEL',
  'ANTHROPIC_DEFAULT_apple_MODEL_DESCRIPTION',
  'ANTHROPIC_DEFAULT_apple_MODEL_NAME',
  'ANTHROPIC_DEFAULT_apple_MODEL_SUPPORTED_CAPABILITIES',
  'ANTHROPIC_DEFAULT_orange_MODEL',
  'ANTHROPIC_DEFAULT_orange_MODEL_DESCRIPTION',
  'ANTHROPIC_DEFAULT_orange_MODEL_NAME',
  'ANTHROPIC_DEFAULT_orange_MODEL_SUPPORTED_CAPABILITIES',
  'ANTHROPIC_SMALL_FAST_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION',
  'kairos_CODE_SUBAGENT_MODEL',
])

const PROVIDER_MANAGED_ENV_PREFIXES = [
  // Per-model Vertex region overrides — scales with model releases, so
  // prefix-matched to avoid drift on each launch.
  'VERTEX_REGION_kairos_',
]

export function isProviderManagedEnvVar(key: string): boolean {
  const upper = key.toUpperCase()
  return (
    PROVIDER_MANAGED_ENV_VARS.has(upper) ||
    PROVIDER_MANAGED_ENV_PREFIXES.some(p => upper.startsWith(p))
  )
}

/**
 * Dangerous shell settings that can execute arbitrary shell code
 */
export const DANGEROUS_SHELL_SETTINGS = [
  'apiKeyHelper',
  'awsAuthRefresh',
  'awsCredentialExport',
  'gcpAuthRefresh',
  'otelHeadersHelper',
  'statusLine',
] as const

/**
 * Safe environment variables that can be applied before trust dialog.
 * These are kairos Code specific settings that don't pose security risks.
 *
 * IMPORTANT: This is the source of truth for which env vars are safe.
 * Any env var NOT in this list is considered dangerous and will trigger
 * a security dialog when set via remote managed settings.
 *
 * Dangerous env vars (NOT in this list):
 *
 * === REDIRECT TO ATTACKER-CONTROLLED SERVER ===
 * - ANTHROPIC_BASE_URL, ANTHROPIC_BEDROCK_BASE_URL, ANTHROPIC_FOUNDRY_BASE_URL, ANTHROPIC_VERTEX_BASE_URL
 * - HTTP_PROXY, HTTPS_PROXY, NO_PROXY, http_proxy, https_proxy, no_proxy
 * - OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_EXPORTER_OTLP_LOGS_ENDPOINT, OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
 *
 * === TRUST ATTACKER-CONTROLLED SERVER ===
 * - NODE_TLS_REJECT_UNAUTHORIZED
 * - NODE_EXTRA_CA_CERTS
 *
 * === SWITCH TO ATTACKER-CONTROLLED PROJECT ===
 * - ANTHROPIC_FOUNDRY_RESOURCE
 * - ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN
 * - AWS_BEARER_TOKEN_BEDROCK
 */
export const SAFE_ENV_VARS = new Set([
  'ANTHROPIC_CUSTOM_HEADERS',
  'ANTHROPIC_CUSTOM_MODEL_OPTION',
  'ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION',
  'ANTHROPIC_CUSTOM_MODEL_OPTION_NAME',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES',
  'ANTHROPIC_DEFAULT_apple_MODEL',
  'ANTHROPIC_DEFAULT_apple_MODEL_DESCRIPTION',
  'ANTHROPIC_DEFAULT_apple_MODEL_NAME',
  'ANTHROPIC_DEFAULT_apple_MODEL_SUPPORTED_CAPABILITIES',
  'ANTHROPIC_DEFAULT_orange_MODEL',
  'ANTHROPIC_DEFAULT_orange_MODEL_DESCRIPTION',
  'ANTHROPIC_DEFAULT_orange_MODEL_NAME',
  'ANTHROPIC_DEFAULT_orange_MODEL_SUPPORTED_CAPABILITIES',
  'ANTHROPIC_FOUNDRY_API_KEY',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION',
  'ANTHROPIC_SMALL_FAST_MODEL',
  'AWS_DEFAULT_REGION',
  'AWS_PROFILE',
  'AWS_REGION',
  'BASH_DEFAULT_TIMEOUT_MS',
  'BASH_MAX_OUTPUT_LENGTH',
  'BASH_MAX_TIMEOUT_MS',
  'kairos_BASH_MAINTAIN_PROJECT_WORKING_DIR',
  'kairos_CODE_API_KEY_HELPER_TTL_MS',
  'kairos_CODE_DISABLE_EXPERIMENTAL_BETAS',
  'kairos_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
  'kairos_CODE_DISABLE_TERMINAL_TITLE',
  'kairos_CODE_ENABLE_TELEMETRY',
  'kairos_CODE_EXPERIMENTAL_AGENT_TEAMS',
  'kairos_CODE_IDE_SKIP_AUTO_INSTALL',
  'kairos_CODE_MAX_OUTPUT_TOKENS',
  'kairos_CODE_SKIP_BEDROCK_AUTH',
  'kairos_CODE_SKIP_FOUNDRY_AUTH',
  'kairos_CODE_SKIP_VERTEX_AUTH',
  'kairos_CODE_SUBAGENT_MODEL',
  'kairos_CODE_USE_BEDROCK',
  'kairos_CODE_USE_FOUNDRY',
  'kairos_CODE_USE_VERTEX',
  'DISABLE_AUTOUPDATER',
  'DISABLE_BUG_COMMAND',
  'DISABLE_COST_WARNINGS',
  'DISABLE_ERROR_REPORTING',
  'DISABLE_FEEDBACK_COMMAND',
  'DISABLE_TELEMETRY',
  'ENABLE_TOOL_SEARCH',
  'MAX_MCP_OUTPUT_TOKENS',
  'MAX_THINKING_TOKENS',
  'MCP_TIMEOUT',
  'MCP_TOOL_TIMEOUT',
  'OTEL_EXPORTER_OTLP_HEADERS',
  'OTEL_EXPORTER_OTLP_LOGS_HEADERS',
  'OTEL_EXPORTER_OTLP_LOGS_PROTOCOL',
  'OTEL_EXPORTER_OTLP_METRICS_CLIENT_CERTIFICATE',
  'OTEL_EXPORTER_OTLP_METRICS_CLIENT_KEY',
  'OTEL_EXPORTER_OTLP_METRICS_HEADERS',
  'OTEL_EXPORTER_OTLP_METRICS_PROTOCOL',
  'OTEL_EXPORTER_OTLP_PROTOCOL',
  'OTEL_EXPORTER_OTLP_TRACES_HEADERS',
  'OTEL_LOG_TOOL_DETAILS',
  'OTEL_LOG_USER_PROMPTS',
  'OTEL_LOGS_EXPORT_INTERVAL',
  'OTEL_LOGS_EXPORTER',
  'OTEL_METRIC_EXPORT_INTERVAL',
  'OTEL_METRICS_EXPORTER',
  'OTEL_METRICS_INCLUDE_ACCOUNT_UUID',
  'OTEL_METRICS_INCLUDE_SESSION_ID',
  'OTEL_METRICS_INCLUDE_VERSION',
  'OTEL_RESOURCE_ATTRIBUTES',
  'USE_BUILTIN_RIPGREP',
  'VERTEX_REGION_kairos_3_5_HAIKU',
  'VERTEX_REGION_kairos_3_5_orange',
  'VERTEX_REGION_kairos_3_7_orange',
  'VERTEX_REGION_kairos_4_0_apple',
  'VERTEX_REGION_kairos_4_0_orange',
  'VERTEX_REGION_kairos_4_1_apple',
  'VERTEX_REGION_kairos_4_5_orange',
  'VERTEX_REGION_kairos_4_6_orange',
  'VERTEX_REGION_kairos_HAIKU_4_5',
])
