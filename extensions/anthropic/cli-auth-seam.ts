import { readkairosCliCredentialsCached } from "kairos/plugin-sdk/provider-auth";

export function readkairosCliCredentialsForSetup() {
  return readkairosCliCredentialsCached();
}

export function readkairosCliCredentialsForSetupNonInteractive() {
  return readkairosCliCredentialsCached({ allowKeychainPrompt: false });
}

export function readkairosCliCredentialsForRuntime() {
  return readkairosCliCredentialsCached({ allowKeychainPrompt: false });
}
