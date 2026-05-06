import { getToolRegistry, ToolBuilder } from '../agents/tools';
import { readFile, writeFile, deleteFile, listFiles, searchCode, editFile } from './file-tools';
import { runCommand } from './run-command';
import { globFiles, grepFiles } from './search-tools';

export function registerAllTools(): void {
  const registry = getToolRegistry();

  // File tools
  registry.register(
    ToolBuilder.create('readFile')
      .description('Read contents of a file with optional line range')
      .parameters({
        path: { type: 'string', description: 'File path relative to workspace' },
        startLine: { type: 'number', description: 'Optional start line (1-indexed)' },
        endLine: { type: 'number', description: 'Optional end line (1-indexed)' },
      })
      .execute(async (ctx, input) => readFile(ctx, input as any))
      .permissions(['files:read' as any])
      .riskLevel('safe')
      .build()
  );

  registry.register(
    ToolBuilder.create('writeFile')
      .description('Write content to a file')
      .parameters({
        path: { type: 'string', description: 'File path relative to workspace' },
        content: { type: 'string', description: 'Content to write' },
        append: { type: 'boolean', description: 'Append to file instead of overwrite' },
      })
      .execute(async (ctx, input) => writeFile(ctx, input as any))
      .permissions(['files:write'])
      .riskLevel('moderate')
      .build()
  );

  registry.register(
    ToolBuilder.create('editFile')
      .description('Edit a file by replacing text')
      .parameters({
        path: { type: 'string', description: 'File path relative to workspace' },
        oldText: { type: 'string', description: 'Text to replace' },
        newText: { type: 'string', description: 'Replacement text' },
        replaceAll: { type: 'boolean', description: 'Replace all occurrences' },
      })
      .execute(async (ctx, input) => editFile(ctx, input as any))
      .permissions(['files:write'])
      .riskLevel('moderate')
      .build()
  );

  registry.register(
    ToolBuilder.create('deleteFile')
      .description('Delete a file from the workspace')
      .parameters({
        path: { type: 'string', description: 'File path relative to workspace' },
      })
      .execute(async (ctx, input) => deleteFile(ctx, input as any))
      .permissions(['files:delete'])
      .riskLevel('destructive')
      .build()
  );

  registry.register(
    ToolBuilder.create('listFiles')
      .description('List files in a directory')
      .parameters({
        path: { type: 'string', description: 'Directory path relative to workspace' },
        recursive: { type: 'boolean', description: 'List recursively' },
      })
      .execute(async (ctx, input) => listFiles(ctx, input as any))
      .permissions(['files:read' as any])
      .riskLevel('safe')
      .build()
  );

  registry.register(
    ToolBuilder.create('searchCode')
      .description('Search for pattern in code files')
      .parameters({
        pattern: { type: 'string', description: 'Search pattern (regex)' },
        path: { type: 'string', description: 'Directory to search in' },
        filePattern: { type: 'string', description: 'Glob pattern for files' },
      })
      .execute(async (ctx, input) => searchCode(ctx, input as any))
      .permissions(['files:read' as any])
      .riskLevel('safe')
      .build()
  );

  // Command execution
  registry.register(
    ToolBuilder.create('runCommand')
      .description('Execute a shell command')
      .parameters({
        command: { type: 'string', description: 'Command to execute' },
        cwd: { type: 'string', description: 'Working directory (relative to workspace)' },
        timeoutMs: { type: 'number', description: 'Timeout in milliseconds' },
      })
      .execute(async (ctx, input) => runCommand(ctx, input as any))
      .permissions(['commands:run'])
      .riskLevel('moderate')
      .build()
  );

  // Search tools
  registry.register(
    ToolBuilder.create('globFiles')
      .description('Find files matching a glob pattern')
      .parameters({
        pattern: { type: 'string', description: 'Glob pattern' },
        path: { type: 'string', description: 'Root directory' },
      })
      .execute(async (ctx, input) => globFiles(ctx, input as any))
      .permissions(['files:read' as any])
      .riskLevel('safe')
      .build()
  );

  registry.register(
    ToolBuilder.create('grepFiles')
      .description('Search file contents with regex')
      .parameters({
        pattern: { type: 'string', description: 'Regex pattern' },
        path: { type: 'string', description: 'Directory to search' },
        filePattern: { type: 'string', description: 'Glob pattern for files' },
      })
      .execute(async (ctx, input) => grepFiles(ctx, input as any))
      .permissions(['files:read' as any])
      .riskLevel('safe')
      .build()
  );
}

// Auto-register on import
if (typeof window === 'undefined') {
  registerAllTools();
}
