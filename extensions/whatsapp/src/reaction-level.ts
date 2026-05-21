import type { kairosConfig } from "kairos/plugin-sdk/config-types";
import {
  resolveReactionLevel,
  type ReactionLevel,
  type ResolvedReactionLevel,
} from "kairos/plugin-sdk/text-runtime";
import { resolveMergedWhatsAppAccountConfig } from "./account-config.js";

export type WhatsAppReactionLevel = ReactionLevel;
export type ResolvedWhatsAppReactionLevel = ResolvedReactionLevel;

/** Resolve the effective reaction level and its implications for WhatsApp. */
export function resolveWhatsAppReactionLevel(params: {
  cfg: kairosConfig;
  accountId?: string;
}): ResolvedWhatsAppReactionLevel {
  const account = resolveMergedWhatsAppAccountConfig({
    cfg: params.cfg,
    accountId: params.accountId,
  });
  return resolveReactionLevel({
    value: account.reactionLevel,
    defaultLevel: "minimal",
    invalidFallback: "minimal",
  });
}
