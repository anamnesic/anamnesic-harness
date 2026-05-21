import { describeZAIProviderRuntimeContract } from "kairos/plugin-sdk/provider-test-contracts";

describeZAIProviderRuntimeContract(() => import("./index.js"));
