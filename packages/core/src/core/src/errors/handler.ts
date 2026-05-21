import type { ErrorHandler, ErrorContext, RecoveryStrategy, ErrorLogger } from "./types"

export class CoreErrorHandler implements ErrorHandler {
  private strategies: RecoveryStrategy[] = []
  private logger: ErrorLogger
  private listeners: Set<(error: Error, context: ErrorContext) => void> = new Set()

  constructor(logger?: ErrorLogger) {
    this.logger = logger ?? new DefaultErrorLogger()
  }

  async handle(error: unknown, context: ErrorContext): Promise<void> {
    const normalized = this.normalizeError(error)

    this.logger.error(normalized.message, context)
    this.notifyListeners(normalized, context)

    for (const strategy of this.strategies) {
      if (strategy.canRecover(error)) {
        try {
          await strategy.recover(error, context)
          return
        } catch {
          // Strategy failed, try next
        }
      }
    }
  }

  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy)
  }

  onError(handler: (error: Error, context: ErrorContext) => void): void {
    this.listeners.add(handler)
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof Error) return error
    return new Error(String(error))
  }

  private notifyListeners(error: Error, context: ErrorContext): void {
    this.listeners.forEach((listener) => {
      try {
        listener(error, context)
      } catch {
        // Listener error
      }
    })
  }
}

class DefaultErrorLogger implements ErrorLogger {
  log(error: Error, context: ErrorContext): void {
    console.error(`[${context.operation}]`, error.message, context)
  }

  warn(message: string, context?: ErrorContext): void {
    console.warn(`[WARN]`, message, context)
  }

  error(message: string, context?: ErrorContext): void {
    console.error(`[ERROR]`, message, context)
  }
}

export class ReconnectStrategy implements RecoveryStrategy {
  canRecover(error: unknown): boolean {
    const msg = String(error)
    return msg.includes("ECONNREFUSED") || msg.includes("timeout")
  }

  async recover(error: unknown, context: ErrorContext): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

export class ConfigRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: unknown): boolean {
    const msg = String(error)
    return msg.includes("config") || msg.includes("JSON")
  }

  async recover(error: unknown, context: ErrorContext): Promise<void> {
    // Reset to default config
  }
}
