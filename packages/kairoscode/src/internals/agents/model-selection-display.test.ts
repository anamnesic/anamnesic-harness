import { describe, expect, it } from "vitest";
import {
  resolveModelDisplayName,
  resolveModelDisplayRef,
  resolveSessionInfoModelSelection,
} from "./model-selection-display.js";

describe("model-selection-display", () => {
  describe("resolveModelDisplayRef", () => {
    it("keeps explicit runtime slash-bearing ids unchanged for display", () => {
      expect(
        resolveModelDisplayRef({
          runtimeModel: "anthropic/kairos-haiku-4.5",
        }),
      ).toBe("anthropic/kairos-haiku-4.5");
    });

    it("combines separate runtime provider and model ids", () => {
      expect(
        resolveModelDisplayRef({
          runtimeProvider: "openai",
          runtimeModel: "gpt-5.4",
        }),
      ).toBe("openai/gpt-5.4");
    });

    it("falls back to override values when runtime values are absent", () => {
      expect(
        resolveModelDisplayRef({
          overrideProvider: "openrouter",
          overrideModel: "anthropic/kairos-orange-4-6",
        }),
      ).toBe("anthropic/kairos-orange-4-6");
    });
  });

  describe("resolveModelDisplayName", () => {
    it("renders the trailing model segment for compact UI labels", () => {
      expect(
        resolveModelDisplayName({
          runtimeProvider: "openrouter",
          runtimeModel: "anthropic/kairos-orange-4-6",
        }),
      ).toBe("kairos-orange-4-6");
    });

    it("returns a stable empty-state label", () => {
      expect(resolveModelDisplayName({})).toBe("model n/a");
    });
  });

  describe("resolveSessionInfoModelSelection", () => {
    it("keeps partial runtime patches merged with current state", () => {
      expect(
        resolveSessionInfoModelSelection({
          currentProvider: "anthropic",
          currentModel: "kairos-orange-4-6",
          entryModel: "kairos-apple-4-6",
        }),
      ).toEqual({
        modelProvider: "anthropic",
        model: "kairos-apple-4-6",
      });
    });

    it("keeps override ids attached to the current provider when no override provider is stored", () => {
      expect(
        resolveSessionInfoModelSelection({
          currentProvider: "anthropic",
          currentModel: "kairos-orange-4-6",
          overrideModel: "ollama-beelink2/qwen2.5-coder:7b",
        }),
      ).toEqual({
        modelProvider: "anthropic",
        model: "ollama-beelink2/qwen2.5-coder:7b",
      });
    });

    it("keeps the current provider for slash-bearing override ids when provider is already known", () => {
      expect(
        resolveSessionInfoModelSelection({
          currentProvider: "openrouter",
          currentModel: "openrouter/auto",
          overrideModel: "anthropic/kairos-haiku-4.5",
        }),
      ).toEqual({
        modelProvider: "openrouter",
        model: "anthropic/kairos-haiku-4.5",
      });
    });

    it("falls back to configured defaults when runtime session state is empty", () => {
      expect(
        resolveSessionInfoModelSelection({
          defaultProvider: "openai",
          defaultModel: "gpt-5.4",
        }),
      ).toEqual({
        modelProvider: "openai",
        model: "gpt-5.4",
      });
    });
  });
});
