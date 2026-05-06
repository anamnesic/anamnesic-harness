import type { ToolHandler, ToolExecutionContext, ToolResult } from "../types"
import { spawn } from "child_process"

export const gitTool = {
  definition: {
    name: "git",
    description: "Execute git commands",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Git command (without 'git')" },
        workdir: { type: "string", description: "Working directory" },
      },
      required: ["command"],
    },
    permissions: "read",
    category: "git",
  },

  handler: async (args: any, context: any): Promise<ToolResult> => {
    const command = args.command as string
    const workdir = (args.workdir as string) ?? context.workingDirectory

    const blocked = ["push", "force", "reset --hard"]
    if (blocked.some((cmd) => command.includes(cmd))) {
      return {
        success: false,
        error: "Git command blocked by security policy",
      }
    }

    return new Promise((resolve) => {
      const proc = spawn("git", command.split(/\s+/), {
        cwd: workdir,
        env: context.environment,
      })

      let stdout = ""
      let stderr = ""

      proc.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString()
      })

      proc.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString()
      })

      proc.on("close", (code) => {
        resolve({
          success: code === 0,
          output: { stdout, stderr, code },
        })
      })

      proc.on("error", (err) => {
        resolve({
          success: false,
          error: err.message,
        })
      })
    })
  },
}
