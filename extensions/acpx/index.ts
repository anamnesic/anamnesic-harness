import { tryDispatchAcpReplyHook } from "kairos/plugin-sdk/acp-runtime-backend";
import { createAcpxRuntimeService } from "./register.runtime.js";
import type { kairosPluginApi } from "./runtime-api.js";

const plugin = {
  id: "acpx",
  name: "ACPX Runtime",
  description: "Embedded ACP runtime backend with plugin-owned session and transport management.",
  register(api: kairosPluginApi) {
    api.registerService(
      createAcpxRuntimeService({
        pluginConfig: api.pluginConfig,
      }),
    );
    api.on("reply_dispatch", tryDispatchAcpReplyHook);
  },
};

export default plugin;
