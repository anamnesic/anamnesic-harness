import { buildManifestModelProviderConfig } from "kairos/plugin-sdk/provider-catalog-shared";
import type { ModelProviderConfig } from "kairos/plugin-sdk/provider-model-shared";
import manifest from "./kairos.plugin.json" with { type: "json" };

export function buildBytePlusProvider(): ModelProviderConfig {
  return buildManifestModelProviderConfig({
    providerId: "byteplus",
    catalog: manifest.modelCatalog.providers.byteplus,
  });
}

export function buildBytePlusCodingProvider(): ModelProviderConfig {
  return buildManifestModelProviderConfig({
    providerId: "byteplus-plan",
    catalog: manifest.modelCatalog.providers["byteplus-plan"],
  });
}
