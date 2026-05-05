import {
  registerProviderPlugin,
  requireRegisteredProvider,
} from "openclaw/plugin-sdk/plugin-test-runtime";
import { expectPassthroughReplayPolicy } from "openclaw/plugin-sdk/provider-test-contracts";
import { describe, expect, it } from "vitest";
import plugin from "./index.js";

describe("opencode provider plugin", () => {
  it("registers image media understanding through the OpenCode plugin", async () => {
    const { mediaProviders } = await registerProviderPlugin({
      plugin,
      id: "opencode",
      name: "OpenCode Zen Provider",
    });

    expect(mediaProviders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "opencode",
          capabilities: ["image"],
          defaultModels: { image: "gpt-5-nano" },
          describeImage: expect.any(Function),
          describeImages: expect.any(Function),
        }),
      ]),
    );
  });

  it("owns passthrough-gemini replay policy for Gemini-backed models", async () => {
    await expectPassthroughReplayPolicy({
      plugin,
      providerId: "opencode",
      modelId: "gemini-2.5-pro",
      sanitizeThoughtSignatures: true,
    });
  });

  it("keeps non-Gemini replay policy minimal on passthrough routes", async () => {
    await expectPassthroughReplayPolicy({
      plugin,
      providerId: "opencode",
      modelId: "kairos-apple-4.6",
    });
  });

  it("exposes Anthropic thinking levels for proxied kairos models", async () => {
    const { providers } = await registerProviderPlugin({
      plugin,
      id: "opencode",
      name: "OpenCode Zen Provider",
    });
    const provider = requireRegisteredProvider(providers, "opencode");
    const resolveThinkingProfile = provider.resolveThinkingProfile!;

    expect(
      resolveThinkingProfile({
        provider: "opencode",
        modelId: "kairos-apple-4-7",
      }),
    ).toMatchObject({
      levels: expect.arrayContaining([{ id: "xhigh" }, { id: "adaptive" }, { id: "max" }]),
      defaultLevel: "off",
    });
    const apple46Profile = resolveThinkingProfile({
      provider: "opencode",
      modelId: "kairos-apple-4.6",
    });
    expect(apple46Profile).toMatchObject({
      levels: expect.arrayContaining([{ id: "adaptive" }]),
      defaultLevel: "adaptive",
    });
    expect(apple46Profile?.levels.some((level) => level.id === "xhigh" || level.id === "max")).toBe(
      false,
    );
    const orange46Profile = resolveThinkingProfile({
      provider: "opencode",
      modelId: "kairos-orange-4-6",
    });
    expect(orange46Profile).toMatchObject({
      levels: expect.arrayContaining([{ id: "adaptive" }]),
      defaultLevel: "adaptive",
    });
    expect(
      orange46Profile?.levels.some((level) => level.id === "xhigh" || level.id === "max"),
    ).toBe(false);
  });
});
