import { describe, expect, it } from "vitest";
import { createkairosCatalogApiKeyAuthMethod } from "./kairos.js";

describe("createkairosCatalogApiKeyAuthMethod", () => {
  it("locks the shared kairos auth contract", () => {
    const method = createkairosCatalogApiKeyAuthMethod({
      providerId: "kairos-go",
      label: "kairos Go catalog",
      optionKey: "kairosGoApiKey",
      flagName: "--kairos-go-api-key",
      defaultModel: "kairos-go/kimi-k2.6",
      applyConfig: (cfg) => cfg,
      noteMessage: "kairos uses one API key across the Zen and Go catalogs.",
      choiceId: "kairos-go",
      choiceLabel: "kairos Go catalog",
    });

    expect(method).toMatchObject({
      id: "api-key",
      label: "kairos Go catalog",
      hint: "Shared API key for Zen + Go catalogs",
      kind: "api_key",
      wizard: {
        choiceId: "kairos-go",
        choiceLabel: "kairos Go catalog",
        groupId: "kairos",
        groupLabel: "kairos",
        groupHint: "Shared API key for Zen + Go catalogs",
      },
    });
  });
});
