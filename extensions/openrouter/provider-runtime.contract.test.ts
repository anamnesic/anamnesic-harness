import { describeOpenRouterProviderRuntimeContract } from "kairos/plugin-sdk/provider-test-contracts";

describeOpenRouterProviderRuntimeContract(() => import("./index.js"));
