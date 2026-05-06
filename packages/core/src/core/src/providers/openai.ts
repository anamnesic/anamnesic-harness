import type { LLMProvider, ChatRequest, ChatResponse, ChatStreamEvent, ProviderConfig } from "./types"
import { ProviderError } from "./types"

export class OpenAIProvider implements LLMProvider {
  name = "openai"
  supportsStreaming = true
  models = ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-4o"]

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

    if (response.toolCalls) {
      for (const toolCall of response.toolCalls) {
        yield { type: "tool_call", toolCall }
      }
    }

    yield { type: "done" }
  }

  private async simulateAPICall(request: ChatRequest): Promise<ChatResponse> {
    await new Promise((resolve) => setTimeout(resolve, 200))

    return {
      content: `Response from OpenAI ${request.model}`,
      model: request.model,
      tokensUsed: 150,
      finishReason: "stop",
    }
  }
}
