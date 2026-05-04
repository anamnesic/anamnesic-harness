#!/usr/bin/env node

import { CoreCLIManager } from "../dist/cli/manager.js"
import { CoreCommand, DoctorCommand, PluginsCommand, ChannelsCommand, SessionsCommand, RunCommand } from "../dist/cli/commands.js"
import { SessionManager } from "../dist/sessions/manager.js"

const manager = new CoreCLIManager()

const sessions = new SessionManager({
  dataDir: "/tmp/kairos-cli",
  maxContextTokens: 4096,
  autoTitle: true,
  embeddingEnabled: false,
})

manager.register(new CoreCommand())
manager.register(new DoctorCommand())
manager.register(new PluginsCommand())
manager.register(new ChannelsCommand())
manager.register(new SessionsCommand(sessions))
manager.register(new RunCommand())

const args = process.argv.slice(2)
const command = args[0] || "help"
const remainingArgs = args.slice(1)

manager.execute(command, {
  command,
  args: remainingArgs,
  flags: {}
}).catch(err => {
  console.error("Error:", err.message)
  process.exit(1)
})
