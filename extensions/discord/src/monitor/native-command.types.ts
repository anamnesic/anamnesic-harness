import type { kairosConfig } from "kairos/plugin-sdk/config-types";
import type { CommandArgValues } from "kairos/plugin-sdk/native-command-registry";

export type DiscordConfig = NonNullable<kairosConfig["channels"]>["discord"];

export type DiscordCommandArgs = {
  raw?: string;
  values?: CommandArgValues;
};
