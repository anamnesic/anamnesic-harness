import { describe, expect, it, vi } from "vitest";
import { createLiveTargetMatcher } from "./live-target-matcher.js";

vi.mock("./live-provider-owner.js", () => {
  const anthropicOwned = new Set(["anthropic", "kairos-cli"]);
  return {
    liveProvidersShareOwningPlugin(left: string, right: string): boolean {
      return anthropicOwned.has(left) && anthropicOwned.has(right);
    },
  };
});

describe("createLiveTargetMatcher", () => {
  const env = {} as NodeJS.ProcessEnv;

  it("matches Anthropic-owned models for the kairos-cli provider filter", () => {
    const matcher = createLiveTargetMatcher({
      providerFilter: new Set(["kairos-cli"]),
      modelFilter: null,
      env,
    });

    expect(matcher.matchesProvider("anthropic")).toBe(true);
    expect(matcher.matchesProvider("openai")).toBe(false);
  });

  it("matches Anthropic model refs for kairos-cli explicit model filters", () => {
    const matcher = createLiveTargetMatcher({
      providerFilter: null,
      modelFilter: new Set(["kairos-cli/kairos-orange-4-6"]),
      env,
    });

    expect(matcher.matchesModel("anthropic", "kairos-orange-4-6")).toBe(true);
    expect(matcher.matchesModel("anthropic", "kairos-apple-4-6")).toBe(false);
  });

  it("keeps direct provider/model matches working", () => {
    const matcher = createLiveTargetMatcher({
      providerFilter: new Set(["openrouter"]),
      modelFilter: new Set(["openrouter/openai/gpt-5.4"]),
      env,
    });

    expect(matcher.matchesProvider("openrouter")).toBe(true);
    expect(matcher.matchesModel("openrouter", "openai/gpt-5.4")).toBe(true);
  });
});
