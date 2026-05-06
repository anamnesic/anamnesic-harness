import { describeGoogleProviderRuntimeContract } from "kairos/plugin-sdk/provider-test-contracts";

describeGoogleProviderRuntimeContract(() => import("./index.js"));
