import { describeAnthropicProviderRuntimeContract } from "kairos/plugin-sdk/provider-test-contracts";

describeAnthropicProviderRuntimeContract(() => import("./index.js"));
