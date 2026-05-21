import type { kairosConfig } from "kairos/plugin-sdk/config-types";
import { inspectDiscordAccount } from "./src/account-inspect.js";

export function inspectDiscordReadOnlyAccount(cfg: kairosConfig, accountId?: string | null) {
  return inspectDiscordAccount({ cfg, accountId });
}
