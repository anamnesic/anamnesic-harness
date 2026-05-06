import type { kairosConfig } from "kairos/plugin-sdk/config-types";

export type IMessageAccountConfig = Omit<
  NonNullable<NonNullable<kairosConfig["channels"]>["imessage"]>,
  "accounts" | "defaultAccount"
>;
