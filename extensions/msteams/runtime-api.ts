// Private runtime barrel for the bundled Microsoft Teams extension.
// Keep this barrel thin and aligned with the local extension surface.

export { DEFAULT_ACCOUNT_ID } from "kairos/plugin-sdk/account-id";
export type { AllowlistMatch } from "kairos/plugin-sdk/allow-from";
export {
  mergeAllowlist,
  resolveAllowlistMatchSimple,
  summarizeMapping,
} from "kairos/plugin-sdk/allow-from";
export type {
  BaseProbeResult,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelOutboundAdapter,
} from "kairos/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "kairos/plugin-sdk/channel-core";
export { logTypingFailure } from "kairos/plugin-sdk/channel-logging";
export { createChannelPairingController } from "kairos/plugin-sdk/channel-pairing";
export {
  evaluateSenderGroupAccessForPolicy,
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithLists,
  resolveEffectiveAllowFromLists,
  resolveSenderScopedGroupPolicy,
  resolveToolsBySender,
} from "kairos/plugin-sdk/channel-policy";
export { createChannelReplyPipeline } from "kairos/plugin-sdk/channel-reply-pipeline";
export {
  PAIRING_APPROVED_MESSAGE,
  buildProbeChannelStatusSummary,
  createDefaultChannelRuntimeState,
} from "kairos/plugin-sdk/channel-status";
export {
  buildChannelKeyCandidates,
  normalizeChannelSlug,
  resolveChannelEntryMatchWithFallback,
  resolveNestedAllowlistDecision,
} from "kairos/plugin-sdk/channel-targets";
export type {
  GroupPolicy,
  GroupToolPolicyConfig,
  MSTeamsChannelConfig,
  MSTeamsConfig,
  MSTeamsReplyStyle,
  MSTeamsTeamConfig,
  MarkdownTableMode,
  kairosConfig,
} from "kairos/plugin-sdk/config-types";
export { isDangerousNameMatchingEnabled } from "kairos/plugin-sdk/dangerous-name-runtime";
export { resolveDefaultGroupPolicy } from "kairos/plugin-sdk/runtime-group-policy";
export { withFileLock } from "kairos/plugin-sdk/file-lock";
export { keepHttpServerTaskAlive } from "kairos/plugin-sdk/channel-lifecycle";
export {
  detectMime,
  extensionForMime,
  extractOriginalFilename,
  getFileExtension,
  resolveChannelMediaMaxBytes,
} from "kairos/plugin-sdk/media-runtime";
export { dispatchReplyFromConfigWithSettledDispatcher } from "kairos/plugin-sdk/inbound-reply-dispatch";
export { loadOutboundMediaFromUrl } from "kairos/plugin-sdk/outbound-media";
export { buildMediaPayload } from "kairos/plugin-sdk/reply-payload";
export type { ReplyPayload } from "kairos/plugin-sdk/reply-payload";
export type { PluginRuntime } from "kairos/plugin-sdk/runtime-store";
export type { RuntimeEnv } from "kairos/plugin-sdk/runtime";
export type { SsrFPolicy } from "kairos/plugin-sdk/ssrf-runtime";
export { fetchWithSsrFGuard } from "kairos/plugin-sdk/ssrf-runtime";
export { normalizeStringEntries } from "kairos/plugin-sdk/string-normalization-runtime";
export { chunkTextForOutbound } from "kairos/plugin-sdk/text-chunking";
export { DEFAULT_WEBHOOK_MAX_BODY_BYTES } from "kairos/plugin-sdk/webhook-ingress";
export { setMSTeamsRuntime } from "./src/runtime.js";
