import { describeOpenAIProviderRuntimeContract } from "kairos/plugin-sdk/provider-test-contracts";

describeOpenAIProviderRuntimeContract(() => import("./index.js"));
