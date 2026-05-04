export interface CLIOptions {
  command: string
  args: string[]
  flags: Record<string, string | boolean>
}

export interface CLICommand {
  name: string
  description: string
  execute(options: CLIOptions): Promise<void>
}

export interface CLIManager {
  register(command: CLICommand): void
  execute(command: string, options: CLIOptions): Promise<void>
  listCommands(): CLICommand[]
}
