import type { CLICommand, CLIOptions, CLIManager } from "./types"

export class CoreCLIManager implements CLIManager {
  private commands: Map<string, CLICommand> = new Map()

  register(command: CLICommand): void {
    if (this.commands.has(command.name)) {
      throw new Error(`Command ${command.name} already registered`)
    }
    this.commands.set(command.name, command)
  }

  async execute(commandName: string, options: CLIOptions): Promise<void> {
    const command = this.commands.get(commandName)

    if (!command) {
      console.error(`Unknown command: ${commandName}`)
      console.log("Available commands:")
      this.listCommands().forEach((c) => {
        console.log(`  - ${c.name}: ${c.description}`)
      })
      return
    }

    await command.execute(options)
  }

  listCommands(): CLICommand[] {
    return Array.from(this.commands.values())
  }
}
