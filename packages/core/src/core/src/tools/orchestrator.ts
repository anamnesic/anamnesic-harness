import type {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  ToolRegistryEntry,
} from "./types"
import { ToolRegistry } from "./registry.js"
import type { PermissionManager } from "./types.js"
import { DefaultPermissionManager } from "./permissions.js"

export class ToolOrchestrator {
  private registry: ToolRegistry
  private permissions: PermissionManager

  constructor(
    registry?: ToolRegistry,
    permissions?: PermissionManager,
  ) {
    this.registry = registry ?? new ToolRegistry()
    this.permissions = permissions ?? new DefaultPermissionManager()
  }

  async executeTool(
    name: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolResult> {
    const tool = this.registry.get(name)

    if (!tool) {
      return {
        success: false,
        error: `Tool ${name} not found`,
      }
    }

    const check = await this.permissions.check(tool, context)

    if (!check.granted) {
      return {
        success: false,
        error: check.reason ?? "Permission denied",
        metadata: { requiresUserApproval: check.requiresUserApproval },
      }
    }

    return this.registry.execute(name, args, context)
  }

  registerTool(
    definition: ToolDefinition,
    handler: ToolRegistryEntry["handler"],
  ): void {
    this.registry.register(definition, handler)
  }

  getRegistry(): ToolRegistry {
    return this.registry
  }

  getPermissions(): PermissionManager {
    return this.permissions
  }
}
