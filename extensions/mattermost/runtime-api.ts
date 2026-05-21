// Private runtime barrel for the bundled Mattermost extension.
// Keep this barrel thin and generic-only.

export type {
  BaseProbeResult,
  ChannelAccountSnapshot,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelPlugin,
  ChatType,
  HistoryEntry,
  kairosConfig,
  kairosPluginApi,
  PluginRuntime,
} from "kairos/plugin-sdk/core";
export type { RuntimeEnv } from "kairos/plugin-sdk/runtime";
export type { ReplyPayload } from "kairos/plugin-sdk/reply-runtime";
export type { ModelsProviderData } from "kairos/plugin-sdk/command-auth";
export type {
  BlockStreamingCoalesceConfig,
  DmPolicy,
  GroupPolicy,
} from "kairos/plugin-sdk/config-types";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  createDedupeCache,
  parseStrictPositiveInteger,
  resolveClientIp,
  isTrustedProxyAddress,
} from "kairos/plugin-sdk/core";
export { buildComputedAccountStatusSnapshot } from "kairos/plugin-sdk/channel-status";
export { createAccountStatusSink } from "kairos/plugin-sdk/channel-lifecycle";
export { buildAgentMediaPayload } from "kairos/plugin-sdk/agent-media-payload";
export {
  buildModelsProviderData,
  listSkillCommandsForAgents,
  resolveControlCommandGate,
  resolveStoredModelOverride,
} from "kairos/plugin-sdk/command-auth";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "kairos/plugin-sdk/runtime-group-policy";
export { isDangerousNameMatchingEnabled } from "kairos/plugin-sdk/dangerous-name-runtime";
export { loadSessionStore, resolveStorePath } from "kairos/plugin-sdk/session-store-runtime";
export { formatInboundFromLabel } from "kairos/plugin-sdk/channel-inbound";
export { logInboundDrop } from "kairos/plugin-sdk/channel-inbound";
export { createChannelPairingController } from "kairos/plugin-sdk/channel-pairing";
export {
  DM_GROUP_ACCESS_REASON,
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithLists,
  resolveEffectiveAllowFromLists,
} from "kairos/plugin-sdk/channel-policy";
export { evaluateSenderGroupAccessForPolicy } from "kairos/plugin-sdk/group-access";
export { createChannelReplyPipeline } from "kairos/plugin-sdk/channel-reply-pipeline";
export { logTypingFailure } from "kairos/plugin-sdk/channel-feedback";
export { loadOutboundMediaFromUrl } from "kairos/plugin-sdk/outbound-media";
export { rawDataToString } from "kairos/plugin-sdk/webhook-ingress";
export { chunkTextForOutbound } from "kairos/plugin-sdk/text-chunking";
export {
  DEFAULT_GROUP_HISTORY_LIMIT,
  buildPendingHistoryContextFromMap,
  clearHistoryEntriesIfEnabled,
  recordPendingHistoryEntryIfEnabled,
} from "kairos/plugin-sdk/reply-history";
export { normalizeAccountId, resolveThreadSessionKeys } from "kairos/plugin-sdk/routing";
export { resolveAllowlistMatchSimple } from "kairos/plugin-sdk/allow-from";
export { registerPluginHttpRoute } from "kairos/plugin-sdk/webhook-targets";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
} from "kairos/plugin-sdk/webhook-ingress";
export {
  applyAccountNameToChannelSection,
  applySetupAccountConfigPatch,
  migrateBaseNameToDefaultAccount,
} from "kairos/plugin-sdk/setup";
export {
  getAgentScopedMediaLocalRoots,
  resolveChannelMediaMaxBytes,
} from "kairos/plugin-sdk/media-runtime";
export { normalizeProviderId } from "kairos/plugin-sdk/provider-model-shared";
export { setMattermostRuntime } from "./src/runtime.js";
