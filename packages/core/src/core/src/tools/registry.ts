import type {
  ToolDefinition,
  ToolHandler,
  ToolRegistryEntry,
  ToolExecutionContext,
  ToolResult,
} from "./types"

export class ToolRegistry {
  private tools: Map<string, ToolRegistryEntry> = new Map()

  register(definition: ToolDefinition, handler: ToolHandler): void {
    if (this.tools.has(definition.name)) {
      throw new Error(`Tool ${definition.name} is already registered`)
    }

    this.tools.set(definition.name, { ...definition, handler })
  }

  unregister(name: string): boolean {
    return this.tools.delete(name)
  }

  get(name: string): ToolRegistryEntry | undefined {
    return this.tools.get(name)
  }

  list(): ToolRegistryEntry[] {
    return Array.from(this.tools.values())
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolResult> {
    const entry = this.tools.get(name)

    if (!entry) {
      return {
        success: false,
        error: `Tool ${name} not found`,
      }
    }

    try {
      const result = await entry.handler(args, context)

      if (isAsyncIterable(result)) {
        return {
          success: true,
          stream: result,
        }
      }

      return result
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }

  clear(): void {
    this.tools.clear()
  }
}

function isAsyncIterable(obj: unknown): obj is AsyncIterable<string> {
  return obj !== null && typeof obj === "object" && Symbol.asyncIterator in obj
}
