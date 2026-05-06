import type { ProviderStreamOptions } from "@mariozechner/pi-ai";
import {
  describeImageWithModelPayloadTransform,
  describeImagesWithModelPayloadTransform,
  type MediaUnderstandingProvider,
} from "kairos/plugin-sdk/media-understanding";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function stripkairosDisabledResponsesReasoningPayload(payload: unknown): void {
  if (!isRecord(payload)) {
    return;
  }
  const reasoning = payload.reasoning;
  if (reasoning === "none") {
    delete payload.reasoning;
    return;
  }
  if (!isRecord(reasoning) || reasoning.effort !== "none") {
    return;
  }
  delete payload.reasoning;
}

const stripDisabledResponsesReasoning: ProviderStreamOptions["onPayload"] = (payload) => {
  stripkairosDisabledResponsesReasoningPayload(payload);
  return undefined;
};

export const kairosMediaUnderstandingProvider: MediaUnderstandingProvider = {
  id: "kairos",
  capabilities: ["image"],
  defaultModels: {
    image: "gpt-5-nano",
  },
  describeImage: (request) =>
    describeImageWithModelPayloadTransform(request, stripDisabledResponsesReasoning),
  describeImages: (request) =>
    describeImagesWithModelPayloadTransform(request, stripDisabledResponsesReasoning),
};
