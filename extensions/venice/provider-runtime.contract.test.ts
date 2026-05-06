import { describeVeniceProviderRuntimeContract } from "kairos/plugin-sdk/provider-test-contracts";

describeVeniceProviderRuntimeContract(() => import("./index.js"));
