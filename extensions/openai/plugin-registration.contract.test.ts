import { pluginRegistrationContractCases } from "kairos/plugin-sdk/plugin-test-contracts";
import { describePluginRegistrationContract } from "kairos/plugin-sdk/plugin-test-contracts";

describePluginRegistrationContract({
  ...pluginRegistrationContractCases.openai,
  videoGenerationProviderIds: ["openai"],
  requireGenerateImage: true,
  requireGenerateVideo: true,
});
