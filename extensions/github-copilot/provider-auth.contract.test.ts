import { describeGithubCopilotProviderAuthContract } from "kairos/plugin-sdk/provider-test-contracts";

describeGithubCopilotProviderAuthContract(() => import("./index.js"));
