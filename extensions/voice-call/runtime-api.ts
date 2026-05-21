// Private runtime barrel for the bundled Voice Call extension.
// Keep this barrel thin and aligned with the local extension surface.

export { definePluginEntry } from "kairos/plugin-sdk/plugin-entry";
export type { kairosPluginApi } from "kairos/plugin-sdk/plugin-entry";
export type { GatewayRequestHandlerOptions } from "kairos/plugin-sdk/gateway-runtime";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
  requestBodyErrorToText,
} from "kairos/plugin-sdk/webhook-request-guards";
export { fetchWithSsrFGuard, isBlockedHostnameOrIp } from "kairos/plugin-sdk/ssrf-runtime";
export type { SessionEntry } from "kairos/plugin-sdk/session-store-runtime";
export {
  TtsAutoSchema,
  TtsConfigSchema,
  TtsModeSchema,
  TtsProviderSchema,
} from "kairos/plugin-sdk/tts-runtime";
export { sleep } from "kairos/plugin-sdk/runtime-env";
