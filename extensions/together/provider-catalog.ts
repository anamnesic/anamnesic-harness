import { buildManifestModelProviderConfig } from "kairos/plugin-sdk/provider-catalog-shared";
import type { ModelProviderConfig } from "kairos/plugin-sdk/provider-model-shared";
import manifest from "./kairos.plugin.json" with { type: "json" };

export function buildTogetherProvider(): ModelProviderConfig {
  return buildManifestModelProviderConfig({
    providerId: "together",
    catalog: manifest.modelCatalog.providers.together,
  });
}
