export { MessageGateway as ChannelGateway } from "./gateway"
export type {
  ChannelPlugin,
  ChannelManifest,
  IncomingMessage,
  OutgoingMessage,
  User,
} from "./types"

// Re-export for backward compatibility
export { MessageGateway } from "./gateway"
