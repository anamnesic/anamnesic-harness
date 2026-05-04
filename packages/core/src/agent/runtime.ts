import type {
  AgentConfig,
  AgentContext,
  AgentResult,
  AgentError,
  ExecutionOptions,
  ModelSelection,
  FallbackStrategy,
  AgentLimits,
} from "./types"

export class AgentRuntime {
  private config: AgentConfig
  private limits: AgentLimits
  private executionCount = 0
  private requestTimestamps: number[] = []

  constructor(config: AgentConfig, limits?: Partial<AgentLimits>) {
    this.config = config
    this.limits = {
      maxTokensPerRequest: limits?.maxTokensPerRequest ?? 4096,
      maxRequestsPerMinute: limits?.maxRequestsPerMinute ?? 60,
      maxConcurrentRequests: limits?.maxConcurrentRequests ?? 5,
      maxContextWindow: limits?.maxContextWindow ?? 128000,
      maxResponseTime: limits?.maxResponseTime ?? 30000,
    }
  }

  async execute(
    context: AgentContext,
    options?: ExecutionOptions,
  ): Promise<AgentResult> {
    const startTime = Date.now()
    const signal = options?.signal

    this.checkLimits()

    const model = this.selectModel(context)
    let lastError: AgentError | undefined

    const maxAttempts = this.config.fallback?.enabled
      ? this.config.fallback.maxAttempts
      : 1

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (signal?.aborted) {
        return this.createAbortedResult(startTime, model)
      }

      try {
        const result = await this.runWithModel(model, context, options)
        return result
      } catch (err) {
        lastError = this.normalizeError(err)

        if (!lastError.retryable || !this.config.fallback?.enabled) {
          break
        }

        const strategy = this.config.fallback.strategies[attempt]
        if (strategy) {
          model = await this.applyFallbackStrategy(strategy, model, context)
        }
      }
    }

    return {
      success: false,
      error: lastError ?? {
        code: "UNKNOWN_ERROR",
        message: "Agent execution failed",
        retryable: false,
      },
      tokensUsed: 0,
      executionTime: Date.now() - startTime,
      modelUsed: model,
    }
  }

  private selectModel(context: AgentContext): string {
    const selection = this.config.model

    switch (selection.strategy) {
      case "cost-optimized":
        return this.selectCheapestModel(selection)
      case "manual":
        return selection.primary
      case "auto":
      default:
        return this.selectBestModel(selection, context)
    }
  }

  private selectBestModel(
    selection: ModelSelection,
    context: AgentContext,
  ): string {
    if (context.tokenCount > this.limits.maxContextWindow * 0.8) {
      const fallback = selection.fallback?.find((m) => m.includes("large"))
      if (fallback) return fallback
    }
    return selection.primary
  }

  private selectCheapestModel(selection: ModelSelection): string {
    const costOrder = [
      "gpt-3.5-turbo",
      "gpt-4",
      "gpt-4-turbo",
      "claude-3-haiku",
      "claude-3-sonnet",
      "claude-3-opus",
    ]

    const allModels = [selection.primary, ...(selection.fallback ?? [])]
    return allModels.reduce((cheapest, current) => {
      const cheapestIdx = costOrder.indexOf(cheapest)
      const currentIdx = costOrder.indexOf(current)
      if (currentIdx === -1) return cheapest
      if (cheapestIdx === -1 || currentIdx < cheapestIdx) return current
      return cheapest
    })
  }

  private async runWithModel(
    model: string,
    context: AgentContext,
    options?: ExecutionOptions,
  ): Promise<AgentResult> {
    const startTime = Date.now()
    const timeout = this.config.timeout ?? this.limits.maxResponseTime

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await this.callLLM(model, context, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      return {
        success: true,
        message: {
          role: "assistant",
          content: response.content,
          timestamp: Date.now(),
          metadata: { model, tokens: response.tokensUsed },
        },
        tokensUsed: response.tokensUsed,
        executionTime: Date.now() - startTime,
        modelUsed: model,
      }
    } catch (err) {
      clearTimeout(timeoutId)
      throw err
    }
  }

  private async callLLM(
    model: string,
    context: AgentContext,
    options?: ExecutionOptions,
  ): Promise<{ content: string; tokensUsed: number }> {
    this.executionCount++
    this.requestTimestamps.push(Date.now())

    await new Promise((resolve) => setTimeout(resolve, 100))

    return {
      content: `Response from ${model}`,
      tokensUsed: 150,
    }
  }

  private async applyFallbackStrategy(
    strategy: FallbackStrategy,
    currentModel: string,
    context: AgentContext,
  ): Promise<string> {
    switch (strategy) {
      case "model-switch":
        return this.config.model.fallback?.[0] ?? currentModel
      case "reduce-context":
        context.messages = context.messages.slice(-5)
        return currentModel
      case "simplify-prompt":
        context.messages = context.messages.map((m) => ({
          ...m,
          content: m.content.slice(0, 1000),
        }))
        return currentModel
      case "timeout-extend":
        this.limits.maxResponseTime *= 2
        return currentModel
      default:
        return currentModel
    }
  }

  private checkLimits(): void {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => ts > oneMinuteAgo,
    )

    if (this.requestTimestamps.length >= this.limits.maxRequestsPerMinute) {
      throw new Error("Rate limit exceeded")
    }
  }

  private normalizeError(err: unknown): AgentError {
    if (err instanceof Error) {
      return {
        code: err.name,
        message: err.message,
        retryable: err.message.includes("timeout") ||
          err.message.includes("rate") ||
          err.message.includes("503"),
      }
    }
    return {
      code: "UNKNOWN_ERROR",
      message: String(err),
      retryable: false,
    }
  }

  private createAbortedResult(
    startTime: number,
    model: string,
  ): AgentResult {
    return {
      success: false,
      error: {
        code: "ABORTED",
        message: "Execution was aborted",
        retryable: false,
      },
      tokensUsed: 0,
      executionTime: Date.now() - startTime,
      modelUsed: model,
    }
  }

  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): Readonly<AgentConfig> {
    return Object.freeze({ ...this.config })
  }

  getLimits(): Readonly<AgentLimits> {
    return Object.freeze({ ...this.limits })
  }
}
