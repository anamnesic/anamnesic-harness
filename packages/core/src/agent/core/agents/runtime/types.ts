import type { AgentCapability, AgentMetadata, AgentResult, IAgentContext } from '../contracts';
import type { MultiProviderSettings } from '../../providers/multi-provider';

// ─── Execution Limits ─────────────────────────────────────────

export interface ExecutionLimits {
  /** Maximum execution time in milliseconds */
  maxExecutionTimeMs?: number;
  /** Maximum memory usage in MB */
  maxMemoryMb?: number;
  /** Maximum number of LLM turns */
  maxTurns?: number;
  /** Maximum total tokens */
  maxTotalTokens?: number;
  /** Maximum cost in USD */
  maxCostUsd?: number;
}

// ─── Model Selection ──────────────────────────────────────────

export type ModelSelectionStrategy =
  | 'capability-based'  // Select based on agent capabilities
  | 'cost-optimized'    // Prefer cheaper models
  | 'performance'       // Prefer best-performing models
  | 'fallback-chain';   // Use configured fallback chain

export interface ModelSelectionConfig {
  strategy: ModelSelectionStrategy;
  /** Override model for specific capabilities */
  capabilityOverrides?: Partial<Record<AgentCapability, string>>;
  /** Preferred models in order (for fallback-chain strategy) */
  preferredModels?: string[];
  /** Models to avoid */
  excludedModels?: string[];
  /** Maximum cost per request in USD */
  maxCostPerRequest?: number;
}

// ─── Runtime Configuration ───────────────────────────────────

export interface AgentRuntimeConfig {
  /** Provider settings for LLM calls */
  providerSettings: MultiProviderSettings;
  /** Provider ID (anthropic, openai, etc.) */
  providerId?: string;
  /** Execution limits */
  limits?: ExecutionLimits;
  /** Model selection configuration */
  modelSelection?: ModelSelectionConfig;
  /** Enable fallback on model failure */
  enableFallback?: boolean;
  /** Maximum fallback attempts */
  maxFallbackAttempts?: number;
  /** Custom system prompt (overrides agent default) */
  systemPrompt?: string;
  /** Tools available to the agent */
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

// ─── Runtime Events ──────────────────────────────────────────

export type RuntimeEventType =
  | 'execution:start'
  | 'execution:complete'
  | 'execution:failed'
  | 'execution:cancelled'
  | 'execution:limit-reached'
  | 'model:selected'
  | 'model:fallback'
  | 'model:failed'
  | 'turn:start'
  | 'turn:complete'
  | 'tool:start'
  | 'tool:complete'
  | 'tool:failed';

export interface RuntimeEvent {
  type: RuntimeEventType;
  timestamp: Date;
  agentId?: string;
  sessionId?: string;
  data?: Record<string, unknown>;
}

export type RuntimeEventCallback = (event: RuntimeEvent) => void;

// ─── Runtime Result ──────────────────────────────────────────

export interface RuntimeExecutionResult extends AgentResult {
  modelUsed: string;
  fallbackChain?: string[];
  limitsEnforced: {
    executionTimeMs: number;
    turnsUsed: number;
    tokensUsed: number;
    estimatedCostUsd: number;
  };
}

// ─── Model Info ──────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  provider: string;
  capabilities: AgentCapability[];
  contextWindow: number;
  maxOutputTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  supportsTools: boolean;
  supportsVision: boolean;
}
