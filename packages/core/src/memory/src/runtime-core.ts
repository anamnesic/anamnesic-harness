// Focused runtime contract for memory plugin config/state/helpers.

export type { AnyAgentTool } from "./host/kairos-runtime-agent.js";
export { resolveCronStyleNow } from "./host/kairos-runtime-agent.js";
export { DEFAULT_PI_COMPACTION_RESERVE_TOKENS_FLOOR } from "./host/kairos-runtime-agent.js";
export { resolveDefaultAgentId, resolveSessionAgentId } from "./host/kairos-runtime-agent.js";
export { resolveMemorySearchConfig } from "./host/kairos-runtime-agent.js";
export {
  asToolParamsRecord,
  jsonResult,
  readNumberParam,
  readStringParam,
} from "./host/kairos-runtime-agent.js";
export { SILENT_REPLY_TOKEN } from "./host/kairos-runtime-session.js";
export { parseNonNegativeByteSize } from "./host/kairos-runtime-config.js";
export {
  getRuntimeConfig,
  /** @deprecated Use getRuntimeConfig(), or pass the already loaded config through the call path. */
  loadConfig,
} from "./host/kairos-runtime-config.js";
export { resolveStateDir } from "./host/kairos-runtime-config.js";
export { resolveSessionTranscriptsDirForAgent } from "./host/kairos-runtime-config.js";
export { emptyPluginConfigSchema } from "./host/kairos-runtime-memory.js";
export {
  buildActiveMemoryPromptSection,
  getMemoryCapabilityRegistration,
  listActiveMemoryPublicArtifacts,
} from "./host/kairos-runtime-memory.js";
export { parseAgentSessionKey } from "./host/kairos-runtime-agent.js";
export type { kairosConfig } from "./host/kairos-runtime-config.js";
export type { MemoryCitationsMode } from "./host/kairos-runtime-config.js";
export type {
  MemoryFlushPlan,
  MemoryFlushPlanResolver,
  MemoryPluginCapability,
  MemoryPluginPublicArtifact,
  MemoryPluginPublicArtifactsProvider,
  MemoryPluginRuntime,
  MemoryPromptSectionBuilder,
} from "./host/kairos-runtime-memory.js";
export type { kairosPluginApi } from "./host/kairos-runtime-memory.js";
