import { describePluginRegistrationContract } from "kairos/plugin-sdk/plugin-test-contracts";

describePluginRegistrationContract({
  pluginId: "kairos",
  providerIds: ["kairos"],
  mediaUnderstandingProviderIds: ["kairos"],
  requireDescribeImages: true,
});
