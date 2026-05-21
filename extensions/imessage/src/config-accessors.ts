import type { kairosConfig } from "kairos/plugin-sdk/config-types";
import { resolveIMessageAccount } from "./accounts.js";

export function resolveIMessageConfigAllowFrom(params: {
  cfg: kairosConfig;
  accountId?: string | null;
}): string[] {
  return (resolveIMessageAccount(params).config.allowFrom ?? []).map((entry) => String(entry));
}

export function resolveIMessageConfigDefaultTo(params: {
  cfg: kairosConfig;
  accountId?: string | null;
}): string | undefined {
  const defaultTo = resolveIMessageAccount(params).config.defaultTo;
  if (defaultTo == null) {
    return undefined;
  }
  const normalized = defaultTo.trim();
  return normalized || undefined;
}
