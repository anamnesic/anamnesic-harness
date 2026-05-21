import {
  kairos_CLI_PROFILE_ID,
  type kairosConfig,
  type ProviderAuthResult,
} from "kairos/plugin-sdk/provider-auth";
import { normalizeLowercaseStringOrEmpty } from "kairos/plugin-sdk/text-runtime";
import {
  readkairosCliCredentialsForSetup,
  readkairosCliCredentialsForSetupNonInteractive,
} from "./cli-auth-seam.js";
import { kairos_CLI_BACKEND_ID, kairos_CLI_DEFAULT_ALLOWLIST_REFS } from "./cli-shared.js";

type AgentDefaultsModel = NonNullable<NonNullable<kairosConfig["agents"]>["defaults"]>["model"];
type AgentDefaultsModels = NonNullable<NonNullable<kairosConfig["agents"]>["defaults"]>["models"];
type AgentDefaultsRuntimePolicy = NonNullable<
  NonNullable<kairosConfig["agents"]>["defaults"]
>["agentRuntime"];
type kairosCliCredential = NonNullable<ReturnType<typeof readkairosCliCredentialsForSetup>>;

function toAnthropicModelRef(raw: string): string | null {
  const trimmed = raw.trim();
  const lower = normalizeLowercaseStringOrEmpty(trimmed);
  const provider = lower.startsWith("anthropic/")
    ? "anthropic"
    : lower.startsWith(`${kairos_CLI_BACKEND_ID}/`)
      ? kairos_CLI_BACKEND_ID
      : "";
  if (!provider) {
    return null;
  }
  const modelId = trimmed.slice(provider.length + 1).trim();
  if (!normalizeLowercaseStringOrEmpty(modelId).startsWith("kairos-")) {
    return null;
  }
  return `anthropic/${modelId}`;
}

function rewriteModelSelection(model: AgentDefaultsModel): {
  value: AgentDefaultsModel;
  primary?: string;
  changed: boolean;
} {
  if (typeof model === "string") {
    const converted = toAnthropicModelRef(model);
    return converted
      ? { value: converted, primary: converted, changed: true }
      : { value: model, changed: false };
  }
  if (!model || typeof model !== "object" || Array.isArray(model)) {
    return { value: model, changed: false };
  }

  const current = model as Record<string, unknown>;
  const next: Record<string, unknown> = { ...current };
  let changed = false;
  let primary: string | undefined;

  if (typeof current.primary === "string") {
    const converted = toAnthropicModelRef(current.primary);
    if (converted) {
      next.primary = converted;
      primary = converted;
      changed = true;
    }
  }

  const currentFallbacks = current.fallbacks;
  if (Array.isArray(currentFallbacks)) {
    const nextFallbacks = currentFallbacks.map((entry) =>
      typeof entry === "string" ? (toAnthropicModelRef(entry) ?? entry) : entry,
    );
    if (nextFallbacks.some((entry, index) => entry !== currentFallbacks[index])) {
      next.fallbacks = nextFallbacks;
      changed = true;
    }
  }

  return {
    value: changed ? next : model,
    ...(primary ? { primary } : {}),
    changed,
  };
}

function rewriteModelEntryMap(models: Record<string, unknown> | undefined): {
  value: Record<string, unknown> | undefined;
  migrated: string[];
} {
  if (!models) {
    return { value: models, migrated: [] };
  }

  const next = { ...models };
  const migrated: string[] = [];

  for (const [rawKey, value] of Object.entries(models)) {
    const converted = toAnthropicModelRef(rawKey);
    if (!converted) {
      continue;
    }
    if (converted === rawKey) {
      continue;
    }
    if (!(converted in next)) {
      next[converted] = value;
    }
    delete next[rawKey];
    migrated.push(converted);
  }

  return {
    value: migrated.length > 0 ? next : models,
    migrated,
  };
}

function seedkairosCliAllowlist(
  models: NonNullable<AgentDefaultsModels>,
): NonNullable<AgentDefaultsModels> {
  const next = { ...models };
  for (const ref of kairos_CLI_DEFAULT_ALLOWLIST_REFS) {
    const canonicalRef = toAnthropicModelRef(ref) ?? ref;
    next[canonicalRef] = next[canonicalRef] ?? {};
  }
  return next;
}

function selectkairosCliRuntime(agentRuntime: AgentDefaultsRuntimePolicy | undefined) {
  const currentRuntime = agentRuntime?.id?.trim();
  if (currentRuntime && currentRuntime !== "auto") {
    return agentRuntime;
  }
  return {
    ...agentRuntime,
    id: kairos_CLI_BACKEND_ID,
  };
}

export function haskairosCliAuth(options?: { allowKeychainPrompt?: boolean }): boolean {
  return Boolean(
    options?.allowKeychainPrompt === false
      ? readkairosCliCredentialsForSetupNonInteractive()
      : readkairosCliCredentialsForSetup(),
  );
}

function buildkairosCliAuthProfiles(
  credential?: kairosCliCredential | null,
): ProviderAuthResult["profiles"] {
  if (!credential) {
    return [];
  }
  if (credential.type === "oauth") {
    return [
      {
        profileId: kairos_CLI_PROFILE_ID,
        credential: {
          type: "oauth",
          provider: kairos_CLI_BACKEND_ID,
          access: credential.access,
          refresh: credential.refresh,
          expires: credential.expires,
        },
      },
    ];
  }
  return [
    {
      profileId: kairos_CLI_PROFILE_ID,
      credential: {
        type: "token",
        provider: kairos_CLI_BACKEND_ID,
        token: credential.token,
        expires: credential.expires,
      },
    },
  ];
}

export function buildAnthropicCliMigrationResult(
  config: kairosConfig,
  credential?: kairosCliCredential | null,
): ProviderAuthResult {
  const defaults = config.agents?.defaults;
  const rewrittenModel = rewriteModelSelection(defaults?.model);
  const rewrittenModels = rewriteModelEntryMap(defaults?.models);
  const existingModels = (rewrittenModels.value ??
    defaults?.models ??
    {}) as NonNullable<AgentDefaultsModels>;
  const nextModels = seedkairosCliAllowlist(existingModels);
  const defaultModel = rewrittenModel.primary ?? "anthropic/kairos-apple-4-7";

  return {
    profiles: buildkairosCliAuthProfiles(credential),
    configPatch: {
      agents: {
        defaults: {
          ...(rewrittenModel.changed ? { model: rewrittenModel.value } : {}),
          agentRuntime: selectkairosCliRuntime(defaults?.agentRuntime),
          models: nextModels,
        },
      },
    },
    // Rewrites `kairos-cli/*` -> `anthropic/*`; merge would keep stale keys.
    replaceDefaultModels: true,
    defaultModel,
    notes: [
      "kairos CLI auth detected; kept Anthropic model refs and selected the local kairos CLI runtime.",
      "Existing Anthropic auth profiles are kept for rollback.",
      ...(rewrittenModels.migrated.length > 0
        ? [`Migrated allowlist entries: ${rewrittenModels.migrated.join(", ")}.`]
        : []),
    ],
  };
}
