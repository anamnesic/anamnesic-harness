import { createPluginRuntimeStore } from "kairos/plugin-sdk/runtime-store";
import type { PluginRuntime } from "kairos/plugin-sdk/runtime-store";

const { setRuntime: setMSTeamsRuntime, getRuntime: getMSTeamsRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "msteams",
    errorMessage: "MSTeams runtime not initialized",
  });
export { getMSTeamsRuntime, setMSTeamsRuntime };
