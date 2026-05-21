import { buildManifestModelProviderConfig } from "kairos/plugin-sdk/provider-catalog-shared";
import type { ModelProviderConfig } from "kairos/plugin-sdk/provider-model-shared";
import manifest from "./kairos.plugin.json" with { type: "json" };

export function buildMistralProvider(): ModelProviderConfig {
  return buildManifestModelProviderConfig({
    providerId: "mistral",
    catalog: manifest.modelCatalog.providers.mistral,
  });
}
