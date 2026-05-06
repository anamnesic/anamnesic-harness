// Private runtime barrel for the bundled Nostr extension.
// Keep this barrel thin and aligned with the local extension surface.

export type { kairosConfig } from "kairos/plugin-sdk/config-types";
export { getPluginRuntimeGatewayRequestScope } from "kairos/plugin-sdk/plugin-runtime";
export type { PluginRuntime } from "kairos/plugin-sdk/runtime-store";
