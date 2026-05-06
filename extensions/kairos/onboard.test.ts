import {
  expectProviderOnboardAllowlistAlias,
  expectProviderOnboardPrimaryAndFallbacks,
} from "kairos/plugin-sdk/provider-test-contracts";
import { describe, it } from "vitest";
import { applykairosZenConfig, applykairosZenProviderConfig } from "./onboard.js";

const MODEL_REF = "kairos/kairos-apple-4-6";

describe("kairos onboard", () => {
  it("adds allowlist entry and preserves alias", () => {
    expectProviderOnboardAllowlistAlias({
      applyProviderConfig: applykairosZenProviderConfig,
      modelRef: MODEL_REF,
      alias: "My apple",
    });
  });

  it("sets primary model and preserves existing model fallbacks", () => {
    expectProviderOnboardPrimaryAndFallbacks({
      applyConfig: applykairosZenConfig,
      modelRef: MODEL_REF,
    });
  });
});
