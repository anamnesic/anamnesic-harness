import type { ToolHandler, ToolExecutionContext, ToolResult } from "../types"
import { spawn } from "child_process"
import { readFile, writeFile, unlink } from "fs/promises"
import { existsSync } from "fs"

export const bashTool: { definition: any; handler: ToolHandler } = {
  definition: {
    name: "bash",
    description: "Execute bash commands in a sandboxed environment",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Command to execute" },
        timeout: { type: "number", description: "Timeout in ms", default: 30000 },
        workdir: { type: "string", description: "Working directory" },
      },
      required: ["command"],
    },
    permissions: "execute",
    category: "system",
    timeout: 30000,
  },

  handler: async (args, context) => {
    const command = args.command as string
    const timeout = (args.timeout as number) ?? 30000
    const workdir = (args.workdir as string) ?? context.workingDirectory

    const blocklist = ["rm -rf /", "dd if=", "mkfs", "fdisk"]
    if (blocklist.some((pattern) => command.includes(pattern))) {
      return {
        success: false,
        error: "Command blocked by security policy",
      }
    }

    return new Promise((resolve) => {
      const proc = spawn("bash", ["-c", command], {
        cwd: workdir,
        env: context.environment,
        timeout,
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
          metadata: { command, workdir },
        })
      })

      proc.on("error", (err) => {
        resolve({
          success: false,
          error: err.message,
        })
      })

      if (context.signal) {
        context.signal.addEventListener("abort", () => {
          proc.kill()
          resolve({
            success: false,
            error: "Command aborted",
          })
        })
      }
    })
  },
}
