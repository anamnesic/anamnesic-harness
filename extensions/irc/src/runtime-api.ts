// Private runtime barrel for the bundled IRC extension.
// Keep this barrel thin and generic-only.

export type { BaseProbeResult } from "kairos/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "kairos/plugin-sdk/channel-core";
export type { kairosConfig } from "kairos/plugin-sdk/config-types";
export type { PluginRuntime } from "kairos/plugin-sdk/runtime-store";
export type { RuntimeEnv } from "kairos/plugin-sdk/runtime";
export type {
  BlockStreamingCoalesceConfig,
  DmConfig,
  DmPolicy,
  GroupPolicy,
  GroupToolPolicyBySenderConfig,
  GroupToolPolicyConfig,
  MarkdownConfig,
} from "kairos/plugin-sdk/config-types";
export type { OutboundReplyPayload } from "kairos/plugin-sdk/reply-payload";
export { DEFAULT_ACCOUNT_ID } from "kairos/plugin-sdk/account-id";
export { buildChannelConfigSchema } from "kairos/plugin-sdk/channel-config-primitives";
export {
  PAIRING_APPROVED_MESSAGE,
  buildBaseChannelStatusSummary,
} from "kairos/plugin-sdk/channel-status";
export { createChannelPairingController } from "kairos/plugin-sdk/channel-pairing";
export { createAccountStatusSink } from "kairos/plugin-sdk/channel-lifecycle";
export {
  readStoreAllowFromForDmPolicy,
  resolveEffectiveAllowFromLists,
} from "kairos/plugin-sdk/channel-policy";
export { resolveControlCommandGate } from "kairos/plugin-sdk/command-auth";
export { dispatchInboundReplyWithBase } from "kairos/plugin-sdk/inbound-reply-dispatch";
export { chunkTextForOutbound } from "kairos/plugin-sdk/text-chunking";
export {
  deliverFormattedTextWithAttachments,
  formatTextWithAttachmentLinks,
  resolveOutboundMediaUrls,
} from "kairos/plugin-sdk/reply-payload";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "kairos/plugin-sdk/runtime-group-policy";
export { isDangerousNameMatchingEnabled } from "kairos/plugin-sdk/dangerous-name-runtime";
export { logInboundDrop } from "kairos/plugin-sdk/channel-inbound";
