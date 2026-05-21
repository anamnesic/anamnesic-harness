export * from "./client.js"
export * from "./server.js"

import { createkairosClient } from "./client.js"
import { createkairosServer } from "./server.js"
import type { ServerOptions } from "./server.js"

export async function createkairos(options?: ServerOptions) {
  const server = await createkairosServer({
    ...options,
  })

  const client = createkairosClient({
    baseUrl: server.url,
  })

  return {
    client,
    server,
  }
}
