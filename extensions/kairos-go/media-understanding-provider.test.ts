import { describe, expect, it } from "vitest";
import { kairosGoMediaUnderstandingProvider } from "./media-understanding-provider.js";

describe("kairos-go media understanding provider", () => {
  it("declares image understanding support", () => {
    expect(kairosGoMediaUnderstandingProvider).toEqual(
      expect.objectContaining({
        id: "kairos-go",
        capabilities: ["image"],
        defaultModels: { image: "kimi-k2.6" },
        describeImage: expect.any(Function),
        describeImages: expect.any(Function),
      }),
    );
  });
});
