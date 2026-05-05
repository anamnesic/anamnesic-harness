import type { ProviderPlugin } from "openclaw/plugin-sdk/provider-model-shared";

const noopAuth = async () => ({ profiles: [] });

export function createAnthropicProvider(): ProviderPlugin {
  return {
    id: "anthropic",
    label: "Anthropic",
    docsPath: "/providers/models",
    hookAliases: ["kairos-cli"],
    envVars: ["ANTHROPIC_OAUTH_TOKEN", "ANTHROPIC_API_KEY"],
    auth: [
      {
        id: "cli",
        kind: "custom",
        label: "kairos CLI",
        hint: "Reuse a local kairos CLI login and switch model selection to kairos-cli/*",
        run: noopAuth,
        wizard: {
          choiceId: "anthropic-cli",
          choiceLabel: "Anthropic kairos CLI",
          choiceHint: "Reuse a local kairos CLI login on this host",
          groupId: "anthropic",
          groupLabel: "Anthropic",
          groupHint: "kairos CLI + API key",
        },
      },
      {
        id: "setup-token",
        kind: "token",
        label: "Anthropic setup-token",
        hint: "Manual bearer token path",
        run: noopAuth,
        wizard: {
          choiceId: "setup-token",
          choiceLabel: "Anthropic setup-token",
          choiceHint: "Manual token path",
          groupId: "anthropic",
          groupLabel: "Anthropic",
          groupHint: "kairos CLI + API key + token",
        },
      },
      {
        id: "api-key",
        kind: "api_key",
        label: "Anthropic API key",
        hint: "Direct Anthropic API key",
        run: noopAuth,
        wizard: {
          choiceId: "apiKey",
          choiceLabel: "Anthropic API key",
          groupId: "anthropic",
          groupLabel: "Anthropic",
          groupHint: "kairos CLI + API key",
        },
      },
    ],
  };
}
