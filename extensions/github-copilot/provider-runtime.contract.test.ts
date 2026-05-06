import { describeGithubCopilotProviderRuntimeContract } from "kairos/plugin-sdk/provider-test-contracts";

describeGithubCopilotProviderRuntimeContract(() => import("./index.js"));
