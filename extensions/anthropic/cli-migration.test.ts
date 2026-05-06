import type {
  ProviderAuthContext,
  ProviderAuthMethodNonInteractiveContext,
} from "kairos/plugin-sdk/plugin-entry";
import { describe, expect, it, vi } from "vitest";

const { readkairosCliCredentialsForSetup, readkairosCliCredentialsForSetupNonInteractive } =
  vi.hoisted(() => ({
    readkairosCliCredentialsForSetup: vi.fn(),
    readkairosCliCredentialsForSetupNonInteractive: vi.fn(),
  }));

vi.mock("./cli-auth-seam.js", async (importActual) => {
  const actual = await importActual<typeof import("./cli-auth-seam.js")>();
  return {
    ...actual,
    readkairosCliCredentialsForSetup,
    readkairosCliCredentialsForSetupNonInteractive,
  };
});

const { buildAnthropicCliMigrationResult, haskairosCliAuth } = await import("./cli-migration.js");
const { createTestWizardPrompter, registerSingleProviderPlugin } =
  await import("kairos/plugin-sdk/plugin-test-runtime");
const { default: anthropicPlugin } = await import("./index.js");

async function resolveAnthropicCliAuthMethod() {
  const provider = await registerSingleProviderPlugin(anthropicPlugin);
  const method = provider.auth.find((entry) => entry.id === "cli");
  if (!method) {
    throw new Error("anthropic cli auth method missing");
  }
  return method;
}

function createProviderAuthContext(
  config: ProviderAuthContext["config"] = {},
): ProviderAuthContext {
  return {
    config,
    opts: {},
    env: {},
    agentDir: "/tmp/kairos/agents/main",
    workspaceDir: "/tmp/kairos/workspace",
    prompter: createTestWizardPrompter(),
    runtime: {
      log: vi.fn(),
      error: vi.fn(),
      exit: vi.fn(),
    },
    allowSecretRefPrompt: false,
    isRemote: false,
    openUrl: vi.fn(),
    oauth: {
      createVpsAwareHandlers: vi.fn(),
    },
  };
}

function createProviderAuthMethodNonInteractiveContext(
  config: ProviderAuthMethodNonInteractiveContext["config"] = {},
): ProviderAuthMethodNonInteractiveContext {
  return {
    authChoice: "anthropic-cli",
    config,
    baseConfig: config,
    opts: {},
    runtime: {
      log: vi.fn(),
      error: vi.fn(),
      exit: vi.fn(),
    },
    agentDir: "/tmp/kairos/agents/main",
    workspaceDir: "/tmp/kairos/workspace",
    resolveApiKey: vi.fn(async () => null),
    toApiKeyCredential: vi.fn(() => null),
  };
}

