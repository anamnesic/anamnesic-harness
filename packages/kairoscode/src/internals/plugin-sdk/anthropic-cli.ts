// Manual facade. Keep loader boundary explicit.
import { loadBundledPluginPublicSurfaceModuleSync } from "./facade-loader.js";

type FacadeModule = {
  kairos_CLI_BACKEND_ID: string;
  iskairosCliProvider: (providerId: string) => boolean;
};

function loadFacadeModule(): FacadeModule {
  return loadBundledPluginPublicSurfaceModuleSync<FacadeModule>({
    dirName: "anthropic",
    artifactBasename: "api.js",
  });
}
export const kairos_CLI_BACKEND_ID: FacadeModule["kairos_CLI_BACKEND_ID"] =
  loadFacadeModule()["kairos_CLI_BACKEND_ID"];
export const iskairosCliProvider: FacadeModule["iskairosCliProvider"] = ((...args) =>
  loadFacadeModule()["iskairosCliProvider"](...args)) as FacadeModule["iskairosCliProvider"];
