export interface ErrorContext {
  operation: string
  sessionId?: string
  agentId?: string
  channelId?: string
  pluginName?: string
  retryCount?: number
  metadata?: Record<string, unknown>
}

export interface ErrorHandler {
  handle(error: unknown, context: ErrorContext): Promise<void>
}

export interface RecoveryStrategy {
  canRecover(error: unknown): boolean
  recover(error: unknown, context: ErrorContext): Promise<void>
}

export interface ErrorLogger {
  log(error: Error, context: ErrorContext): void
  warn(message: string, context?: ErrorContext): void
  error(message: string, context?: ErrorContext): void
}
