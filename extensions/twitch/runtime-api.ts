// Private runtime barrel for the bundled Twitch extension.
// Keep this barrel thin and aligned with the local extension surface.

export type {
  ChannelAccountSnapshot,
  ChannelCapabilities,
  ChannelGatewayContext,
  ChannelLogSink,
  ChannelMessageActionAdapter,
  ChannelMessageActionContext,
  ChannelMeta,
  ChannelOutboundAdapter,
  ChannelOutboundContext,
  ChannelResolveKind,
  ChannelResolveResult,
  ChannelStatusAdapter,
} from "kairos/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "kairos/plugin-sdk/channel-core";
export type { OutboundDeliveryResult } from "kairos/plugin-sdk/channel-send-result";
export type { kairosConfig } from "kairos/plugin-sdk/config-types";
export type { RuntimeEnv } from "kairos/plugin-sdk/runtime";
export type { WizardPrompter } from "kairos/plugin-sdk/setup";
