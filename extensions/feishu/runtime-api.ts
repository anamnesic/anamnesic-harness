// Private runtime barrel for the bundled Feishu extension.
// Keep this barrel thin and generic-only.

export type {
  AllowlistMatch,
  AnyAgentTool,
  BaseProbeResult,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelMeta,
  ChannelOutboundAdapter,
  ChannelPlugin,
  HistoryEntry,
  kairosConfig,
  kairosPluginApi,
  OutboundIdentity,
  PluginRuntime,
  ReplyPayload,
} from "kairos/plugin-sdk/core";
export type { kairosConfig as ClawdbotConfig } from "kairos/plugin-sdk/core";
export type { RuntimeEnv } from "kairos/plugin-sdk/runtime";
export type { GroupToolPolicyConfig } from "kairos/plugin-sdk/config-types";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  createActionGate,
  createDedupeCache,
} from "kairos/plugin-sdk/core";
export {
  PAIRING_APPROVED_MESSAGE,
  buildProbeChannelStatusSummary,
  createDefaultChannelRuntimeState,
} from "kairos/plugin-sdk/channel-status";
export { buildAgentMediaPayload } from "kairos/plugin-sdk/agent-media-payload";
export { createChannelPairingController } from "kairos/plugin-sdk/channel-pairing";
export { createReplyPrefixContext } from "kairos/plugin-sdk/channel-reply-pipeline";
export {
  evaluateSupplementalContextVisibility,
  filterSupplementalContextItems,
  resolveChannelContextVisibilityMode,
} from "kairos/plugin-sdk/context-visibility-runtime";
export {
  loadSessionStore,
  resolveSessionStoreEntry,
} from "kairos/plugin-sdk/session-store-runtime";
export { readJsonFileWithFallback } from "kairos/plugin-sdk/json-store";
export { createPersistentDedupe } from "kairos/plugin-sdk/persistent-dedupe";
export { normalizeAgentId } from "kairos/plugin-sdk/routing";
export { chunkTextForOutbound } from "kairos/plugin-sdk/text-chunking";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
  requestBodyErrorToText,
} from "kairos/plugin-sdk/webhook-ingress";
export { setFeishuRuntime } from "./src/runtime.js";
