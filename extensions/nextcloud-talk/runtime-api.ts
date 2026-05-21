// Private runtime barrel for the bundled Nextcloud Talk extension.
// Keep this barrel thin and aligned with the local extension surface.

export type { AllowlistMatch } from "kairos/plugin-sdk/allow-from";
export type { ChannelGroupContext } from "kairos/plugin-sdk/channel-contract";
export { logInboundDrop } from "kairos/plugin-sdk/channel-logging";
export { createChannelPairingController } from "kairos/plugin-sdk/channel-pairing";
export {
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithCommandGate,
} from "kairos/plugin-sdk/channel-policy";
export type {
  BlockStreamingCoalesceConfig,
  DmConfig,
  DmPolicy,
  GroupPolicy,
  GroupToolPolicyConfig,
  kairosConfig,
} from "kairos/plugin-sdk/config-types";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "kairos/plugin-sdk/runtime-group-policy";
export { dispatchInboundReplyWithBase } from "kairos/plugin-sdk/inbound-reply-dispatch";
export type { OutboundReplyPayload } from "kairos/plugin-sdk/reply-payload";
export { deliverFormattedTextWithAttachments } from "kairos/plugin-sdk/reply-payload";
export type { PluginRuntime } from "kairos/plugin-sdk/runtime-store";
export type { RuntimeEnv } from "kairos/plugin-sdk/runtime";
export type { SecretInput } from "kairos/plugin-sdk/secret-input";
export { fetchWithSsrFGuard } from "kairos/plugin-sdk/ssrf-runtime";
export { setNextcloudTalkRuntime } from "./src/runtime.js";
