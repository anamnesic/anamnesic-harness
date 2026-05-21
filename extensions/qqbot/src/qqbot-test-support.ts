import type { kairosConfig } from "kairos/plugin-sdk/config-types";

export function makeQqbotSecretRefConfig(): kairosConfig {
  return {
    channels: {
      qqbot: {
        appId: "123456",
        clientSecret: {
          source: "env",
          provider: "default",
          id: "QQBOT_CLIENT_SECRET",
        },
      },
    },
  } as kairosConfig;
}

export function makeQqbotDefaultAccountConfig(): kairosConfig {
  return {
    channels: {
      qqbot: {
        defaultAccount: "bot2",
        accounts: {
          bot2: { appId: "123456" },
        },
      },
    },
  } as kairosConfig;
}