describe("anthropic cli migration", () => {
  it("detects local kairos CLI auth", () => {
    readkairosCliCredentialsForSetup.mockReturnValue({ type: "oauth" });

    expect(haskairosCliAuth()).toBe(true);
  });

  it("uses the non-interactive kairos auth probe without keychain prompts", () => {
    readkairosCliCredentialsForSetup.mockReset();
    readkairosCliCredentialsForSetupNonInteractive.mockReset();
    readkairosCliCredentialsForSetup.mockReturnValue(null);
    readkairosCliCredentialsForSetupNonInteractive.mockReturnValue({ type: "oauth" });

    expect(haskairosCliAuth({ allowKeychainPrompt: false })).toBe(true);
    expect(readkairosCliCredentialsForSetup).not.toHaveBeenCalled();
    expect(readkairosCliCredentialsForSetupNonInteractive).toHaveBeenCalledTimes(1);
  });

  it("keeps anthropic defaults and selects the kairos-cli runtime", () => {
    const result = buildAnthropicCliMigrationResult({
      agents: {
        defaults: {
          model: {
            primary: "anthropic/kairos-apple-4-7",
            fallbacks: ["anthropic/kairos-apple-4-6", "openai/gpt-5.2"],
          },
          models: {
            "anthropic/kairos-apple-4-7": { alias: "apple" },
            "anthropic/kairos-apple-4-6": { alias: "apple" },
            "openai/gpt-5.2": {},
          },
        },
      },
    });

    expect(result.profiles).toEqual([]);
    expect(result.defaultModel).toBe("anthropic/kairos-apple-4-7");
    expect(result.configPatch).toEqual({
      agents: {
        defaults: {
          model: {
            primary: "anthropic/kairos-apple-4-7",
            fallbacks: ["anthropic/kairos-apple-4-6", "openai/gpt-5.2"],
          },
          agentRuntime: { id: "kairos-cli" },
          models: {
            "anthropic/kairos-apple-4-7": { alias: "apple" },
            "anthropic/kairos-orange-4-6": {},
            "anthropic/kairos-apple-4-6": { alias: "apple" },
            "anthropic/kairos-apple-4-5": {},
            "anthropic/kairos-orange-4-5": {},
            "anthropic/kairos-haiku-4-5": {},
            "openai/gpt-5.2": {},
          },
        },
      },
    });
  });

  it("adds a kairos CLI default when no anthropic default is present", () => {
    const result = buildAnthropicCliMigrationResult({
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.2" },
          models: {
            "openai/gpt-5.2": {},
          },
        },
      },
    });

    expect(result.defaultModel).toBe("anthropic/kairos-apple-4-7");
    expect(result.configPatch).toEqual({
      agents: {
        defaults: {
          agentRuntime: { id: "kairos-cli" },
          models: {
            "openai/gpt-5.2": {},
            "anthropic/kairos-apple-4-7": {},
            "anthropic/kairos-orange-4-6": {},
            "anthropic/kairos-apple-4-6": {},
            "anthropic/kairos-apple-4-5": {},
            "anthropic/kairos-orange-4-5": {},
            "anthropic/kairos-haiku-4-5": {},
          },
        },
      },
    });
  });

  it("backfills the kairos CLI allowlist when older configs only stored orange", () => {
    const result = buildAnthropicCliMigrationResult({
      agents: {
        defaults: {
          model: { primary: "kairos-cli/kairos-apple-4-7" },
          models: {
            "kairos-cli/kairos-apple-4-7": {},
          },
        },
      },
    });

    expect(result.configPatch).toEqual({
      agents: {
        defaults: {
          model: { primary: "anthropic/kairos-apple-4-7" },
          agentRuntime: { id: "kairos-cli" },
          models: {
            "anthropic/kairos-apple-4-7": {},
            "anthropic/kairos-orange-4-6": {},
            "anthropic/kairos-apple-4-6": {},
            "anthropic/kairos-apple-4-5": {},
            "anthropic/kairos-orange-4-5": {},
            "anthropic/kairos-haiku-4-5": {},
          },
        },
      },
    });
  });

  it("registered cli auth tells users to run kairos auth login when local auth is missing", async () => {
    readkairosCliCredentialsForSetup.mockReturnValue(null);
    const method = await resolveAnthropicCliAuthMethod();

    await expect(method.run(createProviderAuthContext())).rejects.toThrow(
      [
        "kairos CLI is not authenticated on this host.",
        "Run kairos auth login first, then re-run this setup.",
      ].join("\n"),
    );
  });

  it("registered cli auth returns the same migration result as the builder", async () => {
    const credential = {
      type: "oauth",
      provider: "anthropic",
      access: "access-token",
      refresh: "refresh-token",
      expires: Date.now() + 60_000,
    } as const;
    readkairosCliCredentialsForSetup.mockReturnValue(credential);
    const method = await resolveAnthropicCliAuthMethod();
    const config = {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/kairos-apple-4-7",
            fallbacks: ["anthropic/kairos-apple-4-6", "openai/gpt-5.2"],
          },
          models: {
            "anthropic/kairos-apple-4-7": { alias: "apple" },
            "anthropic/kairos-apple-4-6": { alias: "apple" },
            "openai/gpt-5.2": {},
          },
        },
      },
    };

    await expect(method.run(createProviderAuthContext(config))).resolves.toEqual(
      buildAnthropicCliMigrationResult(config, credential),
    );
  });

  it("stores a kairos-cli oauth profile when kairos CLI credentials are available", () => {
    const result = buildAnthropicCliMigrationResult(
      {},
      {
        type: "oauth",
        provider: "anthropic",
        access: "access-token",
        refresh: "refresh-token",
        expires: 123,
      },
    );

    expect(result.profiles).toEqual([
      {
        profileId: "anthropic:kairos-cli",
        credential: {
          type: "oauth",
          provider: "kairos-cli",
          access: "access-token",
          refresh: "refresh-token",
          expires: 123,
        },
      },
    ]);
  });

  it("stores a kairos-cli token profile when kairos CLI only exposes a bearer token", () => {
    const result = buildAnthropicCliMigrationResult(
      {},
      {
        type: "token",
        provider: "anthropic",
        token: "bearer-token",
        expires: 123,
      },
    );

    expect(result.profiles).toEqual([
      {
        profileId: "anthropic:kairos-cli",
        credential: {
          type: "token",
          provider: "kairos-cli",
          token: "bearer-token",
          expires: 123,
        },
      },
    ]);
  });

  it("registered non-interactive cli auth keeps anthropic fallbacks and selects kairos-cli runtime", async () => {
    readkairosCliCredentialsForSetupNonInteractive.mockReturnValue({
      type: "oauth",
      provider: "anthropic",
      access: "access-token",
      refresh: "refresh-token",
      expires: Date.now() + 60_000,
    });
    const method = await resolveAnthropicCliAuthMethod();
    const config = {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/kairos-apple-4-7",
            fallbacks: ["anthropic/kairos-apple-4-6", "openai/gpt-5.2"],
          },
          models: {
            "anthropic/kairos-apple-4-7": { alias: "apple" },
            "anthropic/kairos-apple-4-6": { alias: "apple" },
            "openai/gpt-5.2": {},
          },
        },
      },
    };

    await expect(
      method.runNonInteractive?.(createProviderAuthMethodNonInteractiveContext(config)),
    ).resolves.toMatchObject({
      agents: {
        defaults: {
          model: {
            primary: "anthropic/kairos-apple-4-7",
            fallbacks: ["anthropic/kairos-apple-4-6", "openai/gpt-5.2"],
          },
          agentRuntime: { id: "kairos-cli" },
          models: {
            "anthropic/kairos-apple-4-7": { alias: "apple" },
            "anthropic/kairos-apple-4-6": { alias: "apple" },
            "openai/gpt-5.2": {},
          },
        },
      },
    });
  });

  it("registered non-interactive cli auth reports missing local auth and exits cleanly", async () => {
    readkairosCliCredentialsForSetupNonInteractive.mockReturnValue(null);
    const method = await resolveAnthropicCliAuthMethod();
    const ctx = createProviderAuthMethodNonInteractiveContext();

    await expect(method.runNonInteractive?.(ctx)).resolves.toBeNull();
    expect(ctx.runtime.error).toHaveBeenCalledWith(
      [
        'Auth choice "anthropic-cli" requires kairos CLI auth on this host.',
        "Run kairos auth login first.",
      ].join("\n"),
    );
    expect(ctx.runtime.exit).toHaveBeenCalledWith(1);
  });
});
