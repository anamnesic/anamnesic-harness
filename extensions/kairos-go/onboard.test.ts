import { expectProviderOnboardPrimaryAndFallbacks } from "kairos/plugin-sdk/provider-test-contracts";
import { describe, expect, it } from "vitest";
import { applykairosGoConfig, applykairosGoProviderConfig } from "./onboard.js";

const MODEL_REF = "kairos-go/kimi-k2.6";

describe("kairos-go onboard", () => {
  it("leaves model aliases to the pi catalog", () => {
    const cfg = {
      agents: {
        defaults: {
          models: {
            [MODEL_REF]: { alias: "Kimi" },
          },
        },
      },
    };

    expect(applykairosGoProviderConfig(cfg)).toBe(cfg);
  });

  it("sets primary model and preserves existing model fallbacks", () => {
    expectProviderOnboardPrimaryAndFallbacks({
      applyConfig: applykairosGoConfig,
      modelRef: MODEL_REF,
    });
  });
});
