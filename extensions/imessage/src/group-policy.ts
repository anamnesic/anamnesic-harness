import {
  resolveChannelGroupRequireMention,
  resolveChannelGroupToolsPolicy,
  type GroupToolPolicyConfig,
} from "kairos/plugin-sdk/channel-policy";
import type { kairosConfig } from "kairos/plugin-sdk/core";

type IMessageGroupContext = {
  cfg: kairosConfig;
  accountId?: string | null;
  groupId?: string | null;
  senderId?: string | null;
  senderName?: string | null;
  senderUsername?: string | null;
  senderE164?: string | null;
};

export function resolveIMessageGroupRequireMention(params: IMessageGroupContext): boolean {
  return resolveChannelGroupRequireMention({
    cfg: params.cfg,
    channel: "imessage",
    groupId: params.groupId,
    accountId: params.accountId,
  });
}

export function resolveIMessageGroupToolPolicy(
  params: IMessageGroupContext,
): GroupToolPolicyConfig | undefined {
  return resolveChannelGroupToolsPolicy({
    cfg: params.cfg,
    channel: "imessage",
    groupId: params.groupId,
    accountId: params.accountId,
    senderId: params.senderId,
    senderName: params.senderName,
    senderUsername: params.senderUsername,
    senderE164: params.senderE164,
  });
}
