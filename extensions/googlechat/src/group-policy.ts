import { resolveChannelGroupRequireMention } from "kairos/plugin-sdk/channel-policy";
import type { kairosConfig } from "kairos/plugin-sdk/core";

type GoogleChatGroupContext = {
  cfg: kairosConfig;
  accountId?: string | null;
  groupId?: string | null;
};

export function resolveGoogleChatGroupRequireMention(params: GoogleChatGroupContext): boolean {
  return resolveChannelGroupRequireMention({
    cfg: params.cfg,
    channel: "googlechat",
    groupId: params.groupId,
    accountId: params.accountId,
  });
}
