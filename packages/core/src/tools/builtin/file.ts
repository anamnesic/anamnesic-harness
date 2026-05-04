import type { ToolHandler, ToolExecutionContext, ToolResult } from "../types"
import { readFile, writeFile, mkdir, readdir, stat } from "fs/promises"
import { existsSync } from "fs"
import { join, resolve } from "path"

function sanitizePath(inputPath: string, baseDir: string): string {
  const resolved = resolve(baseDir, inputPath)
  if (!resolved.startsWith(baseDir)) {
    throw new Error("Path traversal detected")
  }
  return resolved
}

export const fileReadTool = {
  definition: {
    name: "file_read",
    description: "Read contents of a file",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
        offset: { type: "number", description: "Start line", default: 0 },
        limit: { type: "number", description: "Max lines", default: 1000 },
      },
      required: ["path"],
    },
    permissions: "read",
    category: "file",
  },

  handler: async (args: any, context: any): Promise<ToolResult> => {
    try {
      const filePath = sanitizePath(
        args.path as string,
        context.workingDirectory,
      )

      if (!existsSync(filePath)) {
        return { success: false, error: "File not found" }
      }

      const content = await readFile(filePath, "utf-8")
      const lines = content.split("\n")
      const offset = (args.offset as number) ?? 0
      const limit = (args.limit as number) ?? 1000

      return {
        success: true,
        output: lines.slice(offset, offset + limit).join("\n"),
        metadata: { path: filePath, lines: lines.length },
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  },
}

export const fileWriteTool = {
  definition: {
    name: "file_write",
    description: "Write contents to a file",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
        content: { type: "string", description: "File content" },
        append: { type: "boolean", description: "Append mode", default: false },
      },
      required: ["path", "content"],
    },
    permissions: "write",
    category: "file",
  },

  handler: async (args: any, context: any): Promise<ToolResult> => {
    try {
      const filePath = sanitizePath(
        args.path as string,
        context.workingDirectory,
      )

      const dir = filePath.split("/").slice(0, -1).join("/")
      if (dir && !existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }

      if (args.append) {
        await writeFile(filePath, args.content as string, { flag: "a" })
      } else {
        await writeFile(filePath, args.content as string)
      }

      return {
        success: true,
        output: { path: filePath },
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  },
}

export const fileEditTool = {
  definition: {
    name: "file_edit",
    description: "Edit a file by replacing text",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
        oldText: { type: "string", description: "Text to replace" },
        newText: { type: "string", description: "Replacement text" },
        replaceAll: { type: "boolean", description: "Replace all occurrences", default: false },
      },
      required: ["path", "oldText", "newText"],
    },
    permissions: "write",
    category: "file",
  },

  handler: async (args: any, context: any): Promise<ToolResult> => {
    try {
      const filePath = sanitizePath(
        args.path as string,
        context.workingDirectory,
      )

      if (!existsSync(filePath)) {
        return { success: false, error: "File not found" }
      }

      const content = await readFile(filePath, "utf-8")
      const oldText = args.oldText as string
      const newText = args.newText as string

      let newContent: string
      if (args.replaceAll) {
        newContent = content.split(oldText).join(newText)
      } else {
        newContent = content.replace(oldText, newText)
      }

      if (newContent === content) {
        return { success: false, error: "Text not found in file" }
      }

      await writeFile(filePath, newContent)
      return { success: true, output: { path: filePath } }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  },
}
