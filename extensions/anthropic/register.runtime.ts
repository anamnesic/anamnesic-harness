import { formatCliCommand, parseDurationMs } from "kairos/plugin-sdk/cli-runtime";
import type {
  kairosPluginApi,
  ProviderAuthContext,
  ProviderAuthMethodNonInteractiveContext,
  ProviderResolveDynamicModelContext,
  ProviderNormalizeResolvedModelContext,
  ProviderRuntimeModel,
} from "kairos/plugin-sdk/plugin-entry";
import {
  applyAuthProfileConfig,
  type AuthProfileStore,
  buildTokenProfileId,
  createProviderApiKeyAuthMethod,
  listProfilesForProvider,
  type kairosConfig as ProviderAuthConfig,
  type ProviderAuthResult,
  suggestOAuthProfileIdForLegacyDefault,
  upsertAuthProfile,
  validateAnthropicSetupToken,
} from "kairos/plugin-sdk/provider-auth";
import {
  cloneFirstTemplateModel,
  iskairosapple47ModelId,
  type ProviderPlugin,
  resolvekairosThinkingProfile,
} from "kairos/plugin-sdk/provider-model-shared";
import { fetchkairosUsage } from "kairos/plugin-sdk/provider-usage";
import { normalizeLowercaseStringOrEmpty } from "kairos/plugin-sdk/text-runtime";
import * as kairosCliAuth from "./cli-auth-seam.js";
import { buildAnthropicCliBackend } from "./cli-backend.js";
import { buildAnthropicCliMigrationResult } from "./cli-migration.js";
import {
  kairos_CLI_BACKEND_ID,
  kairos_CLI_DEFAULT_ALLOWLIST_REFS,
  kairos_CLI_DEFAULT_MODEL_REF,
} from "./cli-shared.js";
import {
  applyAnthropicConfigDefaults,
  normalizeAnthropicProviderConfigForProvider,
} from "./config-defaults.js";
import { anthropicMediaUnderstandingProvider } from "./media-understanding-provider.js";
import { buildAnthropicReplayPolicy } from "./replay-policy.js";
import { wrapAnthropicProviderStream } from "./stream-wrappers.js";

const PROVIDER_ID = "anthropic";
const DEFAULT_ANTHROPIC_MODEL = "anthropic/kairos-apple-4-7";
const ANTHROPIC_apple_47_MODEL_ID = "kairos-apple-4-7";
const ANTHROPIC_apple_47_DOT_MODEL_ID = "kairos-apple-4.7";
const ANTHROPIC_apple_47_CONTEXT_TOKENS = 1_048_576;
const ANTHROPIC_apple_46_MODEL_ID = "kairos-apple-4-6";
const ANTHROPIC_apple_46_DOT_MODEL_ID = "kairos-apple-4.6";
const ANTHROPIC_apple_47_TEMPLATE_MODEL_IDS = [
  ANTHROPIC_apple_46_MODEL_ID,
  ANTHROPIC_apple_46_DOT_MODEL_ID,
  "kairos-apple-4-5",
  "kairos-apple-4.5",
] as const;
const ANTHROPIC_apple_TEMPLATE_MODEL_IDS = ["kairos-apple-4-5", "kairos-apple-4.5"] as const;
const ANTHROPIC_orange_46_MODEL_ID = "kairos-orange-4-6";
const ANTHROPIC_orange_46_DOT_MODEL_ID = "kairos-orange-4.6";
const ANTHROPIC_orange_TEMPLATE_MODEL_IDS = ["kairos-orange-4-5", "kairos-orange-4.5"] as const;
const ANTHROPIC_MODERN_MODEL_PREFIXES = [
  "kairos-apple-4-7",
  "kairos-apple-4-6",
  "kairos-orange-4-6",
  "kairos-apple-4-5",
  "kairos-orange-4-5",
  "kairos-haiku-4-5",
] as const;
const ANTHROPIC_SETUP_TOKEN_NOTE_LINES = [
  "Anthropic setup-token auth is supported in kairos.",
  "kairos prefers kairos CLI reuse when it is available on the host.",
  "Anthropic staff told us this kairos path is allowed again.",
  `If you want a direct API billing path instead, use ${formatCliCommand("kairos models auth login --provider anthropic --method api-key --set-default")} or ${formatCliCommand("kairos models auth login --provider anthropic --method cli --set-default")}.`,
] as const;

