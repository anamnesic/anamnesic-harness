import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const resolveRuntimeSyntheticAuthProviderRefs = vi.hoisted(() => vi.fn(() => ["kairos-cli"]));

const resolveProviderSyntheticAuthWithPlugin = vi.hoisted(() =>
  vi.fn((params: { provider: string }) =>
    params.provider === "kairos-cli"
      ? {
          apiKey: "kairos-cli-access-token",
          source: "kairos CLI native auth",
          mode: "oauth" as const,
        }
      : undefined,
  ),
);

vi.mock("../plugins/synthetic-auth.runtime.js", () => ({
  resolveRuntimeSyntheticAuthProviderRefs,
}));

vi.mock("../plugins/provider-runtime.js", () => ({
  applyProviderResolvedModelCompatWithPlugins: () => undefined,
  applyProviderResolvedTransportWithPlugin: () => undefined,
  normalizeProviderResolvedModelWithPlugin: () => undefined,
  resolveProviderSyntheticAuthWithPlugin,
  resolveExternalAuthProfilesWithPlugins: () => [],
}));

vi.mock("./auth-profiles/store.js", () => ({
  ensureAuthProfileStore: () => ({ version: 1, profiles: {} }),
  loadAuthProfileStoreForSecretsRuntime: () => ({ version: 1, profiles: {} }),
}));

vi.mock("./pi-auth-discovery-core.js", () => ({
  addEnvBackedPiCredentials: (credentials: Record<string, unknown>) => ({ ...credentials }),
  scrubLegacyStaticAuthJsonEntriesForDiscovery: vi.fn(),
}));

let resolvePiCredentialsForDiscovery: typeof import("./pi-auth-discovery.js").resolvePiCredentialsForDiscovery;

async function withAgentDir(run: (agentDir: string) => Promise<void>): Promise<void> {
  const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-pi-synthetic-auth-"));
  try {
    await run(agentDir);
  } finally {
    await fs.rm(agentDir, { recursive: true, force: true });
  }
}

describe("pi model discovery synthetic auth", () => {
  beforeAll(async () => {
    ({ resolvePiCredentialsForDiscovery } = await import("./pi-auth-discovery.js"));
  });

  beforeEach(() => {
    resolveRuntimeSyntheticAuthProviderRefs.mockClear();
    resolveProviderSyntheticAuthWithPlugin.mockClear();
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("ANTHROPIC_OAUTH_TOKEN", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mirrors plugin-owned synthetic cli auth into pi credential discovery", async () => {
    await withAgentDir(async (agentDir) => {
      const credentials = resolvePiCredentialsForDiscovery(agentDir, { readOnly: true });

      expect(resolveRuntimeSyntheticAuthProviderRefs).toHaveBeenCalled();
      expect(resolveProviderSyntheticAuthWithPlugin).toHaveBeenCalledWith({
        provider: "kairos-cli",
        context: {
          config: undefined,
          provider: "kairos-cli",
          providerConfig: undefined,
        },
      });
      expect(credentials["kairos-cli"]).toEqual({
        type: "api_key",
        key: "kairos-cli-access-token",
      });
    });
  });
});
