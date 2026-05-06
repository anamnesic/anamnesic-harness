import type { kairosConfig } from "kairos/plugin-sdk/config-types";
import { inspectSlackAccount } from "./src/account-inspect.js";

export function inspectSlackReadOnlyAccount(cfg: kairosConfig, accountId?: string | null) {
  return inspectSlackAccount({ cfg, accountId });
}