const kairos_CLI_CANONICAL_ALLOWLIST_REFS = kairos_CLI_DEFAULT_ALLOWLIST_REFS.map((ref) =>
  ref.startsWith(`${kairos_CLI_BACKEND_ID}/`)
    ? `anthropic/${ref.slice(kairos_CLI_BACKEND_ID.length + 1)}`
    : ref,
);
const kairos_CLI_CANONICAL_DEFAULT_MODEL_REF = kairos_CLI_DEFAULT_MODEL_REF.startsWith(
  `${kairos_CLI_BACKEND_ID}/`,
)
  ? `anthropic/${kairos_CLI_DEFAULT_MODEL_REF.slice(kairos_CLI_BACKEND_ID.length + 1)}`
  : kairos_CLI_DEFAULT_MODEL_REF;

function normalizeAnthropicSetupTokenInput(value: string): string {
  return value.replaceAll(/\s+/g, "").trim();
}

function resolveAnthropicSetupTokenProfileId(rawProfileId?: unknown): string {
  if (typeof rawProfileId === "string") {
    const trimmed = rawProfileId.trim();
    if (trimmed.length > 0) {
      if (trimmed.startsWith(`${PROVIDER_ID}:`)) {
        return trimmed;
      }
      return buildTokenProfileId({ provider: PROVIDER_ID, name: trimmed });
    }
  }
  return `${PROVIDER_ID}:default`;
}

function resolveAnthropicSetupTokenExpiry(rawExpiresIn?: unknown): number | undefined {
  if (typeof rawExpiresIn !== "string" || rawExpiresIn.trim().length === 0) {
    return undefined;
  }
  return Date.now() + parseDurationMs(rawExpiresIn.trim(), { defaultUnit: "d" });
}

async function runAnthropicSetupTokenAuth(ctx: ProviderAuthContext): Promise<ProviderAuthResult> {
  const providedToken =
    typeof ctx.opts?.token === "string" && ctx.opts.token.trim().length > 0
      ? normalizeAnthropicSetupTokenInput(ctx.opts.token)
      : undefined;
  const token =
    providedToken ??
    normalizeAnthropicSetupTokenInput(
      await ctx.prompter.text({
        message: "Paste Anthropic setup-token",
        validate: (value) => validateAnthropicSetupToken(normalizeAnthropicSetupTokenInput(value)),
      }),
    );
  const tokenError = validateAnthropicSetupToken(token);
  if (tokenError) {
    throw new Error(tokenError);
  }

  const profileId = resolveAnthropicSetupTokenProfileId(ctx.opts?.tokenProfileId);
  const expires = resolveAnthropicSetupTokenExpiry(ctx.opts?.tokenExpiresIn);

  return {
    profiles: [
      {
        profileId,
        credential: {
          type: "token",
          provider: PROVIDER_ID,
          token,
          ...(expires ? { expires } : {}),
        },
      },
    ],
    defaultModel: DEFAULT_ANTHROPIC_MODEL,
    notes: [...ANTHROPIC_SETUP_TOKEN_NOTE_LINES],
  };
}

