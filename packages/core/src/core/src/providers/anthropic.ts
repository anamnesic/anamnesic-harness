import type { LLMProvider, ChatRequest, ChatResponse, ChatStreamEvent, ProviderConfig } from "./types"

export class AnthropicProvider implements LLMProvider {
  name = "anthropic"
  supportsStreaming = true
  models = ["claude-3-haiku", "claude-3-sonnet", "claude-3-opus", "claude-3.5-sonnet"]

  private config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.simulateAPICall(request)
    return response
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatStreamEvent> {
    const response = await this.simulateAPICall(request)

    for (const char of response.content) {
      yield { type: "token", content: char }
    }

    yield { type: "done" }
  }

  private async simulateAPICall(request: ChatRequest): Promise<ChatResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300))

    return {
      content: `Response from Anthropic ${request.model}`,
      model: request.model,
      tokensUsed: 200,
      finishReason: "stop",
    }
  }
}
