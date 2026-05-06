import type { kairosConfig } from "kairos/plugin-sdk/config-types";

export type WhatsAppAccountConfig = NonNullable<
  NonNullable<NonNullable<kairosConfig["channels"]>["whatsapp"]>["accounts"]
>[string];
