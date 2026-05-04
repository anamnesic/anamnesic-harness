export interface AgentConfig {
  id: string
  name: string
  description?: string
  model: ModelSelection
  systemPrompt?: string
  maxTokens?: number
  maxRetries?: number
  timeout?: number
  fallback?: FallbackConfig
}

export interface ModelSelection {
  primary: string
  fallback?: string[]
  strategy: "auto" | "manual" | "cost-optimized"
  temperature?: number
  topP?: number
}

export interface FallbackConfig {
  enabled: boolean
  maxAttempts: number
  strategies: FallbackStrategy[]
  onFailure?: "error" | "partial" | "retry"
}

export type FallbackStrategy =
  | "model-switch"
  | "reduce-context"
  | "simplify-prompt"
  | "timeout-extend"

export interface AgentLimits {
  maxTokensPerRequest: number
  maxRequestsPerMinute: number
  maxConcurrentRequests: number
  maxContextWindow: number
  maxResponseTime: number
}

export interface AgentContext {
  sessionId: string
  messages: Message[]
  metadata: Record<string, unknown>
  tokenCount: number
}

export interface Message {
  role: "user" | "assistant" | "system" | "tool"
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface AgentResult {
  success: boolean
  message?: Message
  error?: AgentError
  tokensUsed: number
  executionTime: number
  modelUsed: string
}

export interface AgentError {
  code: string
  message: string
  retryable: boolean
  details?: unknown
}

export interface ExecutionOptions {
  stream?: boolean
  signal?: AbortSignal
  tools?: ToolDefinition[]
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}
