import type { ToolExecutionContext, ToolResult } from "../tools"

export interface SandboxConfig {
  enabled: boolean
  backend: "docker" | "ssh" | "none"
  timeout: number
  networkAccess: boolean
  readonlyPaths: string[]
  writePaths: string[]
}

export class ToolSandbox {
  private config: SandboxConfig

  constructor(config?: Partial<SandboxConfig>) {
    this.config = {
      enabled: config?.enabled ?? false,
      backend: config?.backend ?? "none",
      timeout: config?.timeout ?? 30000,
      networkAccess: config?.networkAccess ?? false,
      readonlyPaths: config?.readonlyPaths ?? [],
      writePaths: config?.writePaths ?? [],
    }
  }

  isSandboxed(toolName: string): boolean {
    const sandboxedTools = ["bash", "file_write", "file_edit"]
    return sandboxedTools.includes(toolName) && this.config.enabled
  }

  async executeSandboxed(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolResult> {
    if (!this.isSandboxed(toolName)) {
      return {
        success: false,
        error: "Tool is not sandboxed",
      }
    }

    switch (this.config.backend) {
      case "docker":
        return this.executeInDocker(toolName, args, context)
      case "ssh":
        return this.executeViaSSH(toolName, args, context)
      default:
        return {
          success: false,
          error: "No sandbox backend configured",
        }
    }
  }

  private async executeInDocker(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolResult> {
    return {
      success: true,
      output: `Docker sandbox: ${toolName} would execute here`,
      metadata: { sandbox: "docker", tool: toolName },
    }
  }

  private async executeViaSSH(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolResult> {
    return {
      success: true,
      output: `SSH sandbox: ${toolName} would execute here`,
      metadata: { sandbox: "ssh", tool: toolName },
    }
  }

  getConfig(): Readonly<SandboxConfig> {
    return Object.freeze({ ...this.config })
  }

  updateConfig(config: Partial<SandboxConfig>): void {
    Object.assign(this.config, config)
  }
}
