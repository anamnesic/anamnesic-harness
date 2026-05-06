import { describe, expect, it } from "vitest";
import {
  kairosMediaUnderstandingProvider,
  stripkairosDisabledResponsesReasoningPayload,
} from "./media-understanding-provider.js";

describe("kairos media understanding provider", () => {
  it("strips disabled Responses reasoning payloads", () => {
    const payload = {
      reasoning: { effort: "none" },
      include: ["reasoning.encrypted_content"],
      store: false,
    };

    stripkairosDisabledResponsesReasoningPayload(payload);

    expect(payload).toEqual({
      include: ["reasoning.encrypted_content"],
      store: false,
    });
  });

  it("keeps supported Responses reasoning payloads", () => {
    const payload = {
      reasoning: { effort: "low" },
      store: false,
    };

    stripkairosDisabledResponsesReasoningPayload(payload);

    expect(payload).toEqual({
      reasoning: { effort: "low" },
      store: false,
    });
  });

  it("declares kairos image understanding support", () => {
    expect(kairosMediaUnderstandingProvider).toEqual(
      expect.objectContaining({
        id: "kairos",
        capabilities: ["image"],
        defaultModels: { image: "gpt-5-nano" },
        describeImage: expect.any(Function),
        describeImages: expect.any(Function),
      }),
    );
  });
});