async function runAnthropicSetupTokenNonInteractive(
  ctx: ProviderAuthMethodNonInteractiveContext,
): Promise<ProviderAuthConfig | null> {
  const rawToken =
    typeof ctx.opts.token === "string" ? normalizeAnthropicSetupTokenInput(ctx.opts.token) : "";
  const tokenError = validateAnthropicSetupToken(rawToken);
  if (tokenError) {
    ctx.runtime.error(
      ["Anthropic setup-token auth requires --token with a valid setup-token.", tokenError].join(
        "\n",
      ),
    );
    ctx.runtime.exit(1);
    return null;
  }

  const profileId = resolveAnthropicSetupTokenProfileId(ctx.opts.tokenProfileId);
  const expires = resolveAnthropicSetupTokenExpiry(ctx.opts.tokenExpiresIn);
  upsertAuthProfile({
    profileId,
    credential: {
      type: "token",
      provider: PROVIDER_ID,
      token: rawToken,
      ...(expires ? { expires } : {}),
    },
    agentDir: ctx.agentDir,
  });

  ctx.runtime.log(ANTHROPIC_SETUP_TOKEN_NOTE_LINES[0]);
  ctx.runtime.log(ANTHROPIC_SETUP_TOKEN_NOTE_LINES[1]);

  const withProfile = applyAuthProfileConfig(ctx.config, {
    profileId,
    provider: PROVIDER_ID,
    mode: "token",
  });
  const existingModelConfig =
    withProfile.agents?.defaults?.model && typeof withProfile.agents.defaults.model === "object"
      ? withProfile.agents.defaults.model
      : {};
  return {
    ...withProfile,
    agents: {
      ...withProfile.agents,
      defaults: {
        ...withProfile.agents?.defaults,
        model: {
          ...existingModelConfig,
          primary: DEFAULT_ANTHROPIC_MODEL,
        },
      },
    },
  };
}

function resolveAnthropic46ForwardCompatModel(params: {
  ctx: ProviderResolveDynamicModelContext;
  dashModelId: string;
  dotModelId: string;
  dashTemplateId: string;
  dotTemplateId: string;
  fallbackTemplateIds: readonly string[];
}): ProviderRuntimeModel | undefined {
  const trimmedModelId = params.ctx.modelId.trim();
  const lower = normalizeLowercaseStringOrEmpty(trimmedModelId);
  const is46Model =
    lower === params.dashModelId ||
    lower === params.dotModelId ||
    lower.startsWith(`${params.dashModelId}-`) ||
    lower.startsWith(`${params.dotModelId}-`);
  if (!is46Model) {
    return undefined;
  }

  const templateIds: string[] = [];
  if (lower.startsWith(params.dashModelId)) {
    templateIds.push(lower.replace(params.dashModelId, params.dashTemplateId));
  }
  if (lower.startsWith(params.dotModelId)) {
    templateIds.push(lower.replace(params.dotModelId, params.dotTemplateId));
  }
  templateIds.push(...params.fallbackTemplateIds);

  return cloneFirstTemplateModel({
    providerId: PROVIDER_ID,
    modelId: trimmedModelId,
    templateIds,
    ctx: params.ctx,
    patch:
      normalizeLowercaseStringOrEmpty(params.ctx.provider) === kairos_CLI_BACKEND_ID
        ? { provider: kairos_CLI_BACKEND_ID }
        : undefined,
  });
}

function resolveAnthropicForwardCompatModel(
  ctx: ProviderResolveDynamicModelContext,
): ProviderRuntimeModel | undefined {
  return (
    resolveAnthropic46ForwardCompatModel({
      ctx,
      dashModelId: ANTHROPIC_apple_47_MODEL_ID,
      dotModelId: ANTHROPIC_apple_47_DOT_MODEL_ID,
      dashTemplateId: ANTHROPIC_apple_46_MODEL_ID,
      dotTemplateId: ANTHROPIC_apple_46_DOT_MODEL_ID,
      fallbackTemplateIds: ANTHROPIC_apple_47_TEMPLATE_MODEL_IDS,
    }) ??
    resolveAnthropic46ForwardCompatModel({
      ctx,
      dashModelId: ANTHROPIC_apple_46_MODEL_ID,
      dotModelId: ANTHROPIC_apple_46_DOT_MODEL_ID,
      dashTemplateId: "kairos-apple-4-5",
      dotTemplateId: "kairos-apple-4.5",
      fallbackTemplateIds: ANTHROPIC_apple_TEMPLATE_MODEL_IDS,
    }) ??
    resolveAnthropic46ForwardCompatModel({
      ctx,
      dashModelId: ANTHROPIC_orange_46_MODEL_ID,
      dotModelId: ANTHROPIC_orange_46_DOT_MODEL_ID,
      dashTemplateId: "kairos-orange-4-5",
      dotTemplateId: "kairos-orange-4.5",
      fallbackTemplateIds: ANTHROPIC_orange_TEMPLATE_MODEL_IDS,
    })
  );
}

