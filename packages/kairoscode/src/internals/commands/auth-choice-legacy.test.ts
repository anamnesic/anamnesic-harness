import { describe, expect, it, vi } from "vitest";

const manifestAuthChoices = vi.hoisted(() => [
  {
    pluginId: "anthropic",
    providerId: "anthropic",
    methodId: "cli",
    choiceId: "anthropic-cli",
    choiceLabel: "Anthropic kairos CLI",
    deprecatedChoiceIds: ["kairos-cli"],
  },
  {
    pluginId: "openai",
    providerId: "openai-codex",
    methodId: "cli",
    choiceId: "openai-codex-cli",
    choiceLabel: "OpenAI Codex CLI",
    deprecatedChoiceIds: ["codex-cli"],
  },
]);

vi.mock("../plugins/provider-auth-choices.js", () => ({
  resolveManifestProviderAuthChoices: () => manifestAuthChoices,
  resolveManifestDeprecatedProviderAuthChoice: (choiceId: string) =>
    manifestAuthChoices.find((choice) => choice.deprecatedChoiceIds.includes(choiceId)),
}));

import {
  resolveLegacyAuthChoiceAliasesForCli,
  formatDeprecatedNonInteractiveAuthChoiceError,
  normalizeLegacyOnboardAuthChoice,
  resolveDeprecatedAuthChoiceReplacement,
} from "./auth-choice-legacy.js";

function authChoiceManifestEnv(): NodeJS.ProcessEnv {
  return {
    OPENCLAW_BUNDLED_PLUGINS_DIR: "extensions",
    OPENCLAW_DISABLE_BUNDLED_PLUGINS: "0",
    OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY: "1",
    VITEST: "1",
  } as NodeJS.ProcessEnv;
}

describe("auth choice legacy aliases", () => {
  it("maps kairos-cli to the new anthropic cli choice", () => {
    const env = authChoiceManifestEnv();
    expect(normalizeLegacyOnboardAuthChoice("kairos-cli", { env })).toBe("anthropic-cli");
    expect(resolveDeprecatedAuthChoiceReplacement("kairos-cli", { env })).toEqual({
      normalized: "anthropic-cli",
      message: 'Auth choice "kairos-cli" is deprecated; using Anthropic kairos CLI setup instead.',
    });
    expect(formatDeprecatedNonInteractiveAuthChoiceError("kairos-cli", { env })).toBe(
      'Auth choice "kairos-cli" is deprecated.\nUse "--auth-choice anthropic-cli".',
    );
  });

  it("sources deprecated cli aliases from plugin manifests", () => {
    expect(resolveLegacyAuthChoiceAliasesForCli({ env: authChoiceManifestEnv() })).toEqual([
      "kairos-cli",
      "codex-cli",
    ]);
  });
});
