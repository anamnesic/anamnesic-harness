export type { ChannelPlugin, kairosPluginApi, PluginRuntime } from "kairos/plugin-sdk/core";
export type { kairosConfig } from "kairos/plugin-sdk/config-types";
export type {
  kairosPluginService,
  kairosPluginServiceContext,
  PluginLogger,
} from "kairos/plugin-sdk/core";
export type { ResolvedQQBotAccount, QQBotAccountConfig } from "./src/types.js";
export { getQQBotRuntime, setQQBotRuntime } from "./src/bridge/runtime.js";
