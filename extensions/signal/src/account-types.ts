import type { kairosConfig } from "kairos/plugin-sdk/config-types";

export type SignalAccountConfig = Omit<
  Exclude<NonNullable<kairosConfig["channels"]>["signal"], undefined>,
  "accounts"
>;
