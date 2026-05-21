import type { ChannelDoctorConfigMutation } from "kairos/plugin-sdk/channel-contract";
import type { kairosConfig } from "kairos/plugin-sdk/config-types";
import { normalizeCompatibilityConfig as normalizeCompatibilityConfigImpl } from "./doctor.js";

export function normalizeCompatibilityConfig({
  cfg,
}: {
  cfg: kairosConfig;
}): ChannelDoctorConfigMutation {
  return normalizeCompatibilityConfigImpl({ cfg });
}
