import type { kairosConfig } from "kairos/plugin-sdk/config-types";
import {
  resolveThreadBindingIdleTimeoutMs,
  resolveThreadBindingMaxAgeMs,
  resolveThreadBindingsEnabled,
} from "kairos/plugin-sdk/conversation-runtime";
import { normalizeAccountId } from "kairos/plugin-sdk/routing";

export {
  resolveThreadBindingIdleTimeoutMs,
  resolveThreadBindingMaxAgeMs,
  resolveThreadBindingsEnabled,
};

export function resolveDiscordThreadBindingIdleTimeoutMs(params: {
  cfg: kairosConfig;
  accountId?: string;
}): number {
  const accountId = normalizeAccountId(params.accountId);
  const root = params.cfg.channels?.discord?.threadBindings;
  const account = params.cfg.channels?.discord?.accounts?.[accountId]?.threadBindings;
  return resolveThreadBindingIdleTimeoutMs({
    channelIdleHoursRaw: account?.idleHours ?? root?.idleHours,
    sessionIdleHoursRaw: params.cfg.session?.threadBindings?.idleHours,
  });
}

export function resolveDiscordThreadBindingMaxAgeMs(params: {
  cfg: kairosConfig;
  accountId?: string;
}): number {
  const accountId = normalizeAccountId(params.accountId);
  const root = params.cfg.channels?.discord?.threadBindings;
  const account = params.cfg.channels?.discord?.accounts?.[accountId]?.threadBindings;
  return resolveThreadBindingMaxAgeMs({
    channelMaxAgeHoursRaw: account?.maxAgeHours ?? root?.maxAgeHours,
    sessionMaxAgeHoursRaw: params.cfg.session?.threadBindings?.maxAgeHours,
  });
}
