// @ts-nocheck

import { kairos } from "@kairos-ai/core"
import { ReadTool } from "@kairos-ai/core/tools"

const kairos = kairos.make({})

kairos.tool.add(ReadTool)

kairos.tool.add({
  name: "bash",
  schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to run.",
      },
    },
    required: ["command"],
  },
  execute(input, ctx) {},
})

kairos.auth.add({
  provider: "openai",
  type: "api",
  value: process.env.OPENAI_API_KEY,
})

kairos.agent.add({
  name: "build",
  permissions: [],
  model: {
    id: "gpt-5-5",
    provider: "openai",
    variant: "xhigh",
  },
})

const sessionID = await kairos.session.create({
  agent: "build",
})

kairos.subscribe((event) => {
  console.log(event)
})

await kairos.session.prompt({
  sessionID,
  text: "hey what is up",
})

await kairos.session.prompt({
  sessionID,
  text: "what is up with this",
  files: [
    {
      mime: "image/png",
      uri: "data:image/png;base64,xxxx",
    },
  ],
})

await kairos.session.wait()

console.log(await kairos.session.messages(sessionID))
