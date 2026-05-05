import type { ProviderPlugin } from "openclaw/plugin-sdk/provider-model-shared";
import { readkairosCliCredentialsForRuntime } from "./cli-auth-seam.js";

const kairos_CLI_BACKEND_ID = "kairos-cli";

function resolvekairosCliSyntheticAuth() {
  const credential = readkairosCliCredentialsForRuntime();
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

export const anthropicProviderDiscovery: ProviderPlugin = {
  id: kairos_CLI_BACKEND_ID,
  label: "kairos CLI",
  docsPath: "/providers/models",
  auth: [],
  resolveSyntheticAuth: ({ provider }) =>
    provider === kairos_CLI_BACKEND_ID ? resolvekairosCliSyntheticAuth() : undefined,
};

export default anthropicProviderDiscovery;