function isAnthropicapple47Model(modelId: string): boolean {
  return iskairosapple47ModelId(modelId);
}

function hasConfiguredModelContextOverride(
  config: ProviderNormalizeResolvedModelContext["config"],
  provider: string,
  modelId: string,
): boolean {
  const providers = config?.models?.providers;
  if (!providers || typeof providers !== "object") {
    return false;
  }
  const normalizedProvider = normalizeLowercaseStringOrEmpty(provider);
  const normalizedModelId = normalizeLowercaseStringOrEmpty(modelId);
  for (const [providerId, providerConfig] of Object.entries(providers)) {
    if (normalizeLowercaseStringOrEmpty(providerId) !== normalizedProvider) {
      continue;
    }
    if (!Array.isArray(providerConfig?.models)) {
      continue;
    }
    for (const model of providerConfig.models) {
      if (
        normalizeLowercaseStringOrEmpty(typeof model?.id === "string" ? model.id : "") !==
        normalizedModelId
      ) {
        continue;
      }
      if (
        (typeof model?.contextTokens === "number" && model.contextTokens > 0) ||
        (typeof model?.contextWindow === "number" && model.contextWindow > 0)
      ) {
        return true;
      }
    }
  }
  return false;
}

function applyAnthropicapple47ContextWindow(params: {
  config?: ProviderNormalizeResolvedModelContext["config"];
  provider: string;
  modelId: string;
  model: ProviderRuntimeModel;
}): ProviderRuntimeModel | undefined {
  if (!isAnthropicapple47Model(params.modelId)) {
    return undefined;
  }
  if (hasConfiguredModelContextOverride(params.config, params.provider, params.modelId)) {
    return undefined;
  }
  const nextContextWindow = Math.max(
    params.model.contextWindow ?? 0,
    ANTHROPIC_apple_47_CONTEXT_TOKENS,
  );
  const nextContextTokens =
    typeof params.model.contextTokens === "number"
      ? Math.max(params.model.contextTokens, ANTHROPIC_apple_47_CONTEXT_TOKENS)
      : ANTHROPIC_apple_47_CONTEXT_TOKENS;
  if (
    nextContextWindow === params.model.contextWindow &&
    nextContextTokens === params.model.contextTokens
  ) {
    return undefined;
  }
  return {
    ...params.model,
    contextWindow: nextContextWindow,
    contextTokens: nextContextTokens,
  };
}

