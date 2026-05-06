import type { LLMProvider, ProviderConfig } from "./types"
import { OpenAIProvider } from "./openai"
import { AnthropicProvider } from "./anthropic"

export class ProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map()

  constructor() {
    this.register(new OpenAIProvider({}))
    this.register(new AnthropicProvider({}))
  }

  register(provider: LLMProvider): void {
    if (this.providers.has(provider.name)) {
      throw new Error(`Provider ${provider.name} is already registered`)
    }
    this.providers.set(provider.name, provider)
  }

  unregister(name: string): boolean {
    return this.providers.delete(name)
  }

  get(name: string): LLMProvider | undefined {
    return this.providers.get(name)
  }

  list(): LLMProvider[] {
    return Array.from(this.providers.values())
  }

  getProviderForModel(model: string): LLMProvider | undefined {
    for (const provider of this.providers.values()) {
      if (provider.models.includes(model)) {
        return provider
      }
    }
    return undefined
  }
}
