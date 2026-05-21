import type { kairosConfig } from "kairos/plugin-sdk/config-types";
import type { ThreadBindingManager } from "./thread-bindings.js";

type DiscordConfig = NonNullable<kairosConfig["channels"]>["discord"];

export type DiscordCommandArgContext = {
  cfg: kairosConfig;
  discordConfig: DiscordConfig;
  accountId: string;
  sessionPrefix: string;
  threadBindings: ThreadBindingManager;
  postApplySettleMs?: number;
};

export type DiscordModelPickerContext = DiscordCommandArgContext;

export type SafeDiscordInteractionCall = <T>(
  label: string,
  fn: () => Promise<T>,
) => Promise<T | null>;
