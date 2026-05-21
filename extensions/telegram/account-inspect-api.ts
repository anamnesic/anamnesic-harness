import type { kairosConfig } from "./runtime-api.js";
import { inspectTelegramAccount } from "./src/account-inspect.js";

export function inspectTelegramReadOnlyAccount(cfg: kairosConfig, accountId?: string | null) {
  return inspectTelegramAccount({ cfg, accountId });
}
