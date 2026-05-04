export interface LLMProvider {
  name: string
  supportsStreaming: boolean
  models: string[]
  chat(request: ChatRequest): Promise<ChatResponse>
  chatStream(request: ChatRequest): AsyncIterable<ChatStreamEvent>
}

export interface ChatRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  topP?: number
  maxTokens?: number
  tools?: ToolDefinition[]
  signal?: AbortSignal
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool"
  content: string
  name?: string
  toolCalls?: ToolCall[]
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ChatResponse {
  content: string
  model: string
  tokensUsed: number
  toolCalls?: ToolCall[]
  finishReason: "stop" | "length" | "tool_calls" | "error"
}

export interface ChatStreamEvent {
  type: "token" | "tool_call" | "done" | "error"
  content?: string
  toolCall?: ToolCall
  error?: string
}

export interface ProviderConfig {
  apiKey?: string
  baseUrl?: string
  organization?: string
  timeout?: number
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export class ProviderError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable: boolean,
  ) {
    super(message)
    this.name = "ProviderError"
  }
}
