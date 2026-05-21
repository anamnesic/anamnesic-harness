// Real workspace contract for memory engine foundation concerns.

export {
  resolveAgentContextLimits,
  resolveAgentDir,
  resolveAgentWorkspaceDir,
  resolveDefaultAgentId,
  resolveSessionAgentId,
} from "./host/kairos-runtime-agent.js";
export {
  resolveMemorySearchConfig,
  resolveMemorySearchSyncConfig,
  type ResolvedMemorySearchConfig,
  type ResolvedMemorySearchSyncConfig,
} from "./host/kairos-runtime-agent.js";
export { parseDurationMs } from "./host/kairos-runtime-config.js";
export { loadConfig } from "./host/kairos-runtime-config.js";
export { resolveStateDir } from "./host/kairos-runtime-config.js";
export { resolveSessionTranscriptsDirForAgent } from "./host/kairos-runtime-config.js";
export {
  hasConfiguredSecretInput,
  normalizeResolvedSecretInputString,
} from "./host/kairos-runtime-config.js";
export { writeFileWithinRoot } from "./host/kairos-runtime-io.js";
export { createSubsystemLogger } from "./host/kairos-runtime-io.js";
export { detectMime } from "./host/kairos-runtime-io.js";
export { resolveGlobalSingleton } from "./host/kairos-runtime-io.js";
export { onSessionTranscriptUpdate } from "./host/kairos-runtime-session.js";
export { splitShellArgs } from "./host/kairos-runtime-io.js";
export { runTasksWithConcurrency } from "./host/kairos-runtime-io.js";
export {
  shortenHomeInString,
  shortenHomePath,
  resolveUserPath,
  truncateUtf16Safe,
} from "./host/kairos-runtime-io.js";
export type { kairosConfig } from "./host/kairos-runtime-config.js";
export type { SessionSendPolicyConfig } from "./host/kairos-runtime-config.js";
export type { SecretInput } from "./host/kairos-runtime-config.js";
export type {
  MemoryBackend,
  MemoryCitationsMode,
  MemoryQmdConfig,
  MemoryQmdIndexPath,
  MemoryQmdMcporterConfig,
  MemoryQmdSearchMode,
} from "./host/kairos-runtime-config.js";
export type { MemorySearchConfig } from "./host/kairos-runtime-config.js";
