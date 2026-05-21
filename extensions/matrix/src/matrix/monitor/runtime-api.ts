// Narrow Matrix monitor helper seam.
// Keep monitor internals off the broad package runtime-api barrel so monitor
// tests and shared workers do not pull unrelated Matrix helper surfaces.

export type { NormalizedLocation } from "kairos/plugin-sdk/channel-location";
export type { PluginRuntime, RuntimeLogger } from "kairos/plugin-sdk/plugin-runtime";
export type { BlockReplyContext, ReplyPayload } from "kairos/plugin-sdk/reply-runtime";
export type { MarkdownTableMode, kairosConfig } from "kairos/plugin-sdk/config-types";
export type { RuntimeEnv } from "kairos/plugin-sdk/runtime";
export {
  addAllowlistUserEntriesFromConfigEntry,
  buildAllowlistResolutionSummary,
  canonicalizeAllowlistWithResolvedIds,
  formatAllowlistMatchMeta,
  patchAllowlistUsersInConfigEntries,
  summarizeMapping,
} from "kairos/plugin-sdk/allow-from";
export {
  createReplyPrefixOptions,
  createTypingCallbacks,
} from "kairos/plugin-sdk/channel-reply-options-runtime";
export { formatLocationText, toLocationContext } from "kairos/plugin-sdk/channel-location";
export { getAgentScopedMediaLocalRoots } from "kairos/plugin-sdk/agent-media-payload";
export { logInboundDrop, logTypingFailure } from "kairos/plugin-sdk/channel-logging";
export { resolveAckReaction } from "kairos/plugin-sdk/channel-feedback";
export {
  buildChannelKeyCandidates,
  resolveChannelEntryMatch,
} from "kairos/plugin-sdk/channel-targets";
