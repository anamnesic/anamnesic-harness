// This file serves as the public API for the core package.

// ─── Utils ───────────────────────────────────────────────────
export { safePath } from './utils/safe-path';
export { CryptoUtils } from './utils/crypto';

// ─── Types ───────────────────────────────────────────────────
export type {
  ActionLogEntry,
  FileAffected,
  CommandDetails,
  SnapshotFileMetadata,
  SnapshotMetadata,
  SnapshotConfig,
  ToolResult,
  RollbackResult,
  DryRunSummary,
  ToolName,
  ActionResult,
  FileAction,
  CommandRiskLevel,
  UserDecision,
  SnapshotFileAction,
} from './types/safety-net';
export { DEFAULT_SNAPSHOT_CONFIG } from './types/safety-net';

// ─── Safety Net Services ─────────────────────────────────────
export { ActionLogService } from './services/ActionLogService';
export { SnapshotService } from './services/SnapshotService';
export { RollbackService } from './services/RollbackService';

// ─── Core Tools ──────────────────────────────────────────────
export {
  readFile,
  writeFile,
  deleteFile,
  listFiles,
  searchCode,
  type ToolContext,
  type ReadFileInput,
  type WriteFileInput,
  type DeleteFileInput,
  type ListFilesInput,
  type SearchCodeInput,
} from './tools/file-tools';

export {
  runCommand,
  isCommandSafe,
  getCommandRiskLevel,
  type RunCommandInput,
  type RunCommandOptions,
} from './tools/run-command';

// ─── Guardrails ──────────────────────────────────────────────
export {
  validateCommand,
  isDestructiveCommand,
  isBlockedCommand,
  type CommandValidationResult,
} from './guardrails/command-validator';

// ─── Pipeline ────────────────────────────────────────────────
export {
  PipelineService,
  AGENT_META,
  type Pipeline,
  type PipelinePhase,
  type AgentTask,
  type AgentRole,
  type PhaseTemplate,
  type PipelineStatus,
  type PhaseStatus,
  type TaskStatus,
} from './pipeline';

// ─── Other Services ──────────────────────────────────────────
export { ProjectService } from './services/ProjectService';
export { ContextService } from './services/ContextService';
export { DecisionService } from './services/DecisionService';
export { ApiKeyService } from './services/ApiKeyService';
export { SyncConfigService } from './services/SyncConfigService';
export type { CreateSyncConfigInput, UpdateSyncConfigInput, SyncResult } from './services/SyncConfigService';
export { AutoSyncService } from './services/AutoSyncService';
export { ChatHistoryService } from './services/ChatHistoryService';
export type { SaveHistoryInput, HistoryFilter, BackupInfo, RecoveryResult } from './services/ChatHistoryService';

// ─── Chat ────────────────────────────────────────────────────
export { ChatService } from './chat';
export type { ChatMessage } from './chat';

// ─── Agent Config ────────────────────────────────────────────
export {
  loadAgentConfig,
  saveAgentConfig,
  getModelForAgent,
  DEFAULT_AGENT_MODELS,
  QUALITY_PRESETS,
  getModelCost,
  applyQualityPreset,
  isQualityPreset,
  getPMModelForPreset,
  recordModelFailure,
  getModelFailureCounts,
} from './agent-config';
export type { AgentModelConfig, PMModelAssignment, QualityPreset } from './agent-config';

// ─── Validation ──────────────────────────────────────────────
export * from './validation';

// ─── Entities ────────────────────────────────────────────────
export * from './entities';