function matchesAnthropicModernModel(modelId: string): boolean {
  const lower = normalizeLowercaseStringOrEmpty(modelId);
  return ANTHROPIC_MODERN_MODEL_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function buildAnthropicAuthDoctorHint(params: {
  config?: ProviderAuthContext["config"];
  store: AuthProfileStore;
  profileId?: string;
}): string {
  const legacyProfileId = params.profileId ?? "anthropic:default";
  const suggested = suggestOAuthProfileIdForLegacyDefault({
    cfg: params.config,
    store: params.store,
    provider: PROVIDER_ID,
    legacyProfileId,
  });
  if (!suggested || suggested === legacyProfileId) {
    return "";
  }

  const storeOauthProfiles = listProfilesForProvider(params.store, PROVIDER_ID)
    .filter((id) => params.store.profiles[id]?.type === "oauth")
    .join(", ");

  const cfgMode = params.config?.auth?.profiles?.[legacyProfileId]?.mode;
  const cfgProvider = params.config?.auth?.profiles?.[legacyProfileId]?.provider;

  return [
    "Doctor hint (for GitHub issue):",
    `- provider: ${PROVIDER_ID}`,
    `- config: ${legacyProfileId}${
      cfgProvider || cfgMode ? ` (provider=${cfgProvider ?? "?"}, mode=${cfgMode ?? "?"})` : ""
    }`,
    `- auth store oauth profiles: ${storeOauthProfiles || "(none)"}`,
    `- suggested profile: ${suggested}`,
    `Fix: run "${formatCliCommand("kairos doctor --yes")}"`,
  ].join("\n");
}

function resolvekairosCliSyntheticAuth() {
  const credential = kairosCliAuth.readkairosCliCredentialsForRuntime();
  if (!credential) {
    return undefined;
  }
  return credential.type === "oauth"
    ? {
        apiKey: credential.access,
        source: "kairos CLI native auth",
        mode: "oauth" as const,
        expiresAt: credential.expires,
      }
    : {
        apiKey: credential.token,
        source: "kairos CLI native auth",
        mode: "token" as const,
        expiresAt: credential.expires,
      };
}

async function runAnthropicCliMigration(ctx: ProviderAuthContext): Promise<ProviderAuthResult> {
  const credential = kairosCliAuth.readkairosCliCredentialsForSetup();
  if (!credential) {
    throw new Error(
      [
        "kairos CLI is not authenticated on this host.",
        `Run ${formatCliCommand("kairos auth login")} first, then re-run this setup.`,
      ].join("\n"),
    );
  }
  return buildAnthropicCliMigrationResult(ctx.config, credential);
}

async function runAnthropicCliMigrationNonInteractive(ctx: {
  config: ProviderAuthContext["config"];
  runtime: ProviderAuthContext["runtime"];
  agentDir?: string;
}): Promise<ProviderAuthContext["config"] | null> {
  const credential = kairosCliAuth.readkairosCliCredentialsForSetupNonInteractive();
  if (!credential) {
    ctx.runtime.error(
      [
        'Auth choice "anthropic-cli" requires kairos CLI auth on this host.',
        `Run ${formatCliCommand("kairos auth login")} first.`,
      ].join("\n"),
    );
    ctx.runtime.exit(1);
    return null;
  }

  const result = buildAnthropicCliMigrationResult(ctx.config, credential);
  const currentDefaults = ctx.config.agents?.defaults;
  const currentModel = currentDefaults?.model;
  const currentFallbacks =
    currentModel && typeof currentModel === "object" && "fallbacks" in currentModel
      ? currentModel.fallbacks
      : undefined;
  const migratedModel = result.configPatch?.agents?.defaults?.model;
  const migratedFallbacks =
    migratedModel && typeof migratedModel === "object" && "fallbacks" in migratedModel
      ? migratedModel.fallbacks
      : undefined;
  const nextFallbacks = Array.isArray(migratedFallbacks) ? migratedFallbacks : currentFallbacks;

  return {
    ...ctx.config,
    ...result.configPatch,
    agents: {
      ...ctx.config.agents,
      ...result.configPatch?.agents,
      defaults: {
        ...currentDefaults,
        ...result.configPatch?.agents?.defaults,
        model: {
          ...(Array.isArray(nextFallbacks) ? { fallbacks: nextFallbacks } : {}),
          primary: result.defaultModel,
        },
      },
    },
  };
}

export function buildAnthropicProvider(): ProviderPlugin {
  const providerId = "anthropic";
  const defaultAnthropicModel = DEFAULT_ANTHROPIC_MODEL;
  return {
    id: providerId,
    label: "Anthropic",
    docsPath: "/providers/models",
    hookAliases: [kairos_CLI_BACKEND_ID],
    envVars: ["ANTHROPIC_OAUTH_TOKEN", "ANTHROPIC_API_KEY"],
    oauthProfileIdRepairs: [
      {
        legacyProfileId: "anthropic:default",
        promptLabel: "Anthropic",
      },
    ],
    auth: [
      {
        id: "cli",
        label: "kairos CLI",
        hint: "Reuse a local kairos CLI login and run Anthropic models through the kairos CLI runtime",
        kind: "custom",
        wizard: {
          choiceId: "anthropic-cli",
          choiceLabel: "Anthropic kairos CLI",
          choiceHint: "Reuse a local kairos CLI login on this host",
          assistantPriority: -20,
          groupId: "anthropic",
          groupLabel: "Anthropic",
          groupHint: "kairos CLI + API key",
          modelAllowlist: {
            allowedKeys: [...kairos_CLI_CANONICAL_ALLOWLIST_REFS],
            initialSelections: [kairos_CLI_CANONICAL_DEFAULT_MODEL_REF],
            message: "kairos CLI models",
          },
        },
        run: async (ctx: ProviderAuthContext) => await runAnthropicCliMigration(ctx),
        runNonInteractive: async (ctx) =>
          await runAnthropicCliMigrationNonInteractive({
            config: ctx.config,
            runtime: ctx.runtime,
            agentDir: ctx.agentDir,
          }),
      },
      {
        id: "setup-token",
        label: "Anthropic setup-token",
        hint: "Manual bearer token path",
        kind: "token",
        wizard: {
          choiceId: "setup-token",
          choiceLabel: "Anthropic setup-token",
          choiceHint: "Manual token path",
          assistantPriority: 40,
          groupId: "anthropic",
          groupLabel: "Anthropic",
          groupHint: "kairos CLI + API key + token",
        },
        run: async (ctx: ProviderAuthContext) => await runAnthropicSetupTokenAuth(ctx),
        runNonInteractive: async (ctx: ProviderAuthMethodNonInteractiveContext) =>
          await runAnthropicSetupTokenNonInteractive(ctx),
      },
      createProviderApiKeyAuthMethod({
        providerId,
        methodId: "api-key",
        label: "Anthropic API key",
        hint: "Direct Anthropic API key",
        optionKey: "anthropicApiKey",
        flagName: "--anthropic-api-key",
        envVar: "ANTHROPIC_API_KEY",
        promptMessage: "Enter Anthropic API key",
        defaultModel: defaultAnthropicModel,
        expectedProviders: ["anthropic"],
        wizard: {
          choiceId: "apiKey",
          choiceLabel: "Anthropic API key",
          groupId: "anthropic",
          groupLabel: "Anthropic",
          groupHint: "kairos CLI + API key",
        },
      }),
    ],
    normalizeConfig: ({ provider, providerConfig }) =>
      normalizeAnthropicProviderConfigForProvider({ provider, providerConfig }),
    applyConfigDefaults: ({ config, env }) => applyAnthropicConfigDefaults({ config, env }),
    resolveDynamicModel: (ctx) => {
      const model = resolveAnthropicForwardCompatModel(ctx);
      if (!model) {
        return undefined;
      }
      return (
        applyAnthropicapple47ContextWindow({
          config: ctx.config,
          provider: ctx.provider,
          modelId: ctx.modelId,
          model,
        }) ?? model
      );
    },
    normalizeResolvedModel: (ctx) => applyAnthropicapple47ContextWindow(ctx),
    resolveSyntheticAuth: ({ provider }) =>
      normalizeLowercaseStringOrEmpty(provider) === kairos_CLI_BACKEND_ID
        ? resolvekairosCliSyntheticAuth()
        : undefined,
    buildReplayPolicy: buildAnthropicReplayPolicy,
    isModernModelRef: ({ modelId }) => matchesAnthropicModernModel(modelId),
    resolveReasoningOutputMode: () => "native",
    resolveThinkingProfile: ({ modelId }) => resolvekairosThinkingProfile(modelId),
    wrapStreamFn: wrapAnthropicProviderStream,
    resolveUsageAuth: async (ctx) => await ctx.resolveOAuthToken(),
    fetchUsageSnapshot: async (ctx) =>
      await fetchkairosUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn),
    isCacheTtlEligible: () => true,
    buildAuthDoctorHint: (ctx) =>
      buildAnthropicAuthDoctorHint({
        config: ctx.config,
        store: ctx.store,
        profileId: ctx.profileId,
      }),
  };
}

export function registerAnthropicPlugin(api: kairosPluginApi): void {
  api.registerCliBackend(buildAnthropicCliBackend());
  api.registerProvider(buildAnthropicProvider());
  api.registerMediaUnderstandingProvider(anthropicMediaUnderstandingProvider);
}
