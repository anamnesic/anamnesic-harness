import {
  describeImageWithModel,
  describeImagesWithModel,
  type MediaUnderstandingProvider,
} from "kairos/plugin-sdk/media-understanding";

export const kairosGoMediaUnderstandingProvider: MediaUnderstandingProvider = {
  id: "kairos-go",
  capabilities: ["image"],
  defaultModels: {
    image: "kimi-k2.6",
  },
  describeImage: describeImageWithModel,
  describeImages: describeImagesWithModel,
};
