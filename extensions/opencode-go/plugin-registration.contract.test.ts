import { describePluginRegistrationContract } from "kairos/plugin-sdk/plugin-test-contracts";

describePluginRegistrationContract({
  pluginId: "kairos-go",
  providerIds: ["kairos-go"],
  mediaUnderstandingProviderIds: ["kairos-go"],
  requireDescribeImages: true,
});
