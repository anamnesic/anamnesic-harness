// Private runtime barrel for the bundled Google Chat extension.
// Keep this barrel thin and avoid broad plugin-sdk surfaces during bootstrap.

export { DEFAULT_ACCOUNT_ID } from "kairos/plugin-sdk/account-id";
export {
  createActionGate,
  jsonResult,
  readNumberParam,
  readReactionParams,
  readStringParam,
} from "kairos/plugin-sdk/channel-actions";
export { buildChannelConfigSchema } from "kairos/plugin-sdk/channel-config-primitives";
export type {
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
  ChannelStatusIssue,
} from "kairos/plugin-sdk/channel-contract";
export { missingTargetError } from "kairos/plugin-sdk/channel-feedback";
export {
  createAccountStatusSink,
  runPassiveAccountLifecycle,
} from "kairos/plugin-sdk/channel-lifecycle";
export { createChannelPairingController } from "kairos/plugin-sdk/channel-pairing";
export { createChannelReplyPipeline } from "kairos/plugin-sdk/channel-reply-pipeline";
export {
  evaluateGroupRouteAccessForPolicy,
  resolveDmGroupAccessWithLists,
  resolveSenderScopedGroupPolicy,
} from "kairos/plugin-sdk/channel-policy";
export { PAIRING_APPROVED_MESSAGE } from "kairos/plugin-sdk/channel-status";
export { chunkTextForOutbound } from "kairos/plugin-sdk/text-chunking";
export type { kairosConfig } from "kairos/plugin-sdk/config-types";
export { GoogleChatConfigSchema } from "kairos/plugin-sdk/bundled-channel-config-schema";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "kairos/plugin-sdk/runtime-group-policy";
export { isDangerousNameMatchingEnabled } from "kairos/plugin-sdk/dangerous-name-runtime";
export { fetchRemoteMedia, resolveChannelMediaMaxBytes } from "kairos/plugin-sdk/media-runtime";
export { loadOutboundMediaFromUrl } from "kairos/plugin-sdk/outbound-media";
export type { PluginRuntime } from "kairos/plugin-sdk/runtime-store";
export { fetchWithSsrFGuard } from "kairos/plugin-sdk/ssrf-runtime";
export type { GoogleChatAccountConfig, GoogleChatConfig } from "kairos/plugin-sdk/config-types";
export { extractToolSend } from "kairos/plugin-sdk/tool-send";
export { resolveInboundMentionDecision } from "kairos/plugin-sdk/channel-inbound";
export { resolveInboundRouteEnvelopeBuilderWithRuntime } from "kairos/plugin-sdk/inbound-envelope";
export { resolveWebhookPath } from "kairos/plugin-sdk/webhook-path";
export {
  registerWebhookTargetWithPluginRoute,
  resolveWebhookTargetWithAuthOrReject,
  withResolvedWebhookRequestPipeline,
} from "kairos/plugin-sdk/webhook-targets";
export {
  createWebhookInFlightLimiter,
  readJsonWebhookBodyOrReject,
  type WebhookInFlightLimiter,
} from "kairos/plugin-sdk/webhook-request-guards";
export { setGoogleChatRuntime } from "./src/runtime.js";
