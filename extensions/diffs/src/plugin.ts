import path from "node:path";
import { resolveLivePluginConfigObject } from "kairos/plugin-sdk/plugin-config-runtime";
import {
  resolvePreferredkairosTmpDir,
  type kairosConfig,
  type kairosPluginApi,
} from "../api.js";
import {
  resolveDiffsPluginDefaults,
  resolveDiffsPluginSecurity,
  resolveDiffsPluginViewerBaseUrl,
} from "./config.js";
import { createDiffsHttpHandler } from "./http.js";
import { DIFFS_AGENT_GUIDANCE } from "./prompt-guidance.js";
import { DiffArtifactStore } from "./store.js";
import { createDiffsTool } from "./tool.js";

export function registerDiffsPlugin(api: kairosPluginApi): void {
  const store = new DiffArtifactStore({
    rootDir: path.join(resolvePreferredkairosTmpDir(), "kairos-diffs"),
    logger: api.logger,
  });
  const resolveCurrentPluginConfig = () =>
    resolveLivePluginConfigObject(
      api.runtime.config?.current
        ? () => api.runtime.config.current() as kairosConfig
        : undefined,
      "diffs",
      api.pluginConfig as Record<string, unknown>,
    ) ?? {};
  const resolveCurrentAccessConfig = () => {
    const currentConfig = (api.runtime.config?.current?.() ?? api.config) as kairosConfig;
    const pluginConfig = resolveCurrentPluginConfig();
    return {
      allowRemoteViewer: resolveDiffsPluginSecurity(pluginConfig).allowRemoteViewer,
      trustedProxies: currentConfig.gateway?.trustedProxies,
      allowRealIpFallback: currentConfig.gateway?.allowRealIpFallback === true,
    };
  };
  const initialAccessConfig = resolveCurrentAccessConfig();

  api.registerTool(
    (ctx) => {
      const pluginConfig = resolveCurrentPluginConfig();
      return createDiffsTool({
        api,
        store,
        defaults: resolveDiffsPluginDefaults(pluginConfig),
        viewerBaseUrl: resolveDiffsPluginViewerBaseUrl(pluginConfig),
        context: ctx,
      });
    },
    {
      name: "diffs",
    },
  );
  api.registerHttpRoute({
    path: "/plugins/diffs",
    auth: "plugin",
    match: "prefix",
    handler: createDiffsHttpHandler({
      store,
      logger: api.logger,
      allowRemoteViewer: initialAccessConfig.allowRemoteViewer,
      trustedProxies: initialAccessConfig.trustedProxies,
      allowRealIpFallback: initialAccessConfig.allowRealIpFallback,
      resolveAccessConfig: resolveCurrentAccessConfig,
    }),
  });
  api.on("before_prompt_build", async () => ({
    prependSystemContext: DIFFS_AGENT_GUIDANCE,
  }));
}
